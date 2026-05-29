from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.exc import SQLAlchemyError

from app.database import obtener_db
from app.models.auth.usuario import Usuario
from app.api.auth.profile_router import obtener_usuario_actual_db
from app.services.jerarquia.service import JerarquiaService
from app.models.desarrollo.desarrollo import Desarrollo
from app.models.desarrollo.actividad import Actividad

from pydantic import BaseModel


router = APIRouter()


class ActividadOut(BaseModel):
    id: int
    desarrollo_id: str
    titulo: str
    descripcion: Optional[str] = None
    estado: str
    porcentaje_avance: float
    fecha_inicio_estimada: Optional[str] = None
    fecha_fin_estimada: Optional[str] = None
    seguimiento: Optional[str] = None
    compromiso: Optional[str] = None
    archivo_url: Optional[str] = None


class DesarrolloConOut(BaseModel):
    id: str
    nombre: str
    area_desarrollo: Optional[str] = None
    analista: Optional[str] = None
    actividades: List[ActividadOut] = []


def _build_actividad(a) -> ActividadOut:
    return ActividadOut(
        id=a.id,
        desarrollo_id=a.desarrollo_id,
        titulo=a.titulo,
        descripcion=a.descripcion,
        estado=a.estado,
        porcentaje_avance=float(a.porcentaje_avance or 0),
        fecha_inicio_estimada=(a.fecha_inicio_estimada.isoformat() if a.fecha_inicio_estimada else None),
        fecha_fin_estimada=(a.fecha_fin_estimada.isoformat() if a.fecha_fin_estimada else None),
        seguimiento=a.seguimiento,
        compromiso=a.compromiso,
        archivo_url=a.archivo_url,
    )


def _build_desarrollo(dev, acts: List[ActividadOut]) -> DesarrolloConOut:
    return DesarrolloConOut(
        id=dev.id,
        nombre=dev.nombre or "",
        area_desarrollo=dev.area_desarrollo,
        analista=dev.analista,
        actividades=acts,
    )


@router.get("/desarrollos_actividades", response_model=List[DesarrolloConOut])
async def get_desarrollos_actividades(
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    try:
        # Obtener subordinados jerárquicos del usuario (IDs y nombres)
        uid = usuario.id
        subordinados = await JerarquiaService.obtener_ids_y_nombres_subordinados(db, uid)
        todos_los_ids = [uid] + subordinados["ids"]
        todos_los_nombres = [usuario.nombre] + subordinados["nombres"]

        stmt = select(Desarrollo)

        # Si no es admin y no es director, filtrar desarrollos por jerarquía y participación
        if usuario.rol not in ("admin", "director"):
            subquery_act = select(Actividad.desarrollo_id).where(
                or_(
                    Actividad.asignado_a_id.in_(todos_los_ids),
                    Actividad.responsable_id.in_(todos_los_ids),
                    Actividad.delegado_por_id.in_(todos_los_ids)
                )
            )

            stmt = stmt.where(
                or_(
                    Desarrollo.creado_por_id.in_(todos_los_ids),
                    Desarrollo.responsable_id.in_(todos_los_ids),
                    Desarrollo.analista.in_(todos_los_nombres),
                    Desarrollo.supervisor.in_(todos_los_nombres),
                    Desarrollo.autoridad.in_(todos_los_nombres),
                    Desarrollo.responsable.in_(todos_los_nombres),
                    Desarrollo.id.in_(subquery_act),
                )
            )

        result = await db.execute(stmt)
        devs = result.scalars().all()
        payload: List[DesarrolloConOut] = []

        for dev in devs:
            # Consultar todas las actividades de este desarrollo
            act_stmt = select(Actividad).where(Actividad.desarrollo_id == dev.id).order_by(Actividad.id)
            act_result = await db.execute(act_stmt)
            actividades = act_result.scalars().all()

            # Filtrar actividades en base a la regla de colaboración externa (Regla 2) si aplica
            if usuario.rol in ("admin", "director"):
                actividades_filtradas = actividades
            else:
                # Comprobar si tiene acceso total al desarrollo por jerarquía
                desarrollo_acceso_total = (
                    dev.creado_por_id in todos_los_ids or
                    dev.responsable_id in todos_los_ids or
                    dev.analista in todos_los_nombres or
                    dev.supervisor in todos_los_nombres or
                    dev.autoridad in todos_los_nombres or
                    dev.responsable in todos_los_nombres
                )

                if desarrollo_acceso_total:
                    actividades_filtradas = actividades
                else:
                    permitidos_ids = set()
                    actividades_dict = {a.id: a for a in actividades}
                    
                    for act in actividades:
                        if (act.asignado_a_id in todos_los_ids or 
                            act.responsable_id in todos_los_ids or 
                            act.delegado_por_id in todos_los_ids):
                            curr = act
                            while curr:
                                permitidos_ids.add(curr.id)
                                curr = actividades_dict.get(curr.parent_id) if curr.parent_id else None
                    
                    actividades_filtradas = [a for a in actividades if a.id in permitidos_ids]

            acts = [_build_actividad(a) for a in actividades_filtradas]
            payload.append(_build_desarrollo(dev, acts))

    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Error consultando actividades") from exc

    return payload


@router.get("/desarrollos_actividades/{desarrollo_id}", response_model=DesarrolloConOut)
async def get_desarrollo_actividades_by_id(
    desarrollo_id: str,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    try:
        # Obtener subordinados jerárquicos del usuario (IDs y nombres)
        uid = usuario.id
        subordinados = await JerarquiaService.obtener_ids_y_nombres_subordinados(db, uid)
        todos_los_ids = [uid] + subordinados["ids"]
        todos_los_nombres = [usuario.nombre] + subordinados["nombres"]

        stmt = select(Desarrollo).where(Desarrollo.id == desarrollo_id)
        result = await db.execute(stmt)
        dev = result.scalars().first()
        if not dev:
            raise HTTPException(status_code=404, detail=f"Desarrollo '{desarrollo_id}' no encontrado")

        # Validar permisos de acceso al desarrollo si no es admin/director
        if usuario.rol not in ("admin", "director"):
            subquery_act = select(Actividad.desarrollo_id).where(
                Actividad.desarrollo_id == desarrollo_id,
                or_(
                    Actividad.asignado_a_id.in_(todos_los_ids),
                    Actividad.responsable_id.in_(todos_los_ids),
                    Actividad.delegado_por_id.in_(todos_los_ids)
                )
            )
            res_act = await db.execute(subquery_act)
            tiene_actividad = res_act.first() is not None

            desarrollo_acceso_total = (
                dev.creado_por_id in todos_los_ids or
                dev.responsable_id in todos_los_ids or
                dev.analista in todos_los_nombres or
                dev.supervisor in todos_los_nombres or
                dev.autoridad in todos_los_nombres or
                dev.responsable in todos_los_nombres
            )

            if not desarrollo_acceso_total and not tiene_actividad:
                raise HTTPException(status_code=403, detail="No tiene permisos para acceder a este desarrollo")

        act_stmt = select(Actividad).where(Actividad.desarrollo_id == desarrollo_id).order_by(Actividad.id)
        act_result = await db.execute(act_stmt)
        actividades = act_result.scalars().all()

        # Filtrar actividades en base a colaboración externa (Regla 2) si aplica
        if usuario.rol in ("admin", "director"):
            actividades_filtradas = actividades
        else:
            desarrollo_acceso_total = (
                dev.creado_por_id in todos_los_ids or
                dev.responsable_id in todos_los_ids or
                dev.analista in todos_los_nombres or
                dev.supervisor in todos_los_nombres or
                dev.autoridad in todos_los_nombres or
                dev.responsable in todos_los_nombres
            )

            if desarrollo_acceso_total:
                actividades_filtradas = actividades
            else:
                permitidos_ids = set()
                actividades_dict = {a.id: a for a in actividades}
                
                for act in actividades:
                    if (act.asignado_a_id in todos_los_ids or 
                        act.responsable_id in todos_los_ids or 
                        act.delegado_por_id in todos_los_ids):
                        curr = act
                        while curr:
                            permitidos_ids.add(curr.id)
                            curr = actividades_dict.get(curr.parent_id) if curr.parent_id else None
                
                actividades_filtradas = [a for a in actividades if a.id in permitidos_ids]

        acts = [_build_actividad(a) for a in actividades_filtradas]

    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail="Error consultando actividades") from exc

    return _build_desarrollo(dev, acts)
