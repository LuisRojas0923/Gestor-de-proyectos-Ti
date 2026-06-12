"""Resolución de actor y entidad para el middleware de auditoría."""
import re
from typing import Any, Optional

from starlette.requests import Request

from app.database import AsyncSessionLocal
from app.core.middleware.auditoria_rutas import (
    extraer_metadatos_descarga,
    inferir_entidad_descarga,
)
from app.services.auth.servicio import ServicioAuth

_TIPO_ENTIDAD_POR_MODULO = {
    "desarrollos": "desarrollo",
    "actividades": "actividad",
    "soporte": "ticket",
    "auth": "usuario",
    "jerarquia": "jerarquia",
    "inventario": "inventario",
    "novedades-nomina": "nomina",
    "reserva-salas": "reserva",
    "impuestos": "impuestos",
}

_SEGMENTO_NO_ID = frozenset({
    "arbol",
    "estadisticas",
    "rendimiento",
    "plantillas",
    "aplicar",
    "eventos",
    "usuarios-disponibles",
    "desarrollo",
})


async def resolver_actor_desde_request(
    request: Request,
) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """Obtiene usuario_id, nombre y rol desde request.state o JWT Bearer."""
    usuario_id = getattr(request.state, "usuario_id", None)
    if usuario_id:
        return (
            usuario_id,
            getattr(request.state, "usuario_nombre", None),
            getattr(request.state, "usuario_rol", None),
        )

    auth_header = request.headers.get("authorization") or ""
    if not auth_header.lower().startswith("bearer "):
        return None, None, None

    token = auth_header.split(" ", 1)[1].strip()
    payload = ServicioAuth.obtener_payload_token(token)
    cedula = payload.get("sub") if payload else None
    if not cedula:
        return None, None, None

    try:
        async with AsyncSessionLocal() as db:
            usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
            if not usuario:
                return None, None, None
            return usuario.id, usuario.nombre, usuario.rol
    except Exception:
        return None, None, None


def inferir_entidad_desde_ruta(ruta: str) -> tuple[Optional[str], Optional[str]]:
    """Extrae tipo e ID de entidad desde rutas REST con identificador."""
    partes = [p for p in ruta.split("/") if p]
    if len(partes) < 4 or partes[0] != "api" or partes[1] != "v2":
        return None, None

    modulo = partes[2]
    candidato = partes[3]
    if candidato in _SEGMENTO_NO_ID:
        return None, None
    if not re.match(r"^[\w\-.]+$", candidato):
        return None, None

    entidad_tipo = _TIPO_ENTIDAD_POR_MODULO.get(modulo, modulo)
    return entidad_tipo, candidato


def extraer_contexto_auditoria(request: Request) -> dict[str, Any]:
    """Lee hints opcionales que los endpoints pueden dejar en request.state."""
    entidad_tipo = getattr(request.state, "auditoria_entidad_tipo", None)
    entidad_id = getattr(request.state, "auditoria_entidad_id", None)
    metadatos = getattr(request.state, "auditoria_metadatos", None)

    if not entidad_tipo or not entidad_id:
        tipo_descarga, id_descarga = inferir_entidad_descarga(request.url.path)
        entidad_tipo = entidad_tipo or tipo_descarga
        entidad_id = entidad_id or id_descarga

    if not entidad_tipo or not entidad_id:
        tipo_ruta, id_ruta = inferir_entidad_desde_ruta(request.url.path)
        entidad_tipo = entidad_tipo or tipo_ruta
        entidad_id = entidad_id or id_ruta

    metadatos_descarga = extraer_metadatos_descarga(request)
    if metadatos_descarga:
        metadatos = {**(metadatos or {}), **metadatos_descarga}
        if not entidad_id:
            entidad_id = metadatos_descarga.get("cedula") or metadatos_descarga.get(
                "cedula_target"
            )

    if "/comisiones/datos" in request.url.path:
        mes = request.query_params.get("mes")
        anio = request.query_params.get("anio")
        if mes and anio:
            metadatos = {**(metadatos or {}), "mes": mes, "anio": anio}
            if not entidad_id:
                entidad_id = f"{mes}-{anio}"

    return {
        "modulo": getattr(request.state, "auditoria_modulo", None),
        "accion": getattr(request.state, "auditoria_accion", None),
        "entidad_tipo": entidad_tipo,
        "entidad_id": entidad_id,
        "metadatos": metadatos,
        "datos_anteriores": getattr(request.state, "auditoria_datos_anteriores", None),
        "datos_nuevos": getattr(request.state, "auditoria_datos_nuevos", None),
    }
