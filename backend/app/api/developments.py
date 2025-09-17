"""
Endpoints de API para gestión de desarrollos
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from .. import crud, models
from ..schemas import development as dev_schemas
from ..database import get_db

router = APIRouter(prefix="/developments", tags=["developments"])


@router.get("/", response_model=List[dev_schemas.Development])
def get_developments(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    provider: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Listar desarrollos con filtros opcionales"""
    if status:
        return crud.get_developments_by_status(db, status, skip, limit)
    elif provider:
        return crud.get_developments_by_provider(db, provider, skip, limit)
    else:
        return crud.get_developments(db, skip, limit)


@router.post("/", response_model=dev_schemas.Development)
def create_development(
    development: dev_schemas.DevelopmentCreate,
    db: Session = Depends(get_db)
):
    """Crear nuevo desarrollo"""
    return crud.create_development(db, development)


@router.get("/{development_id}", response_model=dev_schemas.Development)
def get_development(
    development_id: str,
    db: Session = Depends(get_db)
):
    """Obtener desarrollo por ID"""
    development = crud.get_development(db, development_id)
    if not development:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Development not found"
        )
    return development


@router.put("/{development_id}", response_model=dev_schemas.Development)
def update_development(
    development_id: str,
    development_update: dev_schemas.DevelopmentUpdate,
    db: Session = Depends(get_db)
):
    """Actualizar desarrollo existente"""
    try:
        # Obtener desarrollo
        development = db.query(models.Development).filter(
            models.Development.id == development_id
        ).first()
        
        if not development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Desarrollo {development_id} no encontrado"
            )
        
        # Actualizar campos proporcionados
        update_data = development_update.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(development, field, value)
        
        development.updated_at = datetime.now()
        
        db.commit()
        db.refresh(development)
        
        return development
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error actualizando desarrollo: {str(e)}"
        )


@router.delete("/{development_id}")
def delete_development(
    development_id: str,
    db: Session = Depends(get_db)
):
    """Eliminar desarrollo"""
    development = crud.delete_development(db, development_id)
    if not development:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Development not found"
        )
    return {"message": "Development deleted successfully"}


@router.post("/bulk")
def create_developments_bulk(
    developments: List[dev_schemas.DevelopmentCreate],
    db: Session = Depends(get_db)
):
    """Importar múltiples desarrollos, actualizando estados de existentes"""
    try:
        print(f"Recibidos {len(developments)} desarrollos para importar")
        print(f"Primer desarrollo: {developments[0].dict() if developments else 'No hay datos'}")
        result = crud.create_developments_bulk(db, developments)
        
        # Crear mensaje detallado
        summary = result['summary']
        message = f"Importación completada: {summary['created']} creados, {summary['updated']} actualizados, {summary['skipped']} sin cambios"
        
        return {
            "message": message,
            "data": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en la importación masiva: {str(e)}"
        )


# Endpoints específicos según arquitectura
@router.patch("/{development_id}/stage")
def change_development_stage(
    development_id: str,
    stage_update: dev_schemas.DevelopmentStageUpdate,
    db: Session = Depends(get_db)
):
    """Cambiar etapa del desarrollo"""
    try:
        # Obtener desarrollo
        development = db.query(models.Development).filter(
            models.Development.id == development_id
        ).first()
        
        if not development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Desarrollo {development_id} no encontrado"
            )
        
        # Verificar que la nueva etapa existe
        new_stage = db.query(models.DevelopmentStage).filter(
            models.DevelopmentStage.id == stage_update.stage_id
        ).first()
        
        if not new_stage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Etapa {stage_update.stage_id} no encontrada"
            )
        
        # Guardar etapa anterior para el historial
        previous_stage_id = development.current_stage_id
        
        # Actualizar etapa
        development.current_stage_id = stage_update.stage_id
        if stage_update.progress_percentage is not None:
            development.stage_progress_percentage = stage_update.progress_percentage
        
        development.updated_at = datetime.now()
        
        # Crear registro en historial de estados
        history = models.DevelopmentStatusHistory(
            development_id=development_id,
            status=development.general_status,
            progress_stage=str(stage_update.stage_id),
            changed_by=stage_update.changed_by,
            previous_status=str(previous_stage_id) if previous_stage_id else None
        )
        
        db.add(history)
        db.commit()
        db.refresh(development)
        
        return {
            "message": "Etapa actualizada exitosamente",
            "development_id": development_id,
            "previous_stage_id": previous_stage_id,
            "new_stage_id": stage_update.stage_id,
            "stage_name": new_stage.stage_name,
            "progress_percentage": development.stage_progress_percentage
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cambiando etapa: {str(e)}"
        )


@router.patch("/{development_id}/progress")
def update_stage_progress(
    development_id: str,
    progress_update: dev_schemas.DevelopmentProgressUpdate,
    db: Session = Depends(get_db)
):
    """Actualizar progreso de etapa"""
    try:
        # Obtener desarrollo
        development = db.query(models.Development).filter(
            models.Development.id == development_id
        ).first()
        
        if not development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Desarrollo {development_id} no encontrado"
            )
        
        # Actualizar progreso
        development.stage_progress_percentage = progress_update.progress_percentage
        development.updated_at = datetime.now()
        
        # Crear registro en historial si se proporcionan notas
        if progress_update.notes:
            history = models.DevelopmentStatusHistory(
                development_id=development_id,
                status=development.general_status,
                progress_stage=f"Progreso actualizado: {progress_update.progress_percentage}%",
                changed_by=progress_update.updated_by
            )
            db.add(history)
        
        db.commit()
        db.refresh(development)
        
        return {
            "message": "Progreso actualizado exitosamente",
            "development_id": development_id,
            "progress_percentage": development.stage_progress_percentage,
            "updated_at": development.updated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error actualizando progreso: {str(e)}"
        )


@router.get("/{development_id}/current-status")
def get_current_status(
    development_id: str,
    db: Session = Depends(get_db)
):
    """Estado actual con fase y etapa"""
    # TODO: Implementar usando las nuevas relaciones de fase/etapa
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{development_id}/dates")
def get_development_dates(
    development_id: str,
    db: Session = Depends(get_db)
):
    """Fechas del desarrollo"""
    # TODO: Implementar usando DevelopmentDate
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{development_id}/proposals")
def get_development_proposals(
    development_id: str,
    db: Session = Depends(get_db)
):
    """Propuestas del desarrollo"""
    # TODO: Implementar usando DevelopmentProposal
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{development_id}/installers")
def get_development_installers(
    development_id: str,
    db: Session = Depends(get_db)
):
    """Instaladores del desarrollo"""
    # TODO: Implementar usando DevelopmentInstaller
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{development_id}/providers")
def get_development_providers(
    development_id: str,
    db: Session = Depends(get_db)
):
    """Proveedores del desarrollo"""
    # TODO: Implementar usando DevelopmentProvider
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{development_id}/responsibles")
def get_development_responsibles(
    development_id: str,
    db: Session = Depends(get_db)
):
    """Responsables del desarrollo"""
    # TODO: Implementar usando DevelopmentResponsible
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{development_id}/status-history")
def get_status_history(
    development_id: str,
    db: Session = Depends(get_db)
):
    """Historial de estados"""
    # TODO: Implementar usando DevelopmentStatusHistory
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{development_id}/observations", response_model=List[dev_schemas.DevelopmentObservation])
def get_development_observations(
    development_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Obtener observaciones del desarrollo"""
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
        
        # Obtener observaciones
        observations = db.query(models.DevelopmentObservation).filter(
            models.DevelopmentObservation.development_id == development_id
        ).order_by(
            models.DevelopmentObservation.observation_date.desc()
        ).offset(skip).limit(limit).all()
        
        return observations
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo observaciones: {str(e)}"
        )


@router.post("/{development_id}/observations", response_model=dev_schemas.DevelopmentObservation)
def create_development_observation(
    development_id: str,
    observation: dev_schemas.DevelopmentObservationCreate,
    db: Session = Depends(get_db)
):
    """Crear nueva observación/actividad en bitácora"""
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
        
        # Crear observación
        db_observation = models.DevelopmentObservation(
            development_id=development_id,
            **observation.dict()
        )
        
        db.add(db_observation)
        db.commit()
        db.refresh(db_observation)
        
        return db_observation
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando observación: {str(e)}"
        )


@router.put("/{development_id}/observations/{observation_id}", response_model=dev_schemas.DevelopmentObservation)
def update_development_observation(
    development_id: str,
    observation_id: int,
    observation_update: dev_schemas.DevelopmentObservationUpdate,
    db: Session = Depends(get_db)
):
    """Actualizar observación existente"""
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
        
        # Obtener observación
        observation = db.query(models.DevelopmentObservation).filter(
            models.DevelopmentObservation.id == observation_id,
            models.DevelopmentObservation.development_id == development_id
        ).first()
        
        if not observation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Observación {observation_id} no encontrada"
            )
        
        # Actualizar campos proporcionados
        update_data = observation_update.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(observation, field, value)
        
        observation.updated_at = datetime.now()
        
        db.commit()
        db.refresh(observation)
        
        return observation
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error actualizando observación: {str(e)}"
        )


@router.delete("/{development_id}/observations/{observation_id}")
def delete_development_observation(
    development_id: str,
    observation_id: int,
    db: Session = Depends(get_db)
):
    """Eliminar observación"""
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
        
        # Obtener observación
        observation = db.query(models.DevelopmentObservation).filter(
            models.DevelopmentObservation.id == observation_id,
            models.DevelopmentObservation.development_id == development_id
        ).first()
        
        if not observation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Observación {observation_id} no encontrada"
            )
        
        db.delete(observation)
        db.commit()
        
        return {"message": "Observación eliminada exitosamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error eliminando observación: {str(e)}"
        )


@router.get("/{development_id}/activities")
def get_development_activities(
    development_id: str,
    db: Session = Depends(get_db)
):
    """Actividades del desarrollo (usando DevelopmentUpcomingActivity)"""
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
        
        # Obtener actividades próximas
        activities = db.query(models.DevelopmentUpcomingActivity).filter(
            models.DevelopmentUpcomingActivity.development_id == development_id
        ).order_by(
            models.DevelopmentUpcomingActivity.due_date.desc()
        ).all()
        
        return activities
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo actividades: {str(e)}"
        )


@router.get("/{development_id}/functionalities")
def get_development_functionalities(
    development_id: str,
    db: Session = Depends(get_db)
):
    """Funcionalidades del desarrollo"""
    # TODO: Implementar usando DevelopmentFunctionality
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{development_id}/test-results")
def get_test_results(
    development_id: str,
    db: Session = Depends(get_db)
):
    """Resultados de pruebas"""
    # TODO: Implementar usando DevelopmentTestResult
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{development_id}/delivery-history")
def get_delivery_history(
    development_id: str,
    db: Session = Depends(get_db)
):
    """Historial de entregas"""
    # TODO: Implementar usando DevelopmentDeliveryHistory
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{development_id}/quality-metrics")
def get_quality_metrics(
    development_id: str,
    db: Session = Depends(get_db)
):
    """Métricas de calidad"""
    # TODO: Implementar usando DevelopmentQualityMetric
    raise HTTPException(status_code=501, detail="Not implemented yet")
