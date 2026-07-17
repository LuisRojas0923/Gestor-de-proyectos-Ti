"""Bootstrap opcional y de un solo uso para el primer administrador."""
import os
from pathlib import Path
from uuid import uuid4

import bcrypt
from sqlmodel import select

from app.models.auth.usuario import Usuario


async def asegurar_admin_inicial(session) -> None:
    existente = await session.execute(  # @audit-ok: el job propaga cualquier fallo
        select(Usuario.id).where(
            Usuario.esta_activo.is_(True),
            Usuario.rol == "admin",
        ).limit(1)
    )
    if existente.first() is not None:
        return

    secret_path = os.getenv("ADMIN_BOOTSTRAP_PASSWORD_FILE", "").strip()
    cedula = os.getenv("ADMIN_BOOTSTRAP_CEDULA", "").strip()
    nombre = os.getenv("ADMIN_BOOTSTRAP_NOMBRE", "Administrador inicial").strip()
    if not secret_path or not cedula or not nombre:
        raise RuntimeError("Falta el secreto de un solo uso para crear el administrador inicial")

    path = Path(secret_path)
    if not path.is_file() or path.stat().st_size > 4096:
        raise RuntimeError("El secreto de bootstrap administrativo no es válido")
    secret_bytes = bytearray(path.read_bytes())
    try:
        password = secret_bytes.decode("utf-8").strip()
        if len(password) < 32:
            raise RuntimeError("El secreto de bootstrap administrativo no es válido")
        session.add(Usuario(
            id=f"ADM-{uuid4().hex[:20]}",
            cedula=cedula,
            nombre=nombre,
            rol="admin",
            hash_contrasena=bcrypt.hashpw(
                password.encode("utf-8"), bcrypt.gensalt(rounds=12)
            ).decode("utf-8"),
            esta_activo=True,
        ))
        await session.commit()
    finally:
        for index in range(len(secret_bytes)):
            secret_bytes[index] = 0
