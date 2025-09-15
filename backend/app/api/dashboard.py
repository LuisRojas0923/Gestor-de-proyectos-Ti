"""
Endpoints de API para dashboard y métricas generales
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import crud
from ..database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/metrics")
def get_dashboard_metrics(db: Session = Depends(get_db)):
    """Métricas principales del dashboard"""
    return crud.get_dashboard_metrics(db)


@router.get("/priority-distribution")
def get_priority_distribution(db: Session = Depends(get_db)):
    """Distribución de prioridades"""
    return crud.get_priority_distribution(db)


@router.get("/upcoming-milestones")
def get_upcoming_milestones(db: Session = Depends(get_db)):
    """Próximos hitos importantes"""
    return crud.get_upcoming_milestones(db)


@router.get("/weekly-progress")
def get_weekly_progress(db: Session = Depends(get_db)):
    """Progreso semanal"""
    return crud.get_weekly_progress(db)
