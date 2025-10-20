"""
Endpoints de API para dashboard y métricas generales
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import crud
from ..database import get_db
from ..schemas import activity_log as activity_log_schemas
from typing import Optional

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

@router.get("/pending-activities", response_model=list[activity_log_schemas.DevelopmentActivityLogResponse])
def get_pending_activities(status: Optional[str] = None, db: Session = Depends(get_db)):
    """Obtener actividades pendientes y en curso para el panel principal"""
    activities = crud.get_pending_and_in_progress_activities(db, status=status)
    
    # Mapear manualmente para asegurar la estructura de la respuesta
    response_activities = []
    for activity in activities:
        response_data = {
            "id": activity.id,
            "development_id": activity.development_id,
            "stage_id": activity.stage_id,
            "activity_type": activity.activity_type.value if hasattr(activity.activity_type, 'value') else activity.activity_type,
            "start_date": activity.start_date,
            "end_date": activity.end_date,
            "next_follow_up_at": activity.next_follow_up_at,
            "status": activity.status.value if hasattr(activity.status, 'value') else activity.status,
            "actor_type": activity.actor_type,
            "notes": activity.notes,
            "dynamic_payload": activity.dynamic_payload,
            "created_by": activity.created_by,
            "created_at": activity.created_at,
            "updated_at": activity.updated_at,
            "development": {
                "id": activity.development.id,
                "name": activity.development.name
            } if activity.development else None,
            "stage_name": activity.stage.stage_name if activity.stage else None,
            "stage_code": activity.stage.stage_code if activity.stage else None
        }
        response_activities.append(response_data)
        
    return response_activities
