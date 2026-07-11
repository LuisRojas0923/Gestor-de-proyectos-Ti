"""
Schemas Pydantic para el horario semanal editable (S5'').

Detalle diario del horario pactado (L-D) + registro diario real de
asistencia que alimenta la pre-liquidación. Separado de
``schemas_horas_extras`` para mantenerlo bajo el límite de 500 líneas.
"""
from datetime import time
from typing import Optional, List
from pydantic import ConfigDict, Field, model_validator
from sqlmodel import SQLModel

from .turnos import minutos_jornada


class HorarioPactadoDiaRead(SQLModel):
    """Una fila de horario para un día de la semana."""
    model_config = ConfigDict(from_attributes=True)
    cedula: str
    dia_semana: int
    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    minutos_almuerzo: int
    cruza_medianoche: bool = False


class HorarioPactadoDiaUpdate(SQLModel):
    """Payload para un día del horario (PUT /horario/{cedula}/semana)."""
    dia_semana: int = Field(ge=1, le=7)
    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    minutos_almuerzo: int = Field(default=0, ge=0, le=240)
    cruza_medianoche: bool = False

    @model_validator(mode="after")
    def _validar_jornada(self):
        minutos_jornada(
            self.hora_entrada,
            self.hora_salida,
            self.minutos_almuerzo,
            self.cruza_medianoche,
        )
        return self


class HorarioPactadoSemanaUpdate(SQLModel):
    """Reemplazo total de los 7 días del horario de un empleado."""
    dias: List[HorarioPactadoDiaUpdate] = Field(min_length=7, max_length=7)


class HorarioPactadoSemanaRead(SQLModel):
    """Respuesta: semana completa con días 1-7 (L-D)."""
    cedula: str
    dias: List[HorarioPactadoDiaRead]


class RegistroDiarioInput(SQLModel):
    """
    Jornada REAL de un día: a qué hora entró, a qué hora salió,
    cuánto almorzó. Las horas trabajadas se derivan en backend como
    (salida - entrada) - almuerzo. Días libres: hora_entrada = null.

    Permite al usuario capturar la asistencia en formato reloj
    (HH:MM) sin hacer aritmética mental.
    """
    dia_semana: int = Field(ge=1, le=7)
    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    minutos_almuerzo: int = Field(default=0, ge=0, le=240)
    cruza_medianoche: bool = False

    @model_validator(mode="after")
    def _validar_jornada(self):
        minutos_jornada(
            self.hora_entrada,
            self.hora_salida,
            self.minutos_almuerzo,
            self.cruza_medianoche,
        )
        return self
