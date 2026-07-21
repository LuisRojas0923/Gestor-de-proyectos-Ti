import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import obtener_configuracion
from app.core.rate_limiter import _erp_profile_sync_key_func, limiter
from app.database import obtener_db
from app.models.auth.sincronizacion_perfil import (
    ResumenSincronizacionPerfiles,
    ResultadoSincronizacionPerfil,
    SolicitudSincronizacionIndividual,
)
from app.models.auth.usuario import Usuario
from app.services.auth.servicio import ServicioAuth
from app.services.auth.sesion_service import validar_sesion_activa
from app.services.auth.sincronizacion_perfiles_service import (
    FuenteERPNoDisponible,
    LimiteSincronizacionExcedido,
    SincronizacionEnCurso,
    sincronizar_usuario_desde_erp,
    sincronizar_usuarios_activos_desde_erp,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/usuarios/sincronizacion-erp")
settings = obtener_configuracion()


async def requiere_admin_usuarios_sin_mutaciones(
    request: Request,
    token: str = Depends(ServicioAuth.oauth2_scheme),
    db: AsyncSession = Depends(obtener_db),
) -> Usuario:
    payload = ServicioAuth.obtener_payload_token(token)
    if not payload or payload.get("token_type") == "mcp":
        raise HTTPException(status_code=401, detail="Credencial no valida")
    cedula = payload.get("sub")
    if not cedula or not await validar_sesion_activa(db, token, None):
        raise HTTPException(status_code=401, detail="Credencial no valida")
    usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
    if not usuario or not usuario.esta_activo:
        raise HTTPException(status_code=401, detail="Credencial no valida")
    request.state.usuario_id = usuario.id
    request.state.usuario_nombre = usuario.nombre
    request.state.usuario_rol = usuario.rol
    request.state.auditoria_modulo = "admin_usuarios"
    request.state.auditoria_entidad_tipo = "sincronizacion_perfiles_erp"
    permisos = await ServicioAuth.obtener_permisos_por_rol(db, usuario.rol)
    if "admin_usuarios" not in permisos:
        raise HTTPException(status_code=403, detail="Permiso insuficiente")
    return usuario


def _preparar_auditoria(request: Request) -> None:
    request.state.auditoria_modulo = "admin_usuarios"
    request.state.auditoria_entidad_tipo = "sincronizacion_perfiles_erp"
    request.state.auditoria_entidad_id = None


@router.post(
    "/individual",
    response_model=ResultadoSincronizacionPerfil,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {
                    "schema": SolicitudSincronizacionIndividual.model_json_schema()
                }
            },
        }
    },
)
@limiter.limit(settings.rate_limit_sync_usuario_erp, key_func=_erp_profile_sync_key_func)
async def sincronizar_perfil_individual(
    request: Request,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_admin_usuarios_sin_mutaciones),
):
    _preparar_auditoria(request)
    try:
        payload = SolicitudSincronizacionIndividual.model_validate(
            await request.json()
        )
    except Exception:
        raise HTTPException(status_code=422, detail="Solicitud invalida")
    usuario = (
        await db.execute(select(Usuario).where(Usuario.id == payload.usuario_id))
    ).scalar_one_or_none()
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    try:
        resultado = await sincronizar_usuario_desde_erp(db, usuario)
        request.state.auditoria_metadatos = {
            "estado": resultado.estado.value,
            "campos": resultado.campos_modificados,
        }
        return resultado
    except FuenteERPNoDisponible:
        raise HTTPException(status_code=503, detail="ERP de perfiles no disponible")
    except Exception:
        logger.error("Fallo local sincronizando perfil individual")
        raise HTTPException(status_code=500, detail="No se pudo sincronizar el perfil")


@router.get("/previsualizacion", response_model=ResumenSincronizacionPerfiles)
@limiter.limit(settings.rate_limit_preview_usuarios_erp, key_func=_erp_profile_sync_key_func)
async def previsualizar_sincronizacion_perfiles(
    request: Request,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_admin_usuarios_sin_mutaciones),
):
    _preparar_auditoria(request)
    try:
        resumen = await sincronizar_usuarios_activos_desde_erp(db, aplicar=False)
        request.state.auditoria_metadatos = resumen.model_dump()
        return resumen
    except LimiteSincronizacionExcedido:
        raise HTTPException(status_code=409, detail="Limite operativo excedido")
    except FuenteERPNoDisponible:
        raise HTTPException(status_code=503, detail="ERP de perfiles no disponible")
    except Exception:
        logger.error("Fallo local previsualizando perfiles ERP")
        raise HTTPException(status_code=500, detail="No se pudo previsualizar")


@router.post("/aplicar", response_model=ResumenSincronizacionPerfiles)
@limiter.limit(settings.rate_limit_apply_usuarios_erp, key_func=_erp_profile_sync_key_func)
async def aplicar_sincronizacion_perfiles(
    request: Request,
    db: AsyncSession = Depends(obtener_db),
    _: Usuario = Depends(requiere_admin_usuarios_sin_mutaciones),
):
    _preparar_auditoria(request)
    try:
        resumen = await sincronizar_usuarios_activos_desde_erp(db, aplicar=True)
        request.state.auditoria_metadatos = resumen.model_dump()
        return resumen
    except (LimiteSincronizacionExcedido, SincronizacionEnCurso) as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except FuenteERPNoDisponible:
        raise HTTPException(status_code=503, detail="ERP de perfiles no disponible")
    except Exception:
        logger.error("Fallo local aplicando perfiles ERP")
        raise HTTPException(status_code=500, detail="No se pudo aplicar la sincronizacion")
