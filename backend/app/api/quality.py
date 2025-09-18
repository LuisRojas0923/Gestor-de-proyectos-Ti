"""
Endpoints de API para controles de calidad (FD-PR-072)
Implementación completa del sistema de controles según procedimiento
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/quality", tags=["quality"])


@router.get("/catalog", response_model=List[schemas.QualityControlCatalog])
def get_quality_control_catalog(
    stage_prefix: Optional[str] = None,
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    """
    Obtener catálogo de controles de calidad (FD-PR-072)
    
    - **stage_prefix**: Filtrar por prefijo de etapas (ej: '1-2', '5-7')
    - **is_active**: Solo controles activos (default: True)
    
    Retorna todos los controles definidos en el procedimiento FD-PR-072
    """
    try:
        query = db.query(models.QualityControlCatalog)
        
        if is_active:
            query = query.filter(models.QualityControlCatalog.is_active == True)
        
        if stage_prefix:
            query = query.filter(models.QualityControlCatalog.stage_prefix.like(f"%{stage_prefix}%"))
        
        controls = query.order_by(models.QualityControlCatalog.control_code).all()
        
        return controls
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo catálogo de controles: {str(e)}"
        )


@router.get("/controls", response_model=List[schemas.DevelopmentQualityControlWithCatalog])
def get_quality_controls(
    development_id: Optional[str] = None,
    control_status: Optional[str] = None,
    validation_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Obtener controles de calidad de desarrollos
    
    - **development_id**: Filtrar por desarrollo específico
    - **control_status**: Filtrar por estado del control ('Pendiente', 'Completado', 'No Aplica', 'Rechazado')
    - **validation_status**: Filtrar por estado de validación ('Pendiente', 'Validado', 'Rechazado', 'En Revisión')
    - **skip**: Paginación - registros a omitir
    - **limit**: Paginación - máximo de registros
    """
    try:
        query = db.query(models.DevelopmentQualityControl).options(
            joinedload(models.DevelopmentQualityControl.catalog),
            joinedload(models.DevelopmentQualityControl.development)
        )
        
        if development_id:
            query = query.filter(models.DevelopmentQualityControl.development_id == development_id)
        
        if control_status:
            query = query.filter(models.DevelopmentQualityControl.status == control_status)
        
        if validation_status:
            query = query.filter(models.DevelopmentQualityControl.validation_status == validation_status)
        
        controls = query.order_by(
            models.DevelopmentQualityControl.created_at.desc()
        ).offset(skip).limit(limit).all()
        
        return controls
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo controles: {str(e)}"
        )


@router.post("/controls", response_model=schemas.DevelopmentQualityControl)
def create_quality_control(
    control: schemas.DevelopmentQualityControlCreate,
    db: Session = Depends(get_db)
):
    """
    Crear control de calidad para un desarrollo
    
    Asigna un control específico del catálogo a un desarrollo
    """
    try:
        # Verificar que el desarrollo existe
        development = db.query(models.Development).filter(
            models.Development.id == control.development_id
        ).first()
        
        if not development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Desarrollo {control.development_id} no encontrado"
            )
        
        # Verificar que el control del catálogo existe
        catalog_control = db.query(models.QualityControlCatalog).filter(
            models.QualityControlCatalog.id == control.control_catalog_id
        ).first()
        
        if not catalog_control:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Control de catálogo {control.control_catalog_id} no encontrado"
            )
        
        # Verificar que no existe ya este control para el desarrollo
        existing_control = db.query(models.DevelopmentQualityControl).filter(
            models.DevelopmentQualityControl.development_id == control.development_id,
            models.DevelopmentQualityControl.control_catalog_id == control.control_catalog_id
        ).first()
        
        if existing_control:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Control {catalog_control.control_code} ya existe para desarrollo {control.development_id}"
            )
        
        # Crear el control
        db_control = models.DevelopmentQualityControl(
            development_id=control.development_id,
            control_catalog_id=control.control_catalog_id,
            control_code=catalog_control.control_code,
            status=control.status or "Pendiente",
            validation_status=control.validation_status or "Pendiente",
            deliverables_provided=control.deliverables_provided,
            validation_notes=control.validation_notes
        )
        
        db.add(db_control)
        db.commit()
        db.refresh(db_control)
        
        return db_control
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando control: {str(e)}"
        )


@router.put("/controls/{control_id}", response_model=schemas.DevelopmentQualityControl)
def update_quality_control(
    control_id: int,
    control_update: schemas.DevelopmentQualityControlUpdate,
    db: Session = Depends(get_db)
):
    """
    Actualizar control de calidad
    
    Permite actualizar el estado, entregables y notas del control
    """
    try:
        # Obtener el control
        control = db.query(models.DevelopmentQualityControl).filter(
            models.DevelopmentQualityControl.id == control_id
        ).first()
        
        if not control:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Control {control_id} no encontrado"
            )
        
        # Actualizar campos proporcionados
        update_data = control_update.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(control, field, value)
        
        # Registrar quien completó si se marca como completado
        if control_update.status == "Completado" and not control.completed_by:
            control.completed_by = control_update.completed_by or "Sistema"
            control.completed_at = datetime.now()
        
        control.updated_at = datetime.now()
        
        db.commit()
        db.refresh(control)
        
        return control
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error actualizando control: {str(e)}"
        )


@router.post("/controls/{control_id}/validate", response_model=schemas.DevelopmentQualityControl)
def validate_quality_control(
    control_id: int,
    validation_data: schemas.QualityControlValidationRequest,
    db: Session = Depends(get_db)
):
    """
    Validar control de calidad
    
    Proceso de validación formal del control con evidencias y notas
    """
    try:
        # Obtener el control
        control = db.query(models.DevelopmentQualityControl).filter(
            models.DevelopmentQualityControl.id == control_id
        ).first()
        
        if not control:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Control {control_id} no encontrado"
            )
        
        # Verificar que el control esté completado
        if control.status != "Completado":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo se pueden validar controles completados"
            )
        
        # Actualizar validación
        control.validation_status = validation_data.validation_result
        control.validated_by = validation_data.validator_name
        control.validated_at = datetime.now()
        control.validation_notes = validation_data.validation_notes
        
        if validation_data.validation_result == "Rechazado":
            control.rejection_reason = validation_data.rejection_reason
            # Si se rechaza, volver el control a estado pendiente
            control.status = "Pendiente"
        
        if validation_data.evidence_files:
            control.evidence_files = validation_data.evidence_files
        
        control.updated_at = datetime.now()
        
        db.commit()
        db.refresh(control)
        
        return control
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error validando control: {str(e)}"
        )


@router.get("/controls/{control_id}/evidence")
def get_control_evidence(
    control_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtener evidencias del control de calidad
    
    Retorna archivos de evidencia y documentación asociada
    """
    try:
        control = db.query(models.DevelopmentQualityControl).options(
            joinedload(models.DevelopmentQualityControl.catalog)
        ).filter(models.DevelopmentQualityControl.id == control_id).first()
        
        if not control:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Control {control_id} no encontrado"
            )
        
        # Parsear archivos de evidencia si existen
        evidence_files = []
        if control.evidence_files:
            import json
            try:
                evidence_files = json.loads(control.evidence_files)
            except json.JSONDecodeError:
                evidence_files = [control.evidence_files]  # Fallback para string simple
        
        return {
            "control_id": control.id,
            "control_code": control.control_code,
            "development_id": control.development_id,
            "deliverables_required": control.catalog.deliverables if control.catalog else None,
            "deliverables_provided": control.deliverables_provided,
            "evidence_files": evidence_files,
            "validation_notes": control.validation_notes,
            "validation_status": control.validation_status,
            "validated_by": control.validated_by,
            "validated_at": control.validated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo evidencias: {str(e)}"
        )


@router.post("/developments/backfill-controls")
def backfill_controls_for_all_developments(
    db: Session = Depends(get_db)
):
    """
    Generar controles automáticos para todos los desarrollos existentes
    
    Proceso de backfill para desarrollos que no tienen controles asignados
    según su etapa actual.
    """
    try:
        from ..services.development_service import DevelopmentService
        
        development_service = DevelopmentService(db)
        
        # Obtener todos los desarrollos con su etapa actual
        developments = db.query(models.Development).options(
            joinedload(models.Development.current_stage)
        ).filter(models.Development.current_stage_id.isnot(None)).all()
        
        results = []
        total_processed = 0
        total_controls_created = 0
        
        for development in developments:
            if not development.current_stage:
                continue
                
            # Verificar si ya tiene controles
            existing_controls = db.query(models.DevelopmentQualityControl).filter(
                models.DevelopmentQualityControl.development_id == development.id
            ).count()
            
            if existing_controls == 0:
                # Generar controles para este desarrollo
                try:
                    created_controls = development_service.quality_service.generate_automatic_controls(
                        development_id=development.id,
                        stage_code=development.current_stage.stage_code
                    )
                    
                    results.append({
                        "development_id": development.id,
                        "development_name": development.name,
                        "current_stage": development.current_stage.stage_name,
                        "stage_code": development.current_stage.stage_code,
                        "controls_created": len(created_controls),
                        "control_codes": [c.control_code for c in created_controls]
                    })
                    
                    total_controls_created += len(created_controls)
                    
                except Exception as e:
                    results.append({
                        "development_id": development.id,
                        "development_name": development.name,
                        "current_stage": development.current_stage.stage_name,
                        "stage_code": development.current_stage.stage_code,
                        "error": str(e)
                    })
            
            total_processed += 1
        
        return {
            "message": "Proceso de backfill completado",
            "total_developments_processed": total_processed,
            "total_controls_created": total_controls_created,
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en proceso de backfill: {str(e)}"
        )


@router.post("/developments/{development_id}/generate-controls")
def generate_automatic_controls(
    development_id: str,
    db: Session = Depends(get_db)
):
    """
    Generar controles automáticos para un desarrollo
    
    Basado en la etapa actual del desarrollo, genera los controles aplicables
    """
    try:
        # Obtener desarrollo con su etapa actual
        development = db.query(models.Development).options(
            joinedload(models.Development.current_stage)
        ).filter(models.Development.id == development_id).first()
        
        if not development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Desarrollo {development_id} no encontrado"
            )
        
        if not development.current_stage:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Desarrollo no tiene etapa asignada"
            )
        
        # Obtener controles aplicables para la etapa
        stage_code = development.current_stage.stage_code
        applicable_controls = db.query(models.QualityControlCatalog).filter(
            models.QualityControlCatalog.stage_prefix.like(f"%{stage_code}%"),
            models.QualityControlCatalog.is_active == True
        ).all()
        
        created_controls = []
        
        for catalog_control in applicable_controls:
            # Verificar si ya existe este control
            existing = db.query(models.DevelopmentQualityControl).filter(
                models.DevelopmentQualityControl.development_id == development_id,
                models.DevelopmentQualityControl.control_catalog_id == catalog_control.id
            ).first()
            
            if not existing:
                # Crear control automático
                new_control = models.DevelopmentQualityControl(
                    development_id=development_id,
                    control_catalog_id=catalog_control.id,
                    control_code=catalog_control.control_code,
                    status="Pendiente",
                    validation_status="Pendiente"
                )
                
                db.add(new_control)
                created_controls.append(new_control)
        
        db.commit()
        
        # Refrescar controles creados
        for control in created_controls:
            db.refresh(control)
        
        return {
            "development_id": development_id,
            "current_stage": development.current_stage.stage_name,
            "stage_code": development.current_stage.stage_code,
            "controls_created": len(created_controls),
            "controls": [
                {
                    "id": control.id,
                    "control_code": control.control_code,
                    "status": control.status
                }
                for control in created_controls
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando controles automáticos: {str(e)}"
        )


@router.get("/developments/{development_id}/quality-status")
def get_development_quality_status(
    development_id: str,
    db: Session = Depends(get_db)
):
    """
    Obtener estado de calidad completo de un desarrollo
    
    Resumen del cumplimiento de controles de calidad
    """
    try:
        # Obtener desarrollo
        development = db.query(models.Development).options(
            joinedload(models.Development.current_stage),
            joinedload(models.Development.quality_controls)
        ).filter(models.Development.id == development_id).first()
        
        if not development:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Desarrollo {development_id} no encontrado"
            )
        
        # Calcular estadísticas
        total_controls = len(development.quality_controls)
        completed_controls = len([c for c in development.quality_controls if c.status == "Completado"])
        validated_controls = len([c for c in development.quality_controls if c.validation_status == "Validado"])
        rejected_controls = len([c for c in development.quality_controls if c.validation_status == "Rechazado"])
        pending_controls = len([c for c in development.quality_controls if c.status == "Pendiente"])
        
        # Calcular porcentaje de cumplimiento
        completion_percentage = (completed_controls / total_controls * 100) if total_controls > 0 else 0
        validation_percentage = (validated_controls / total_controls * 100) if total_controls > 0 else 0
        
        return {
            "development_id": development_id,
            "development_name": development.name,
            "current_stage": development.current_stage.stage_name if development.current_stage else None,
            "quality_summary": {
                "total_controls": total_controls,
                "completed_controls": completed_controls,
                "validated_controls": validated_controls,
                "rejected_controls": rejected_controls,
                "pending_controls": pending_controls,
                "completion_percentage": round(completion_percentage, 2),
                "validation_percentage": round(validation_percentage, 2)
            },
            "controls_by_status": {
                "Pendiente": pending_controls,
                "Completado": completed_controls,
                "Validado": validated_controls,
                "Rechazado": rejected_controls
            },
            "quality_score": round((completion_percentage + validation_percentage) / 2, 2),
            "last_updated": max([c.updated_at for c in development.quality_controls]) if development.quality_controls else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estado de calidad: {str(e)}"
        )