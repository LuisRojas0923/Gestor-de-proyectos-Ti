"""
Servicio de Eliminación de Actividades con Cascade Delete
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.desarrollo.actividad import Actividad


async def obtener_hijos_preview(
    db: AsyncSession, actividad_id: int
) -> tuple[Actividad | None, list[dict]]:
    """
    Obtiene la actividad y cuenta recursivamente sus hijos.

    Retorna:
        (actividad, lista de hijos con {id, titulo, nivel})
    """
    stmt = select(Actividad).where(Actividad.id == actividad_id)
    result = await db.execute(stmt)
    actividad = result.scalar_one_or_none()

    if not actividad:
        return None, []

    hijos = await _obtener_hijos_recursivos(db, actividad_id, nivel=1)
    return actividad, hijos


async def _obtener_hijos_recursivos(
    db: AsyncSession, parent_id: int, nivel: int
) -> list[dict]:
    """
    Obtiene recursivamente todos los hijos de una actividad.
    """
    stmt = select(Actividad).where(Actividad.parent_id == parent_id)
    result = await db.execute(stmt)
    hijos = result.scalars().all()

    resultado = []
    for hijo in hijos:
        resultado.append({
            "id": hijo.id,
            "titulo": hijo.titulo,
            "nivel": nivel,
            "estado": hijo.estado,
        })
        # Recursión para nietos
        nietos = await _obtener_hijos_recursivos(db, hijo.id, nivel + 1)
        resultado.extend(nietos)

    return resultado


async def eliminar_actividad_cascade(
    db: AsyncSession, actividad_id: int
) -> int:
    """
    Elimina una actividad y todos sus descendientes recursivamente.

    Retorna:
        Cantidad total de registros eliminados (incluyendo la raíz).
    """
    ids_a_eliminar = await _obtener_todos_los_ids(db, actividad_id)
    count = len(ids_a_eliminar)

    for rid in ids_a_eliminar:
        stmt = select(Actividad).where(Actividad.id == rid)
        result = await db.execute(stmt)
        act = result.scalar_one_or_none()
        if act:
            await db.delete(act)

    await db.flush()
    return count


async def _obtener_todos_los_ids(db: AsyncSession, parent_id: int) -> list[int]:
    """
    Obtiene recursivamente todos los IDs de descendientes.
    Orden: hijos → padres (bottom-up para respetar FK).
    """
    stmt = select(Actividad.id).where(Actividad.parent_id == parent_id)
    result = await db.execute(stmt)
    hijos_ids = [r[0] for r in result.fetchall()]

    todos = []
    for hid in hijos_ids:
        todos.extend(await _obtener_todos_los_ids(db, hid))

    todos.append(parent_id)
    return todos
