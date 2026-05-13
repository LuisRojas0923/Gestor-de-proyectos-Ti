"""
Gestión de sesiones de usuario - Backend V2 (Async + SQLModel)
"""

from datetime import timedelta
from typing import Optional

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.config import config
from app.utils_date import get_bogota_now


async def registrar_sesion(
    db: AsyncSession,
    usuario_id: str,
    token_jwt: str,
    nombre_usuario: Optional[str] = None,
    rol_usuario: Optional[str] = None,
    direccion_ip: Optional[str] = None,
    agente_usuario: Optional[str] = None,
) -> None:
    """Registra una nueva sesión en la base de datos."""
    from app.database import AsyncSessionLocal
    from app.models.auth.usuario import Sesion

    try:
        async with AsyncSessionLocal() as session:
            ahora = get_bogota_now()
            expira = ahora + timedelta(minutes=config.jwt_token_expire_minutes)

            nueva_sesion = Sesion(
                usuario_id=usuario_id,
                token_sesion=token_jwt,
                nombre_usuario=nombre_usuario,
                rol_usuario=rol_usuario,
                direccion_ip=direccion_ip,
                agente_usuario=agente_usuario,
                expira_en=expira,
            )
            session.add(nueva_sesion)
            await session.commit()
    except Exception as e:
        import logging

        logging.warning(f"No se pudo registrar sesion para {usuario_id}: {e}")


async def marcar_fin_sesion(db: AsyncSession, token_jwt: str) -> bool:
    """Marca el fin de una sesión (logout)."""
    from app.models.auth.usuario import Sesion

    try:
        stmt = select(Sesion).where(Sesion.token_sesion == token_jwt)
        result = await db.execute(stmt)
        sesion = result.scalars().first()
        if sesion:
            sesion.fin_sesion = get_bogota_now()
            await db.commit()
            return True
        return False
    except Exception as e:
        import logging

        logging.error(f"Error al cerrar sesion: {e}")
        await db.rollback()
        return False


async def invalidar_sesiones_usuario(db: AsyncSession, usuario_id: str) -> int:
    """Invalida todas las sesiones activas de un usuario (para reseteos de seguridad)."""
    from app.models.auth.usuario import Sesion

    try:
        ahora = get_bogota_now()
        stmt = (
            update(Sesion)
            .where(Sesion.usuario_id == usuario_id, Sesion.fin_sesion.is_(None))
            .values(fin_sesion=ahora)
        )
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount
    except Exception as e:
        import logging

        logging.error(f"Error al invalidar sesiones de {usuario_id}: {e}")
        await db.rollback()
        return 0
