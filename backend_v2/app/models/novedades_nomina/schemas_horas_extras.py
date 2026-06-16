"""
Schemas Pydantic/SQLModel para el módulo de Horas Extras y Pre-liquidación.

Convención del proyecto: usar `SQLModel` con `ConfigDict(from_attributes=True)`
para que las respuestas se serialicen directo desde los modelos ORM.
"""
from datetime import date, datetime
from typing import Optional, List
from pydantic import ConfigDict, Field, field_validator
from sqlmodel import SQLModel


# ---------------------------------------------------------------------------
# Catálogo de novedades
# ---------------------------------------------------------------------------

class NovedadCatalogoRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: str
    descripcion_corta: str
    descripcion_larga: Optional[str] = None
    categoria: str
    subcategoria: str
    factor_hora_ordinaria: float
    acredita_bolsa: bool
    descuenta_bolsa: bool
    requiere_autorizacion: bool
    unidad: str
    estado: str
    vigente_desde: date
    vigente_hasta: Optional[date] = None
    observaciones: Optional[str] = None


class NovedadCatalogoCreate(SQLModel):
    """Payload para crear/actualizar una novedad del catálogo."""
    codigo: str = Field(min_length=1, max_length=20)
    descripcion_corta: str = Field(min_length=1, max_length=100)
    descripcion_larga: Optional[str] = Field(default=None, max_length=500)
    categoria: str = Field(min_length=1, max_length=50)
    subcategoria: str = Field(min_length=1, max_length=50)
    factor_hora_ordinaria: float = Field(ge=0.0, le=10.0)
    acredita_bolsa: bool = False
    descuenta_bolsa: bool = False
    requiere_autorizacion: bool = False
    unidad: str = Field(default="HORAS", max_length=20)
    estado: str = Field(default="ACTIVO", max_length=20)
    vigente_desde: date
    vigente_hasta: Optional[date] = None
    observaciones: Optional[str] = None


# ---------------------------------------------------------------------------
# Factores prestacionales ARL
# ---------------------------------------------------------------------------

class FactorPrestacionalRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nivel_riesgo: str
    nivel_macro: str
    arl_nombre: Optional[str] = None
    factor_prestacional: float
    porcentaje_arl: float
    vigente_desde: date
    vigente_hasta: Optional[date] = None


# ---------------------------------------------------------------------------
# Horario pactado
# ---------------------------------------------------------------------------

class HorarioPactadoRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    cedula: str
    minutos_jornada_ordinaria: int
    horas_semana_ordinaria: float
    es_jornada_nocturna: bool
    autoriza_he_default: bool
    autoriza_he_override: Optional[bool] = None
    override_motivo: Optional[str] = None
    override_autorizado_por: Optional[str] = None
    override_fecha: Optional[datetime] = None
    sincronizado_en: Optional[datetime] = None
    fuente_sincronizacion: str


class HorarioPactadoEfectivoRead(SQLModel):
    """
    Resolución efectiva de autorización HE para un empleado:
    si hay override vigente, gana; si no, gana el default del ERP.
    """
    cedula: str
    autoriza_he: bool
    fuente: str  # 'OVERRIDE' | 'ERP' | 'SIN_DATOS'
    horas_semana_ordinaria: float
    minutos_jornada_ordinaria: int
    es_jornada_nocturna: bool


# ---------------------------------------------------------------------------
# Override de autorización HE
# ---------------------------------------------------------------------------

class OverrideAutorizaHECreate(SQLModel):
    cedula: str = Field(min_length=1, max_length=50)
    autoriza_he_override: bool
    motivo: str = Field(min_length=5, max_length=500)
    autorizado_por: str = Field(min_length=1, max_length=100)
    vigente_hasta: Optional[datetime] = None
    documento_soporte_url: Optional[str] = None


class OverrideAutorizaHERead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    cedula: str
    autoriza_he_erp: bool
    autoriza_he_override: bool
    motivo: str
    autorizado_por: str
    autorizado_por_id: Optional[str] = None
    vigente_desde: datetime
    vigente_hasta: Optional[datetime] = None
    estado: str
    documento_soporte_url: Optional[str] = None
    creado_en: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Pre-liquidación: input de cálculo
# ---------------------------------------------------------------------------

class PreLiquidacionInput(SQLModel):
    """
    Input para el cálculo de horas extras semanales.
    horas_por_dia: lista de 7 días, Lunes a Domingo.
    codigos_por_dia: para cada día, lista de códigos de novedad aplicables (opcional).
    """
    cedula: str = Field(min_length=1, max_length=50)
    anio: int = Field(ge=2020, le=2100)
    semana_iso: int = Field(ge=1, le=53)
    horas_por_dia: List[float] = Field(
        min_length=7,
        max_length=7,
        description="7 valores, lunes a domingo. Horas ordinarias trabajadas cada día.",
    )
    codigos_por_dia: Optional[List[List[str]]] = Field(
        default=None,
        description="Para cada día, lista de códigos de novedad (ej. ['HED','HEN']).",
    )
    es_jornada_nocturna: bool = False
    salario_base_mensual: float = Field(gt=0, description="Salario base mensual del empleado")
    nivel_riesgo_arl: str = Field(pattern="^(I|II|III|IV|V)$")
    ot_codigo: Optional[str] = Field(default=None, max_length=50)
    ot_id: Optional[int] = None

    @field_validator("horas_por_dia")
    @classmethod
    def _validar_horas_no_negativas(cls, v: List[float]) -> List[float]:
        for i, h in enumerate(v):
            if h < 0:
                raise ValueError(f"horas_por_dia[{i}] no puede ser negativo: {h}")
            if h > 24:
                raise ValueError(f"horas_por_dia[{i}] no puede exceder 24h: {h}")
        return v


# ---------------------------------------------------------------------------
# Pre-liquidación: salida de cálculo
# ---------------------------------------------------------------------------

class DetalleCalculoItem(SQLModel):
    codigo_novedad: str
    horas: float
    factor_hora_ordinaria: float
    valor_bruto: float
    carga_prestacional: float
    costo_total: float


class PreLiquidacionResultado(SQLModel):
    """
    Salida completa del cálculo de pre-liquidación semanal.
    """
    cedula: str
    anio: int
    semana_iso: int
    nivel_riesgo_arl: str
    factor_prestacional: float
    salario_base_mensual: float
    valor_hora_ordinaria: float
    total_horas_extras: float
    total_valor_bruto: float
    total_carga_prestacional: float
    total_costo_empresa: float
    detalles: List[DetalleCalculoItem]
    advertencias: List[str] = Field(
        default_factory=list,
        description="Topes legales excedidos, autorizaciones faltantes, etc.",
    )


# ---------------------------------------------------------------------------
# Bolsa de horas
# ---------------------------------------------------------------------------

class BolsaHorasRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    cedula: str
    horas_acreditadas: float
    horas_consumidas: float
    horas_pagadas: float

    @property
    def horas_disponibles(self) -> float:
        return self.horas_acreditadas - self.horas_consumidas - self.horas_pagadas


class BolsaHorasEfectiva(BolsaHorasRead):
    horas_disponibles: float


# ---------------------------------------------------------------------------
# Confirmación de cálculo (persistencia en BD)
# ---------------------------------------------------------------------------

# ConfirmarDetalleItem se declara ANTES de PreLiquidacionConfirmar para que
# la forward-ref 'ConfirmarDetalleItem' en `detalles: List[...]` se resuelva
# correctamente cuando Pydantic 2.5 construye el TypeAdapter del parámetro
# de la ruta. Si va después, Pydantic lanza PydanticUndefinedAnnotation
# en el primer request al endpoint /pre-liquidacion/confirmar.
class ConfirmarDetalleItem(SQLModel):
    codigo_novedad: str = Field(min_length=1, max_length=20)
    horas: float = Field(gt=0.0)
    factor_hora_ordinaria: float = Field(ge=0.0)
    valor_bruto: float = Field(ge=0.0)
    carga_prestacional: float = Field(ge=0.0)
    costo_total: float = Field(ge=0.0)
    fuente: str = Field(default="PORTAL", max_length=20)


class PreLiquidacionConfirmar(SQLModel):
    """
    Input para CONFIRMAR un cálculo y persistirlo.
    El frontend primero llama a /pre-liquidacion (cálculo) y luego a
    /pre-liquidacion/confirmar con el resultado que el usuario aprobó.
    """
    cedula: str = Field(min_length=1, max_length=50)
    anio: int = Field(ge=2020, le=2100)
    semana_iso: int = Field(ge=1, le=53)
    fecha_inicio: date
    fecha_fin: date
    nivel_riesgo_arl: str = Field(pattern="^(I|II|III|IV|V)$")
    factor_prestacional: float = Field(ge=0.0)
    salario_base_mensual: float = Field(gt=0)
    valor_hora_ordinaria: float = Field(ge=0.0)
    detalles: List[ConfirmarDetalleItem] = Field(min_length=1)
    ot_id: Optional[int] = None
    ot_codigo: Optional[str] = Field(default=None, max_length=50)
    usuario_confirma: str = Field(min_length=1, max_length=50)
    observaciones: Optional[str] = None


class PreLiquidacionConfirmada(SQLModel):
    """Respuesta al confirmar. Incluye IDs persistidos y resumen de movimientos."""
    calculo_id: int
    bolsa_id: Optional[int] = None
    horas_acreditadas_bolsa: float = 0.0
    movimientos_bolsa: List[int] = Field(default_factory=list)
    costo_ot_id: Optional[int] = None
    mensaje: str = "Cálculo confirmado y persistido"


# ---------------------------------------------------------------------------
# Lectura de cálculos
# ---------------------------------------------------------------------------

class CalculoDetalleRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo_novedad: str
    horas: float
    factor_hora_ordinaria: float
    valor_bruto: float
    carga_prestacional: float
    costo_total: float
    ot_id: Optional[int] = None
    ot_codigo: Optional[str] = None
    fuente: str


class CalculoSemanalRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    cedula: str
    anio: int
    semana_iso: int
    fecha_inicio: date
    fecha_fin: date
    nivel_riesgo_arl: str
    factor_prestacional: float
    salario_base_mensual: float
    valor_hora_ordinaria: float
    total_horas_extras: float
    total_horas_recargo_nocturno: float
    total_valor_bruto: float
    total_carga_prestacional: float
    total_costo_empresa: float
    estado: str
    calculado_por: Optional[str] = None
    calculado_en: Optional[datetime] = None
    confirmado_por: Optional[str] = None
    confirmado_en: Optional[datetime] = None
    observaciones: Optional[str] = None
    detalles: List[CalculoDetalleRead] = Field(default_factory=list)


class CostoOtRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ot_id: int
    ot_codigo: str
    anio: int
    semana_iso: int
    fecha_inicio: date
    fecha_fin: date
    total_empleados: int
    total_horas: float
    total_horas_hed: float
    total_horas_hen: float
    total_horas_hefd: float
    total_horas_hefn: float
    total_horas_hf: float
    total_valor_bruto: float
    total_carga_prestacional: float
    total_costo_empresa: float
    categoria_sub_indice: Optional[str] = None
    cc: Optional[str] = None
    scc: Optional[str] = None
    sub_indice: Optional[str] = None
    ultima_actualizacion: Optional[datetime] = None


# ---------------------------------------------------------------------------
# S4 — Workflow de estados del cálculo y compensación de bolsa
# ---------------------------------------------------------------------------

class WorkflowTransicionRequest(SQLModel):
    """Body para POST /calculos/{id}/transicion."""
    estado_destino: str = Field(..., description="PAGADO, COMPENSADO o ANULADO")
    justificacion: Optional[str] = Field(default=None, max_length=500)
    horas: Optional[float] = Field(default=None, ge=0, description="Horas a compensar (solo si destino=COMPENSADO)")
    fecha: Optional[date] = Field(default=None, description="Fecha efectiva (solo si destino=COMPENSADO)")


class WorkflowEventoRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    calculo_id: int
    estado_origen: str
    estado_destino: str
    justificacion: Optional[str] = None
    usuario_id: Optional[str] = None
    created_at: Optional[datetime] = None


class WorkflowTransicionResult(SQLModel):
    calculo_id: int
    estado_anterior: str
    estado_nuevo: str
    evento_id: int
    movimiento_bolsa_id: Optional[int] = None
    horas_afectadas: float = 0.0
    mensaje: str


class CompensarBolsaRequest(SQLModel):
    """Body para POST /bolsa/compensar (consumo directo de bolsa, no requiere cálculo)."""
    cedula: str = Field(..., min_length=1, max_length=50)
    horas: float = Field(..., gt=0)
    fecha: date
    calculo_id: Optional[int] = Field(default=None, description="Si viene de un cálculo, se vincula al movimiento")
    observaciones: Optional[str] = Field(default=None, max_length=500)


class CompensarBolsaResponse(SQLModel):
    cedula: str
    movimiento_id: int
    horas_compensadas: float
    horas_disponibles_despues: float
    mensaje: str


# ---------------------------------------------------------------------------
# S5' — Festivos
# ---------------------------------------------------------------------------

class FestivoRead(SQLModel):
    fecha: date
    nombre: str
    fuente: str  # 'CALENDARIFIC' | 'LEY_EMILIANI'


class FestivoSincronizarResult(SQLModel):
    anio: int
    fuente: str
    cantidad: int
    calendarific_error: Optional[str] = None
    mensaje: str
