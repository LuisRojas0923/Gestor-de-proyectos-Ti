"""Snapshot diario inmutable asociado a un cálculo confirmado de HE."""
from datetime import date, datetime, time
from typing import Optional

from sqlmodel import Field, SQLModel


class NominaCalculoDiarioDetalle(SQLModel, table=True):
    __tablename__ = "nomina_calculo_diario_detalle"

    id: Optional[int] = Field(default=None, primary_key=True)
    calculo_id: int = Field(foreign_key="nomina_calculo_semanal.id", index=True)
    cedula: str = Field(max_length=50, index=True)
    anio: int = Field(index=True)
    semana_iso: int = Field(index=True)
    fecha: date = Field(index=True)
    dia_semana: int = Field(ge=1, le=7)

    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    minutos_almuerzo: int = Field(default=0, ge=0)
    horas_trabajadas: float = Field(default=0.0, ge=0.0)
    horas_ordinarias: float = Field(default=0.0, ge=0.0)
    horas_extras: float = Field(default=0.0, ge=0.0)

    codigo_calculado: Optional[str] = Field(default=None, max_length=20, index=True)
    horas_concepto: Optional[float] = Field(default=None, ge=0.0)
    factor_hora_ordinaria: Optional[float] = Field(default=None, ge=0.0)
    valor_bruto: float = Field(default=0.0, ge=0.0)
    carga_prestacional: float = Field(default=0.0, ge=0.0)
    costo_total: float = Field(default=0.0, ge=0.0)

    es_festivo: bool = Field(default=False)
    nombre_festivo: Optional[str] = Field(default=None, max_length=150)
    es_domingo: bool = Field(default=False)
    es_jornada_nocturna: bool = Field(default=False)
    novedad_codigo: Optional[str] = Field(default=None, max_length=20)
    novedad_evento_id: Optional[int] = None

    fuente_horario: str = Field(default="PLANIFICADOR", max_length=30)
    fuente_evidencia_id: Optional[int] = None
    hash_snapshot: Optional[str] = Field(default=None, max_length=128)
    creado_por: Optional[str] = Field(default=None, max_length=50)
    ot_id: Optional[int] = Field(default=None, index=True)
    ot_codigo: Optional[str] = Field(default=None, max_length=50)
    observaciones: Optional[str] = None
    creado_en: datetime = Field(default_factory=datetime.now)
