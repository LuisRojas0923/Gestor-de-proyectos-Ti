"""Endpoint POST /auth/refresh: re-emite un JWT vigente preservando claims.

Extraido de login_router.py para mantener ese archivo bajo el limite de
lineas (regla enforced por el pre-commit hook `enforce-architecture-backend`).
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import obtener_configuracion
from app.core.rate_limiter import (
    _mcp_token_key_func,
    limiter,
)
from app.database import obtener_db
from app.models.auth.usuario import Sesion
from app.services.auth.servicio import ServicioAuth
from app.utils_date import get_bogota_now


router = APIRouter()
_settings = obtener_configuracion()


@router.post("/refresh")
@limiter.limit(_settings.rate_limit_refresh, key_func=_mcp_token_key_func)
async def refrescar_token(
    request: Request,
    token_actual: str = Depends(ServicioAuth.oauth2_scheme),
    db: AsyncSession = Depends(obtener_db),
):
    """Refresca un JWT vigente, devolviendo uno nuevo con `exp` actualizado.

    NO requiere body: el token a refrescar viene en el header Authorization.
    El nuevo token preserva el claim `last_ip` del original (no se re-estampa
    con la IP actual; el usuario podria haber cambiado de red y aun asi
    seguir siendo el mismo).

    El token entrante debe ser valido (firma OK y no expirado). Si esta
    expirado, jwt.decode lanza JWTError y respondemos 401. Esto es a
    proposito: no queremos que un atacante con un token expirado pueda
    re-pedir tokens indefinidamente (combinado con el rate limit 20/h
    por IP, es suficiente para que un usuario legitimo refresque una vez
    cada 45 min sin problemas, y limite el abuso a 20 refreshes/h por IP).
    """
    if not token_actual:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = ServicioAuth.obtener_payload_token(token_actual)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("token_type", "session") != "session" or payload.get("scope"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    usuario = await ServicioAuth.obtener_usuario_por_cedula(db, payload.get("sub"))
    if not usuario or not usuario.esta_activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sesion_web = await ServicioAuth.obtener_sesion_web_activa_por_jti(
        db,
        jti=payload.get("jti"),
        usuario_id=usuario.id,
    )
    if not sesion_web:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Re-emitir el token con todos los claims del original. El claim `last_ip`
    # se preserva tal cual; los demas claims (sub, rol, jti, token_type, scope)
    # se mantienen, solo se renueva `exp` y se genera un nuevo `jti`.
    nuevo_token = ServicioAuth.crear_token_acceso(
        datos={k: v for k, v in payload.items() if k not in ("exp", "jti", "iat")},
        tipo_token=payload.get("token_type", "session"),
    )
    nuevo_payload = ServicioAuth.obtener_payload_token(nuevo_token) or {}
    ahora = get_bogota_now()
    nuevo_expira_en = datetime.fromtimestamp(nuevo_payload["exp"], timezone.utc).replace(tzinfo=None)
    try:
        sesion_web.fin_sesion = ahora
        db.add(
            Sesion(
                usuario_id=usuario.id,
                token_sesion=nuevo_token,
                nombre_usuario=usuario.nombre,
                rol_usuario=usuario.rol,
                direccion_ip=request.client.host if request.client else None,
                agente_usuario=request.headers.get("user-agent"),
                expira_en=nuevo_expira_en,
                tipo_sesion="web",
                jti=nuevo_payload.get("jti"),
            )
        )
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo renovar la sesion de forma segura",
        )

    return {
        "access_token": nuevo_token,
        "token_type": "bearer",
    }
