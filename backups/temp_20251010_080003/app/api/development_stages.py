"""
Endpoints para gestión de etapas de desarrollo con side-effects para KPIs
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, date
from .. import models, schemas
from ..database import get_db
from ..services.kpi_service import KPIService, get_kpi_service

router = APIRouter(prefix="/development-stages", tags=["development-stages"])


@router.post("/{development_id}/close-stage")
def close_development_stage(
    development_id: str,
    request_data: dict,
    db: Session = Depends(get_db),
    kpi_service: KPIService = Depends(get_kpi_service)
):
    """
    Cerrar una etapa de desarrollo con side-effects para KPIs
    
    Body JSON:
    - **stage_id**: ID de la etapa a cerrar
    - **actual_date**: Fecha real de cierre (default: hoy)
    - **planned_date**: Fecha planificada (opcional)
    - **defects_count**: Número de defectos encontrados (para etapas de testing)
    - **rejection_reason**: Razón de rechazo (para devoluciones)
    """
    try:
        # Extraer datos del request
        stage_id = request_data.get("stage_id")
        actual_date = request_data.get("actual_date")
        planned_date = request_data.get("planned_date")
        defects_count = request_data.get("defects_count")
        rejection_reason = request_data.get("rejection_reason")
        
        if not stage_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="stage_id es requerido"
            )
        # Verificar que el desarrollo existe
        development = db.query(models.Development).filter(
            models.Development.id == development_id
        ).first()
        
        if not development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Desarrollo {development_id} no encontrado"
            )
        
        # Verificar que la etapa existe
        stage = db.query(models.DevelopmentStage).filter(
            models.DevelopmentStage.id == stage_id
        ).first()
        
        if not stage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Etapa {stage_id} no encontrada"
            )
        
        # Convertir fechas de string a date si es necesario
        if actual_date and isinstance(actual_date, str):
            actual_date = date.fromisoformat(actual_date)
        elif not actual_date:
            actual_date = date.today()
            
        if planned_date and isinstance(planned_date, str):
            planned_date = date.fromisoformat(planned_date)
        
        # 1. Persistir fechas en development_dates
        # Mapear nombres de etapas a date_type válidos
        stage_to_date_type = {
            "Definición": "inicio",
            "Análisis": "inicio", 
            "Elaboración Propuesta": "inicio",
            "Aprobación Propuesta": "inicio",
            "Desarrollo del Requerimiento": "inicio",
            "Despliegue (Pruebas)": "entrega",
            "Plan de Pruebas": "entrega",
            "Ejecución de Pruebas": "entrega",
            "Aprobación (Pase)": "entrega",
            "Desplegado": "entrega",
            "Entrega a Producción": "produccion",
            "Incidente Post-Producción": "produccion",
            "Cancelado": "cierre"
        }
        
        date_type = stage_to_date_type.get(stage.stage_name, "entrega")
        
        date_record = models.DevelopmentDate(
            development_id=development_id,
            date_type=date_type,
            planned_date=planned_date,
            actual_date=actual_date,
            delivery_status="on_time" if planned_date and actual_date <= planned_date else "delayed" if planned_date else None
        )
        db.add(date_record)
        
        # 2. Side-effects según el tipo de etapa
        if stage.stage_name in ["Entrega", "Re-entrega a TI"]:
            # Crear/actualizar control de calidad
            quality_control = models.DevelopmentQualityControl(
                development_id=development_id,
                control_name=f"Validación {stage.stage_name}",
                status="Completado",
                completed_at=datetime.now(),
                validation_status="Pendiente",  # Requiere validación manual
                rejection_reason=rejection_reason if rejection_reason else None
            )
            db.add(quality_control)
        
        elif stage.stage_name in ["Testing", "Validación de Correcciones"]:
            # Registrar funcionalidades y defectos
            if defects_count is not None:
                functionality = models.DevelopmentFunctionality(
                    development_id=development_id,
                    functionality_name=f"Funcionalidad {stage.stage_name}",
                    description=f"Funcionalidad validada en {stage.stage_name}",
                    complexity_level="medium",
                    status="delivered",
                    delivery_date=actual_date,
                    defects_count=defects_count
                )
                db.add(functionality)
        
        elif stage.stage_name == "Entrega a Producción":
            # Registrar en historial de entregas
            delivery_history = models.DevelopmentDeliveryHistory(
                development_id=development_id,
                delivery_version="1.0",
                delivery_type="final",
                delivery_date=actual_date,
                delivery_status="delivered",
                quality_score=95.0,  # Score por defecto
                delivery_notes=f"Entrega a producción desde {stage.stage_name}"
            )
            db.add(delivery_history)
        
        # 3. Actualizar el desarrollo si es necesario
        if stage.is_milestone:
            development.current_stage_id = stage_id
            development.updated_at = datetime.now()
        
        # 4. Commit todos los cambios
        db.commit()
        
        # 5. Recalcular KPIs si es una etapa crítica
        if stage.stage_name in ["Entrega", "Re-entrega a TI", "Entrega a Producción"]:
            try:
                # Recalcular métricas para este desarrollo
                kpi_service.calculate_global_compliance()
                kpi_service.calculate_first_time_quality()
                kpi_service.calculate_defects_per_delivery()
            except Exception as e:
                # No fallar si no se pueden recalcular los KPIs
                print(f"Warning: No se pudieron recalcular KPIs: {e}")
        
        return {
            "success": True,
            "message": f"Etapa '{stage.stage_name}' cerrada exitosamente",
            "development_id": development_id,
            "stage_id": stage_id,
            "actual_date": actual_date,
            "planned_date": planned_date,
            "side_effects": {
                "date_record_created": True,
                "quality_control_created": stage.stage_name in ["Entrega", "Re-entrega a TI"],
                "functionality_recorded": stage.stage_name in ["Testing", "Validación de Correcciones"],
                "delivery_history_created": stage.stage_name == "Entrega a Producción",
                "kpis_recalculated": stage.stage_name in ["Entrega", "Re-entrega a TI", "Entrega a Producción"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cerrando etapa: {str(e)}"
        )


@router.get("/{development_id}/stages")
def get_development_stages(
    development_id: str,
    db: Session = Depends(get_db)
):
    """
    Obtener todas las etapas disponibles para un desarrollo
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
        
        # Obtener todas las etapas activas
        stages = db.query(models.DevelopmentStage).filter(
            models.DevelopmentStage.is_active == True
        ).order_by(models.DevelopmentStage.sort_order).all()
        
        # Obtener fechas ya registradas para este desarrollo
        existing_dates = db.query(models.DevelopmentDate).filter(
            models.DevelopmentDate.development_id == development_id
        ).all()
        
        # Mapear fechas existentes por tipo
        dates_by_type = {d.date_type: d for d in existing_dates}
        
        # Formatear respuesta
        stages_data = []
        for stage in stages:
            stage_data = {
                "id": stage.id,
                "stage_code": stage.stage_code,
                "stage_name": stage.stage_name,
                "stage_description": stage.stage_description,
                "responsible_party": stage.responsible_party,
                "is_milestone": stage.is_milestone,
                "estimated_days": stage.estimated_days,
                "sort_order": stage.sort_order,
                "phase_id": stage.phase_id,
                "phase_name": stage.phase.phase_name if stage.phase else None
            }
            
            # Agregar fechas si existen
            date_key = stage.stage_name.lower().replace(" ", "_")
            if date_key in dates_by_type:
                existing_date = dates_by_type[date_key]
                stage_data["planned_date"] = existing_date.planned_date
                stage_data["actual_date"] = existing_date.actual_date
                stage_data["is_completed"] = existing_date.actual_date is not None
            else:
                stage_data["is_completed"] = False
            
            stages_data.append(stage_data)
        
        return {
            "development_id": development_id,
            "stages": stages_data,
            "total_stages": len(stages_data),
            "completed_stages": len([s for s in stages_data if s["is_completed"]])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo etapas: {str(e)}"
        )
