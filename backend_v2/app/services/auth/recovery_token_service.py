"""Tokens persistidos y de un solo uso para recuperar contrasenas."""

import hashlib
import secrets
from datetime import timedelta
from typing import Optional

from sqlalchemy import func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.auth.usuario import Token, Usuario
from app.utils_date import get_bogota_now


TIPO_TOKEN_RECUPERACION = "password_recovery"


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def generar_token_recuperacion(
    db: AsyncSession,
    usuario_id: str,
    *,
    origen: str,
) -> str:
    """Crea un token opaco y revoca tokens de recuperacion anteriores."""
    ahora = get_bogota_now()
    usuario = (
        await db.execute(
            select(Usuario).where(Usuario.id == usuario_id).with_for_update()
        )
    ).scalars().first()
    if not usuario:
        raise ValueError("Usuario no encontrado")
    await db.execute(
        select(
            func.pg_advisory_xact_lock(
                func.hashtext("auth_recovery"), func.hashtext(usuario_id)
            )
        )
    )
    await db.execute(
        update(Token)
        .where(
            Token.usuario_id == usuario_id,
            Token.tipo_token == TIPO_TOKEN_RECUPERACION,
            Token.ultimo_uso_en.is_(None),
        )
        .values(ultimo_uso_en=ahora)
    )

    token = secrets.token_urlsafe(48)
    db.add(
        Token(
            usuario_id=usuario_id,
            hash_token=_hash_token(token),
            tipo_token=TIPO_TOKEN_RECUPERACION,
            nombre=origen,
            expira_en=ahora + timedelta(hours=1),
        )
    )
    await db.flush()
    return token


async def consumir_token_recuperacion(
    db: AsyncSession,
    token: str,
) -> Optional[str]:
    """Marca como usado un token vigente y retorna su usuario."""
    ahora = get_bogota_now()
    hash_recibido = _hash_token(token)
    candidato = (
        await db.execute(
            select(Token).where(
                Token.hash_token == hash_recibido,
                Token.tipo_token == TIPO_TOKEN_RECUPERACION,
            )
        )
    ).scalars().first()
    if not candidato:
        return None

    usuario = (
        await db.execute(
            select(Usuario)
            .where(Usuario.id == candidato.usuario_id)
            .with_for_update()
        )
    ).scalars().first()
    if not usuario:
        return None

    await db.execute(
        select(
            func.pg_advisory_xact_lock(
                func.hashtext("auth_recovery"),
                func.hashtext(candidato.usuario_id),
            )
        )
    )
    registro = (
        await db.execute(
            select(Token)
            .where(
                Token.hash_token == hash_recibido,
                Token.tipo_token == TIPO_TOKEN_RECUPERACION,
                Token.ultimo_uso_en.is_(None),
                Token.expira_en > ahora,
            )
            .with_for_update()
        )
    ).scalars().first()
    if not registro:
        return None

    await db.execute(
        update(Token)
        .where(
            Token.usuario_id == registro.usuario_id,
            Token.tipo_token == TIPO_TOKEN_RECUPERACION,
            Token.ultimo_uso_en.is_(None),
        )
        .values(ultimo_uso_en=ahora)
    )
    await db.flush()
    return registro.usuario_id


async def bloquear_cuenta_y_generar_recuperacion(
    db: AsyncSession,
    usuario: Usuario,
    *,
    origen: str,
) -> str:
    """Bloquea la clave conocida, revoca sesiones y crea la activacion."""
    from app.services.auth.servicio import ServicioAuth

    usuario.hash_contrasena = ServicioAuth.obtener_hash_contrasena(
        secrets.token_urlsafe(48)
    )
    await ServicioAuth.invalidar_sesiones_usuario(
        db, usuario.id, confirmar=False
    )
    return await generar_token_recuperacion(db, usuario.id, origen=origen)


async def restablecer_contrasena_con_token(
    db: AsyncSession,
    token: str,
    nueva_contrasena: str,
) -> bool:
    """Consume el token, cambia la clave y revoca sesiones atomicamente."""
    from app.services.auth.servicio import ServicioAuth

    usuario_id = await consumir_token_recuperacion(db, token)
    if not usuario_id:
        return False

    usuario = (
        await db.execute(
            select(Usuario).where(Usuario.id == usuario_id).with_for_update()
        )
    ).scalars().first()
    if not usuario:
        return False

    nueva_contrasena = nueva_contrasena.strip()
    if nueva_contrasena.lower() == usuario.cedula.strip().lower():
        raise ValueError("La contraseña no puede ser igual a la cédula")

    usuario.hash_contrasena = ServicioAuth.obtener_hash_contrasena(nueva_contrasena)
    await ServicioAuth.invalidar_sesiones_usuario(
        db, usuario.id, confirmar=False
    )
    await db.commit()
    return True
