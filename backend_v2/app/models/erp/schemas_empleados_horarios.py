"""Contratos compartidos de filtros y facetas de empleados ERP."""
from pydantic import Field
from sqlmodel import SQLModel


class FacetasEmpleados(SQLModel):
    cargos: list[str] = Field(default_factory=list)
    areas: list[str] = Field(default_factory=list)
    ciudades: list[str] = Field(default_factory=list)
    jefes: list[str] = Field(default_factory=list)
