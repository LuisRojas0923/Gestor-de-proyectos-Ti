"""
Schemas Pydantic para el horario semanal editable (S5'').

Detalle diario del horario pactado (L-D) + registro diario real de
asistencia que alimenta la pre-liquidación. Separado de
``schemas_horas_extras`` para mantenerlo bajo el límite de 500 líneas.
"""
from datetime import time
from typing import Optional, List
from pydantic import ConfigDict, Field, field_validator
from sqlmodel import SQLModel


class HorarioPactadoDiaRead(SQLModel):
    """Una fila de horario para un día de la semana."""
    model_config = ConfigDict(from_attributes=True)
    cedula: str
    dia_semana: int
    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    minutos_almuerzo: int


class HorarioPactadoDiaUpdate(SQLModel):
    """Payload para un día del horario (PUT /horario/{cedula}/semana)."""
    dia_semana: int = Field(ge=1, le=7)
    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    minutos_almuerzo: int = Field(default=0, ge=0, le=240)

    @field_validator("hora_salida")
    @classmethod
    def _salida_posterior_a_entrada(cls, v, info):
        entrada = info.data.get("hora_entrada")
        if v is not None and entrada is not None and v <= entrada:
            raise ValueError(
                "hora_salida debe ser estrictamente mayor que hora_entrada"
            )
        return v


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
