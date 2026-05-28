from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.desarrollo.actividad import Actividad

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
