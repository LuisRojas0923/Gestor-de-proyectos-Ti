"""
Endpoints de API para gestión de desarrollos - Versión 2.0
Integración completa con sistema de fases y etapas
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from .. import models, schemas, crud
from ..database import get_db

router = APIRouter(prefix="/desarrollos", tags=["desarrollos"])

@router.post("/masivo")
def create_developments_bulk(
    developments: List[schemas.DevelopmentCreate],
    db: Session = Depends(get_db)
):
    """Importar múltiples desarrollos (Excel/Portal)"""
    try:
        result = crud.create_developments_bulk(db, developments)
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


@router.get("/", response_model=List[schemas.DevelopmentWithCurrentStatus])
def get_developments(
    skip: int = 0,
    limit: int = 100,
    phase_id: Optional[int] = None,
    stage_id: Optional[int] = None,
    provider: Optional[str] = None,
    module: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Listar desarrollos con filtros avanzados
    
    - **skip**: Número de registros a omitir (paginación)
    - **limit**: Número máximo de registros a retornar
    - **phase_id**: Filtrar por fase específica
    - **stage_id**: Filtrar por etapa específica
    - **provider**: Filtrar por proveedor
    - **module**: Filtrar por módulo
    - **type**: Filtrar por tipo de desarrollo
    
    Retorna desarrollos con información completa de fase y etapa actual
    """
    try:
        from sqlalchemy.orm import joinedload
        
        query = db.query(models.Development).options(
            joinedload(models.Development.current_phase),
            joinedload(models.Development.current_stage)
        )
        
        # Aplicar filtros
        if phase_id is not None:
            query = query.filter(models.Development.current_phase_id == phase_id)
        
        if stage_id is not None:
            query = query.filter(models.Development.current_stage_id == stage_id)
        
        if provider:
            query = query.filter(models.Development.provider.ilike(f"%{provider}%"))
        
        if module:
            query = query.filter(models.Development.module.ilike(f"%{module}%"))
        
        if type:
            query = query.filter(models.Development.type.ilike(f"%{type}%"))
        
        # Ordenamiento por defecto: activos primero, cancelados/completados al final
        from sqlalchemy import case
        query = query.order_by(
            # Prioridad por estado: Pendiente y En curso primero, Completado y Cancelado al final
            case(
                (models.Development.general_status == 'Pendiente', 1),
                (models.Development.general_status == 'En curso', 2),
                (models.Development.general_status == 'Completado', 3),
                (models.Development.general_status == 'Cancelado', 4),
                else_=5  # Cualquier otro estado
            ),
            # Dentro del mismo grupo de estado, ordenar por fecha de actualización más reciente
            models.Development.updated_at.desc()
        )
        
        developments = query.offset(skip).limit(limit).all()
        
        # Agregar información de última actividad para cada desarrollo
        for development in developments:
            # Obtener la última actividad del desarrollo con JOIN a development_stages
            last_activity_query = db.query(
                models.DevelopmentActivityLog,
                models.DevelopmentStage.stage_name
            ).join(
                models.DevelopmentStage, 
                models.DevelopmentActivityLog.stage_id == models.DevelopmentStage.id
            ).filter(
                models.DevelopmentActivityLog.development_id == development.id
            ).order_by(
                models.DevelopmentActivityLog.created_at.desc()
            ).first()
            
            if last_activity_query:
                activity_log, stage_name = last_activity_query
                development.last_activity = {
                    "id": activity_log.id,
                    "stage_id": activity_log.stage_id,
                    "stage_name": stage_name,
                    "activity_type": activity_log.activity_type,
                    "status": activity_log.status,
                    "created_at": activity_log.created_at.isoformat() if activity_log.created_at else None,
                    "notes": activity_log.notes,
                    "dynamic_payload": activity_log.dynamic_payload
                }
            else:
                development.last_activity = None
        
        return developments
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo desarrollos: {str(e)}"
        )


@router.post("/", response_model=schemas.DevelopmentWithCurrentStatus)
def create_development(
    development: schemas.DevelopmentCreateV2,
    db: Session = Depends(get_db)
):
    """
    Crear nuevo desarrollo con asignación automática de fase/etapa
    
    Si no se especifica fase/etapa, se asigna automáticamente a:
    - Fase: "En Ejecución" (ID: 1)  
    - Etapa: "Definición" (código: '1')
    """
    try:
        # Crear desarrollo básico
        db_development = models.Development(
            id=development.id,
            name=development.name,
            description=development.description,
            module=development.module,
            type=development.type,
            environment=development.environment,
            portal_link=development.portal_link,
            provider=development.provider,
            general_status=development.general_status or "En curso",
            estimated_end_date=development.estimated_end_date
        )
        
        # Asignar fase y etapa inicial si no se especifica
        if not development.current_phase_id:
            # Buscar fase "En Ejecución"
            phase = db.query(models.DevelopmentPhase).filter(
                models.DevelopmentPhase.phase_name == "En Ejecución"
            ).first()
            if phase:
                db_development.current_phase_id = phase.id
        else:
            db_development.current_phase_id = development.current_phase_id
        
        if not development.current_stage_id:
            # Buscar etapa "Definición" (código '1')
            stage = db.query(models.DevelopmentStage).filter(
                models.DevelopmentStage.stage_code == "1"
            ).first()
            if stage:
                db_development.current_stage_id = stage.id
        else:
            db_development.current_stage_id = development.current_stage_id
        
        # Guardar en base de datos
        db.add(db_development)
        db.commit()
        db.refresh(db_development)
        
        # Crear registro en historial de estados
        status_history = models.DevelopmentStatusHistory(
            development_id=db_development.id,
            status=db_development.general_status,
            progress_stage="Definición",  # Etapa inicial por defecto
            changed_by="Sistema",
            previous_status=None
        )
        db.add(status_history)
        
        # Crear observación inicial
        phase_name = "En Ejecución" if db_development.current_phase_id == 1 else "Sin fase"
        stage_name = "Definición" if db_development.current_stage_id == 1 else "Sin etapa"
        
        initial_observation = models.DevelopmentObservation(
            development_id=db_development.id,
            observation_type="estado",
            content=f"Desarrollo creado y asignado a fase '{phase_name}', etapa '{stage_name}'",
            author="Sistema",
            is_current=True
        )
        db.add(initial_observation)
        
        db.commit()
        
        # Recargar con relaciones
        db.refresh(db_development)
        
        # Cargar relaciones explícitamente
        db_development = db.query(models.Development).options(
            joinedload(models.Development.current_phase),
            joinedload(models.Development.current_stage)
        ).filter(models.Development.id == db_development.id).first()
        
        return db_development
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando desarrollo: {str(e)}"
        )



@router.get("/informe-detallado-casos-portal")
def get_portal_cases_detailed_report(
    status_filter: Optional[str] = None,
    provider_filter: Optional[str] = None,
    module_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Generar informe detallado de todos los casos del Portal
    """
    try:
        # Query base simple para probar
        developments = db.query(models.Development).limit(10).all()
        
        # Procesar cada desarrollo
        detailed_cases = []
        
        for dev in developments:
            case_detail = {
                "portal_id": dev.id,
                "name": dev.name,
                "description": dev.description,
                "module": dev.module,
                "type": dev.type,
                "environment": dev.environment,
                "portal_link": dev.portal_link,
                "general_status": dev.general_status,
                "provider": dev.provider,
                "main_responsible": dev.responsible,
                "progress_percentage": float(dev.stage_progress_percentage or 0),
                "important_dates": {
                    "created_at": dev.created_at.isoformat() if dev.created_at else None,
                    "updated_at": dev.updated_at.isoformat() if dev.updated_at else None,
                    "estimated_end_date": dev.estimated_end_date.isoformat() if dev.estimated_end_date else None
                }
            }
            detailed_cases.append(case_detail)
        
        # Generar resumen ejecutivo
        summary = {
            "total_cases": len(detailed_cases),
            "status_distribution": {},
            "provider_distribution": {},
            "module_distribution": {},
            "generated_at": datetime.now().isoformat(),
            "filters_applied": {
                "status_filter": status_filter,
                "provider_filter": provider_filter,
                "module_filter": module_filter,
                "start_date": start_date,
                "end_date": end_date
            }
        }
        
        return {
            "summary": summary,
            "cases": detailed_cases
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando informe de casos del Portal: {str(e)}"
        )


@router.get("/{development_id}", response_model=schemas.DevelopmentWithFullDetails)
def get_development(
    development_id: str,
    db: Session = Depends(get_db)
):
    """
    Obtener desarrollo por ID con información completa
    
    Incluye fase actual, etapa, fechas, propuestas, instaladores,
    proveedores, responsables, controles de calidad, etc.
    """
    try:
        from sqlalchemy.orm import joinedload
        
        development = db.query(models.Development).options(
            joinedload(models.Development.current_phase),
            joinedload(models.Development.current_stage),
            joinedload(models.Development.dates),
            joinedload(models.Development.proposals),
            # joinedload(models.Development.installers),  # ELIMINADO - relación no existe
            joinedload(models.Development.providers),
            joinedload(models.Development.responsibles),
            joinedload(models.Development.quality_controls),
            joinedload(models.Development.upcoming_activities)
        ).filter(models.Development.id == development_id).first()
        
        if not development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Desarrollo con ID {development_id} no encontrado"
            )
        
        return development
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo desarrollo: {str(e)}"
        )


@router.put("/{development_id}", response_model=schemas.DevelopmentWithCurrentStatus)
def update_development(
    development_id: str,
    development_update: schemas.DevelopmentUpdate,
    db: Session = Depends(get_db)
):
    """
    Actualizar desarrollo existente
    
    Permite actualizar los campos básicos del desarrollo como nombre, descripción,
    proveedor, estado general, fechas estimadas, etc. No modifica la fase/etapa actual.
    """
    try:
        # Obtener desarrollo
        development = db.query(models.Development).filter(
            models.Development.id == development_id
        ).first()
        
        if not development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Desarrollo con ID {development_id} no encontrado"
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


@router.put("/{development_id}/etapa", response_model=schemas.DevelopmentWithCurrentStatus)
def change_development_stage(
    development_id: str,
    stage_update: schemas.DevelopmentStageUpdate,
    db: Session = Depends(get_db)
):
    """
    Cambiar etapa del desarrollo con generación automática de controles
    
    Actualiza la etapa actual del desarrollo, registra el cambio
    en el historial y genera controles de calidad automáticamente.
    """
    try:
        from ..services.development_service import DevelopmentService
        
        # Usar DevelopmentService que incluye generación automática de controles
        development_service = DevelopmentService(db)
        
        # Cambiar etapa usando el servicio
        updated_development = development_service.change_development_stage(
            development_id=development_id,
            new_stage_id=stage_update.new_stage_id,
            progress_percentage=stage_update.progress_percentage,
            notes=getattr(stage_update, 'notes', None),
            changed_by=stage_update.changed_by or "Usuario"
        )
        
        return updated_development
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cambiando etapa: {str(e)}"
        )


@router.get("/{development_id}/estado-actual")
def get_development_current_status(
    development_id: str,
    db: Session = Depends(get_db)
):
    """
    Obtener estado actual del desarrollo con información de fase y etapa
    
    Retorna información resumida del estado actual, progreso y próximas actividades
    """
    try:
        from sqlalchemy.orm import joinedload
        
        development = db.query(models.Development).options(
            joinedload(models.Development.current_phase),
            joinedload(models.Development.current_stage),
            joinedload(models.Development.upcoming_activities)
        ).filter(models.Development.id == development_id).first()
        
        if not development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Desarrollo con ID {development_id} no encontrado"
            )
        
        # Obtener próximas actividades pendientes
        upcoming_activities = [
            activity for activity in development.upcoming_activities 
            if activity.status == "Pendiente"
        ]
        
        return {
            "development_id": development.id,
            "name": development.name,
            "current_phase": {
                "id": development.current_phase.id,
                "name": development.current_phase.phase_name,
                "color": development.current_phase.phase_color
            } if development.current_phase else None,
            "current_stage": {
                "id": development.current_stage.id,
                "code": development.current_stage.stage_code,
                "name": development.current_stage.stage_name,
                "is_milestone": development.current_stage.is_milestone,
                "responsible_party": development.current_stage.responsible_party
            } if development.current_stage else None,
            "progress_percentage": float(development.stage_progress_percentage or 0),
            "general_status": development.general_status,
            "upcoming_activities_count": len(upcoming_activities),
            "last_updated": development.updated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estado actual: {str(e)}"
        )


@router.get("/{development_id}/observaciones", response_model=List[schemas.DevelopmentObservation])
def get_development_observations(
    development_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Obtener observaciones del desarrollo
    
    Retorna la lista de observaciones/actividades registradas en la bitácora del desarrollo,
    ordenadas por fecha de observación (más recientes primero).
    
    - **skip**: Número de registros a omitir (paginación)
    - **limit**: Número máximo de registros a retornar
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


@router.post("/{development_id}/observaciones", response_model=schemas.DevelopmentObservation)
def create_development_observation(
    development_id: str,
    observation: schemas.DevelopmentObservationCreate,
    db: Session = Depends(get_db)
):
    """
    Crear nueva observación/actividad en bitácora del desarrollo
    
    Permite registrar nuevas observaciones, actividades, cambios de estado,
    o cualquier información relevante en la bitácora del desarrollo.
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


@router.put("/{development_id}/observaciones/{observation_id}", response_model=schemas.DevelopmentObservation)
def update_development_observation(
    development_id: str,
    observation_id: int,
    observation_update: schemas.DevelopmentObservationUpdate,
    db: Session = Depends(get_db)
):
    """
    Actualizar observación existente
    
    Permite modificar el contenido, tipo o estado de una observación existente.
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
        
        # Obtener observación
        observation = db.query(models.DevelopmentObservation).filter(
            models.DevelopmentObservation.id == observation_id,
            models.DevelopmentObservation.development_id == development_id
        ).first()
        
        if not observation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Observación {observation_id} no encontrada para el desarrollo {development_id}"
            )
        
        # Actualizar campos
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


@router.delete("/{development_id}")
def delete_development(
    development_id: str,
    db: Session = Depends(get_db)
):
    """
    Eliminar desarrollo
    
    Elimina un desarrollo y todas sus observaciones relacionadas.
    Esta acción no se puede deshacer.
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
        
        # Eliminar todas las observaciones relacionadas primero
        db.query(models.DevelopmentObservation).filter(
            models.DevelopmentObservation.development_id == development_id
        ).delete()
        
        # Eliminar el desarrollo
        db.delete(development)
        db.commit()
        
        return {"message": "Desarrollo eliminado exitosamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error eliminando desarrollo: {str(e)}"
        )


@router.get("/punto-prueba")
def test_endpoint():
    """Endpoint de prueba simple"""
    return {"message": "Endpoint funcionando correctamente"}

