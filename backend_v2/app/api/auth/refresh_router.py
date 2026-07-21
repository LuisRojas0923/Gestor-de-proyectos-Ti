"""Endpoint POST /auth/refresh: re-emite un JWT vigente preservando claims.

Extraido de login_router.py para mantener ese archivo bajo el limite de
lineas (regla enforced por el pre-commit hook `enforce-architecture-backend`).
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.config import obtener_configuracion
from app.core.rate_limiter import (
    _mcp_token_key_func,
    limiter,
)
from app.services.auth.servicio import ServicioAuth


import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db

router = APIRouter()
_settings = obtener_configuracion()


@router.post("/refresh")
@limiter.limit(_settings.rate_limit_refresh, key_func=_mcp_token_key_func)
async def refrescar_token(
    request: Request,
    db: AsyncSession = Depends(obtener_db),
    token_actual: str = Depends(ServicioAuth.oauth2_scheme),
):
    """Refresca un JWT vigente, devolviendo uno nuevo con `exp` actualizado y rotando la sesión en BD."""
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

    nuevo_jti = str(uuid.uuid4())
    old_jti = payload.get("jti")
    cedula = payload.get("sub")

    nuevo_token = ServicioAuth.crear_token_acceso(
        datos={k: v for k, v in payload.items() if k not in ("exp", "jti", "iat")},
        jti=nuevo_jti,
        tipo_token=payload.get("token_type", "session"),
    )

    if cedula:
        usuario = await ServicioAuth.obtener_usuario_por_cedula(db, cedula)
        if usuario:
            await ServicioAuth.rotar_sesion(
                db=db,
                old_jti=old_jti,
                nuevo_token=nuevo_token,
                nuevo_jti=nuevo_jti,
                usuario_id=usuario.id,
                nombre_usuario=usuario.nombre,
                rol_usuario=usuario.rol,
                direccion_ip=request.client.host if request.client else None,
                agente_usuario=request.headers.get("user-agent"),
                tipo_sesion=payload.get("token_type", "web"),
            )

    return {
        "access_token": nuevo_token,
        "token_type": "bearer",
    }
