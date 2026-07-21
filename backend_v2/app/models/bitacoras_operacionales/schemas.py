"""Contratos estrictos de entrada para Bitacoras Operacionales."""
from datetime import date
from typing import Annotated, Optional

from pydantic import ConfigDict, StringConstraints, field_validator, model_validator
from sqlmodel import Field, SQLModel

from app.utils_date import get_bogota_now


OrdenTrabajo = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=50),
]


class BitacoraOperacionalCrear(SQLModel):
    model_config = ConfigDict(extra="forbid")

    orden_trabajo: OrdenTrabajo
    fecha_elaboracion: date

    @field_validator("fecha_elaboracion")
    @classmethod
    def validar_fecha_no_futura(cls, valor: date) -> date:
        if valor > get_bogota_now().date():
            raise ValueError("La fecha de elaboracion no puede ser futura")
        return valor


class BitacoraActividadEntrada(SQLModel):
    model_config = ConfigDict(extra="forbid")

    descripcion: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=5000),
    ]


class BitacoraOperacionalActualizar(SQLModel):
    model_config = ConfigDict(extra="forbid")

    version_esperada: int = Field(ge=1)
    fecha_elaboracion: Optional[date] = None
    novedades_dia: Optional[str] = Field(default=None, max_length=10000)
    sin_novedad: Optional[bool] = None
    actividades: Optional[list[BitacoraActividadEntrada]] = None

    @field_validator("fecha_elaboracion")
    @classmethod
    def validar_fecha_no_futura(cls, valor: Optional[date]) -> Optional[date]:
        if valor is not None and valor > get_bogota_now().date():
            raise ValueError("La fecha de elaboracion no puede ser futura")
        return valor

    @field_validator("novedades_dia")
    @classmethod
    def normalizar_novedad(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None:
            return None
        normalizado = valor.strip()
        if not normalizado:
            raise ValueError("Las novedades no pueden estar vacias")
        return normalizado

    @model_validator(mode="after")
    def validar_modalidad_novedad(self):
        if self.sin_novedad is True and self.novedades_dia is not None:
            raise ValueError("Sin novedad no admite texto de novedades")
        return self
