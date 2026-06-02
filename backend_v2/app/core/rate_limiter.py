"""
Rate limiter global del backend (singleton).

Se importa desde app/main.py y desde los routers que necesiten
limitar requests (e.g., /api/v2/config/verify-admin).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import obtener_configuracion

_settings = obtener_configuracion()


def _verify_admin_key_func(request) -> str:
    """Key function para slowapi: combina usuario_id (de request.state) con IP."""
    usuario_id = getattr(request.state, "usuario_id", "anonimo")
    ip = get_remote_address(request)
    return f"{usuario_id}:{ip}"


limiter = Limiter(
    key_func=_verify_admin_key_func,
    default_limits=[],
    headers_enabled=False,
)
