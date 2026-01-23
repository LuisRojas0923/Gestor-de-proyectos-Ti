"""
API de KPIs - Backend V2
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db
from app.models.kpi.metrica import MetricaKpi, Funcionalidad

router = APIRouter()


@router.get("/metricas", response_model=List[MetricaKpi])
async def listar_metricas_kpi(
    desarrollo_id: Optional[str] = None,
    db: AsyncSession = Depends(obtener_db)
):
    """Obtiene métricas de KPI"""
    try:
        # TODO: Implementar lógica con servicio de KPIs
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener métricas KPI: {str(e)}")


@router.get("/funcionalidades", response_model=List[Funcionalidad])
async def listar_funcionalidades(
    desarrollo_id: str,
    db: AsyncSession = Depends(obtener_db)
):
    """Lista funcionalidades de un desarrollo"""
    try:
        # TODO: Implementar lógica con servicio de KPIs
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar funcionalidades: {str(e)}")


@router.get("/dashboard")
async def obtener_resumen_dashboard(db: AsyncSession = Depends(obtener_db)):
    """Obtiene datos consolidados para el dashboard de KPIs"""
    try:
        # TODO: Implementar lógica con servicio de KPIs
        return {"resumen": "Datos de dashboard"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener dashboard: {str(e)}")
