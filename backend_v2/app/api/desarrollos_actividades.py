from typing import List
from fastapi import APIRouter, HTTPException
from sqlmodel import select
from sqlalchemy.exc import SQLAlchemyError

from app.database import AsyncSessionLocal
from app.models.desarrollo.desarrollo import Desarrollo
from app.models.desarrollo.actividad import Actividad

from pydantic import BaseModel
from typing import Optional


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
async def get_desarrollos_actividades():
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(Desarrollo)
            result = await session.execute(stmt)
            devs = result.scalars().all()
            payload: List[DesarrolloConOut] = []

            for dev in devs:
                act_stmt = select(Actividad).where(Actividad.desarrollo_id == dev.id)
                act_result = await session.execute(act_stmt)
                acts = [_build_actividad(a) for a in act_result.scalars().all()]
                payload.append(_build_desarrollo(dev, acts))
        except SQLAlchemyError as exc:
            raise HTTPException(status_code=500, detail="Error consultando actividades") from exc

        return payload


@router.get("/desarrollos_actividades/{desarrollo_id}", response_model=DesarrolloConOut)
async def get_desarrollo_actividades_by_id(desarrollo_id: str):
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(Desarrollo).where(Desarrollo.id == desarrollo_id)
            result = await session.execute(stmt)
            dev = result.scalars().first()
            if not dev:
                raise HTTPException(status_code=404, detail=f"Desarrollo '{desarrollo_id}' no encontrado")

            act_stmt = select(Actividad).where(Actividad.desarrollo_id == desarrollo_id)
            act_result = await session.execute(act_stmt)
            acts = [_build_actividad(a) for a in act_result.scalars().all()]
        except HTTPException:
            raise
        except SQLAlchemyError as exc:
            raise HTTPException(status_code=500, detail="Error consultando actividades") from exc

        return _build_desarrollo(dev, acts)
