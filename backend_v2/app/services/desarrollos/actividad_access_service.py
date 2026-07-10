from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth.usuario import Usuario
from app.models.desarrollo.actividad import Actividad, ActividadArbol
from app.models.desarrollo.desarrollo import Desarrollo
from app.services.jerarquia.service import JerarquiaService


def actividad_a_arbol(actividad: Actividad) -> ActividadArbol:
    return ActividadArbol(
        id=actividad.id,
        desarrollo_id=actividad.desarrollo_id,
        parent_id=actividad.parent_id,
        titulo=actividad.titulo,
        descripcion=actividad.descripcion,
        estado=actividad.estado,
        responsable_id=actividad.responsable_id,
        asignado_a_id=actividad.asignado_a_id,
        delegado_por_id=actividad.delegado_por_id,
        estado_validacion=actividad.estado_validacion,
        validacion_id=actividad.validacion_id,
        fecha_inicio_estimada=actividad.fecha_inicio_estimada,
        fecha_fin_estimada=actividad.fecha_fin_estimada,
        fecha_inicio_real=actividad.fecha_inicio_real,
        fecha_fin_real=actividad.fecha_fin_real,
        horas_estimadas=actividad.horas_estimadas,
        horas_reales=actividad.horas_reales,
        porcentaje_avance=actividad.porcentaje_avance,
        seguimiento=actividad.seguimiento,
        compromiso=actividad.compromiso,
        compromiso_fecha=actividad.compromiso_fecha,
        compromiso_cumplido=actividad.compromiso_cumplido,
        archivo_url=actividad.archivo_url,
        anulada=actividad.anulada,
        anulada_en=actividad.anulada_en,
        anulada_por_id=actividad.anulada_por_id,
        creado_en=actividad.creado_en,
        actualizado_en=actividad.actualizado_en,
        subactividades=[],
    )


async def usuario_puede_acceder_desarrollo(db: AsyncSession, usuario: Usuario, desarrollo_id: str) -> bool:
    if usuario.rol in ("admin", "director"):
        return True
    subordinados = await JerarquiaService.obtener_ids_y_nombres_subordinados(db, usuario.id)
    todos_los_ids = [usuario.id] + subordinados["ids"]
    todos_los_nombres = [usuario.nombre] + subordinados["nombres"]
    stmt_dev = select(Desarrollo).where(
        Desarrollo.id == desarrollo_id,
        or_(
            Desarrollo.creado_por_id.in_(todos_los_ids),
            Desarrollo.responsable_id.in_(todos_los_ids),
            Desarrollo.analista.in_(todos_los_nombres),
            Desarrollo.supervisor.in_(todos_los_nombres),
            Desarrollo.autoridad.in_(todos_los_nombres),
            Desarrollo.responsable.in_(todos_los_nombres),
        )
    )
    result = await db.execute(stmt_dev)
    return result.scalar_one_or_none() is not None


async def usuario_puede_acceder_actividad(db: AsyncSession, usuario: Usuario, actividad: Actividad) -> bool:
    if usuario.rol in ("admin", "director"):
        return True
    subordinados = await JerarquiaService.obtener_ids_y_nombres_subordinados(db, usuario.id)
    todos_los_ids = [usuario.id] + subordinados["ids"]
    if (
        actividad.responsable_id in todos_los_ids
        or actividad.asignado_a_id in todos_los_ids
        or actividad.delegado_por_id in todos_los_ids
    ):
        return True
    return await usuario_puede_acceder_desarrollo(db, usuario, actividad.desarrollo_id)


async def bloquear_ancestros_y_obtener_actividad(db: AsyncSession, actividad_id: int) -> Actividad | None:
    ids = []
    current_id = actividad_id
    while current_id is not None:
        result = await db.execute(select(Actividad.id, Actividad.parent_id).where(Actividad.id == current_id))
        row = result.one_or_none()
        if row is None:
            return None
        ids.append(row[0])
        current_id = row[1]
    await db.execute(select(Actividad.id).where(Actividad.id.in_(ids)).order_by(Actividad.id).with_for_update())
    result = await db.execute(select(Actividad).where(Actividad.id == actividad_id))
    return result.scalar_one_or_none()
