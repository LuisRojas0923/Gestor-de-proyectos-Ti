"""Mutaciones RBAC permitidas al runtime mediante funciones verificadas."""
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac_capability import obtener_capacidad_rbac


async def actualizar_modulo_protegido(
    db: AsyncSession,
    actor_id: str,
    modulo_id: str,
    *,
    nombre: Optional[str] = None,
    categoria: Optional[str] = None,
    descripcion: Optional[str] = None,
    esta_activo: Optional[bool] = None,
    es_critico: Optional[bool] = None,
) -> None:
    await db.execute(text("""
        SELECT public.admin_actualizar_modulo(
            :capacidad, :actor, :modulo, :nombre, :categoria,
            :descripcion, :activo, :critico
        )
    """), {
        "capacidad": obtener_capacidad_rbac(),
        "actor": actor_id,
        "modulo": modulo_id,
        "nombre": nombre,
        "categoria": categoria,
        "descripcion": descripcion,
        "activo": esta_activo,
        "critico": es_critico,
    })
