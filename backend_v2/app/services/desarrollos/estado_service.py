from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.models.desarrollo.actividad import Actividad
from app.models.desarrollo.desarrollo import Desarrollo

# Allow-list: solo estos estados son "no iniciados" y pueden promoverse.
# No usar blocklist — el vocabulario "Completada"/"Completado" tiene doble grafía.
_ESTADOS_NO_INICIADOS = {"Pendiente"}


async def propagar_estado_en_progreso(db: AsyncSession, parent_id: int | None) -> None:
    """
    Sube por la jerarquía marcando 'En Progreso' cada padre cuyo estado
    esté en el allow-list de no-iniciados. Se detiene en el primer padre
    que esté fuera del allow-list (activo, completado, bloqueado, etc.).
    El caller es responsable de hacer db.flush() después de esta función.
    """
    while parent_id is not None:
        stmt = select(Actividad).where(Actividad.id == parent_id)
        result = await db.execute(stmt)
        padre = result.scalar_one_or_none()

        if not padre:
            break

        if padre.estado not in _ESTADOS_NO_INICIADOS:
            break

        padre.estado = "En Progreso"
        parent_id = padre.parent_id


async def actualizar_estado_general_desarrollo(db: AsyncSession, desarrollo_id: str) -> None:
    """
    Promueve el estado_general del desarrollo a 'En Progreso' si al menos una
    de sus actividades está en ese estado y el desarrollo aún está en 'Pendiente'.
    Nunca degrada un estado más avanzado (Completado, Cancelado, etc.).
    """
    sql = text("SELECT estado FROM actividades WHERE desarrollo_id = :did")
    result = await db.execute(sql, {"did": desarrollo_id})
    estados = [r.estado for r in result.fetchall()]

    if not estados:
        return

    stmt = select(Desarrollo).where(Desarrollo.id == desarrollo_id)
    result_dev = await db.execute(stmt)
    desarrollo = result_dev.scalar_one_or_none()
    if not desarrollo or desarrollo.estado_general != "Pendiente":
        return

    if any(e == "En Progreso" for e in estados):
        desarrollo.estado_general = "En Progreso"
