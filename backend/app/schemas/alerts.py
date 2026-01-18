"""
Schemas Pydantic para alertas y actividades próximas
"""

from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime, date


class DevelopmentUpcomingActivityBase(BaseModel):
    """Schema base para actividades próximas"""
    desarrollo_id: str = Field(..., max_length=50, description="ID del desarrollo")
    tipo_actividad: str = Field(..., max_length=100, description="Tipo de actividad")
    titulo: str = Field(..., max_length=255, description="Título de la actividad")
    descripcion: Optional[str] = Field(None, description="Descripción detallada")
    fecha_vencimiento: date = Field(..., description="Fecha límite")
    parte_responsable: str = Field(..., max_length=100, description="Parte responsable")
    persona_responsable: Optional[str] = Field(None, max_length=255, description="Persona responsable")
    prioridad: str = Field("Media", max_length=20, description="Prioridad")

    @validator('tipo_actividad')
    def validate_activity_type(cls, v):
        allowed_types = [
            'entrega_proveedor', 'reunion', 'entrega_usuario', 'revision',
            'aprobacion', 'despliegue', 'pruebas', 'documentacion'
        ]
        if v not in allowed_types:
            raise ValueError(f'tipo_actividad debe ser uno de: {allowed_types}')
        return v

    @validator('parte_responsable')
    def validate_responsible_party(cls, v):
        allowed_parties = ['proveedor', 'usuario', 'equipo_interno']
        if v not in allowed_parties:
            raise ValueError(f'parte_responsable debe ser uno de: {allowed_parties}')
        return v

    @validator('prioridad')
    def validate_priority(cls, v):
        allowed_priorities = ['Alta', 'Media', 'Baja', 'Crítica']
        if v not in allowed_priorities:
            raise ValueError(f'prioridad debe ser uno de: {allowed_priorities}')
        return v


class DevelopmentUpcomingActivityCreate(DevelopmentUpcomingActivityBase):
    """Schema para crear actividad próxima"""
    creado_por: Optional[str] = Field(None, max_length=255, description="Creado por")


class DevelopmentUpcomingActivityUpdate(BaseModel):
    """Schema para actualizar actividad próxima"""
    titulo: Optional[str] = Field(None, max_length=255, description="Título")
    descripcion: Optional[str] = Field(None, description="Descripción")
    fecha_vencimiento: Optional[date] = Field(None, description="Fecha límite")
    persona_responsable: Optional[str] = Field(None, max_length=255, description="Persona responsable")
    prioridad: Optional[str] = Field(None, max_length=20, description="Prioridad")
    estado: Optional[str] = Field(None, max_length=50, description="Estado")

    @validator('prioridad')
    def validate_priority(cls, v):
        if v is None:
            return v
        allowed_priorities = ['Alta', 'Media', 'Baja', 'Crítica']
        if v not in allowed_priorities:
            raise ValueError(f'prioridad debe ser uno de: {allowed_priorities}')
        return v

    @validator('estado')
    def validate_status(cls, v):
        if v is None:
            return v
        allowed_statuses = ['Pendiente', 'En Progreso', 'Completada', 'Vencida', 'Cancelada']
        if v not in allowed_statuses:
            raise ValueError(f'estado debe ser uno de: {allowed_statuses}')
        return v


class DevelopmentUpcomingActivity(DevelopmentUpcomingActivityBase):
    """Schema completo para actividad próxima"""
    id: int
    estado: str = "Pendiente"
    alerta_enviada: bool = False
    completado_en: Optional[datetime] = None
    creado_por: Optional[str] = None
    creado_en: datetime
    actualizado_en: Optional[datetime] = None

    class Config:
        orm_mode = True


class AlertSummary(BaseModel):
    """Schema para resumen de alertas"""
    total_alertas: int
    alertas_urgentes: int
    alertas_vencidas: int
    alertas_proximas: int
    completadas_hoy: int


class AlertLevel(BaseModel):
    """Schema para nivel de alerta"""
    desarrollo_id: str
    nombre_desarrollo: str
    actividad_id: int
    titulo_actividad: str
    fecha_vencimiento: date
    dias_restantes: int
    nivel_alerta: str  # 'Vencido', 'Urgente', 'Próximo', 'Normal'
    parte_responsable: str
    persona_responsable: Optional[str] = None


class ActivityCompletionRequest(BaseModel):
    """Schema para completar una actividad"""
    completado_por: str = Field(..., max_length=255, description="Persona que completa la actividad")
    notas_finalizacion: Optional[str] = Field(None, description="Notas de finalización")
    
    class Config:
        schema_extra = {
            "example": {
                "completado_por": "Juan Pérez",
                "notas_finalizacion": "Actividad completada satisfactoriamente según lo planificado"
            }
        }
