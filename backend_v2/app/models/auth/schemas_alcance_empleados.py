"""Contratos de administracion y consulta del alcance gestor-empleado."""
from typing import Optional
from uuid import UUID

from pydantic import Field
from sqlmodel import SQLModel

from ..erp.schemas_empleados_horarios import FacetasEmpleados


class CambioRelacionesValidado(SQLModel):
    gestor_id: str
    cedulas_agregar: list[str]
    cedulas_quitar: list[str]


class RelacionesGestorUpdate(SQLModel):
    solicitud_id: UUID
    cedulas_agregar: list[str] = Field(default_factory=list, max_length=200)
    cedulas_quitar: list[str] = Field(default_factory=list, max_length=200)


class RelacionesGestorResultado(SQLModel):
    gestor_id: str
    agregadas: int = 0
    reactivadas: int = 0
    desactivadas: int = 0
    sin_cambio: int = 0
    idempotente: bool = False


class GestorAlcanceRead(SQLModel):
    id: str
    nombre: str
    rol: str
    relaciones_activas: int = 0


class GestoresAlcanceList(SQLModel):
    items: list[GestorAlcanceRead]
    total: int
    limit: int
    offset: int


class EmpleadoAlcanceRead(SQLModel):
    cedula: str
    nombre: str
    cargo: Optional[str] = None
    area: Optional[str] = None
    ciudadcontratacion: Optional[str] = None
    jefe: Optional[str] = None
    autoriza_he: bool = False
    disponible_semana: bool = False
    motivo_no_disponible: Optional[str] = None
    relacionado: Optional[bool] = None


class EmpleadosAlcanceList(SQLModel):
    items: list[EmpleadoAlcanceRead]
    total: int
    limit: int
    offset: int
    facetas: FacetasEmpleados = Field(default_factory=FacetasEmpleados)
