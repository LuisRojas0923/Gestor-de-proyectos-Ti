"""
API de KPIs - Backend V2
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import obtener_db
from app.schemas.kpi import MetricaKpi, Funcionalidad

router = APIRouter()


@router.get("/metricas", response_model=List[MetricaKpi])
async def listar_metricas_kpi(
    desarrollo_id: Optional[str] = None,
    db: Session = Depends(obtener_db)
):
    """Obtiene mtricas de KPI"""
    return []


@router.get("/funcionalidades", response_model=List[Funcionalidad])
async def listar_funcionalidades(
    desarrollo_id: str,
    db: Session = Depends(obtener_db)
):
    """Lista funcionalidades de un desarrollo"""
    return []


@router.get("/dashboard")
async def obtener_resumen_dashboard(db: Session = Depends(obtener_db)):
    """Obtiene datos consolidados para el dashboard de KPIs"""
    return {"resumen": "Datos de dashboard"}
