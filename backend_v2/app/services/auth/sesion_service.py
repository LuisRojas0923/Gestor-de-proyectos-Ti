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

        nueva_sesion = Sesion(
            usuario_id=usuario_id,
            token_sesion=token_jwt,
            nombre_usuario=nombre_usuario,
            rol_usuario=rol_usuario,
            direccion_ip=direccion_ip,
            agente_usuario=agente_usuario,
            expira_en=expira,
            tipo_sesion=tipo_sesion,
            jti=jti,
            scope=scope,
        )
        db.add(nueva_sesion)
        await db.commit()
    except Exception as e:
        import logging

        await db.rollback()
        logging.error(f"No se pudo registrar sesion para {usuario_id}: {e}")
        raise


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


async def obtener_sesion_web_activa_por_jti(
    db: AsyncSession,
    *,
    jti: str,
    usuario_id: str,
):
    """Retorna la sesion web activa asociada a un JWT o None si fue revocada."""
    from app.models.auth.usuario import Sesion

    if not jti:
        return None

    resultado = await db.execute(
        select(Sesion).where(
            Sesion.jti == jti,
            Sesion.usuario_id == usuario_id,
            Sesion.tipo_sesion == "web",
        )
    )
    sesion = resultado.scalars().first()
    if not sesion:
        return None

    expira = sesion.expira_en.replace(tzinfo=None) if sesion.expira_en else None
    if sesion.fin_sesion is not None or (expira and expira < get_bogota_now()):
        return None

    return sesion


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
