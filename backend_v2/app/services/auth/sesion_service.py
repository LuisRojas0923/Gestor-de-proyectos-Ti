"""
Gestión de sesiones de usuario - Backend V2 (Async + SQLModel)
"""

from datetime import timedelta
from hashlib import sha256
from typing import Optional

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.config import config
from app.utils_date import get_bogota_now


def hash_token_sesion(token_jwt: str) -> str:
    """Devuelve el identificador no reutilizable persistido para un JWT."""
    return sha256(token_jwt.encode("utf-8")).hexdigest()


async def registrar_sesion(
    db: AsyncSession,
    usuario_id: str,
    token_jwt: str,
    nombre_usuario: Optional[str] = None,
    rol_usuario: Optional[str] = None,
    direccion_ip: Optional[str] = None,
    agente_usuario: Optional[str] = None,
    tipo_sesion: str = "web",
    jti: Optional[str] = None,
    scope: Optional[str] = None,
    tiempo_expiracion: Optional[timedelta] = None,
) -> None:
    """Registra una nueva sesión en la base de datos.

    Acepta `tipo_sesion` ('web' | 'mcp'), `jti` (UUID del JWT) y `scope`
    para soportar tokens MCP de larga duracion (ver docs/PLAN_SERVIDOR_MCP.md).
    `tiempo_expiracion` permite sobreescribir el default de
    `jwt_token_expire_minutes` cuando se registran tokens con vigencia
    personalizada (MCP: 30/90 dias).
    """
    from app.models.auth.usuario import Sesion

    try:
        ahora = get_bogota_now()
        expira = ahora + (
            tiempo_expiracion
            if tiempo_expiracion
            else timedelta(minutes=config.jwt_token_expire_minutes)
        )
        db.add(Sesion(
            usuario_id=usuario_id,
            token_sesion=hash_token_sesion(token_jwt),
            nombre_usuario=nombre_usuario,
            rol_usuario=rol_usuario,
            direccion_ip=direccion_ip,
            agente_usuario=agente_usuario,
            expira_en=expira,
            tipo_sesion=tipo_sesion,
            jti=jti,
            scope=scope,
        ))
        await db.commit()
    except Exception:
        await db.rollback()
        raise


async def marcar_fin_sesion(db: AsyncSession, token_jwt: str) -> bool:
    """Marca el fin de una sesión (logout)."""
    from app.models.auth.usuario import Sesion

    try:
        stmt = select(Sesion).where(
            Sesion.token_sesion == hash_token_sesion(token_jwt)
        )
        result = await db.execute(stmt)
        sesion = result.scalars().first()
        if sesion:
            sesion.fin_sesion = get_bogota_now()
            await db.commit()
            return True
        return False
    except Exception:
        await db.rollback()
        raise


async def validar_sesion_activa(
    db: AsyncSession, token_jwt: str, jti: Optional[str] = None
):
    """Obtiene una sesión web/MCP solo si no fue cerrada ni expiró."""
    from app.models.auth.usuario import Sesion

    if jti:
        condicion = Sesion.jti == jti
    else:
        condicion = Sesion.token_sesion == hash_token_sesion(token_jwt)
    sesion = (await db.execute(select(Sesion).where(condicion))).scalars().first()
    if not sesion or sesion.fin_sesion is not None:
        return None
    expira = sesion.expira_en.replace(tzinfo=None) if sesion.expira_en else None
    if expira and expira < get_bogota_now():
        return None
    return sesion


async def validar_sesion_hash_activa(db: AsyncSession, token_hash: str):
    """Valida una sesion web a partir del hash ya calculado del JWT."""
    from app.models.auth.usuario import Sesion

    sesion = (
        await db.execute(
            select(Sesion).where(
                Sesion.token_sesion == token_hash,
                Sesion.tipo_sesion == "web",
            )
        )
    ).scalars().first()
    if not sesion or sesion.fin_sesion is not None:
        return None
    expira = sesion.expira_en.replace(tzinfo=None) if sesion.expira_en else None
    if expira and expira < get_bogota_now():
        return None
    return sesion


async def rotar_sesion_web(
    db: AsyncSession,
    token_anterior: str,
    token_nuevo: str,
    nueva_expiracion,
) -> bool:
    """Sustituye atómicamente el hash de un JWT web todavía activo."""
    from app.models.auth.usuario import Sesion

    stmt = (
        update(Sesion)
        .where(
            Sesion.token_sesion == hash_token_sesion(token_anterior),
            Sesion.tipo_sesion == "web",
            Sesion.fin_sesion.is_(None),
            Sesion.expira_en > get_bogota_now(),
        )
        .values(
            token_sesion=hash_token_sesion(token_nuevo),
            expira_en=nueva_expiracion,
        )
    )
    result = await db.execute(stmt)
    if result.rowcount != 1:
        await db.rollback()
        return False
    await db.commit()
    return True


async def invalidar_sesiones_usuario(db: AsyncSession, usuario_id: str) -> int:
    """Invalida todas las sesiones activas de un usuario (para reseteos de seguridad)."""
    from app.models.auth.usuario import Sesion

    stmt = (
        update(Sesion)
        .where(Sesion.usuario_id == usuario_id, Sesion.fin_sesion.is_(None))
        .values(fin_sesion=get_bogota_now())
    )
    result = await db.execute(stmt)
    return result.rowcount
