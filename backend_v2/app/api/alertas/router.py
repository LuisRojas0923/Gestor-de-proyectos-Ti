"""
API de Alertas y Actividades - Backend V2
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db
from app.models.alerta.actividad import ActividadProxima, RegistroActividad

router = APIRouter()


@router.get("/proximas", response_model=List[ActividadProxima])
async def listar_actividades_proximas(db: AsyncSession = Depends(obtener_db)):
    """Lista actividades próximas y alertas de vencimiento"""
    try:
        # TODO: Implementar lógica de consulta cuando el servicio esté disponible
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener actividades próximas: {str(e)}")


@router.get("/historial", response_model=List[RegistroActividad])
async def obtener_historial_actividades(
    desarrollo_id: Optional[str] = None,
    db: AsyncSession = Depends(obtener_db)
):
    """Obtiene el log de actividades del sistema"""
    try:
        # TODO: Implementar lógica de consulta cuando el servicio esté disponible
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener historial de actividades: {str(e)}")


@router.get("/pendientes/conteo")
async def contar_alertas_pendientes(db: AsyncSession = Depends(obtener_db)):
    """Obtiene el número de alertas urgentes o vencidas"""
    try:
        # TODO: Implementar lógica de consulta cuando el servicio esté disponible
        return {"total": 0, "urgentes": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al contar alertas pendientes: {str(e)}")
