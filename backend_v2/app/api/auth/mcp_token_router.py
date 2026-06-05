"""Endpoints MCP: emision, listado y revocacion de tokens MCP de larga duracion.

Ver docs/PLAN_SERVIDOR_MCP.md seccion 4.4. Extraido de login_router.py para
mantener ese archivo bajo el limite de lineas (regla enforced por el
pre-commit hook `enforce-architecture-backend`).
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.profile_router import obtener_usuario_actual_db
from app.core.config import obtener_configuracion
from app.core.rate_limiter import (
    _mcp_token_key_func,
    _mcp_tokens_list_key_func,
    _mcp_tokens_revoke_key_func,
    limiter,
)
from app.database import obtener_db
from app.models.auth.usuario import Usuario
from app.services.auth.servicio import ServicioAuth, enmascarar_pii


router = APIRouter()
_settings = obtener_configuracion()


@router.post("/mcp-token")
@limiter.limit(_settings.rate_limit_mcp_token, key_func=_mcp_token_key_func)
async def emitir_token_mcp(
    request: Request,
    payload: dict,
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
    db: AsyncSession = Depends(obtener_db),
):
    """Emite un token MCP de larga duracion para el usuario autenticado.

    ANTI-ORFANDAD: solo sesiones web (token_type='session') pueden emitir
    tokens MCP. Un token MCP no puede generar otro token MCP.
    """
    # Anti-orfandad: validar tipo de credencial entrante
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token_entrante = auth_header[7:]
        payload_in = ServicioAuth.obtener_payload_token(token_entrante)
        if payload_in and payload_in.get("token_type") == "mcp":
            raise HTTPException(
                status_code=403,
                detail="Los tokens MCP no pueden emitir otros tokens MCP. "
                       "Inicia sesion web para generar un token MCP nuevo.",
            )

    from app.services.auth.mcp_service import emitir_token_mcp as svc

    return await svc(
        db,
        usuario_actual,
        vigencia_dias=payload.get("vigencia_dias", 30),
        scope=payload.get("scope", "read"),
        motivo=enmascarar_pii(payload.get("motivo", "")),
        direccion_ip=request.client.host if request.client else None,
    )


@router.get("/mcp-tokens")
@limiter.limit(_settings.rate_limit_mcp_tokens_list, key_func=_mcp_tokens_list_key_func)
async def listar_mis_tokens_mcp(
    request: Request,
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
    db: AsyncSession = Depends(obtener_db),
):
    """Lista los tokens MCP activos del usuario autenticado."""
    from app.services.auth.mcp_service import listar_tokens_mcp_activos

    return {"tokens": await listar_tokens_mcp_activos(db, usuario_actual)}


@router.delete("/mcp-tokens/{jti}")
@limiter.limit(_settings.rate_limit_mcp_tokens_revoke, key_func=_mcp_tokens_revoke_key_func)
async def revocar_mi_token_mcp(
    request: Request,
    jti: str,
    usuario_actual: Usuario = Depends(obtener_usuario_actual_db),
    db: AsyncSession = Depends(obtener_db),
):
    """Revoca un token MCP propio por jti."""
    from app.services.auth.mcp_service import revocar_token_mcp

    ok = await revocar_token_mcp(db, usuario_actual, jti)
    if not ok:
        raise HTTPException(404, "Token no encontrado o no te pertenece")
    return {"message": "Token revocado"}
