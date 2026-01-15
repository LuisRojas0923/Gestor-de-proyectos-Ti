"""
Endpoints para gestión de instaladores y seguimiento de fallas
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import json

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/instaladores", tags=["instaladores"])


@router.get("/fallidos")
def get_failed_installers(
    development_id: Optional[str] = Query(None, description="Filtrar por desarrollo"),
    installer_number: Optional[str] = Query(None, description="Filtrar por número de instalador"),
    status: Optional[str] = Query("en_curso", description="Estado de la actividad"),
    db: Session = Depends(get_db)
):
    """
    Obtener instaladores con fallas o problemas
    
    - **development_id**: Filtrar por desarrollo específico
    - **installer_number**: Buscar instalador específico
    - **status**: Estado de la actividad (en_curso, pendiente, etc.)
    """
    try:
        # Query base para actividades de Despliegue (Pruebas) y Validación de Correcciones
        query = db.query(models.DevelopmentActivityLog).filter(
            models.DevelopmentActivityLog.stage_id.in_(
                db.query(models.DevelopmentStage.id).filter(
                    models.DevelopmentStage.stage_name.in_(["Despliegue (Pruebas)", "Validación de Correcciones"])
                )
            ),
            models.DevelopmentActivityLog.dynamic_payload.isnot(None)
        )
        
        # Filtrar por desarrollo si se especifica
        if development_id:
            query = query.filter(models.DevelopmentActivityLog.development_id == development_id)
        
        # Filtrar por estado
        if status:
            query = query.filter(models.DevelopmentActivityLog.status == status)
        
        activities = query.order_by(models.DevelopmentActivityLog.created_at.desc()).all()
        
        # Procesar resultados y extraer información de instaladores
        failed_installers = []
        for activity in activities:
            try:
                payload = json.loads(activity.dynamic_payload) if isinstance(activity.dynamic_payload, str) else activity.dynamic_payload
                
                # Buscar instalador específico si se especifica
                if installer_number:
                    if payload.get("installer_number") != installer_number:
                        continue
                
                # Solo incluir si tiene número de instalador
                if payload.get("installer_number"):
                    failed_installers.append({
                        "activity_id": activity.id,
                        "development_id": activity.development_id,
                        "installer_number": payload.get("installer_number"),
                        "environment": payload.get("environment"),
                        "installation_notes": payload.get("installation_notes"),
                        "activity_notes": activity.notes,
                        "status": activity.status,
                        "created_at": activity.created_at,
                        "start_date": activity.start_date,
                        "end_date": activity.end_date
                    })
            except (json.JSONDecodeError, TypeError):
                continue
        
        return {
            "total_failed_installers": len(failed_installers),
            "installers": failed_installers,
            "filters": {
                "development_id": development_id,
                "installer_number": installer_number,
                "status": status
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error consultando instaladores fallidos: {str(e)}"
        )


@router.get("/buscar/{installer_number}")
def search_installer_history(
    installer_number: str,
    db: Session = Depends(get_db)
):
    """
    Buscar historial completo de un instalador específico
    """
    try:
        # Buscar en todas las actividades que contengan este número de instalador
        activities = db.query(models.DevelopmentActivityLog).filter(
            models.DevelopmentActivityLog.dynamic_payload.like(f'%{installer_number}%')
        ).order_by(models.DevelopmentActivityLog.created_at.desc()).all()
        
        history = []
        for activity in activities:
            try:
                payload = json.loads(activity.dynamic_payload) if isinstance(activity.dynamic_payload, str) else activity.dynamic_payload
                
                if payload.get("installer_number") == installer_number:
                    # Obtener información de la etapa
                    stage = db.query(models.DevelopmentStage).filter(
                        models.DevelopmentStage.id == activity.stage_id
                    ).first()
                    
                    history.append({
                        "activity_id": activity.id,
                        "development_id": activity.development_id,
                        "stage_name": stage.stage_name if stage else None,
                        "stage_code": stage.stage_code if stage else None,
                        "activity_type": activity.activity_type,
                        "status": activity.status,
                        "installer_number": payload.get("installer_number"),
                        "environment": payload.get("environment"),
                        "installation_notes": payload.get("installation_notes"),
                        "activity_notes": activity.notes,
                        "start_date": activity.start_date,
                        "end_date": activity.end_date,
                        "created_at": activity.created_at
                    })
            except (json.JSONDecodeError, TypeError):
                continue
        
        return {
            "installer_number": installer_number,
            "total_activities": len(history),
            "history": history
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error buscando historial del instalador: {str(e)}"
        )


@router.get("/informe-problemas")
def get_installer_problems_report(
    period_days: int = Query(30, description="Días hacia atrás para el reporte"),
    db: Session = Depends(get_db)
):
    """
    Reporte consolidado de problemas con instaladores
    """
    try:
        from datetime import timedelta
        
        start_date = date.today() - timedelta(days=period_days)
        
        # Obtener actividades de Despliegue (Pruebas) con problemas
        activities = db.query(models.DevelopmentActivityLog).filter(
            models.DevelopmentActivityLog.stage_id.in_(
                db.query(models.DevelopmentStage.id).filter(
                    models.DevelopmentStage.stage_name == "Despliegue (Pruebas)"
                )
            ),
            models.DevelopmentActivityLog.created_at >= start_date,
            models.DevelopmentActivityLog.dynamic_payload.isnot(None)
        ).order_by(models.DevelopmentActivityLog.created_at.desc()).all()
        
        # Estadísticas generales
        total_activities = len(activities)
        failed_count = len([a for a in activities if a.status in ["en_curso", "cancelada"]])
        
        # Agrupar por problema
        problems_by_type = {}
        installers_by_status = {}
        
        for activity in activities:
            try:
                payload = json.loads(activity.dynamic_payload) if isinstance(activity.dynamic_payload, str) else activity.dynamic_payload
                installer_num = payload.get("installer_number")
                
                if installer_num:
                    # Agrupar por estado
                    if activity.status not in installers_by_status:
                        installers_by_status[activity.status] = []
                    installers_by_status[activity.status].append(installer_num)
                    
                    # Analizar tipo de problema
                    notes = activity.notes or payload.get("installation_notes", "")
                    if "conexion" in notes.lower() or "bd" in notes.lower():
                        problem_type = "Problemas de Conexión"
                    elif "dependencia" in notes.lower():
                        problem_type = "Dependencias"
                    elif "permiso" in notes.lower():
                        problem_type = "Permisos"
                    elif "configuracion" in notes.lower():
                        problem_type = "Configuración"
                    else:
                        problem_type = "Otros"
                    
                    if problem_type not in problems_by_type:
                        problems_by_type[problem_type] = 0
                    problems_by_type[problem_type] += 1
                    
            except (json.JSONDecodeError, TypeError):
                continue
        
        return {
            "report_period": {
                "start_date": start_date,
                "end_date": date.today(),
                "days": period_days
            },
            "summary": {
                "total_installer_activities": total_activities,
                "failed_installers": failed_count,
                "success_rate": round((total_activities - failed_count) / total_activities * 100, 2) if total_activities > 0 else 0
            },
            "problems_by_type": problems_by_type,
            "installers_by_status": {
                status: len(installers) for status, installers in installers_by_status.items()
            },
            "recommendations": _generate_installer_recommendations(problems_by_type, failed_count, total_activities)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generando reporte de problemas: {str(e)}"
        )


def _generate_installer_recommendations(problems_by_type: dict, failed_count: int, total_activities: int) -> List[dict]:
    """Generar recomendaciones basadas en los problemas encontrados"""
    recommendations = []
    
    failure_rate = (failed_count / total_activities * 100) if total_activities > 0 else 0
    
    if failure_rate > 20:
        recommendations.append({
            "priority": "high",
            "issue": f"Alta tasa de fallas en instaladores ({failure_rate:.1f}%)",
            "recommendation": "Revisar procesos de validación previa al despliegue",
            "impact": "Retrasos significativos en entregas"
        })
    
    if "Problemas de Conexión" in problems_by_type:
        recommendations.append({
            "priority": "medium",
            "issue": f"Problemas de conexión ({problems_by_type['Problemas de Conexión']} casos)",
            "recommendation": "Establecer checklist de conectividad antes del despliegue",
            "impact": "Fallos recurrentes en instalaciones"
        })
    
    if "Dependencias" in problems_by_type:
        recommendations.append({
            "priority": "medium",
            "issue": f"Problemas con dependencias ({problems_by_type['Dependencias']} casos)",
            "recommendation": "Implementar validación automática de dependencias",
            "impact": "Instalaciones incompletas o fallidas"
        })
    
    return recommendations
