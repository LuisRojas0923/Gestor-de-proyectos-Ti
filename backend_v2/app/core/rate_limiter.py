"""
Rate limiter global del backend (singleton).

Se importa desde app/main.py y desde los routers que necesiten
limitar requests (e.g., /api/v2/config/verify-admin).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import obtener_configuracion
from urllib.parse import parse_qs

_settings = obtener_configuracion()


def _verify_admin_key_func(request) -> str:
    """Key function para slowapi: combina usuario_id (de request.state) con IP."""
    usuario_id = getattr(request.state, "usuario_id", "anonimo")
    ip = get_remote_address(request)
    return f"{usuario_id}:{ip}"


def _login_key_func(request) -> str:
    """Key function para /auth/login: combina IP con cédula del form.

    El form ya fue parseado por la dependencia OAuth2PasswordRequestForm
    (resolución de dependencias ocurre antes del check de rate limit),
    por lo que `request._body` está cacheado y podemos leerlo sync.

    Esto evita que un atacante evada el rate limit rotando IPs (X-Forwarded-For)
    porque el bucket es por (IP, cédula): la misma cédula sigue limitada
    desde la misma IP, y distintas IPs tienen buckets independientes pero
    la misma cédula sigue contando para un eventual patrón distribuido.
    """
    ip = get_remote_address(request)
    cedula = ""
    try:
        body = getattr(request, "_body", None)
        if body:
            form = parse_qs(body.decode("utf-8"))
            cedula = (form.get("username", [""])[0] or "").strip().lower()
    except Exception:
        cedula = ""
    return f"login:{ip}:{cedula}"


limiter = Limiter(
    key_func=_verify_admin_key_func,
    default_limits=[],
    headers_enabled=False,
)
