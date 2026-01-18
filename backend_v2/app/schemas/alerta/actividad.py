"""
Schemas de Alertas - Backend V2
"""
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, date


class ActividadProximaBase(BaseModel):
    """Schema base para actividades prximas"""
    desarrollo_id: str
    tipo_actividad: str = Field(..., max_length=100)
    titulo: str = Field(..., max_length=255)
    descripcion: Optional[str] = None
    fecha_vencimiento: date
    parte_responsable: str = Field(..., max_length=100)
    persona_responsable: Optional[str] = None
    estado: str = "Pendiente"
    prioridad: str = "Media"
    alerta_enviada: bool = False


class ActividadProxima(ActividadProximaBase):
    """Schema completo de actividad prxima"""
    id: int
    completado_en: Optional[datetime] = None
    creado_por: Optional[str] = None
    creado_en: datetime
    actualizado_en: Optional[datetime] = None

    class Config:
        from_attributes = True


class RegistroActividadBase(BaseModel):
    """Schema base para registro de actividades"""
    desarrollo_id: Optional[str] = None
    etapa_id: Optional[int] = None
    tipo_actividad: str = Field(..., max_length=100)
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    proximo_seguimiento_en: Optional[datetime] = None
    estado: str = "pendiente"
    tipo_actor: Optional[str] = None
    datos_dinamicos: Optional[str] = None  # JSON string
    creado_por: Optional[str] = None


class RegistroActividad(RegistroActividadBase):
    """Schema completo de registro de actividad"""
    id: int
    creado_en: datetime
    actualizado_en: Optional[datetime] = None

    class Config:
        from_attributes = True
