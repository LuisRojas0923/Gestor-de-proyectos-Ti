"""
Modelo de Actividades (WBS) - Backend V2 (SQLModel)
"""

from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import text

# --- Modelos de Base de Datos (table=True) ---


class Actividad(SQLModel, table=True):
    """Modelo de Actividad o Sub-tarea jerárquica"""

    __tablename__ = "actividades"

    id: Optional[int] = Field(default=None, primary_key=True)
    desarrollo_id: str = Field(foreign_key="desarrollos.id", index=True)
    parent_id: Optional[int] = Field(
        default=None, foreign_key="actividades.id", index=True
    )

    titulo: str = Field(max_length=255)
    descripcion: Optional[str] = Field(default=None)
    estado: str = Field(
        default="Pendiente", max_length=50
    )  # Pendiente, En Progreso, Bloqueado, Completado
    responsable_id: Optional[str] = Field(
        default=None, max_length=100
    )  # ID del Analista asignado

    # Fechas
    fecha_inicio_estimada: Optional[date] = Field(default=None)
    fecha_fin_estimada: Optional[date] = Field(default=None)
    fecha_inicio_real: Optional[date] = Field(default=None)
    fecha_fin_real: Optional[date] = Field(default=None)

    # Progreso/Esfuerzo
    horas_estimadas: Decimal = Field(default=Decimal("0.0"))
    horas_reales: Decimal = Field(default=Decimal("0.0"))
    porcentaje_avance: Decimal = Field(default=Decimal("0.0"))

    # Auditoria
    creado_en: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"server_default": text("now()")}
    )
    actualizado_en: Optional[datetime] = Field(
        default=None, sa_column_kwargs={"onupdate": text("now()")}
    )

    # Relaciones
    # Nota: El tipo como string "Desarrollo" evita importaciones circulares inmediatas,
    # pero requiere que se importen todos los modelos en un __init__.py comun.
    desarrollo: Optional["Desarrollo"] = Relationship(back_populates="actividades")

    # Self-referential Adjacency List
    parent: Optional["Actividad"] = Relationship(
        back_populates="subactividades",
        sa_relationship_kwargs=dict(remote_side="Actividad.id"),
    )
    subactividades: List["Actividad"] = Relationship(back_populates="parent")


# --- Schemas de Validación Pydantic ---


class ActividadBase(SQLModel):
    titulo: str
    descripcion: Optional[str] = None
    estado: str = "Pendiente"
    responsable_id: Optional[str] = None
    fecha_inicio_estimada: Optional[date] = None
    fecha_fin_estimada: Optional[date] = None
    horas_estimadas: Decimal = Decimal("0.0")
    porcentaje_avance: Decimal = Decimal("0.0")


class ActividadCrear(ActividadBase):
    desarrollo_id: str
    parent_id: Optional[int] = None


class ActividadActualizar(SQLModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    estado: Optional[str] = None
    responsable_id: Optional[str] = None
    fecha_inicio_estimada: Optional[date] = None
    fecha_fin_estimada: Optional[date] = None
    fecha_inicio_real: Optional[date] = None
    fecha_fin_real: Optional[date] = None
    horas_estimadas: Optional[Decimal] = None
    horas_reales: Optional[Decimal] = None
    porcentaje_avance: Optional[Decimal] = None
    parent_id: Optional[int] = None


class ActividadLeer(ActividadBase):
    id: int
    desarrollo_id: str
    parent_id: Optional[int] = None
    fecha_inicio_real: Optional[date] = None
    fecha_fin_real: Optional[date] = None
    horas_reales: Decimal
    creado_en: Optional[datetime] = None
    actualizado_en: Optional[datetime] = None


# Schema para devolver el arbol
class ActividadArbol(ActividadLeer):
    subactividades: List["ActividadArbol"] = []
