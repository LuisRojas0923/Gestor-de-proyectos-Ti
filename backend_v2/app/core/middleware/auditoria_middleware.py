"""Middleware HTTP para auditoría automática de mutaciones."""

import json

import logging

import uuid



from starlette.requests import Request

from starlette.responses import Response



from app.database import AsyncSessionLocal

from app.models.auditoria.accion_usuario import AccionAuditoria

from app.core.middleware.auditoria_rutas import (
    es_ruta_consulta_comisiones_auditable,
    es_ruta_descarga_auditable,
    es_preview_perfiles_erp_auditable,
    es_ruta_sincronizacion_perfiles,
)

from app.services.auditoria.servicio import (

    ServicioAuditoria,

    inferir_accion_desde_metodo,

    inferir_modulo_desde_ruta,

    inferir_resultado_desde_codigo,

)

from app.services.auditoria.snapshots import modelo_a_dict_auditoria

from app.core.middleware.auditoria_resolver import (

    extraer_contexto_auditoria,

    resolver_actor_desde_request,

)



logger = logging.getLogger(__name__)



_METODOS_AUDITABLES = frozenset({"POST", "PUT", "PATCH", "DELETE"})

_RUTAS_EXCLUIDAS = frozenset({

    "/health",

    "/api/v2/health",

    "/docs",

    "/openapi.json",

    "/redoc",

    "/api/v2/auth/login",

    "/api/v2/auth/logout",

    # Polling automático de presencia en torre de control (no es acción de usuario)
    "/api/v2/panel-control/torre-control/heartbeat",

})

_CONTENT_TYPES_JSON = ("application/json", "application/json;", "text/json")





def _debe_auditar(request: Request) -> bool:

    path = request.url.path.rstrip("/") or "/"

    if path in _RUTAS_EXCLUIDAS:

        return False

    if path.startswith("/api/v2/auditoria"):

        return False

    if not path.startswith("/api/v2/"):

        return False

    if request.method in _METODOS_AUDITABLES:

        return True

    if request.method == "GET" and es_ruta_descarga_auditable(path):

        return True

    if request.method == "GET" and es_ruta_consulta_comisiones_auditable(path):

        return True

    if request.method == "GET" and es_preview_perfiles_erp_auditable(path):
        return True

    return False


def _debe_registrar_automaticamente(request: Request) -> bool:
    """Evita duplicar un evento que la ruta ya agrego a su transaccion."""
    return not bool(getattr(request.state, "auditoria_evento_manual", False))


def _resolver_correlacion_id(request: Request) -> str:

    valor = (request.headers.get("X-Request-ID") or "").strip()

    try:

        return str(uuid.UUID(valor))

    except (ValueError, AttributeError, TypeError):

        return str(uuid.uuid4())


def _permite_auditar_body(path: str) -> bool:

    ruta = path.rstrip("/") or "/"

    return not (

        ruta == "/api/v2/bitacoras-operacionales"

        or ruta.startswith("/api/v2/bitacoras-operacionales/")

    )





async def _leer_body_json(request: Request) -> dict | None:

    content_type = (request.headers.get("content-type") or "").lower()

    if not any(content_type.startswith(t) for t in _CONTENT_TYPES_JSON):

        return None

    try:

        raw = await request.body()

        if not raw:

            return None

        parsed = json.loads(raw)

        if isinstance(parsed, dict):

            return modelo_a_dict_auditoria(parsed)

    except Exception:

        return None

    return None





async def auditoria_http_middleware(request: Request, call_next) -> Response:

    correlacion_id = _resolver_correlacion_id(request)

    request.state.correlacion_id = correlacion_id



    body_json = None

    if (
        _debe_auditar(request)
        and request.method in ("POST", "PUT", "PATCH")
        and _permite_auditar_body(request.url.path)
    ):

        body_json = await _leer_body_json(request)



    response = await call_next(request)

    if es_ruta_sincronizacion_perfiles(request.url.path):
        response.headers["Cache-Control"] = "no-store, private"



    if not _debe_auditar(request):

        return response

    if not _debe_registrar_automaticamente(request):

        return response



    usuario_id, usuario_nombre, rol = await resolver_actor_desde_request(request)

    if not usuario_id and es_ruta_sincronizacion_perfiles(request.url.path):
        usuario_id, usuario_nombre, rol = "anonimo", None, None
    elif not usuario_id:

        logger.debug(

            "Auditoría omitida (sin actor): %s",

            request.method,

        )

        return response



    path = request.url.path

    contexto = extraer_contexto_auditoria(request)



    datos_anteriores = contexto.get("datos_anteriores")

    datos_nuevos = contexto.get("datos_nuevos")

    if datos_nuevos is None and body_json is not None:

        datos_nuevos = body_json



    accion = contexto.get("accion")
    if not accion:
        if request.method == "GET" and es_ruta_descarga_auditable(path):
            accion = AccionAuditoria.EXPORTAR
        elif request.method == "GET" and es_ruta_consulta_comisiones_auditable(path):
            accion = AccionAuditoria.CONSULTAR
        else:
            accion = inferir_accion_desde_metodo(request.method)

    modulo = contexto.get("modulo") or (
        "admin_usuarios"
        if es_ruta_sincronizacion_perfiles(path)
        else inferir_modulo_desde_ruta(path)
    )

    try:

        async with AsyncSessionLocal() as db:

            await ServicioAuditoria.registrar(

                db,

                usuario_id=usuario_id,

                usuario_nombre=usuario_nombre,

                rol=rol,

                modulo=modulo,

                accion=accion,

                resultado=inferir_resultado_desde_codigo(response.status_code),

                entidad_tipo=contexto.get("entidad_tipo"),

                entidad_id=contexto.get("entidad_id"),

                metodo_http=request.method,

                ruta=path[:255],

                codigo_respuesta=response.status_code,

                direccion_ip=request.client.host if request.client else None,

                agente_usuario=request.headers.get("user-agent"),

                correlacion_id=correlacion_id,

                datos_anteriores=datos_anteriores,

                datos_nuevos=datos_nuevos,

                metadatos=contexto.get("metadatos"),

            )

    except Exception:

        logger.error("Middleware auditoría falló sin afectar respuesta")



    return response
