"""
API de Alertas y Actividades - Backend V2
"""
from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import obtener_db
from app.schemas.alerta import ActividadProxima, RegistroActividad

router = APIRouter()


@router.get("/proximas", response_model=List[ActividadProxima])
async def listar_actividades_proximas(db: Session = Depends(obtener_db)):
    """Lista actividades prximas y alertas de vencimiento"""
    return []


@router.get("/historial", response_model=List[RegistroActividad])
async def obtener_historial_actividades(
    desarrollo_id: Optional[str] = None,
    db: Session = Depends(obtener_db)
):
    """Obtiene el log de actividades del sistema"""
    return []


@router.get("/pendientes/conteo")
async def contar_alertas_pendientes(db: Session = Depends(obtener_db)):
    """Obtiene el nmero de alertas urgentes o vencidas"""
    return {"total": 0, "urgentes": 0}
