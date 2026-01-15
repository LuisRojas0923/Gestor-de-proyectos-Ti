"""
Endpoints de API para alertas y actividades próximas
Sistema completo de notificaciones y monitoreo proactivo
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime, date, timedelta
from .. import models, schemas
from ..database import get_db
from ..services.alert_service import AlertService, get_alert_service

router = APIRouter(prefix="/alertas", tags=["alertas"])


@router.get("/proximas")
def get_upcoming_activities(
    development_id: Optional[str] = None,
    responsible_party: Optional[str] = None,
    priority: Optional[str] = None,
    status_filter: Optional[str] = None,
    days_ahead: int = 30,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Obtener próximas actividades con filtros avanzados
    
    - **development_id**: Filtrar por desarrollo específico
    - **responsible_party**: Filtrar por responsable ('tecnico', 'proveedor', 'area')
    - **priority**: Filtrar por prioridad ('Baja', 'Media', 'Alta', 'Crítica')
    - **status_filter**: Filtrar por estado ('Pendiente', 'En Progreso', 'Completada')
    - **days_ahead**: Días hacia adelante para buscar actividades
    """
    try:
        # Calcular fecha límite
        end_date = date.today() + timedelta(days=days_ahead)
        
        # Query base
        query = db.query(models.DevelopmentUpcomingActivity).options(
            joinedload(models.DevelopmentUpcomingActivity.development)
        ).filter(
            models.DevelopmentUpcomingActivity.due_date <= end_date
        )
        
        # Aplicar filtros
        if development_id:
            query = query.filter(models.DevelopmentUpcomingActivity.development_id == development_id)
        
        if responsible_party:
            query = query.filter(models.DevelopmentUpcomingActivity.responsible_party.ilike(f"%{responsible_party}%"))
        
        if priority:
            query = query.filter(models.DevelopmentUpcomingActivity.priority == priority)
        
        if status_filter:
            query = query.filter(models.DevelopmentUpcomingActivity.status == status_filter)
        else:
            # Por defecto, no mostrar actividades completadas
            query = query.filter(models.DevelopmentUpcomingActivity.status != "Completada")
        
        # Ordenar por prioridad y fecha
        from sqlalchemy import case
        priority_order = case(
            (models.DevelopmentUpcomingActivity.priority == "Crítica", 1),
            (models.DevelopmentUpcomingActivity.priority == "Alta", 2),
            (models.DevelopmentUpcomingActivity.priority == "Media", 3),
            (models.DevelopmentUpcomingActivity.priority == "Baja", 4),
            else_=5
        )
        
        activities = query.order_by(
            priority_order,
            models.DevelopmentUpcomingActivity.due_date
        ).offset(skip).limit(limit).all()
        
        # Categorizar por urgencia
        today = date.today()
        categorized_activities = {
            "overdue": [],
            "due_today": [],
            "due_this_week": [],
            "due_later": []
        }
        
        for activity in activities:
            days_until_due = (activity.due_date - today).days
            
            if days_until_due < 0:
                categorized_activities["overdue"].append(activity)
            elif days_until_due == 0:
                categorized_activities["due_today"].append(activity)
            elif days_until_due <= 7:
                categorized_activities["due_this_week"].append(activity)
            else:
                categorized_activities["due_later"].append(activity)
        
        return {
            "total_activities": len(activities),
            "filters_applied": {
                "development_id": development_id,
                "responsible_party": responsible_party,
                "priority": priority,
                "status": status_filter,
                "days_ahead": days_ahead
            },
            "activities_by_urgency": categorized_activities,
            "all_activities": activities
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo actividades: {str(e)}"
        )


@router.post("/actividades", response_model=schemas.DevelopmentUpcomingActivity)
def create_activity(
    activity: schemas.DevelopmentUpcomingActivityCreate,
    db: Session = Depends(get_db)
):
    """
    Crear nueva actividad próxima
    
    Permite programar actividades y asignar responsables
    """
    try:
        # Verificar que el desarrollo existe
        development = db.query(models.Development).filter(
            models.Development.id == activity.development_id
        ).first()
        
        if not development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Desarrollo {activity.development_id} no encontrado"
            )
        
        # Crear actividad
        db_activity = models.DevelopmentUpcomingActivity(**activity.dict())
        
        db.add(db_activity)
        db.commit()
        db.refresh(db_activity)
        
        return db_activity
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando actividad: {str(e)}"
        )


@router.put("/actividades/{activity_id}", response_model=schemas.DevelopmentUpcomingActivity)
def update_activity(
    activity_id: int,
    activity_update: schemas.DevelopmentUpcomingActivityUpdate,
    db: Session = Depends(get_db)
):
    """
    Actualizar actividad existente
    
    Permite modificar fechas, responsables, prioridades, etc.
    """
    try:
        # Obtener actividad
        activity = db.query(models.DevelopmentUpcomingActivity).filter(
            models.DevelopmentUpcomingActivity.id == activity_id
        ).first()
        
        if not activity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Actividad {activity_id} no encontrada"
            )
        
        # Actualizar campos proporcionados
        update_data = activity_update.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(activity, field, value)
        
        activity.updated_at = datetime.now()
        
        db.commit()
        db.refresh(activity)
        
        return activity
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error actualizando actividad: {str(e)}"
        )


@router.post("/actividades/{activity_id}/completar")
def complete_activity(
    activity_id: int,
    completion_data: schemas.ActivityCompletionRequest,
    db: Session = Depends(get_db)
):
    """
    Marcar actividad como completada
    
    Registra la finalización con notas y resultados
    """
    try:
        # Obtener actividad
        activity = db.query(models.DevelopmentUpcomingActivity).filter(
            models.DevelopmentUpcomingActivity.id == activity_id
        ).first()
        
        if not activity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Actividad {activity_id} no encontrada"
            )
        
        if activity.status == "Completada":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La actividad ya está completada"
            )
        
        # Marcar como completada
        activity.status = "Completada"
        activity.completed_at = datetime.now()
        activity.completed_by = completion_data.completed_by
        activity.completion_notes = completion_data.completion_notes
        activity.updated_at = datetime.now()
        
        db.commit()
        db.refresh(activity)
        
        return {
            "activity_id": activity_id,
            "status": "completed",
            "completed_at": activity.completed_at,
            "completed_by": activity.completed_by,
            "message": "Actividad completada exitosamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error completando actividad: {str(e)}"
        )


@router.get("/panel")
def get_alerts_dashboard(
    alert_service: AlertService = Depends(get_alert_service),
    db: Session = Depends(get_db)
):
    """
    Dashboard de alertas con resumen ejecutivo
    
    Proporciona vista consolidada de todas las alertas activas
    """
    try:
        # Generar alertas automáticas
        generated_alerts = alert_service.generate_automatic_alerts()
        
        # Obtener estadísticas de actividades
        today = date.today()
        
        # Actividades vencidas
        overdue_count = db.query(models.DevelopmentUpcomingActivity).filter(
            models.DevelopmentUpcomingActivity.due_date < today,
            models.DevelopmentUpcomingActivity.status != "Completada"
        ).count()
        
        # Actividades de hoy
        due_today_count = db.query(models.DevelopmentUpcomingActivity).filter(
            models.DevelopmentUpcomingActivity.due_date == today,
            models.DevelopmentUpcomingActivity.status != "Completada"
        ).count()
        
        # Actividades de esta semana
        week_end = today + timedelta(days=7)
        due_this_week_count = db.query(models.DevelopmentUpcomingActivity).filter(
            models.DevelopmentUpcomingActivity.due_date > today,
            models.DevelopmentUpcomingActivity.due_date <= week_end,
            models.DevelopmentUpcomingActivity.status != "Completada"
        ).count()
        
        # Actividades por prioridad
        priority_stats = db.query(
            models.DevelopmentUpcomingActivity.priority,
            func.count(models.DevelopmentUpcomingActivity.id)
        ).filter(
            models.DevelopmentUpcomingActivity.status != "Completada"
        ).group_by(models.DevelopmentUpcomingActivity.priority).all()
        
        priority_counts = {priority: count for priority, count in priority_stats}
        
        # Actividades por responsable
        responsible_stats = db.query(
            models.DevelopmentUpcomingActivity.responsible_party,
            func.count(models.DevelopmentUpcomingActivity.id)
        ).filter(
            models.DevelopmentUpcomingActivity.status != "Completada"
        ).group_by(models.DevelopmentUpcomingActivity.responsible_party).all()
        
        responsible_counts = {party: count for party, count in responsible_stats}
        
        # Obtener alertas críticas recientes
        critical_activities = db.query(models.DevelopmentUpcomingActivity).options(
            joinedload(models.DevelopmentUpcomingActivity.development)
        ).filter(
            models.DevelopmentUpcomingActivity.priority == "Crítica",
            models.DevelopmentUpcomingActivity.status != "Completada"
        ).order_by(models.DevelopmentUpcomingActivity.due_date).limit(5).all()
        
        return {
            "dashboard_updated_at": datetime.now(),
            "automatic_alerts_generated": len(generated_alerts),
            "activity_summary": {
                "overdue": overdue_count,
                "due_today": due_today_count,
                "due_this_week": due_this_week_count,
                "by_priority": priority_counts,
                "by_responsible": responsible_counts
            },
            "critical_activities": [
                {
                    "id": activity.id,
                    "title": activity.title,
                    "development_name": activity.development.name if activity.development else None,
                    "due_date": activity.due_date,
                    "days_overdue": (today - activity.due_date).days if activity.due_date < today else 0,
                    "responsible_party": activity.responsible_party,
                    "responsible_person": activity.responsible_person
                }
                for activity in critical_activities
            ],
            "recent_alerts": generated_alerts[:10]  # Últimas 10 alertas generadas
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando dashboard de alertas: {str(e)}"
        )


@router.post("/generar-automaticas")
def generate_automatic_alerts(
    alert_service: AlertService = Depends(get_alert_service)
):
    """
    Generar alertas automáticas del sistema
    
    Ejecuta el proceso de generación de alertas basado en reglas predefinidas
    """
    try:
        alerts = alert_service.generate_automatic_alerts()
        
        return {
            "alerts_generated": len(alerts),
            "generation_timestamp": datetime.now(),
            "alerts": alerts
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando alertas automáticas: {str(e)}"
        )


@router.get("/por-desarrollo/{development_id}")
def get_development_alerts(
    development_id: str,
    include_completed: bool = False,
    db: Session = Depends(get_db)
):
    """
    Obtener todas las alertas de un desarrollo específico
    
    Incluye actividades próximas, alertas de calidad, y notificaciones
    """
    try:
        # Verificar que el desarrollo existe
        development = db.query(models.Development).filter(
            models.Development.id == development_id
        ).first()
        
        if not development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Desarrollo {development_id} no encontrado"
            )
        
        # Obtener actividades
        activities_query = db.query(models.DevelopmentUpcomingActivity).filter(
            models.DevelopmentUpcomingActivity.development_id == development_id
        )
        
        if not include_completed:
            activities_query = activities_query.filter(
                models.DevelopmentUpcomingActivity.status != "Completada"
            )
        
        activities = activities_query.order_by(
            models.DevelopmentUpcomingActivity.due_date
        ).all()
        
        # Obtener controles de calidad pendientes
        quality_controls = db.query(models.DevelopmentQualityControl).options(
            joinedload(models.DevelopmentQualityControl.catalog)
        ).filter(
            models.DevelopmentQualityControl.development_id == development_id,
            or_(
                models.DevelopmentQualityControl.status == "Pendiente",
                models.DevelopmentQualityControl.validation_status == "Rechazado"
            )
        ).all()
        
        # Calcular métricas del desarrollo
        today = date.today()
        overdue_activities = [a for a in activities if a.due_date < today and a.status != "Completada"]
        critical_activities = [a for a in activities if a.priority == "Crítica" and a.status != "Completada"]
        
        return {
            "development_id": development_id,
            "development_name": development.name,
            "alert_summary": {
                "total_activities": len(activities),
                "overdue_activities": len(overdue_activities),
                "critical_activities": len(critical_activities),
                "pending_quality_controls": len(quality_controls)
            },
            "activities": activities,
            "quality_controls": quality_controls,
            "recommendations": _generate_development_recommendations(
                development, activities, quality_controls
            )
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo alertas del desarrollo: {str(e)}"
        )


@router.delete("/actividades/{activity_id}")
def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db)
):
    """
    Eliminar actividad próxima
    
    Solo permite eliminar actividades que no han sido completadas
    """
    try:
        # Obtener actividad
        activity = db.query(models.DevelopmentUpcomingActivity).filter(
            models.DevelopmentUpcomingActivity.id == activity_id
        ).first()
        
        if not activity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Actividad {activity_id} no encontrada"
            )
        
        if activity.status == "Completada":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pueden eliminar actividades completadas"
            )
        
        db.delete(activity)
        db.commit()
        
        return {"message": "Actividad eliminada exitosamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error eliminando actividad: {str(e)}"
        )


def _generate_development_recommendations(
    development: models.Development,
    activities: List[models.DevelopmentUpcomingActivity],
    quality_controls: List[models.DevelopmentQualityControl]
) -> List[dict]:
    """
    Generar recomendaciones específicas para un desarrollo
    """
    recommendations = []
    today = date.today()
    
    # Actividades vencidas
    overdue_activities = [a for a in activities if a.due_date < today and a.status != "Completada"]
    if overdue_activities:
        recommendations.append({
            "type": "urgent",
            "title": "Actividades Vencidas",
            "description": f"{len(overdue_activities)} actividades están vencidas",
            "action": "Revisar y reprogramar actividades vencidas",
            "priority": "high"
        })
    
    # Controles de calidad rechazados
    rejected_controls = [c for c in quality_controls if c.validation_status == "Rechazado"]
    if rejected_controls:
        recommendations.append({
            "type": "quality",
            "title": "Controles de Calidad Rechazados",
            "description": f"{len(rejected_controls)} controles necesitan corrección",
            "action": "Corregir controles rechazados antes de continuar",
            "priority": "high"
        })
    
    # Controles pendientes
    pending_controls = [c for c in quality_controls if c.status == "Pendiente"]
    if pending_controls:
        recommendations.append({
            "type": "process",
            "title": "Controles Pendientes",
            "description": f"{len(pending_controls)} controles esperan completarse",
            "action": "Completar controles de calidad pendientes",
            "priority": "medium"
        })
    
    return recommendations