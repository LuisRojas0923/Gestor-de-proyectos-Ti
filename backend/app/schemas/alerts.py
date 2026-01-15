"""
Schemas Pydantic para alertas y actividades próximas
"""

from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime, date


class DevelopmentUpcomingActivityBase(BaseModel):
    """Schema base para actividades próximas"""
    development_id: str = Field(..., max_length=50, description="ID del desarrollo")
    activity_type: str = Field(..., max_length=100, description="Tipo de actividad")
    title: str = Field(..., max_length=255, description="Título de la actividad")
    description: Optional[str] = Field(None, description="Descripción detallada")
    due_date: date = Field(..., description="Fecha límite")
    responsible_party: str = Field(..., max_length=100, description="Parte responsable")
    responsible_person: Optional[str] = Field(None, max_length=255, description="Persona responsable")
    priority: str = Field("Media", max_length=20, description="Prioridad")

    @validator('activity_type')
    def validate_activity_type(cls, v):
        allowed_types = [
            'entrega_proveedor', 'reunion', 'entrega_usuario', 'revision',
            'aprobacion', 'despliegue', 'pruebas', 'documentacion'
        ]
        if v not in allowed_types:
            raise ValueError(f'activity_type debe ser uno de: {allowed_types}')
        return v

    @validator('responsible_party')
    def validate_responsible_party(cls, v):
        allowed_parties = ['proveedor', 'usuario', 'equipo_interno']
        if v not in allowed_parties:
            raise ValueError(f'responsible_party debe ser uno de: {allowed_parties}')
        return v

    @validator('priority')
    def validate_priority(cls, v):
        allowed_priorities = ['Alta', 'Media', 'Baja', 'Crítica']
        if v not in allowed_priorities:
            raise ValueError(f'priority debe ser uno de: {allowed_priorities}')
        return v


class DevelopmentUpcomingActivityCreate(DevelopmentUpcomingActivityBase):
    """Schema para crear actividad próxima"""
    created_by: Optional[str] = Field(None, max_length=255, description="Creado por")


class DevelopmentUpcomingActivityUpdate(BaseModel):
    """Schema para actualizar actividad próxima"""
    title: Optional[str] = Field(None, max_length=255, description="Título")
    description: Optional[str] = Field(None, description="Descripción")
    due_date: Optional[date] = Field(None, description="Fecha límite")
    responsible_person: Optional[str] = Field(None, max_length=255, description="Persona responsable")
    priority: Optional[str] = Field(None, max_length=20, description="Prioridad")
    status: Optional[str] = Field(None, max_length=50, description="Estado")

    @validator('priority')
    def validate_priority(cls, v):
        if v is None:
            return v
        allowed_priorities = ['Alta', 'Media', 'Baja', 'Crítica']
        if v not in allowed_priorities:
            raise ValueError(f'priority debe ser uno de: {allowed_priorities}')
        return v

    @validator('status')
    def validate_status(cls, v):
        if v is None:
            return v
        allowed_statuses = ['Pendiente', 'En Progreso', 'Completada', 'Vencida', 'Cancelada']
        if v not in allowed_statuses:
            raise ValueError(f'status debe ser uno de: {allowed_statuses}')
        return v


class DevelopmentUpcomingActivity(DevelopmentUpcomingActivityBase):
    """Schema completo para actividad próxima"""
    id: int
    status: str = "Pendiente"
    alert_sent: bool = False
    completed_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class AlertSummary(BaseModel):
    """Schema para resumen de alertas"""
    total_alerts: int
    urgent_alerts: int
    overdue_alerts: int
    upcoming_alerts: int
    completed_today: int


class AlertLevel(BaseModel):
    """Schema para nivel de alerta"""
    development_id: str
    development_name: str
    activity_id: int
    activity_title: str
    due_date: date
    days_remaining: int
    alert_level: str  # 'Vencido', 'Urgente', 'Próximo', 'Normal'
    responsible_party: str
    responsible_person: Optional[str] = None


class ActivityCompletionRequest(BaseModel):
    """Schema para completar una actividad"""
    completed_by: str = Field(..., max_length=255, description="Persona que completa la actividad")
    completion_notes: Optional[str] = Field(None, description="Notas de finalización")
    
    class Config:
        schema_extra = {
            "example": {
                "completed_by": "Juan Pérez",
                "completion_notes": "Actividad completada satisfactoriamente según lo planificado"
            }
        }
