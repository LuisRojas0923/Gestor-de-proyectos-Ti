"""
Rate limiter global del backend (singleton SlowAPI con Redis).

Storage: Redis (compartido entre workers de uvicorn).
Key funcs: todas SYNC. SlowAPI 0.1.9 NO awaita el resultado de un key
func async (llama `lim.key_func(request)` y trata el retorno como string),
asi que leer el body en un key func async dejaria la key con un coroutine.
En su lugar, un middleware HTTP en main.py pre-corre `await request.body()`
para los paths con rate limit, poblando `request._body`. El key func
luego lee `request._body` sync y parsea segun Content-Type.

IMPORTANTE (async-safety): SlowAPI 0.1.9 invoca `self.limiter.hit()`
sincrónicamente desde el async_wrapper. Con `limits.storage.RedisStorage`
la llamada a redis-py bloquea el event loop 1-5ms por request. Para
herramientas admin con tráfico bajo es aceptable; en alta concurrencia
migrar a `limits.aio.storage.AsyncRedisStorage` (strategy="async") o
usar un solo worker de uvicorn.
"""
import hashlib
import json
import logging
from typing import Optional
from urllib.parse import parse_qs

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import obtener_configuracion

logger = logging.getLogger(__name__)

_settings = obtener_configuracion()


def _resolve_effective_ip(request: Request) -> str:
    """Resuelve la IP efectiva del cliente.

    Si la conexion TCP viene de un proxy en `trusted_proxy_ips`, lee
    `X-Forwarded-For` y usa la primera IP. Si no, IGNORA el header
    y usa la IP de la conexion TCP. Cierra el bypass por header
    falsificado: el atacante no puede mentir sobre su IP salvo que ya
    este en la allowlist (en cuyo caso es un proxy de confianza).
    """
    connection_ip = get_remote_address(request) or "unknown"
    trusted = _settings.trusted_proxy_ips_set
    if not trusted or connection_ip not in trusted:
        return connection_ip

    xff = request.headers.get("x-forwarded-for", "")
    if not xff:
        return connection_ip
    first = xff.split(",")[0].strip()
    if not first:
        return connection_ip
    return first


def _safe_resolve_effective_ip(request: Request) -> str:
    """Wrapper de _resolve_effective_ip que nunca lanza (SlowAPI key func
    no tolera excepciones)."""
    try:
        return _resolve_effective_ip(request)
    except Exception:
        try:
            return get_remote_address(request) or "unknown"
        except Exception:
            return "unknown"


def _extract_form_field_from_multipart(
    body: bytes, content_type: str, field_names: tuple[str, ...]
) -> str:
    """Extrae username/cedula de multipart/form-data de forma sync."""
    boundary = None
    for segment in content_type.split(";"):
        segment = segment.strip()
        if segment.startswith("boundary="):
            boundary = segment[9:].strip().strip('"')
            break
    if not boundary:
        return ""
    delimiter = f"--{boundary}".encode("ascii", errors="ignore")
    for chunk in body.split(delimiter):
        if not chunk or chunk in (b"--\r\n", b"--", b"\r\n"):
            continue
        header_end = chunk.find(b"\r\n\r\n")
        if header_end == -1:
            continue
        headers = chunk[:header_end].decode("utf-8", errors="replace").lower()
        for name in field_names:
            if f'name="{name}"' in headers or f"name='{name}'" in headers:
                raw = chunk[header_end + 4 :]
                line_end = raw.find(b"\r\n")
                if line_end != -1:
                    raw = raw[:line_end]
                text = raw.decode("utf-8", errors="replace").strip()
                if text:
                    return text.lower()
    return ""


def _read_cedula_from_cached_body(request: Request) -> str:
    """Lee la cedula del body pre-cacheado por el middleware
    `cache_request_body_for_rate_limit` (registrado en main.py).

    Soporta `application/x-www-form-urlencoded`, `application/json` y
    `multipart/form-data` (campo `username` o `cedula`).
    """
    body = (
        getattr(request, "_body", None)
        or request.scope.get("rate_limit_body", b"")
        or b""
    )
    if not body:
        return ""
    content_type = (request.headers.get("content-type") or "").lower()
    try:
        if "application/json" in content_type:
            data = json.loads(body)
            if not isinstance(data, dict):
                return ""
            for key in ("username", "cedula"):
                v = data.get(key)
                if isinstance(v, str) and v.strip():
                    return v.strip().lower()
            return ""
        if "application/x-www-form-urlencoded" in content_type:
            form = parse_qs(body.decode("utf-8"))
            for key in ("username", "cedula"):
                v = form.get(key, [""])[0]
                if v and v.strip():
                    return v.strip().lower()
            return ""
        if "multipart/form-data" in content_type:
            return _extract_form_field_from_multipart(
                body, content_type, ("username", "cedula")
            )
        return ""
    except Exception:
        return ""


def _resolve_body_identity(request: Request, *, anon_prefix: str = "anon") -> str:
    """Identidad para rate limit basada en cedula/username del body cacheado.

    Fallbacks (en orden):
    1. cedula/username parseados del body
    2. hash corto del body crudo (distingue requests aunque el parser falle)
    3. IP como ultimo recurso (evita bucket global unico)
    """
    cedula = _read_cedula_from_cached_body(request)
    if cedula:
        return cedula
    body = (
        getattr(request, "_body", None)
        or request.scope.get("rate_limit_body", b"")
        or b""
    )
    content_type = request.headers.get("content-type", "")
    if body:
        identity = f"body:{hashlib.sha256(body).hexdigest()[:16]}"
        logger.warning(
            "RATE_LIMIT_IDENTITY_FALLBACK | fallback=body_hash | path=%s | content_type=%s",
            request.url.path,
            content_type,
        )
        return identity
    ip = _safe_resolve_effective_ip(request)
    logger.warning(
        "RATE_LIMIT_IDENTITY_FALLBACK | fallback=ip | path=%s | content_type=%s",
        request.url.path,
        content_type,
    )
    return f"{anon_prefix}:{ip}"


def _verify_admin_key_func(request: Request) -> str:
    """Key para /config/verify-admin: usuario autenticado (de request.state) + IP."""
    usuario_id = getattr(request.state, "usuario_id", "anonimo") or "anonimo"
    ip = _safe_resolve_effective_ip(request)
    return f"verify_admin:{usuario_id}:{ip}"


def _erp_profile_sync_key_func(request: Request) -> str:
    """Agrupa por actor e IP sin persistir el identificador del usuario."""
    usuario_id = getattr(request.state, "usuario_id", "anonimo") or "anonimo"
    actor_hash = hashlib.sha256(usuario_id.encode("utf-8")).hexdigest()[:16]
    ip = _safe_resolve_effective_ip(request)
    return f"erp_profile_sync:{actor_hash}:{ip}"


def _login_key_func(request: Request) -> str:
    """Key para /auth/login: cedula del form (cacheado), sin IP compartida de proxy."""
    identity = _resolve_body_identity(request)
    return f"login:{identity}"


def _generic_json_body_key_func(request: Request) -> str:
    """Key generica para endpoints que reciben JSON con campo cedula/username."""
    identity = _resolve_body_identity(request)
    return f"{request.url.path}:{identity}"


def _setup_password_key_func(request: Request) -> str:
    """Key para /auth/setup-password: cedula del body cacheado, sin IP."""
    identity = _resolve_body_identity(request)
    return f"setup_password:{identity}"


def _mcp_token_key_func(request: Request) -> str:
    """Key para /auth/mcp-token: solo IP (usuario autenticado, rate por origen)."""
    ip = _safe_resolve_effective_ip(request)
    return f"mcp_token:{ip}"


def _password_status_key_func(request: Request) -> str:
    """Key para /password-status/{cedula}: IP + cedula del path param."""
    ip = _safe_resolve_effective_ip(request)
    cedula = (request.path_params.get("cedula") or "").strip().lower()
    return f"password_status:{ip}:{cedula}"


def _logout_key_func(request: Request) -> str:
    """Key para /auth/logout: usuario del JWT (si esta en state) + IP."""
    sub = getattr(request.state, "sub", "anonimo") or "anonimo"
    ip = _safe_resolve_effective_ip(request)
    return f"logout:{sub}:{ip}"


def _mcp_tokens_list_key_func(request: Request) -> str:
    sub = getattr(request.state, "sub", "anonimo") or "anonimo"
    ip = _safe_resolve_effective_ip(request)
    return f"mcp_tokens_list:{sub}:{ip}"


def _mcp_tokens_revoke_key_func(request: Request) -> str:
    sub = getattr(request.state, "sub", "anonimo") or "anonimo"
    ip = _safe_resolve_effective_ip(request)
    jti = (request.path_params.get("jti") or "").strip().lower()
    return f"mcp_tokens_revoke:{jti}:{sub}:{ip}"


# --- Lockout per-cuenta (defense-in-depth sobre el rate limit por IP) ---


def _identificador_cedula(cedula: str) -> str:
    return hashlib.sha256(cedula.encode("utf-8")).hexdigest()


def _verificar_lockout_cedula(cedula: str) -> Optional[int]:
    """Si la cedula esta lockeada en Redis, retorna segundos restantes.
    Retorna None si no hay lockout activo o si Redis no esta disponible."""
    if not cedula:
        return None
    try:
        from limits.storage import RedisStorage
        storage = limiter._storage
        if not isinstance(storage, RedisStorage):
            return None
        identificador = _identificador_cedula(cedula)
        key = f"LIMITER/lockout:{identificador}///{_settings.lockout_duracion_minutos * 60}/1/second"
        remaining = storage.get(key)
        if remaining and int(remaining) > 0:
            return _settings.lockout_duracion_minutos * 60
        return None
    except Exception:
        logger.warning("No se pudo consultar lockout")
        return None


def _registrar_fallo_cedula(cedula: str) -> None:
    """Incrementa el contador de fallos. Si supera el umbral, activa
    lockout durante `lockout_duracion_minutos`."""
    if not cedula:
        return
    try:
        from limits.storage import RedisStorage
        storage = limiter._storage
        if not isinstance(storage, RedisStorage):
            return
        identificador = _identificador_cedula(cedula)
        ventana = _settings.lockout_ventana_minutos * 60
        fail_key = f"LIMITER/login_fallos:{identificador}///{ventana}/1/second"
        current = storage.incr(fail_key, ventana)
        if current and int(current) >= _settings.lockout_umbral_fallos:
            lockout_ttl = _settings.lockout_duracion_minutos * 60
            lockout_key = f"LIMITER/lockout:{identificador}///{lockout_ttl}/1/second"
            storage.set(lockout_key, lockout_ttl, lockout_ttl)
            storage.delete(fail_key)
            logger.warning("Lockout activado tras %d fallos", current)
    except Exception:
        logger.warning("No se pudo registrar fallo de lockout")


def _opciones_storage_redis(settings) -> dict[str, str]:
    """Entrega credenciales a Redis sin incluirlas en la URI ni en logs."""
    return {"password": settings.redis_password} if settings.redis_password else {}


limiter = Limiter(
    key_func=_verify_admin_key_func,
    default_limits=[],
    headers_enabled=False,
    storage_uri=_settings.redis_url,
    storage_options=_opciones_storage_redis(_settings),
    # SlowAPI por defecto intenta leer .env con Starlette Config. En
    # Windows + UTF-8 con tildes eso falla con UnicodeDecodeError. No
    # necesitamos esa config (pasamos todos los flags directo), asi que
    # pasamos un path inexistente para que lo skipee.
    config_filename="",
)


# Paths que requieren pre-cachear el body para que el key func pueda
# leer la cedula del form/JSON. El middleware en main.py consulta este set.
PATHS_CON_BODY_PARA_RATE_LIMIT: set[str] = {
    "/api/v2/auth/login",
    "/api/v2/auth/setup-password",
    "/api/v2/auth/forgot-password",
    "/api/v2/auth/reset-password",
    "/api/v2/auth/registro",
}
