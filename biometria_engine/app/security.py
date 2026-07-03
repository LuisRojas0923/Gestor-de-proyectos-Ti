from fastapi import Header, HTTPException

from .config import EngineSettings


def validar_token_interno_header(
    authorization: str | None,
    settings: EngineSettings,
) -> None:
    token = settings.biometria_engine_token.strip()
    if not token and settings.es_entorno_local:
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autorizado")
    if authorization.removeprefix("Bearer ").strip() != token:
        raise HTTPException(status_code=401, detail="No autorizado")


def obtener_authorization_header(authorization: str | None = Header(default=None)) -> str | None:
    return authorization
