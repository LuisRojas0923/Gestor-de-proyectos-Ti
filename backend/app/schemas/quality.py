"""
Schemas de controles de calidad
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class QualityControlCatalogBase(BaseModel):
    control_code: str = Field(..., max_length=20)
    control_name: str = Field(..., max_length=255)
    description: str = Field(..., min_length=1)
    stage_prefix: str = Field(..., max_length=50)
    stage_description: Optional[str] = Field(None, max_length=255)
    deliverables: Optional[str] = None  # Lista de entregables separados por comas
    validation_criteria: Optional[str] = None
    responsible_party: str = Field(..., max_length=50)  # 'analista', 'arquitecto', 'equipo_interno'
    is_active: bool = True


class QualityControlCatalogCreate(QualityControlCatalogBase):
    pass


class QualityControlCatalog(QualityControlCatalogBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        orm_mode = True


class DevelopmentQualityControlBase(BaseModel):
    development_id: str
    control_catalog_id: int
    control_code: str = Field(..., max_length=20)
    status: str = Field(default="Pendiente", max_length=50)
    validation_status: str = Field(default="Pendiente", max_length=50)
    completed_by: Optional[str] = Field(None, max_length=255)
    validated_by: Optional[str] = Field(None, max_length=255)
    deliverables_provided: Optional[str] = None  # JSON string con entregables completados
    deliverables_completed: Optional[str] = None  # JSON array de entregables marcados como completados
    validation_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    evidence_files: Optional[str] = None  # JSON string


class DevelopmentQualityControlCreate(DevelopmentQualityControlBase):
    pass


class DevelopmentQualityControlUpdate(BaseModel):
    status: Optional[str] = Field(None, max_length=50)
    validation_status: Optional[str] = Field(None, max_length=50)
    completed_by: Optional[str] = Field(None, max_length=255)
    validated_by: Optional[str] = Field(None, max_length=255)
    deliverables_provided: Optional[str] = None
    deliverables_completed: Optional[str] = None  # JSON array de entregables marcados como completados
    validation_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    evidence_files: Optional[str] = None


class DevelopmentQualityControl(DevelopmentQualityControlBase):
    id: int
    completed_at: Optional[datetime] = None
    validated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        orm_mode = True


class DevelopmentQualityControlWithCatalog(DevelopmentQualityControl):
    """Control de calidad con información del catálogo"""
    catalog: Optional[QualityControlCatalog] = None


class QualityControlValidationRequest(BaseModel):
    """Request para validar un control de calidad"""
    validation_result: str = Field(..., max_length=50, description="Resultado de la validación")
    validator_name: str = Field(..., max_length=255, description="Nombre del validador")
    validation_notes: Optional[str] = Field(None, description="Notas de la validación")
    rejection_reason: Optional[str] = Field(None, description="Motivo de rechazo si aplica")
    evidence_files: Optional[str] = Field(None, description="Archivos de evidencia (JSON)")


class QualityControlCompletionRequest(BaseModel):
    """Request para completar un control de calidad"""
    deliverables_provided: str = Field(..., min_length=1)
    deliverables_completed: Optional[List[str]] = Field(None, description="Lista de entregables marcados como completados")
    evidence_files: Optional[List[str]] = None
    notes: Optional[str] = None
