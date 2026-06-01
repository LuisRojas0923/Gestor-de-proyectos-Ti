from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import obtener_db
from app.models.alerta.actividad import RegistroActividad, RegistroActividadCrear

router = APIRouter()

@router.get("/desarrollos/{desarrollo_id}/actividades", response_model=List[RegistroActividad])
async def obtener_actividades_por_desarrollo(
    desarrollo_id: str, 
    db: AsyncSession = Depends(obtener_db)
):
    """Obtiene el historial de actividades (bitácora) de un desarrollo"""
    try:
        query = select(RegistroActividad).where(RegistroActividad.desarrollo_id == desarrollo_id).order_by(RegistroActividad.creado_en.desc())
        result = await db.execute(query)
        actividades = result.scalars().all()
            
        return actividades
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener actividades: {str(e)}")

@router.post("/desarrollos/{desarrollo_id}/actividades", response_model=RegistroActividad)
async def crear_actividad_bitacora(
    desarrollo_id: str,
    actividad_in: RegistroActividadCrear,
    db: AsyncSession = Depends(obtener_db)
):
    """Crea un nuevo registro en la bitácora de un desarrollo"""
    try:
        nueva_act_data = actividad_in.model_dump()
        # Asegurar que el ID del desarrollo en la ruta coincida
        nueva_act_data["desarrollo_id"] = desarrollo_id
        
        nueva_act = RegistroActividad(**nueva_act_data)
        db.add(nueva_act)
        await db.commit()
        await db.refresh(nueva_act)
        return nueva_act
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear registro de bitácora: {str(e)}")

@router.delete("/actividades/{actividad_id}", status_code=204)
async def eliminar_actividad_bitacora(
    actividad_id: int,
    db: AsyncSession = Depends(obtener_db)
):
    try:
        query = select(RegistroActividad).where(RegistroActividad.id == actividad_id)
        result = await db.execute(query)
        act = result.scalar_one_or_none()
        if not act:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        await db.delete(act)
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar registro: {str(e)}")
