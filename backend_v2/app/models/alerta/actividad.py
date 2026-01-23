"""
Modelos de Alertas y Actividades - Backend V2 (SQLModel)
"""
from typing import Optional
from datetime import datetime, date
from sqlmodel import SQLModel, Field


# --- Modelos de Base de Datos (table=True) ---

class ActividadProxima(SQLModel, table=True):
    """Actividades proximas y alertas"""
    __tablename__ = "actividades_proximas"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    desarrollo_id: str = Field(max_length=50)
    tipo_actividad: str = Field(max_length=100)
    titulo: str = Field(max_length=255)
    descripcion: Optional[str] = Field(default=None)
    fecha_vencimiento: date
    parte_responsable: str = Field(max_length=100)
    persona_responsable: Optional[str] = Field(default=None, max_length=255)
    estado: str = Field(default="Pendiente", max_length=50)
    prioridad: str = Field(default="Media", max_length=20)
    alerta_enviada: bool = Field(default=False)
    completado_en: Optional[datetime] = Field(default=None)
    creado_por: Optional[str] = Field(default=None, max_length=255)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    actualizado_en: Optional[datetime] = Field(default=None)


class RegistroActividad(SQLModel, table=True):
    """Log de actividades del sistema"""
    __tablename__ = "registro_actividades"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    desarrollo_id: Optional[str] = Field(default=None, max_length=50)
    etapa_id: Optional[int] = Field(default=None)
    tipo_actividad: str = Field(max_length=100)
    fecha_inicio: Optional[datetime] = Field(default=None)
    fecha_fin: Optional[datetime] = Field(default=None)
    proximo_seguimiento_en: Optional[datetime] = Field(default=None)
    estado: str = Field(default="pendiente", max_length=50)
    tipo_actor: Optional[str] = Field(default=None, max_length=50)
    datos_dinamicos: Optional[str] = Field(default=None)  # JSON string
    creado_por: Optional[str] = Field(default=None, max_length=255)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    actualizado_en: Optional[datetime] = Field(default=None)


# --- Schemas de Validacion ---

class ActividadProximaCrear(SQLModel):
    """Schema para crear una actividad proxima"""
    desarrollo_id: str
    tipo_actividad: str
    titulo: str
    descripcion: Optional[str] = None
    fecha_vencimiento: date
    parte_responsable: str
    persona_responsable: Optional[str] = None
    estado: str = "Pendiente"
    prioridad: str = "Media"
    alerta_enviada: bool = False


class RegistroActividadCrear(SQLModel):
    """Schema para crear un registro de actividad"""
    desarrollo_id: Optional[str] = None
    etapa_id: Optional[int] = None
    tipo_actividad: str
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    proximo_seguimiento_en: Optional[datetime] = None
    estado: str = "pendiente"
    tipo_actor: Optional[str] = None
    datos_dinamicos: Optional[str] = None
    creado_por: Optional[str] = None
