"""
Sprint S7 — Schemas del planificador semanal.

DTOs para:
  - GET /planificador/empleados-erp          (busqueda paginada)
  - POST /horario/registros/bulk             (guardar borrador)
  - POST /planificador/pre-calcular          (calculo sin persistir)
  - POST /planificador/confirmar             (genera calculos semanales)

Separado de schemas_horas_extras.py para mantener ese archivo
bajo el limite de 500 lineas del pre-commit.
"""
from datetime import date, datetime, time
from typing import List, Optional

from pydantic import ConfigDict, Field
from sqlmodel import SQLModel


# ---------------------------------------------------------------------------
# ERP empleados
# ---------------------------------------------------------------------------

class EmpleadoERPRead(SQLModel):
    """Vista reducida de un empleado para el selector del planificador."""
    cedula: str
    nombre: str
    cargo: Optional[str] = None
    area: Optional[str] = None
    nivel_riesgo_arl: Optional[str] = None
    autoriza_he: Optional[bool] = None


class EmpleadoERPListResponse(SQLModel):
    items: List[EmpleadoERPRead]
    total: int
    limit: int
    offset: int


# ---------------------------------------------------------------------------
# Plan semanal — input
# ---------------------------------------------------------------------------

class PlanSemanaIn(SQLModel):
    """Cabecera del plan: anio + semana ISO + fechas."""
    anio: int = Field(ge=2020, le=2100)
    semana_iso: int = Field(ge=1, le=53)
    fecha_inicio: date
    fecha_fin: date


class PlanNovedadIn(SQLModel):
    """Novedad (INC/VAC/AUS/LIC) a registrar para un dia especifico."""
    codigo_novedad: str = Field(min_length=1, max_length=20)
    fecha_inicio: date
    fecha_fin: date
    observaciones: Optional[str] = Field(default=None, max_length=500)


class PlanDiaIn(SQLModel):
    """Jornada REAL de un dia (formato reloj HH:MM)."""
    dia_semana: int = Field(ge=1, le=7, description="1=Lunes .. 7=Domingo")
    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    minutos_almuerzo: int = Field(default=0, ge=0, le=240)
    novedades: List[PlanNovedadIn] = Field(default_factory=list)


class PlanEmpleadoInBase(SQLModel):
    """Datos comunes de un empleado en el plan."""
    cedula: str = Field(min_length=1, max_length=50)
    dias: List[PlanDiaIn] = Field(min_length=0, max_length=7)


class PlanBulkRequest(SQLModel):
    """Request para guardar borrador (bulk upsert horario + bulk insert novedades)."""
    semana: PlanSemanaIn
    empleados: List[PlanEmpleadoInBase] = Field(min_length=1, max_length=200)


class PlanBulkEmpleadoError(SQLModel):
    cedula: str
    motivo: str


class PlanBulkResponse(SQLModel):
    registros_horario_creados: int = 0
    registros_horario_actualizados: int = 0
    novedades_creadas: int = 0
    errores: List[PlanBulkEmpleadoError] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Pre-calculo — input/output
# ---------------------------------------------------------------------------

class PlanPreCalculoDetalleDia(SQLModel):
    dia: str  # 'LUNES'..'DOMINGO' para que el frontend no tenga que mapear
    dia_semana: int
    horas_trabajadas: float
    horas_ordinarias: float
    horas_extras: float
    codigo_he: Optional[str] = None  # 'HED' | 'HEN' | 'HEFD' | 'HEFN' | 'HF'
    es_festivo: bool = False
    novedad_codigo: Optional[str] = None


class PlanPreCalculoEmpleado(SQLModel):
    cedula: str
    total_horas_trabajadas: float = 0.0
    total_horas_ordinarias: float = 0.0
    total_horas_extras: float = 0.0
    total_costo_estimado: float = 0.0
    detalle_por_dia: List[PlanPreCalculoDetalleDia] = Field(default_factory=list)


class PlanPreCalculoResumen(SQLModel):
    total_horas_extras: float = 0.0
    total_costo_estimado: float = 0.0
    empleados_count: int = 0


class PlanPreCalculoResponse(SQLModel):
    empleados: List[PlanPreCalculoEmpleado]
    resumen: PlanPreCalculoResumen


# ---------------------------------------------------------------------------
# Confirmar plan — request con parametros de calculo
# ---------------------------------------------------------------------------

class PlanConfirmarParametros(SQLModel):
    """Parametros del calculo que aplican por empleado."""
    nivel_riesgo_arl: str = Field(min_length=1, max_length=10)
    factor_prestacional: float = Field(ge=0.0, le=1.0)
    salario_base_mensual: float = Field(ge=0.0)
    valor_hora_ordinaria: float = Field(ge=0.0)
    jornada_nocturna: bool = False
    ot_id: Optional[int] = None
    ot_codigo: Optional[str] = Field(default=None, max_length=50)


class PlanConfirmarEmpleadoIn(PlanEmpleadoInBase):
    """Empleado con parametros de calculo."""
    parametros: PlanConfirmarParametros


class PlanConfirmarRequest(SQLModel):
    semana: PlanSemanaIn
    usuario_confirma: str = Field(min_length=1, max_length=50)
    empleados: List[PlanConfirmarEmpleadoIn] = Field(min_length=1, max_length=200)


class PlanConfirmarCalculoItem(SQLModel):
    cedula: str
    calculo_id: Optional[int] = None
    bolsa_id: Optional[int] = None
    horas_acreditadas_bolsa: float = 0.0
    costo_ot_id: Optional[int] = None
    bolsa_habilitada_en_confirmacion: bool = True
    bolsa_fuente: str = "DEFAULT"
    ok: bool = True
    mensaje: str = ""


class PlanConfirmarResumen(SQLModel):
    ok_count: int = 0
    error_count: int = 0
    total_horas_extras: float = 0.0
    total_costo: float = 0.0


class PlanConfirmarResponse(SQLModel):
    calculos: List[PlanConfirmarCalculoItem]
    errores: List[PlanBulkEmpleadoError]
    resumen: PlanConfirmarResumen
