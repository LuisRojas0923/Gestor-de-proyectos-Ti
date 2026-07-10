"""
Servicio de anulación lógica de actividades.
"""
from datetime import datetime
from decimal import Decimal

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
    db: AsyncSession, actividad_id: int, anulado_por_id: str | None = None
) -> int:
    """
    Anula una actividad y todos sus descendientes recursivamente.

    Retorna:
        Cantidad total de registros anulados (incluyendo la raíz).
    """
    from sqlalchemy import delete
    from app.models.desarrollo.desarrollo import ValidacionAsignacion

    if not await _bloquear_ancestros(db, actividad_id):
        return 0

    ids_a_eliminar = await _obtener_todos_los_ids_con_bloqueo(db, actividad_id)
    count = 0

    # Quitar validaciones pendientes/asociadas para que una actividad anulada no quede accionable.
    await db.execute(
        delete(ValidacionAsignacion).where(
            ValidacionAsignacion.actividad_id.in_(ids_a_eliminar)
        )
    )

    now = datetime.utcnow()
    for rid in ids_a_eliminar:
        stmt = select(Actividad).where(Actividad.id == rid).with_for_update()
        result = await db.execute(stmt)
        act = result.scalar_one_or_none()
        if act and not act.anulada:
            act.anulada = True
            act.anulada_en = now
            act.anulada_por_id = anulado_por_id
            act.estado = "Anulada"
            act.porcentaje_avance = Decimal("0")
            count += 1

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


async def _bloquear_ancestros(db: AsyncSession, actividad_id: int) -> bool:
    ids = []
    current_id = actividad_id
    while current_id is not None:
        result = await db.execute(select(Actividad.id, Actividad.parent_id).where(Actividad.id == current_id))
        row = result.one_or_none()
        if row is None:
            return False
        ids.append(row[0])
        current_id = row[1]
    await db.execute(select(Actividad.id).where(Actividad.id.in_(ids)).order_by(Actividad.id).with_for_update())
    return True


async def _obtener_todos_los_ids_con_bloqueo(db: AsyncSession, parent_id: int) -> list[int]:
    """Bloquea iterativamente la rama para serializar creación y anulación."""
    ids = await _obtener_todos_los_ids(db, parent_id)
    while True:
        await db.execute(
            select(Actividad.id)
            .where(Actividad.id.in_(ids))
            .order_by(Actividad.id)
            .with_for_update()
        )
        siguientes_ids = await _obtener_todos_los_ids(db, parent_id)
        if set(siguientes_ids) == set(ids):
            return siguientes_ids
        ids = siguientes_ids
