"""
Schemas de controles de calidad
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class QualityControlCatalogBase(BaseModel):
    codigo_control: str = Field(..., max_length=20)
    nombre_control: str = Field(..., max_length=255)
    descripcion: str = Field(..., min_length=1)
    prefijo_etapa: str = Field(..., max_length=50)
    descripcion_etapa: Optional[str] = Field(None, max_length=255)
    entregables: Optional[str] = None  # Lista de entregables separados por comas
    criterios_validacion: Optional[str] = None
    parte_responsable: str = Field(..., max_length=50)  # 'analista', 'arquitecto', 'equipo_interno'
    esta_activo: bool = True


class QualityControlCatalogCreate(QualityControlCatalogBase):
    pass


class QualityControlCatalog(QualityControlCatalogBase):
    id: int
    creado_en: datetime
    actualizado_en: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class DevelopmentQualityControlBase(BaseModel):
    desarrollo_id: str
    catalogo_control_id: int
    codigo_control: str = Field(..., max_length=20)
    estado: str = Field(default="Pendiente", max_length=50)
    estado_validacion: str = Field(default="Pendiente", max_length=50)
    completado_por: Optional[str] = Field(None, max_length=255)
    validado_por: Optional[str] = Field(None, max_length=255)
    entregables_proporcionados: Optional[str] = None  # JSON string con entregables completados
    entregables_completados: Optional[str] = None  # JSON array de entregables marcados como completados
    notas_validacion: Optional[str] = None
    motivo_rechazo: Optional[str] = None
    archivos_evidencia: Optional[str] = None  # JSON string


class DevelopmentQualityControlCreate(DevelopmentQualityControlBase):
    pass


class DevelopmentQualityControlUpdate(BaseModel):
    estado: Optional[str] = Field(None, max_length=50)
    estado_validacion: Optional[str] = Field(None, max_length=50)
    completado_por: Optional[str] = Field(None, max_length=255)
    validado_por: Optional[str] = Field(None, max_length=255)
    entregables_proporcionados: Optional[str] = None
    entregables_completados: Optional[str] = None  # JSON array de entregables marcados como completados
    notas_validacion: Optional[str] = None
    motivo_rechazo: Optional[str] = None
    archivos_evidencia: Optional[str] = None


class DevelopmentQualityControl(DevelopmentQualityControlBase):
    id: int
    completado_en: Optional[datetime] = None
    validado_en: Optional[datetime] = None
    creado_en: datetime
    actualizado_en: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class DevelopmentQualityControlWithCatalog(DevelopmentQualityControl):
    """Control de calidad con información del catálogo"""
    catalogo: Optional[QualityControlCatalog] = None


class QualityControlValidationRequest(BaseModel):
    """Request para validar un control de calidad"""
    resultado_validacion: str = Field(..., max_length=50, description="Resultado de la validación")
    nombre_validador: str = Field(..., max_length=255, description="Nombre del validador")
    notas_validacion: Optional[str] = Field(None, description="Notas de la validación")
    motivo_rechazo: Optional[str] = Field(None, description="Motivo de rechazo si aplica")
    archivos_evidencia: Optional[str] = Field(None, description="Archivos de evidencia (JSON)")


class QualityControlCompletionRequest(BaseModel):
    """Request para completar un control de calidad"""
    entregables_proporcionados: str = Field(..., min_length=1)
    entregables_completados: Optional[List[str]] = Field(None, description="Lista de entregables marcados como completados")
    archivos_evidencia: Optional[List[str]] = None
    notas: Optional[str] = None
