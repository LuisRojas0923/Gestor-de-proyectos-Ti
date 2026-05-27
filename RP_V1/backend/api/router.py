"""
API de Recursos Humanos (RRHH) - Backend V2
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import obtener_db
from app.models.rrhh.solicitud_personal import SolicitudPersonal, SolicitudPersonalCrear, SolicitudPersonalPublico

router = APIRouter()

@router.post("/solicitudes", response_model=SolicitudPersonalPublico, status_code=status.HTTP_201_CREATED)
async def crear_solicitud_personal(
    solicitud: SolicitudPersonalCrear,
    db: AsyncSession = Depends(obtener_db)
):
    """Crea una nueva solicitud de personal en la base de datos"""
    try:
        nueva_solicitud = SolicitudPersonal.model_validate(solicitud)
        db.add(nueva_solicitud)
        await db.commit()
        await db.refresh(nueva_solicitud)
        return nueva_solicitud
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error al crear la solicitud de personal: {str(e)}"
        )

@router.get("/solicitudes", response_model=List[SolicitudPersonalPublico])
async def listar_solicitudes_personal(
    db: AsyncSession = Depends(obtener_db)
):
    """Lista todas las solicitudes de personal"""
    result = await db.execute(select(SolicitudPersonal).order_by(SolicitudPersonal.fecha_radicacion.desc()))
    return result.scalars().all()
