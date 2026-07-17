"""Mutaciones de identidad autorizadas mediante capacidad de aplicación."""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac_capability import obtener_capacidad_rbac


async def actualizar_hash_protegido(
    db: AsyncSession, usuario_id: str, hash_contrasena: str
) -> None:
    await db.execute(text("""
        SELECT public.auth_actualizar_hash_usuario(
            :capacidad, :usuario, :hash_contrasena
        )
    """), {
        "capacidad": obtener_capacidad_rbac(),
        "usuario": usuario_id,
        "hash_contrasena": hash_contrasena,
    })


async def actualizar_hash_si_vigente(
    db: AsyncSession,
    usuario_id: str,
    hash_esperado: str,
    hash_nuevo: str,
) -> bool:
    result = await db.execute(text("""
        SELECT public.auth_consumir_token_recuperacion(
            :capacidad, :usuario, :hash_esperado, :hash_nuevo
        )
    """), {
        "capacidad": obtener_capacidad_rbac(),
        "usuario": usuario_id,
        "hash_esperado": hash_esperado,
        "hash_nuevo": hash_nuevo,
    })
    return bool(result.scalar_one())


async def actualizar_correo_protegido(
    db: AsyncSession,
    usuario_id: str,
    correo: str,
    correo_actualizado: bool,
    correo_verificado: bool,
) -> None:
    await db.execute(text("""
        SELECT public.auth_actualizar_correo_usuario(
            :capacidad, :usuario, :correo, :actualizado, :verificado
        )
    """), {
        "capacidad": obtener_capacidad_rbac(),
        "usuario": usuario_id,
        "correo": correo,
        "actualizado": correo_actualizado,
        "verificado": correo_verificado,
    })


async def actualizar_rol_protegido(
    db: AsyncSession, actor_id: str, usuario_id: str, rol: str
) -> None:
    await db.execute(text("""
        SELECT public.admin_actualizar_usuario(
            :capacidad, :actor, :usuario, :rol
        )
    """), {
        "capacidad": obtener_capacidad_rbac(),
        "actor": actor_id,
        "usuario": usuario_id,
        "rol": rol,
    })


async def actualizar_estado_protegido(
    db: AsyncSession, actor_id: str, usuario_id: str, esta_activo: bool
) -> None:
    await db.execute(text("""
        SELECT public.admin_actualizar_estado_usuario(
            :capacidad, :actor, :usuario, :activo
        )
    """), {
        "capacidad": obtener_capacidad_rbac(),
        "actor": actor_id,
        "usuario": usuario_id,
        "activo": esta_activo,
    })
