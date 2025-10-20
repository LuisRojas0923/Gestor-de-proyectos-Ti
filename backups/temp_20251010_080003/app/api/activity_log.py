"""
API endpoints para el log de actividades de desarrollo
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional
from datetime import date, datetime

from .. import models, schemas
from ..database import get_db
from ..schemas.activity_log import (
    DevelopmentActivityLogCreate,
    DevelopmentActivityLogUpdate,
    DevelopmentActivityLogResponse,
    ActivityLogListResponse,
    validate_dynamic_payload,
    get_stage_field_config
)

router = APIRouter(prefix="/activity-log", tags=["activity-log"])


@router.post("/developments/{development_id}/activities", response_model=DevelopmentActivityLogResponse)
def create_development_activity(
    development_id: str,
    activity_data: DevelopmentActivityLogCreate,
    db: Session = Depends(get_db)
):
    """
    Crear una nueva actividad en la bitácora de desarrollo
    
    - **development_id**: ID del desarrollo
    - **activity_data**: Datos de la actividad incluyendo campos dinámicos por etapa
    """
    try:
        # Verificar que el desarrollo existe
        development = db.query(models.Development).filter(
            models.Development.id == development_id
        ).first()
        if not development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Desarrollo con ID {development_id} no encontrado"
            )
        
        # Verificar que la etapa existe
        stage = db.query(models.DevelopmentStage).filter(
            models.DevelopmentStage.id == activity_data.stage_id
        ).first()
        if not stage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Etapa con ID {activity_data.stage_id} no encontrada"
            )
        
        # Validar payload dinámico si existe
        validated_payload = None
        if activity_data.dynamic_payload:
            try:
                validated_payload = validate_dynamic_payload(stage.stage_name, activity_data.dynamic_payload)
            except ValueError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e)
                )
        
        # Crear la actividad
        new_activity = models.DevelopmentActivityLog(
            development_id=development_id,
            stage_id=activity_data.stage_id,
            activity_type=activity_data.activity_type,
            start_date=activity_data.start_date,
            end_date=activity_data.end_date,
            next_follow_up_at=activity_data.next_follow_up_at,
            status=activity_data.status,
            actor_type=activity_data.actor_type,
            notes=activity_data.notes,
            dynamic_payload=validated_payload,
            created_by="system"  # TODO: Obtener del usuario autenticado
        )
        
        db.add(new_activity)
        db.commit()
        db.refresh(new_activity)
        
        # Obtener información de la etapa para la respuesta
        stage_info = db.query(models.DevelopmentStage).filter(
            models.DevelopmentStage.id == new_activity.stage_id
        ).first()
        
        # Construir respuesta
        response_data = {
            "id": new_activity.id,
            "development_id": new_activity.development_id,
            "stage_id": new_activity.stage_id,
            "activity_type": new_activity.activity_type,
            "start_date": new_activity.start_date,
            "end_date": new_activity.end_date,
            "next_follow_up_at": new_activity.next_follow_up_at,
            "status": new_activity.status,
            "actor_type": new_activity.actor_type,
            "notes": new_activity.notes,
            "dynamic_payload": new_activity.dynamic_payload,
            "created_by": new_activity.created_by,
            "created_at": new_activity.created_at,
            "updated_at": new_activity.updated_at,
            "stage_name": stage_info.stage_name if stage_info else None,
            "stage_code": stage_info.stage_code if stage_info else None
        }
        
        return DevelopmentActivityLogResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando actividad: {str(e)}"
        )


@router.get("/developments/{development_id}/activities", response_model=ActivityLogListResponse)
def get_development_activities(
    development_id: str,
    stage_id: Optional[int] = Query(None, description="Filtrar por etapa"),
    activity_type: Optional[str] = Query(None, description="Filtrar por tipo de actividad"),
    status: Optional[str] = Query(None, description="Filtrar por estado"),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(20, ge=1, le=100, description="Tamaño de página"),
    db: Session = Depends(get_db)
):
    """
    Obtener actividades de un desarrollo con filtros opcionales
    
    - **development_id**: ID del desarrollo
    - **stage_id**: Filtrar por etapa específica
    - **activity_type**: Filtrar por tipo de actividad
    - **status**: Filtrar por estado
    - **page**: Número de página (default: 1)
    - **size**: Tamaño de página (default: 20, max: 100)
    """
    try:
        # Verificar que el desarrollo existe
        development = db.query(models.Development).filter(
            models.Development.id == development_id
        ).first()
        if not development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Desarrollo con ID {development_id} no encontrado"
            )
        
        # Construir query base
        query = db.query(models.DevelopmentActivityLog).filter(
            models.DevelopmentActivityLog.development_id == development_id
        )
        
        # Aplicar filtros
        if stage_id:
            query = query.filter(models.DevelopmentActivityLog.stage_id == stage_id)
        if activity_type:
            query = query.filter(models.DevelopmentActivityLog.activity_type == activity_type)
        if status:
            query = query.filter(models.DevelopmentActivityLog.status == status)
        
        # Contar total
        total = query.count()
        
        # Aplicar paginación y ordenamiento
        activities = query.order_by(desc(models.DevelopmentActivityLog.created_at)).offset(
            (page - 1) * size
        ).limit(size).all()
        
        # Construir respuesta con información de etapas
        activity_responses = []
        for activity in activities:
            stage_info = db.query(models.DevelopmentStage).filter(
                models.DevelopmentStage.id == activity.stage_id
            ).first()
            
            activity_data = {
                "id": activity.id,
                "development_id": activity.development_id,
                "stage_id": activity.stage_id,
                "activity_type": activity.activity_type,
                "start_date": activity.start_date,
                "end_date": activity.end_date,
                "next_follow_up_at": activity.next_follow_up_at,
                "status": activity.status,
                "actor_type": activity.actor_type,
                "notes": activity.notes,
                "dynamic_payload": activity.dynamic_payload,
                "created_by": activity.created_by,
                "created_at": activity.created_at,
                "updated_at": activity.updated_at,
                "stage_name": stage_info.stage_name if stage_info else None,
                "stage_code": stage_info.stage_code if stage_info else None
            }
            activity_responses.append(DevelopmentActivityLogResponse(**activity_data))
        
        return ActivityLogListResponse(
            activities=activity_responses,
            total=total,
            page=page,
            size=size
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo actividades: {str(e)}"
        )


@router.get("/developments/{development_id}/stages/{stage_id}/field-config")
def get_stage_field_config_endpoint(
    development_id: str,
    stage_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtener configuración de campos para una etapa específica
    
    - **development_id**: ID del desarrollo
    - **stage_id**: ID de la etapa
    """
    try:
        # Verificar que el desarrollo existe
        development = db.query(models.Development).filter(
            models.Development.id == development_id
        ).first()
        if not development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Desarrollo con ID {development_id} no encontrado"
            )
        
        # Obtener información de la etapa
        stage = db.query(models.DevelopmentStage).filter(
            models.DevelopmentStage.id == stage_id
        ).first()
        if not stage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Etapa con ID {stage_id} no encontrada"
            )
        
        # Obtener configuración de campos
        config = get_stage_field_config(stage.stage_name)
        
        # Preparar respuesta serializable
        response_data = {
            "stage_id": stage.id,
            "stage_name": stage.stage_name,
            "stage_code": stage.stage_code,
            "has_dynamic_fields": config is not None,
            "required_fields": [],
            "optional_fields": []
        }
        
        if config:
            response_data["required_fields"] = config.get("required_fields", [])
            response_data["optional_fields"] = config.get("optional_fields", [])
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo configuración de campos: {str(e)}"
        )


@router.put("/activities/{activity_id}", response_model=DevelopmentActivityLogResponse)
def update_development_activity(
    activity_id: int,
    activity_update: DevelopmentActivityLogUpdate,
    db: Session = Depends(get_db)
):
    """
    Actualizar una actividad existente
    
    - **activity_id**: ID de la actividad
    - **activity_update**: Datos a actualizar
    """
    try:
        # Buscar la actividad
        activity = db.query(models.DevelopmentActivityLog).filter(
            models.DevelopmentActivityLog.id == activity_id
        ).first()
        if not activity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Actividad con ID {activity_id} no encontrada"
            )
        
        # Validar payload dinámico si se está actualizando
        validated_payload = activity.dynamic_payload
        if activity_update.dynamic_payload is not None:
            stage = db.query(models.DevelopmentStage).filter(
                models.DevelopmentStage.id == activity.stage_id
            ).first()
            if stage:
                try:
                    validated_payload = validate_dynamic_payload(stage.stage_name, activity_update.dynamic_payload)
                except ValueError as e:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=str(e)
                    )
        
        # Actualizar campos
        update_data = activity_update.dict(exclude_unset=True)
        if validated_payload is not None:
            update_data["dynamic_payload"] = validated_payload
        
        for field, value in update_data.items():
            setattr(activity, field, value)
        
        activity.updated_at = datetime.now()
        
        db.commit()
        db.refresh(activity)
        
        # Obtener información de la etapa para la respuesta
        stage_info = db.query(models.DevelopmentStage).filter(
            models.DevelopmentStage.id == activity.stage_id
        ).first()
        
        # Construir respuesta
        response_data = {
            "id": activity.id,
            "development_id": activity.development_id,
            "stage_id": activity.stage_id,
            "activity_type": activity.activity_type,
            "start_date": activity.start_date,
            "end_date": activity.end_date,
            "next_follow_up_at": activity.next_follow_up_at,
            "status": activity.status,
            "actor_type": activity.actor_type,
            "notes": activity.notes,
            "dynamic_payload": activity.dynamic_payload,
            "created_by": activity.created_by,
            "created_at": activity.created_at,
            "updated_at": activity.updated_at,
            "stage_name": stage_info.stage_name if stage_info else None,
            "stage_code": stage_info.stage_code if stage_info else None
        }
        
        return DevelopmentActivityLogResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error actualizando actividad: {str(e)}"
        )


@router.delete("/activities/{activity_id}")
def delete_development_activity(
    activity_id: int,
    db: Session = Depends(get_db)
):
    """
    Eliminar una actividad de la bitácora
    
    - **activity_id**: ID de la actividad a eliminar
    """
    try:
        # Buscar la actividad
        activity = db.query(models.DevelopmentActivityLog).filter(
            models.DevelopmentActivityLog.id == activity_id
        ).first()
        
        if not activity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Actividad no encontrada"
            )
        
        # Eliminar la actividad
        db.delete(activity)
        db.commit()
        
        return {"message": "Actividad eliminada exitosamente", "activity_id": activity_id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error eliminando actividad: {str(e)}"
        )
