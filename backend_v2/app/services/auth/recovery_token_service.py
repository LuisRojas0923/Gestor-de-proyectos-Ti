"""Tokens de recuperación ligados a la versión vigente de contraseña."""
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from jose import jwt

from app.config import config


def crear_token_recuperacion(usuario_id: str, hash_contrasena: str) -> str:
    expira = datetime.now(timezone.utc) + timedelta(hours=1)
    version = hashlib.sha256(hash_contrasena.encode("utf-8")).hexdigest()
    return jwt.encode({
        "sub": usuario_id,
        "exp": expira,
        "scope": "password_recovery",
        "jti": str(uuid4()),
        "pwdv": version,
    }, config.jwt_secret_key, algorithm=config.algorithm)


def validar_token_recuperacion(
    token: str, hash_contrasena: Optional[str] = None
) -> Optional[str]:
    try:
        payload = jwt.decode(
            token, config.jwt_secret_key, algorithms=[config.algorithm]
        )
        if payload.get("scope") != "password_recovery":
            return None
        if hash_contrasena is not None:
            actual = hashlib.sha256(hash_contrasena.encode("utf-8")).hexdigest()
            if not hmac.compare_digest(payload.get("pwdv", ""), actual):
                return None
        return payload.get("sub")
    except Exception:
        return None
