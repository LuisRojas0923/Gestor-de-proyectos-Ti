"""
Endpoints de API para etapas del ciclo de desarrollo
Implementación completa según arquitectura
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/stages", tags=["stages"])


@router.get("/", response_model=List[schemas.DevelopmentStage])
def get_development_stages(
    phase_id: Optional[int] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """
    Listar todas las etapas del desarrollo
    
    - **phase_id**: Filtrar por fase específica (opcional)
    - **include_inactive**: Incluir etapas inactivas (default: False)
    
    Retorna las etapas ordenadas por sort_order
    """
    try:
        query = db.query(models.DevelopmentStage)
        
        if phase_id is not None:
            query = query.filter(models.DevelopmentStage.phase_id == phase_id)
        
        if not include_inactive:
            query = query.filter(models.DevelopmentStage.is_active == True)
        
        stages = query.order_by(models.DevelopmentStage.sort_order).all()
        
        return stages
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo etapas: {str(e)}"
        )


@router.get("/cycle-flow", response_model=List[schemas.DevelopmentCycleFlow])
def get_cycle_flow(
    db: Session = Depends(get_db)
):
    """
    Obtener el flujo completo del ciclo de desarrollo
    
    Retorna todas las etapas organizadas por fase con información completa
    para mostrar el flujo del proceso de desarrollo
    """
    try:
        # Obtener todas las fases con sus etapas
        phases = db.query(models.DevelopmentPhase).filter(
            models.DevelopmentPhase.is_active == True
        ).order_by(models.DevelopmentPhase.sort_order).all()
        
        cycle_flow = []
        
        for phase in phases:
            # Obtener etapas de esta fase
            stages = db.query(models.DevelopmentStage).filter(
                models.DevelopmentStage.phase_id == phase.id,
                models.DevelopmentStage.is_active == True
            ).order_by(models.DevelopmentStage.sort_order).all()
            
            for stage in stages:
                cycle_flow.append({
                    "stage_id": stage.id,
                    "stage_code": stage.stage_code,
                    "stage_name": stage.stage_name,
                    "stage_description": stage.stage_description,
                    "phase_id": phase.id,
                    "phase_name": phase.phase_name,
                    "phase_color": phase.phase_color,
                    "is_milestone": stage.is_milestone,
                    "estimated_days": stage.estimated_days,
                    "responsible_party": stage.responsible_party,
                    "responsible_party_name": {
                        'proveedor': 'Proveedor',
                        'usuario': 'Usuario',
                        'equipo_interno': 'Equipo Interno'
                    }.get(stage.responsible_party, 'No Definido'),
                    "sort_order": stage.sort_order
                })
        
        return cycle_flow
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo flujo del ciclo: {str(e)}"
        )


@router.get("/{stage_id}", response_model=schemas.DevelopmentStageWithPhase)
def get_development_stage(
    stage_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtener etapa específica con información de su fase
    
    - **stage_id**: ID de la etapa a consultar
    
    Retorna la etapa con información de la fase a la que pertenece
    """
    try:
        stage = db.query(models.DevelopmentStage).filter(
            models.DevelopmentStage.id == stage_id
        ).first()
        
        if not stage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Etapa con ID {stage_id} no encontrada"
            )
        
        return stage
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo etapa: {str(e)}"
        )


@router.get("/by-code/{stage_code}", response_model=schemas.DevelopmentStageWithPhase)
def get_stage_by_code(
    stage_code: str,
    db: Session = Depends(get_db)
):
    """
    Obtener etapa por su código
    
    - **stage_code**: Código de la etapa (ej: '1', '2', '5', etc.)
    
    Útil para transiciones de estado basadas en código de etapa
    """
    try:
        stage = db.query(models.DevelopmentStage).filter(
            models.DevelopmentStage.stage_code == stage_code,
            models.DevelopmentStage.is_active == True
        ).first()
        
        if not stage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Etapa con código '{stage_code}' no encontrada"
            )
        
        return stage
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo etapa por código: {str(e)}"
        )


@router.get("/milestones", response_model=List[schemas.DevelopmentStage])
def get_milestone_stages(
    db: Session = Depends(get_db)
):
    """
    Obtener solo las etapas que son hitos importantes
    
    Retorna las etapas marcadas como milestones ordenadas por sort_order
    Útil para mostrar progreso general del proyecto
    """
    try:
        stages = db.query(models.DevelopmentStage).filter(
            models.DevelopmentStage.is_milestone == True,
            models.DevelopmentStage.is_active == True
        ).order_by(models.DevelopmentStage.sort_order).all()
        
        return stages
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo etapas milestone: {str(e)}"
        )