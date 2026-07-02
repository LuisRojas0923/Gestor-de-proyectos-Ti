"""Schemas de parámetros editables de cálculo de horas extras."""
from datetime import date
from typing import List, Optional

from pydantic import Field
from sqlmodel import SQLModel


class ParametroCalculoRead(SQLModel):
    codigo: str
    nombre: str
    valor: str
    tipo_dato: str
    norma_soporte: Optional[str] = None
    grupo: str
    editable: bool = True
    vigente_desde: date
    vigente_hasta: Optional[date] = None
    observaciones: Optional[str] = None


class ParametrosCalculoRead(SQLModel):
    parametros: List[ParametroCalculoRead]


class ParametroCalculoUpdate(SQLModel):
    codigo: str = Field(min_length=1, max_length=50)
    valor: str = Field(min_length=1, max_length=500)
    observaciones: Optional[str] = Field(default=None, max_length=500)


class ParametrosCalculoUpdateRequest(SQLModel):
    parametros: List[ParametroCalculoUpdate] = Field(min_length=1)
