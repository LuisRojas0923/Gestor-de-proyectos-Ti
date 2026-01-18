"""
Schemas Auxiliares de Desarrollo - Backend V2
"""
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, date


class ResponsableBase(BaseModel):
    """Schema base para responsable de desarrollo"""
    desarrollo_id: str
    nombre_usuario: str = Field(..., max_length=255)
    tipo_rol: str = "responsable"
    es_principal: bool = False
    fecha_asignacion: Optional[date] = None


class Responsable(ResponsableBase):
    """Schema completo de responsable"""
    id: int
    creado_en: datetime

    class Config:
        from_attributes = True


class FechaBase(BaseModel):
    """Schema base para fechas de desarrollo"""
    desarrollo_id: str
    tipo_fecha: str = Field(..., max_length=50)
    fecha: date
    descripcion: Optional[str] = None
    estado_entrega: Optional[str] = None
    estado_aprobacion: Optional[str] = None


class Fecha(FechaBase):
    """Schema completo de fecha"""
    id: int
    creado_en: datetime

    class Config:
        from_attributes = True


class ObservacionBase(BaseModel):
    """Schema base para observaciones"""
    desarrollo_id: str
    tipo_observacion: str = Field(..., max_length=50)
    observacion: str
    creado_por: Optional[str] = None


class Observacion(ObservacionBase):
    """Schema completo de observacin"""
    id: int
    creado_en: datetime

    class Config:
        from_attributes = True
