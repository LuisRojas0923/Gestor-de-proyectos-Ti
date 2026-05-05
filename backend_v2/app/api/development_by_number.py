from typing import List
from fastapi import APIRouter, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import select

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


class DesarrolloConOut(BaseModel):
    id: str
    nombre: str
    area_desarrollo: Optional[str] = None
    analista: Optional[str] = None
    actividades: List[ActividadOut] = []


HO_MAP = {
    2: 'HO-2',
    5: 'HO-5',
    7: 'HO-7',
    39: 'HO-39',
    64: 'HO-64',
    72: 'HO-72',
    101: 'HO-101',
    115: 'HO-115',
}


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
    )


@router.get("/development_by_number/{num}", response_model=DesarrolloConOut)
async def get_development_by_number(num: int):
    ho_code = HO_MAP.get(num)
    if not ho_code:
        raise HTTPException(status_code=404, detail="Desarrollo numérico no mapeado")

    async with AsyncSessionLocal() as session:
        try:
            stmt = select(Desarrollo).where(Desarrollo.id == ho_code)
            result = await session.execute(stmt)
            dev = result.scalars().first()
            if not dev:
                raise HTTPException(status_code=404, detail=f"Desarrollo {ho_code} no encontrado")

            act_stmt = select(Actividad).where(Actividad.desarrollo_id == ho_code)
            act_result = await session.execute(act_stmt)
            acts = [_build_actividad(a) for a in act_result.scalars().all()]
        except HTTPException:
            raise
        except SQLAlchemyError as exc:
            raise HTTPException(status_code=500, detail="Error consultando desarrollo") from exc

        return DesarrolloConOut(
            id=dev.id,
            nombre=dev.nombre or "",
            area_desarrollo=dev.area_desarrollo,
            analista=dev.analista,
            actividades=acts,
        )
