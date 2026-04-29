from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, text

class HerramientaInformatica(SQLModel, table=True):
    """Modelo para registro y control de herramientas informaticas (Excel, Software, ETL, etc.)"""
    __tablename__ = "herramientas_informaticas"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=255, index=True)
    descripcion: Optional[str] = Field(default=None)
    funcionalidad: Optional[str] = Field(default=None)
    responsable: Optional[str] = Field(default=None, max_length=100)
    departamento: Optional[str] = Field(default=None, max_length=100)
    
    fecha_creacion: Optional[str] = Field(default=None, max_length=50)
    ultima_actualizacion: Optional[str] = Field(default=None, max_length=50)
    
    estado: str = Field(default="Activa", max_length=50)
    version: Optional[str] = Field(default=None, max_length=50)
    ubicacion_archivo: Optional[str] = Field(default=None)
    fallas_comunes: Optional[str] = Field(default=None)
    fuentes: Optional[str] = Field(default=None)
    observaciones: Optional[str] = Field(default=None)
    ecosistema: Optional[str] = Field(default=None, max_length=100)

    # Campos de auditoria interna del sistema
    sys_fecha_creacion: datetime = Field(
        default_factory=datetime.now,
        sa_column_kwargs={"server_default": text("now()")}
    )
    sys_ultima_modificacion: datetime = Field(
        default_factory=datetime.now,
        sa_column_kwargs={"server_default": text("now()"), "onupdate": text("now()")}
    )
