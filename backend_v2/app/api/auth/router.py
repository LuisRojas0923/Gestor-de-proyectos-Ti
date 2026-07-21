"""
Router de Autenticación - Backend V2 (Agregador)
"""

from fastapi import APIRouter
from .admin_router import router as admin_router
from .login_router import router as login_router
from .mcp_token_router import router as mcp_token_router
from .profile_router import (
    obtener_usuario_actual_db,
    obtener_usuario_actual_opcional,
    router as profile_router,
)
from .public_auth_router import router as public_auth_router
from .refresh_router import router as refresh_router
from .sincronizacion_perfiles_router import router as sincronizacion_perfiles_router

router = APIRouter()

# Incluir sub-routers especializados
router.include_router(login_router, tags=["Login"])
router.include_router(refresh_router, tags=["Login"])
router.include_router(public_auth_router, tags=["Autenticación pública"])
router.include_router(profile_router, tags=["Perfil"])
router.include_router(admin_router, tags=["Administración"])
router.include_router(mcp_token_router, tags=["Tokens MCP"])
router.include_router(sincronizacion_perfiles_router, tags=["Sincronizacion ERP"])

# Exportar dependencia común para otros módulos
__all__ = ["router", "obtener_usuario_actual_db", "obtener_usuario_actual_opcional"]
