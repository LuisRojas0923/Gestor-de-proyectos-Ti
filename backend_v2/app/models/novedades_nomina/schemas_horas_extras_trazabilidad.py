"""Schemas de trazabilidad diaria de cálculos de horas extras."""
from datetime import date, datetime, time
from typing import Literal, Optional

from pydantic import ConfigDict
from sqlmodel import Field, SQLModel


DetalleDiarioEstado = Literal["DISPONIBLE", "HISTORICO_SIN_SNAPSHOT", "INCOMPLETO"]


class CalculoDiarioDetalleIn(SQLModel):
    fecha: date
    dia_semana: int = Field(ge=1, le=7)
    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    minutos_almuerzo: int = Field(default=0, ge=0, le=240)
    cruza_medianoche: bool = False
    horas_trabajadas: float = Field(default=0.0, ge=0.0)
    horas_ordinarias: float = Field(default=0.0, ge=0.0)
    horas_extras: float = Field(default=0.0, ge=0.0)
    codigo_calculado: Optional[str] = Field(default=None, max_length=20)
    horas_concepto: Optional[float] = Field(default=None, ge=0.0)
    factor_hora_ordinaria: Optional[float] = Field(default=None, ge=0.0)
    valor_bruto: float = Field(default=0.0, ge=0.0)
    carga_prestacional: float = Field(default=0.0, ge=0.0)
    costo_total: float = Field(default=0.0, ge=0.0)
    es_festivo: bool = False
    nombre_festivo: Optional[str] = Field(default=None, max_length=150)
    es_domingo: bool = False
    es_jornada_nocturna: bool = False
    novedad_codigo: Optional[str] = Field(default=None, max_length=20)
    novedad_evento_id: Optional[int] = None
    fuente_horario: str = Field(default="PLANIFICADOR", max_length=30)
    fuente_evidencia_id: Optional[int] = None
    ot_id: Optional[int] = None
    ot_codigo: Optional[str] = Field(default=None, max_length=50)
    observaciones: Optional[str] = None


class CalculoDiarioDetalleRead(CalculoDiarioDetalleIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    calculo_id: int
    cedula: str
    anio: int
    semana_iso: int
    hash_snapshot: Optional[str] = None
    creado_por: Optional[str] = None
    creado_en: Optional[datetime] = None
