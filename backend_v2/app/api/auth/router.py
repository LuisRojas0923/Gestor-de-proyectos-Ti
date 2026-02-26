"""
Router de Autenticación - Backend V2 (Agregador)
"""

from fastapi import APIRouter
from .login_router import router as login_router
from .profile_router import router as profile_router, obtener_usuario_actual_db
from .admin_router import router as admin_router
from .viaticos_router import router as viaticos_router

router = APIRouter()

# Incluir sub-routers especializados
router.include_router(login_router, tags=["Login"])
router.include_router(profile_router, tags=["Perfil"])
router.include_router(admin_router, tags=["Administración"])
router.include_router(viaticos_router, tags=["Viáticos & Portal"])

# Exportar dependencia común para otros módulos
__all__ = ["router", "obtener_usuario_actual_db"]
