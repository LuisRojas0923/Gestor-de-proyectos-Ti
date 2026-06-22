import logging
import re

from fastapi import Request, status
from fastapi.responses import JSONResponse
from sqlmodel import select

from app.database import AsyncSessionLocal
from app.models.auth.usuario import Sesion
from app.services.auth.servicio import ServicioAuth
from app.utils_date import get_bogota_now


logger = logging.getLogger(__name__)


PUBLIC_API_OPERATIONS = {
    ("GET", "/api/v2/health"),
    ("POST", "/api/v2/auth/login"),
    ("POST", "/api/v2/auth/setup-password"),
    ("GET", "/api/v2/auth/password-status/{cedula}"),
    ("POST", "/api/v2/auth/forgot-password"),
    ("POST", "/api/v2/auth/reset-password"),
    ("POST", "/api/v2/auth/registro"),
    ("GET", "/api/v2/auth/verify-email"),
}


_PUBLIC_RUNTIME_PREFIXES = (
    ("GET", "/api/v2/auth/password-status/"),
)

_CORS_ORIGINS_PERMITIDOS = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
}
_CORS_ORIGIN_REGEX = re.compile(
    r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?"
)


def es_operacion_publica_api(method: str, path: str) -> bool:
    method_upper = method.upper()
    if (method_upper, path) in PUBLIC_API_OPERATIONS:
        return True
    return any(
        method_upper == public_method and path.startswith(public_prefix)
        for public_method, public_prefix in _PUBLIC_RUNTIME_PREFIXES
    )


def requiere_autenticacion_api(method: str, path: str) -> bool:
    if method.upper() == "OPTIONS":
        return False
    if not path.startswith("/api/v2"):
        return False
    return not es_operacion_publica_api(method, path)


def payload_es_token_autenticable(payload: dict) -> bool:
    if not payload.get("sub"):
        return False
    token_type = payload.get("token_type", "session")
    if token_type == "session":
        return not payload.get("scope")
    if token_type == "mcp":
        return payload.get("scope") in {"read", "write"}
    return False


async def payload_tiene_sesion_activa(payload: dict) -> bool:
    token_type = payload.get("token_type", "session")
    tipo_sesion = "mcp" if token_type == "mcp" else "web"
    try:
        async with AsyncSessionLocal() as db:
            usuario = await ServicioAuth.obtener_usuario_por_cedula(db, payload.get("sub"))
            if not usuario or not usuario.esta_activo:
                return False
            resultado = await db.execute(
                select(Sesion).where(
                    Sesion.jti == payload.get("jti"),
                    Sesion.usuario_id == usuario.id,
                    Sesion.tipo_sesion == tipo_sesion,
                )
            )
            sesion = resultado.scalars().first()
            if not sesion:
                return False
            expira = sesion.expira_en.replace(tzinfo=None) if sesion.expira_en else None
            return sesion.fin_sesion is None and bool(expira and expira >= get_bogota_now())
    except Exception:
        logger.warning("No se pudo validar sesion activa en middleware de seguridad", exc_info=True)
        return False


def _respuesta_401(request: Request, detail: str) -> JSONResponse:
    response = JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": detail},
        headers={"WWW-Authenticate": "Bearer"},
    )
    origin = request.headers.get("origin")
    if origin and (origin in _CORS_ORIGINS_PERMITIDOS or _CORS_ORIGIN_REGEX.fullmatch(origin)):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Vary"] = "Origin"
    return response


async def middleware_api_v2_deny_by_default(request: Request, call_next):
    if not requiere_autenticacion_api(request.method, request.url.path):
        return await call_next(request)

    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return _respuesta_401(request, "No autenticado")

    payload = ServicioAuth.obtener_payload_token(token.strip())
    if (
        not payload
        or not payload_es_token_autenticable(payload)
        or not await payload_tiene_sesion_activa(payload)
    ):
        return _respuesta_401(request, "Token invalido o expirado")

    return await call_next(request)
