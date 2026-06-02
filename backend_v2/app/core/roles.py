"""
SSOT (Single Source of Truth) de constantes de roles del sistema.

IMPORTANTE: Este módulo documenta los roles seed del sistema.
NO se usa para autorización en runtime. La autorización real es siempre
vía ServicioAuth.tiene_acceso_panel_admin() o equivalente, que consulta
dinámicamente PermisoRol JOIN ModuloSistema WHERE categoria='panel'.

Si en el futuro se añade un nuevo rol:
1. Añadirlo a ROLES_SEED aquí.
2. Registrarlo en admin_router.py:271-280 (RolSistema seed).
3. Asignarle permisos de categoria='panel' desde la UI de admin.
4. El endpoint /verify-admin lo aceptará automáticamente.

Mantener esta constante sincronizada con frontend/src/constants/roles.ts
(espejo frontend). El test test_roles_ssot_syncronizado valida que ambas
listas no diverjan.
"""
from typing import FrozenSet

ROLES_SEED: FrozenSet[str] = frozenset({
    "admin",
    "admin_sistemas",
    "admin_mejoramiento",
    "director",
    "analyst",
    "manager",
    "viaticante",
    "usuario",
})


ROLES_ADMIN_PANEL: FrozenSet[str] = frozenset({
    "admin",
    "admin_sistemas",
    "admin_mejoramiento",
    "director",
    "analyst",
})


def es_rol_valido(rol: str) -> bool:
    """Verifica si un rol existe en el sistema."""
    return rol in ROLES_SEED
