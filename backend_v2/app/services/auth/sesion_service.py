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

    ahora = get_bogota_now()
    expira = ahora + (
        tiempo_expiracion
        if tiempo_expiracion
        else timedelta(minutes=config.jwt_token_expire_minutes)
    )
    db.add(
        Sesion(
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
    )
    await db.commit()


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


async def invalidar_sesiones_usuario(
    db: AsyncSession,
    usuario_id: str,
    *,
    confirmar: bool = True,
) -> int:
    """Invalida sesiones y permite integrarlo en una transaccion mayor."""
    from app.models.auth.usuario import Sesion

    ahora = get_bogota_now()
    stmt = (
        update(Sesion)
        .where(Sesion.usuario_id == usuario_id, Sesion.fin_sesion.is_(None))
        .values(fin_sesion=ahora)
    )
    result = await db.execute(stmt)
    if confirmar:
        await db.commit()
    return result.rowcount


async def obtener_sesion_web_activa(
    db: AsyncSession, token_jwt: str, *, bloquear: bool = False
):
    """Retorna la sesion web vigente asociada exactamente al JWT recibido."""
    from app.models.auth.usuario import Sesion

    ahora = get_bogota_now()
    stmt = select(Sesion).where(
        Sesion.token_sesion == token_jwt,
        Sesion.tipo_sesion == "web",
        Sesion.fin_sesion.is_(None),
        Sesion.expira_en > ahora,
    )
    if bloquear:
        stmt = stmt.with_for_update()
    return (await db.execute(stmt)).scalars().first()


async def rotar_sesion_web(db: AsyncSession, sesion, nuevo_token: str) -> None:
    """Reemplaza una sesion web por otra dentro de una sola transaccion."""
    from app.models.auth.usuario import Sesion

    ahora = get_bogota_now()
    sesion.fin_sesion = ahora
    db.add(
        Sesion(
            usuario_id=sesion.usuario_id,
            token_sesion=nuevo_token,
            direccion_ip=sesion.direccion_ip,
            agente_usuario=sesion.agente_usuario,
            expira_en=ahora + timedelta(minutes=config.jwt_token_expire_minutes),
            nombre_usuario=sesion.nombre_usuario,
            rol_usuario=sesion.rol_usuario,
            tipo_sesion="web",
        )
    )
    await db.commit()
