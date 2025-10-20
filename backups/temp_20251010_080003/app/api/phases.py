"""
Endpoints de API para fases y etapas del desarrollo
Implementación completa según arquitectura
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/phases", tags=["phases"])


@router.get("/", response_model=List[schemas.DevelopmentPhase])
def get_development_phases(
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """
    Listar todas las fases del desarrollo
    
    - **include_inactive**: Incluir fases inactivas (default: False)
    
    Retorna las fases ordenadas por sort_order
    """
    try:
        query = db.query(models.DevelopmentPhase)
        
        if not include_inactive:
            query = query.filter(models.DevelopmentPhase.is_active == True)
        
        phases = query.order_by(models.DevelopmentPhase.sort_order).all()
        
        return phases
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo fases: {str(e)}"
        )


@router.get("/{phase_id}", response_model=schemas.DevelopmentPhaseWithStages)
def get_development_phase(
    phase_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtener fase específica con sus etapas
    
    - **phase_id**: ID de la fase a consultar
    
    Retorna la fase con todas sus etapas asociadas
    """
    try:
        phase = db.query(models.DevelopmentPhase).filter(
            models.DevelopmentPhase.id == phase_id
        ).first()
        
        if not phase:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fase con ID {phase_id} no encontrada"
            )
        
        return phase
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo fase: {str(e)}"
        )


@router.get("/{phase_id}/stages", response_model=List[schemas.DevelopmentStage])
def get_phase_stages(
    phase_id: int,
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """
    Obtener todas las etapas de una fase específica
    
    - **phase_id**: ID de la fase
    - **include_inactive**: Incluir etapas inactivas (default: False)
    
    Retorna las etapas ordenadas por sort_order
    """
    try:
        # Verificar que la fase existe
        phase = db.query(models.DevelopmentPhase).filter(
            models.DevelopmentPhase.id == phase_id
        ).first()
        
        if not phase:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fase con ID {phase_id} no encontrada"
            )
        
        # Obtener etapas de la fase
        query = db.query(models.DevelopmentStage).filter(
            models.DevelopmentStage.phase_id == phase_id
        )
        
        if not include_inactive:
            query = query.filter(models.DevelopmentStage.is_active == True)
        
        stages = query.order_by(models.DevelopmentStage.sort_order).all()
        
        return stages
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo etapas: {str(e)}"
        )