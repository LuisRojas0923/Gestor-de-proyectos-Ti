"""
Servicio de Cálculo Jerárquico de Porcentaje de Avance
"""
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.models.desarrollo.actividad import Actividad


async def recalcular_porcentaje_jerarquico(db: AsyncSession, actividad: Actividad) -> None:
    """
    Recalcula el porcentaje de avance de una actividad y sus ancestros.
    
    Reglas:
    - Si NO tiene hijos: porcentaje = 100 si estado='Completado', 0 en caso contrario
    - Si tiene hijos: porcentaje = promedio de porcentajes de hijos (redondeado a entero)
    - Cambio se propaga recursivamente hacia arriba (parent_id = null)
    """
    if actividad is None:
        return
    
    await db.flush()
    
    stmt = select(Actividad).where(Actividad.id == actividad.id)
    result = await db.execute(stmt)
    actividad_actualizada = result.scalar_one_or_none()
    
    if not actividad_actualizada:
        return
    
    await _actualizar_porcentaje_actividad(db, actividad_actualizada)
    await db.flush()
    
    await _propagar_hacia_arriba(db, actividad_actualizada.id, actividad_actualizada.parent_id)


async def _propagar_hacia_arriba(db: AsyncSession, actividad_id: int, parent_id: int | None) -> None:
    """Propaga los cambios hacia arriba en la jerarquía"""
    
    while parent_id is not None:
        stmt = select(Actividad).where(Actividad.id == parent_id)
        result = await db.execute(stmt)
        padre = result.scalar_one_or_none()
        
        if not padre:
            break
        
        raw_sql = text("""
            SELECT id, porcentaje_avance 
            FROM actividades 
            WHERE parent_id = :padre_id
        """)
        result_hijos = await db.execute(raw_sql, {"padre_id": padre.id})
        hijos_raw = result_hijos.fetchall()
        
        suma = Decimal("0")
        for hijo in hijos_raw:
            suma += Decimal(str(hijo.porcentaje_avance)) if hijo.porcentaje_avance else Decimal("0")
        
        count = len(hijos_raw)
        promedio = round(suma / count) if count > 0 else 0
        padre.porcentaje_avance = Decimal(str(promedio))
        
        await db.flush()
        
        parent_id = padre.parent_id


async def _actualizar_porcentaje_actividad(db: AsyncSession, actividad: Actividad) -> int:
    """Actualiza el porcentaje de una actividad basandose en sus hijos o estado"""
    raw_sql = text("""
        SELECT id, porcentaje_avance 
        FROM actividades 
        WHERE parent_id = :actividad_id
    """)
    result = await db.execute(raw_sql, {"actividad_id": actividad.id})
    hijos_raw = result.fetchall()
    
    if not hijos_raw:
        if actividad.estado in ("Completada", "Completado"):
            actividad.porcentaje_avance = Decimal("100")
        else:
            actividad.porcentaje_avance = Decimal("0")
    else:
        suma = Decimal("0")
        for hijo in hijos_raw:
            suma += Decimal(str(hijo.porcentaje_avance)) if hijo.porcentaje_avance else Decimal("0")
        
        count = len(hijos_raw)
        promedio = round(suma / count) if count > 0 else 0
        actividad.porcentaje_avance = Decimal(str(promedio))
    
    return actividad.porcentaje_avance
