"""Contratos HTTP del catalogo de plantillas de horario."""
from datetime import datetime, time
from typing import Optional
from uuid import UUID

from pydantic import ConfigDict, Field, model_validator
from sqlmodel import SQLModel

from .turnos import minutos_jornada


class PlantillaHorarioDiaIn(SQLModel):
    dia_semana: int = Field(ge=1, le=7)
    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    minutos_almuerzo: int = Field(default=0, ge=0, le=240)
    cruza_medianoche: bool = False

    @model_validator(mode="after")
    def _validar_turno(self):
        minutos_jornada(
            self.hora_entrada,
            self.hora_salida,
            self.minutos_almuerzo,
            self.cruza_medianoche,
        )
        return self


class PlantillaHorarioCreate(SQLModel):
    nombre: str = Field(min_length=1, max_length=120)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    dias: list[PlantillaHorarioDiaIn] = Field(min_length=7, max_length=7)


class PlantillaHorarioUpdate(SQLModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=120)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    dias: Optional[list[PlantillaHorarioDiaIn]] = Field(default=None, min_length=7, max_length=7)
    version_esperada: int = Field(ge=1)


class PlantillaHorarioDuplicar(SQLModel):
    nombre: str = Field(min_length=1, max_length=120)


class PlantillaHorarioAplicar(SQLModel):
    solicitud_id: UUID
    cedulas: list[str] = Field(min_length=1, max_length=200)


class PlantillaHorarioDiaRead(PlantillaHorarioDiaIn):
    model_config = ConfigDict(from_attributes=True)


class PlantillaHorarioRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nombre: str
    descripcion: Optional[str] = None
    version: int
    esta_activa: bool
    creado_en: Optional[datetime] = None
    actualizado_en: Optional[datetime] = None
    dias: list[PlantillaHorarioDiaRead] = Field(default_factory=list)


class PlantillaHorarioList(SQLModel):
    items: list[PlantillaHorarioRead]
    total: int
    limit: int
    offset: int


class AplicacionPlantillaRead(SQLModel):
    aplicacion_id: UUID
    plantilla_id: UUID
    plantilla_version: int
    cantidad_empleados: int
    estado: str
    idempotente: bool = False
