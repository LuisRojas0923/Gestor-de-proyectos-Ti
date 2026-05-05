"""
Modelo de Requerimientos de Desarrollo - Backend V2 (SQLModel)
"""

from typing import Optional, TYPE_CHECKING
from datetime import datetime, date
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import text

if TYPE_CHECKING:
    from .desarrollo import Desarrollo


class RequerimientoDesarrollo(SQLModel, table=True):
    """Requerimientos específicos de un desarrollo (Historias de usuario, tareas técnicas, etc)"""

    __tablename__ = "requerimientos_desarrollo"

    id: Optional[int] = Field(default=None, primary_key=True)
    external_id: str = Field(unique=True, max_length=50, index=True)
    desarrollo_id: str = Field(foreign_key="desarrollos.id", max_length=50, index=True)
    titulo: str = Field(max_length=255)
    descripcion: Optional[str] = Field(default=None)
    prioridad: str = Field(default="medium", max_length=20)  # high, medium, low
    estado: str = Field(default="new", max_length=20)  # new, validated, testing, completed, rejected
    fecha_limite: Optional[date] = Field(default=None)
    responsable_id: Optional[int] = Field(default=None)

    creado_en: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": text("now()")}
    )
    actualizado_en: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"onupdate": text("now()")}
    )

    # Relaciones
    desarrollo: Optional["Desarrollo"] = Relationship(back_populates="requerimientos")


class RequerimientoDesarrolloCrear(SQLModel):
    """Schema para crear un requerimiento"""

    external_id: str
    desarrollo_id: str
    titulo: str
    descripcion: Optional[str] = None
    prioridad: str = "medium"
    estado: str = "new"
    fecha_limite: Optional[date] = None
    responsable_id: Optional[int] = None


class RequerimientoDesarrolloActualizar(SQLModel):
    """Schema para actualizar un requerimiento"""

    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    prioridad: Optional[str] = None
    estado: Optional[str] = None
    fecha_limite: Optional[date] = None
    responsable_id: Optional[int] = None
