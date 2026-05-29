"""
Modelo de Validación de Asignación - Backend V2 (SQLModel)
"""

from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from sqlalchemy import text


class ValidacionAsignacion(SQLModel, table=True):
    """Validación de asignaciones que saltan niveles jerárquicos."""

    __tablename__ = "validaciones_asignacion"

    id: Optional[int] = Field(default=None, primary_key=True)
    desarrollo_id: Optional[str] = Field(default=None, foreign_key="desarrollos.id", max_length=50)
    actividad_id: Optional[int] = Field(default=None, foreign_key="actividades.id")
    solicitado_por_id: str = Field(max_length=50)
    validador_id: str = Field(max_length=50)
    asignado_a_id: str = Field(max_length=50)
    estado: str = Field(default="pendiente", max_length=50)
    motivo: Optional[str] = Field(default=None)
    observacion: Optional[str] = Field(default=None)
    creado_en: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": text("now()")}
    )
    validado_en: Optional[datetime] = Field(default=None)


class ValidacionAsignacionPublico(SQLModel):
    id: int
    desarrollo_id: Optional[str] = None
    actividad_id: Optional[int] = None
    solicitado_por_id: str
    validador_id: str
    asignado_a_id: str
    estado: str
    motivo: Optional[str] = None
    observacion: Optional[str] = None
    creado_en: Optional[datetime] = None
    validado_en: Optional[datetime] = None
    # Campos extendidos con nombres
    solicitado_por_nombre: Optional[str] = None
    validador_nombre: Optional[str] = None
    asignado_a_nombre: Optional[str] = None
    actividad_titulo: Optional[str] = None
    desarrollo_nombre: Optional[str] = None


class ValidacionAsignacionResolver(SQLModel):
    estado: str
    observacion: Optional[str] = None
