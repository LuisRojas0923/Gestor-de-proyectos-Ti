"""
Modelos para Solicitud de Personal - Backend V2 (SQLModel)
"""
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field

class SolicitudPersonal(SQLModel, table=True):
    """Modelo para solicitudes de personal (RRHH)"""
    __tablename__ = "solicitudes_personal"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre_solicitante: str = Field(max_length=255)
    area_solicitante: Optional[str] = Field(default=None, max_length=100)
    sede_solicitante: Optional[str] = Field(default=None, max_length=100)
    email_solicitante: str = Field(max_length=255)
    cargo_solicitado: str = Field(max_length=255)
    cantidad: int = Field(default=1)
    justificacion: str = Field()
    prioridad: str = Field(default="Media", max_length=20)
    fecha_ideal_ingreso: Optional[datetime] = Field(default=None)
    estado: str = Field(default="Pendiente", max_length=50)
    ot: Optional[str] = Field(default="N/A", max_length=100)
    nombre_proyecto: Optional[str] = Field(default=None, max_length=255)
    direccion_laboral: Optional[str] = Field(default=None, max_length=500)
    fecha_radicacion: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})

class SolicitudPersonalCrear(SQLModel):
    """Schema para crear una solicitud de personal"""
    nombre_solicitante: str
    area_solicitante: Optional[str] = None
    sede_solicitante: Optional[str] = None
    email_solicitante: str
    cargo_solicitado: str
    cantidad: int = 1
    justificacion: str
    prioridad: str = "Media"
    fecha_ideal_ingreso: Optional[datetime] = None
    ot: Optional[str] = "N/A"
    nombre_proyecto: Optional[str] = None
    direccion_laboral: Optional[str] = None

class SolicitudPersonalPublico(SolicitudPersonalCrear):
    """Schema para respuesta publica"""
    id: int
    estado: str
    fecha_radicacion: datetime
