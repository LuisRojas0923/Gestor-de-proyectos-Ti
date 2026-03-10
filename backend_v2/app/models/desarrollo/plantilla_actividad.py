"""
Modelo de Plantillas de Actividades - Backend V2 (SQLModel)
"""

from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import text


class PlantillaActividad(SQLModel, table=True):
    """Modelo para plantillas genéricas de actividades (árboles predefinidos)"""

    __tablename__ = "plantillas_actividades"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre_plantilla: str = Field(
        max_length=255, index=True
    )  # Solo la raíz usa esto para agrupar
    parent_id: Optional[int] = Field(
        default=None, foreign_key="plantillas_actividades.id", index=True
    )

    titulo: str = Field(max_length=255)
    descripcion: Optional[str] = Field(default=None)
    horas_estimadas: Decimal = Field(default=Decimal("0.0"))

    creado_en: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": text("now()")}
    )
    actualizado_en: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"onupdate": text("now()")}
    )

    # Self-referential Adjacency List para el árbol de la plantilla
    parent: Optional["PlantillaActividad"] = Relationship(
        back_populates="subactividades",
        sa_relationship_kwargs=dict(remote_side="PlantillaActividad.id"),
    )
    subactividades: List["PlantillaActividad"] = Relationship(back_populates="parent")


# --- Schemas de Validación Pydantic ---


class PlantillaActividadBase(SQLModel):
    nombre_plantilla: str
    titulo: str
    descripcion: Optional[str] = None
    horas_estimadas: Decimal = Decimal("0.0")


class PlantillaActividadCrear(PlantillaActividadBase):
    parent_id: Optional[int] = None


class PlantillaActividadActualizar(SQLModel):
    nombre_plantilla: Optional[str] = None
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    horas_estimadas: Optional[Decimal] = None
    parent_id: Optional[int] = None


class PlantillaActividadLeer(PlantillaActividadBase):
    id: int
    parent_id: Optional[int] = None
    creado_en: Optional[datetime] = None
    actualizado_en: Optional[datetime] = None


class PlantillaActividadArbol(PlantillaActividadLeer):
    subactividades: List["PlantillaActividadArbol"] = []


class AplicarPlantillaRequest(SQLModel):
    plantilla_raiz_id: int
    desarrollo_id: str
