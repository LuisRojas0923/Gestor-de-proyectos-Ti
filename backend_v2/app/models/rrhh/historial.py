"""
Modelos de historial y equipos para el módulo Requisición de Personal (RP)
Tablas: historial_requisicion, comentarios_requisicion,
        requisicion_equipos_oficina, requisicion_equipos_tecnologicos
"""
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class HistorialRequisicion(SQLModel, table=True):
    """Registro de auditoría de cada cambio de estado en una requisición"""
    __tablename__ = "historial_requisicion"

    id: Optional[int] = Field(default=None, primary_key=True)
    requisicion_id: int = Field(foreign_key="requisiciones_personal.id")
    estado_anterior: Optional[str] = Field(default=None, max_length=60)
    estado_nuevo: str = Field(max_length=60)
    usuario_nombre: str = Field(max_length=255)
    usuario_email: str = Field(max_length=255)
    observacion: Optional[str] = Field(default=None)
    fecha_evento: Optional[datetime] = Field(
        default_factory=datetime.utcnow
    )


class ComentarioRequisicion(SQLModel, table=True):
    """Comentarios internos sobre una requisición (chat de seguimiento)"""
    __tablename__ = "comentarios_requisicion"

    id: Optional[int] = Field(default=None, primary_key=True)
    requisicion_id: int = Field(foreign_key="requisiciones_personal.id")
    usuario_nombre: str = Field(max_length=255)
    usuario_email: str = Field(max_length=255)
    comentario: str
    fecha_comentario: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": "now()"}
    )


class RequisicionEquipoOficina(SQLModel, table=True):
    """Equipos de oficina requeridos en una requisición (many-to-one)"""
    __tablename__ = "requisicion_equipos_oficina"

    id: Optional[int] = Field(default=None, primary_key=True)
    requisicion_id: int = Field(foreign_key="requisiciones_personal.id")
    equipo: str = Field(max_length=100)


class RequisicionEquipoTecnologico(SQLModel, table=True):
    """Equipos tecnológicos requeridos en una requisición (many-to-one)"""
    __tablename__ = "requisicion_equipos_tecnologicos"

    id: Optional[int] = Field(default=None, primary_key=True)
    requisicion_id: int = Field(foreign_key="requisiciones_personal.id")
    equipo: str = Field(max_length=100)
