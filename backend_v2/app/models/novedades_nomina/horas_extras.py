"""
Modelos del módulo de Horas Extras y Novedades — Backend V2 (SQLModel).

Decisiones de diseño documentadas en:
  docs/research/2026-06-15-preguntas-y-respuestas-modulo-he.md
  - C1: Bolsa se acredita al confirmar el cálculo, no al cargar.
  - E1: Cache de horario_pactado se refresca diario a las 02:00.
  - H2: Carga prestacional se parametriza por nivel de riesgo ARL.
  - H7: Costos OT se consolidan en tiempo real al confirmar.
  - H8: Bolsa de horas pertenece al empleado (nunca a la OT).
"""
from typing import Optional, List
from datetime import datetime, date
from sqlmodel import SQLModel, Field, Relationship, JSON, Column


# ---------------------------------------------------------------------------
# 1. Catálogo maestro de novedades
# ---------------------------------------------------------------------------

class NominaCatalogoNovedad(SQLModel, table=True):
    """
    Catálogo cerrado de novedades soportadas (HED, HEN, VAC, LIC, ...).

    Es la fuente de verdad para validar entradas y derivar reglas operativas
    (factor de hora extra, afectación a bolsa, etc.). Cualquier novedad que
    no esté aquí debe rechazarse en la carga.

    Decisión I3: códigos cortos del Excel regional en mayúsculas
    (HED, HEN, HEFD, HEFN, HF, RN, RF, VAC, INC, CMP, PNR, RET, AUS,
    SAN, DXT, REM, LIC).
    """
    __tablename__ = "nomina_catalogo_novedades"

    id: Optional[int] = Field(default=None, primary_key=True)
    codigo: str = Field(max_length=20, unique=True, index=True)  # 'HED', 'VAC', ...
    descripcion_corta: str = Field(max_length=100)               # 'Hora extra diurna'
    descripcion_larga: Optional[str] = Field(default=None, max_length=500)

    # Clasificación
    categoria: str = Field(max_length=50)        # 'HORA_EXTRA' | 'AUSENCIA' | 'LICENCIA' | 'INCAPACIDAD' | 'VACACION'
    subcategoria: str = Field(max_length=50)     # 'DIURNA' | 'NOCTURNA' | 'FESTIVA_DIURNA' | ...

    # Reglas operativas
    # Factor multiplicador sobre hora ordinaria (1.0 = hora normal).
    # 1.25 (HED), 1.75 (HEN), 2.05 (HEFD), 2.55 (HEFN) según CST y Ley 2466/2025.
    factor_hora_ordinaria: float = Field(default=1.0)

    # ¿Acredita bolsa de horas del empleado? Solo las horas extras (HED/HEN/HEFD/HEFN/HF)
    # acreditan bolsa. Ausencias y licencias NO. Decisión H8: bolsa siempre del empleado.
    acredita_bolsa: bool = Field(default=False)

    # ¿Descuenta de la bolsa al consumirse? (true = la hora extra se compensa después)
    descuenta_bolsa: bool = Field(default=False)

    # ¿Requiere autorización del jefe para reportarse? (todas las HE)
    requiere_autorizacion: bool = Field(default=False)

    # Unidad de medida: 'HORAS' | 'DIAS'
    unidad: str = Field(default="HORAS", max_length=20)

    # Estado: 'ACTIVO' | 'INACTIVO' (para soportar deprecación sin eliminar)
    estado: str = Field(default="ACTIVO", max_length=20)

    # Vigencia legal: la regla puede cambiar con nueva normatividad.
    vigente_desde: date = Field(default_factory=date.today)
    vigente_hasta: Optional[date] = Field(default=None)

    observaciones: Optional[str] = Field(default=None)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    actualizado_en: Optional[datetime] = Field(default=None)


# ---------------------------------------------------------------------------
# 2. Factores prestacionales por nivel de riesgo ARL
# ---------------------------------------------------------------------------

class NominaFactorPrestacionalRiesgo(SQLModel, table=True):
    """
    Carga prestacional que la empresa asume sobre las horas extras,
    parametrizada por nivel de riesgo ARL del empleado (Decisión H2).

    Fórmula: costo_total_empleador = valor_hora * factor_hora_extra
                                              * (1 + factor_prestacional_nivel)

    Los 5 niveles ARL (Decreto 1295/1994):
      I   → 0.522%
      II  → 1.044%
      III → 2.436%
      IV  → 4.350%
      V   → 6.960%

    Se almacenan agrupados en 3 macro-niveles para evitar dispersión:
      Operativo (III–V):   ~56%
      Administrativo (II): ~52%
      Dirección (I):       ~50%
    """
    __tablename__ = "nomina_factor_prestacional_riesgo"

    id: Optional[int] = Field(default=None, primary_key=True)
    nivel_riesgo: str = Field(max_length=20, unique=True, index=True)  # 'I' | 'II' | 'III' | 'IV' | 'V'
    nivel_macro: str = Field(max_length=30)                          # 'OPERATIVO' | 'ADMINISTRATIVO' | 'DIRECCION'
    arl_nombre: Optional[str] = Field(default=None, max_length=100)   # 'SURA', 'BOLIVAR', etc.

    # Carga prestacional efectiva (fracción, no porcentaje).
    # 0.56 = 56% sobre la hora extra bruta.
    factor_prestacional: float

    # Componentes desglosados (opcional, para reporte)
    porcentaje_salud: float = Field(default=0.085)
    porcentaje_pension: float = Field(default=0.12)
    porcentaje_arl: float = Field(default=0.00522)  # 0.522% nivel I
    porcentaje_caja: float = Field(default=0.04)
    porcentaje_icbf: float = Field(default=0.03)
    porcentaje_sena: float = Field(default=0.02)
    porcentaje_prima: float = Field(default=0.0833)
    porcentaje_cesantia: float = Field(default=0.0833)
    porcentaje_interes_cesantia: float = Field(default=0.01)
    porcentaje_vacaciones: float = Field(default=0.0417)

    vigente_desde: date = Field(default_factory=date.today)
    vigente_hasta: Optional[date] = Field(default=None)
    observaciones: Optional[str] = Field(default=None)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})


# ---------------------------------------------------------------------------
# 3. Horario pactado (cache desde ERP)
# ---------------------------------------------------------------------------

class NominaHorarioPactado(SQLModel, table=True):
    """
    Cache local del horario_pactado del empleado desde el ERP.

    Decisión E1: se cachea para evitar golpear el ERP en cada consulta de HE.
    El job batch diario a las 02:00 refresca autorizacion_he y nivel_riesgo_arl.

    El cache_flag indica si la fila proviene del ERP (false) o de override
    del portal (true). Cualquier override se audita en nomina_override_autoriza_he.
    """
    __tablename__ = "nomina_horario_pactado"

    id: Optional[int] = Field(default=None, primary_key=True)
    cedula: str = Field(max_length=50, unique=True, index=True)

    # Horario ordinario: minutos por día (480 = 8h).
    # En Colombia la jornada ordinaria diurna = 8h (Ley 2101/2021 reducción gradual).
    minutos_jornada_ordinaria: int = Field(default=480)
    horas_semana_ordinaria: float = Field(default=48.0)

    # Jornada nocturna ordinaria: 22:00 – 06:00 (CST Art. 160).
    # Si la jornada del empleado cae en este rango, las horas son recargo nocturno,
    # no horas extras (regla distinta a HE).
    es_jornada_nocturna: bool = Field(default=False)

    # ¿El empleado está autorizado para laborar HE por su contrato/cargo?
    # Viene de la tabla `beneficio` en el ERP (campo `autoriza_he`).
    autoriza_he_default: bool = Field(default=False)

    # Override aplicado en el portal (tiene prioridad sobre el default del ERP).
    autoriza_he_override: Optional[bool] = Field(default=None)
    override_motivo: Optional[str] = Field(default=None, max_length=500)
    override_autorizado_por: Optional[str] = Field(default=None, max_length=100)
    override_fecha: Optional[datetime] = Field(default=None)

    # Última sincronización con el ERP.
    sincronizado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    fuente_sincronizacion: str = Field(default="ERP", max_length=20)  # 'ERP' | 'MANUAL' | 'OVERRIDE'
    observaciones: Optional[str] = Field(default=None)


# ---------------------------------------------------------------------------
# 4. Bolsa de horas del empleado
# ---------------------------------------------------------------------------

class NominaBolsaHoras(SQLModel, table=True):
    """
    Bolsa de horas extras del empleado.

    Decisión H8: la bolsa pertenece SIEMPRE al empleado, nunca a la OT.
    Se acredita cuando se CONFIRMA el cálculo de HE (no al cargar — decisión C1).
    Se descuenta cuando se COMPENSA (tiempo libre o pago).

    horas_disponibles = horas_acreditadas - horas_consumidas - horas_pagadas
    """
    __tablename__ = "nomina_bolsa_horas"

    id: Optional[int] = Field(default=None, primary_key=True)
    cedula: str = Field(max_length=50, unique=True, index=True)

    horas_acreditadas: float = Field(default=0.0)
    horas_consumidas: float = Field(default=0.0)   # compensadas con tiempo libre
    horas_pagadas: float = Field(default=0.0)       # liquidadas en dinero

    # Periodo de control: por defecto la bolsa es "viva" (sin vencimiento).
    # Si la organización quiere tope, se parametriza aquí.
    fecha_ultimo_movimiento: Optional[datetime] = Field(default=None)
    observaciones: Optional[str] = Field(default=None)

    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    actualizado_en: Optional[datetime] = Field(default=None)


class NominaBolsaHorasMovimiento(SQLModel, table=True):
    """
    Trazabilidad de cada movimiento de la bolsa (acreditación, consumo, pago).
    """
    __tablename__ = "nomina_bolsa_horas_movimientos"

    id: Optional[int] = Field(default=None, primary_key=True)
    bolsa_id: int = Field(foreign_key="nomina_bolsa_horas.id")
    cedula: str = Field(max_length=50, index=True)

    # 'ACREDITACION' | 'CONSUMO_TIEMPO' | 'PAGO' | 'AJUSTE'
    tipo_movimiento: str = Field(max_length=30)
    horas: float
    fecha: datetime = Field(default_factory=datetime.now)

    # Vínculo al cálculo de HE que originó el movimiento
    calculo_id: Optional[int] = Field(default=None, foreign_key="nomina_calculo_semanal.id")
    liquidacion_id: Optional[int] = Field(default=None)
    usuario_id: Optional[str] = Field(default=None, max_length=50)
    observaciones: Optional[str] = Field(default=None)


# ---------------------------------------------------------------------------
# 5. Auditoría de overrides de autorización de HE
# ---------------------------------------------------------------------------

class NominaOverrideAutorizaHE(SQLModel, table=True):
    """
    Bitácora inmutable de cada override de autorización HE.

    El ERP entrega `autoriza_he` por contrato. Si el portal lo cambia
    (ej. cargo temporal, autorización verbal del jefe), queda registrado
    aquí con: quién, cuándo, por qué, vigencia, y si está activo.
    """
    __tablename__ = "nomina_override_autoriza_he"

    id: Optional[int] = Field(default=None, primary_key=True)
    cedula: str = Field(max_length=50, index=True)

    # Valor original del ERP al momento del override
    autoriza_he_erp: bool
    # Valor aplicado por el override del portal
    autoriza_he_override: bool

    motivo: str = Field(max_length=500)
    autorizado_por: str = Field(max_length=100)  # nombre del jefe que autorizó
    autorizado_por_id: Optional[str] = Field(default=None, max_length=50)

    vigente_desde: datetime = Field(default_factory=datetime.now)
    vigente_hasta: Optional[datetime] = Field(default=None)
    estado: str = Field(default="ACTIVO", max_length=20)  # 'ACTIVO' | 'REVOCADO' | 'EXPIRADO'

    documento_soporte_url: Optional[str] = Field(default=None, max_length=500)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})


# ---------------------------------------------------------------------------
# 6. Cálculo semanal de horas extras
# ---------------------------------------------------------------------------

class NominaCalculoSemanal(SQLModel, table=True):
    """
    Cabecera del cálculo semanal de horas extras de un empleado.

    Una fila por (cedula, año, semana_iso, ot_id).
    Detalle de conceptos (HED, HEN, ...) en nomina_calculo_semanal_detalle.
    """
    __tablename__ = "nomina_calculo_semanal"

    id: Optional[int] = Field(default=None, primary_key=True)
    cedula: str = Field(max_length=50, index=True)

    # Periodo
    anio: int = Field(index=True)
    semana_iso: int = Field(index=True)  # 1-53
    fecha_inicio: date
    fecha_fin: date

    # Snapshot del horario al momento del cálculo
    nivel_riesgo_arl: str = Field(max_length=10)  # 'I'..'V'
    factor_prestacional: float
    salario_base_mensual: float
    valor_hora_ordinaria: float  # salario_base / 240

    # Total agregado (denormalizado para consulta rápida)
    total_horas_extras: float = Field(default=0.0)
    total_horas_recargo_nocturno: float = Field(default=0.0)
    total_valor_bruto: float = Field(default=0.0)
    total_carga_prestacional: float = Field(default=0.0)
    total_costo_empresa: float = Field(default=0.0)

    estado: str = Field(default="BORRADOR", max_length=30)
    # 'BORRADOR' | 'CONFIRMADO' | 'PAGADO' | 'COMPENSADO' | 'ANULADO'

    # Trazabilidad
    calculado_por: Optional[str] = Field(default=None, max_length=50)
    calculado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    confirmado_por: Optional[str] = Field(default=None, max_length=50)
    confirmado_en: Optional[datetime] = Field(default=None)
    observaciones: Optional[str] = Field(default=None)

    detalles: List["NominaCalculoSemanalDetalle"] = Relationship(
        back_populates="calculo",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class NominaCalculoSemanalDetalle(SQLModel, table=True):
    """
    Detalle por concepto (HED, HEN, HEFD, HEFN, HF) de un cálculo semanal.
    """
    __tablename__ = "nomina_calculo_semanal_detalle"

    id: Optional[int] = Field(default=None, primary_key=True)
    calculo_id: int = Field(foreign_key="nomina_calculo_semanal.id")

    codigo_novedad: str = Field(max_length=20)  # FK lógica a nomina_catalogo_novedades.codigo
    horas: float
    factor_hora_ordinaria: float  # snapshot del factor al calcular

    valor_bruto: float            # horas * valor_hora_ordinaria * factor
    carga_prestacional: float     # valor_bruto * factor_prestacional_nivel
    costo_total: float            # valor_bruto + carga_prestacional

    # Si la HE está asociada a una OT (no todas lo están)
    ot_id: Optional[int] = Field(default=None)
    ot_codigo: Optional[str] = Field(default=None, max_length=50)

    fuente: str = Field(default="PORTAL", max_length=20)  # 'PORTAL' | 'PLANILLA' | 'ERP'

    calculo: NominaCalculoSemanal = Relationship(back_populates="detalles")


# ---------------------------------------------------------------------------
# 7. Costo consolidado por OT
# ---------------------------------------------------------------------------

class NominaCostoOt(SQLModel, table=True):
    """
    Costo consolidado por OT y semana.

    Decisión H7: se actualiza en tiempo real al confirmar el cálculo semanal.
    Permite al ERP consultar cuánto ha costado una OT en M.O. extra.

    Una fila por (ot_id, anio, semana_iso). Se hace UPSERT en cada confirmación.
    """
    __tablename__ = "nomina_costo_ot"

    id: Optional[int] = Field(default=None, primary_key=True)
    ot_id: int = Field(index=True)
    ot_codigo: str = Field(max_length=50, index=True)

    anio: int
    semana_iso: int
    fecha_inicio: date
    fecha_fin: date

    # Empleados distintos que aportaron HE a esta OT en la semana
    total_empleados: int = Field(default=0)
    total_horas: float = Field(default=0.0)
    total_horas_hed: float = Field(default=0.0)
    total_horas_hen: float = Field(default=0.0)
    total_horas_hefd: float = Field(default=0.0)
    total_horas_hefn: float = Field(default=0.0)
    total_horas_hf: float = Field(default=0.0)

    total_valor_bruto: float = Field(default=0.0)
    total_carga_prestacional: float = Field(default=0.0)
    total_costo_empresa: float = Field(default=0.0)

    # Snapshot del contrato al momento del cálculo
    categoria_sub_indice: Optional[str] = Field(default=None, max_length=50)
    cc: Optional[str] = Field(default=None, max_length=50)
    scc: Optional[str] = Field(default=None, max_length=50)
    sub_indice: Optional[str] = Field(default=None, max_length=50)

    ultima_actualizacion: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
    calculo_ids: Optional[list] = Field(default=None, sa_column=Column(JSON))  # IDs de cálculos que aportaron


# ---------------------------------------------------------------------------
# 8. Parámetros legales con vigencia
# ---------------------------------------------------------------------------

class NominaParametroLegal(SQLModel, table=True):
    """
    Parámetros legales (topes, factores, fechas) con vigencia.

    Ejemplos:
      - 'MAX_HE_DIARIAS' = 2 (CST Art. 161)
      - 'MAX_HE_SEMANALES' = 12
      - 'REDUCCION_JORNADA_LEY_2101' = '{"2026":47, "2027":46, "2028":44}'
      - 'PORCENTAJE_EMPRESA_PORCENTAJE_HED' = 1.25
    """
    __tablename__ = "nomina_parametros_legales"

    id: Optional[int] = Field(default=None, primary_key=True)
    codigo: str = Field(max_length=50, unique=True, index=True)
    nombre: str = Field(max_length=200)
    valor: str = Field(max_length=500)            # texto, parseado según tipo
    tipo_dato: str = Field(default="NUMERICO", max_length=20)  # 'NUMERICO' | 'TEXTO' | 'JSON' | 'BOOLEANO'
    norma_soporte: Optional[str] = Field(default=None, max_length=200)  # 'Ley 2101/2021 Art. 2'
    vigente_desde: date = Field(default_factory=date.today)
    vigente_hasta: Optional[date] = Field(default=None)
    estado: str = Field(default="VIGENTE", max_length=20)
    observaciones: Optional[str] = Field(default=None)
    creado_en: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})


# ---------------------------------------------------------------------------
# 9. Eventos de workflow del cálculo semanal (S4)
# ---------------------------------------------------------------------------

class NominaCalculoWorkflowEvento(SQLModel, table=True):
    """
    Bitácora inmutable de transiciones de estado de un cálculo semanal.

    Decisión S4: cada cambio de estado (CONFIRMADO → PAGADO / COMPENSADO /
    ANULADO) deja un evento con: origen, destino, justificación, usuario y
    timestamp. Esto es la fuente de verdad para auditoría y para que el
    módulo de auditoría central pueda consultarlo.
    """
    __tablename__ = "nomina_calculo_workflow_evento"

    id: Optional[int] = Field(default=None, primary_key=True)
    calculo_id: int = Field(foreign_key="nomina_calculo_semanal.id", index=True)
    estado_origen: str = Field(max_length=30)
    estado_destino: str = Field(max_length=30)
    justificacion: Optional[str] = Field(default=None)
    usuario_id: Optional[str] = Field(default=None, max_length=50)
    created_at: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})


# ---------------------------------------------------------------------------
# 10. Calendario de festivos (S5')
# ---------------------------------------------------------------------------

class NominaFestivoCalendario(SQLModel, table=True):
    """
    Festivos nacionales de Colombia para un año dado.

    Decisión S5': fuente ∈ {CALENDARIFIC, LEY_EMILIANI}. Calendarific es
    preferido cuando CALENDARIFIC_API_KEY está configurada; si no, se usa
    la tabla hardcodeada con la Ley Emiliani (Ley 51/1983) que mueve a
    lunes los festivos que caen en domingo.

    PK compuesta por (anio, fecha) para que un mismo año pueda tener sus
    18 festivos únicos pero distintos años convivan en la misma tabla.
    """
    __tablename__ = "nomina_festivo_calendario"

    anio: int = Field(primary_key=True)
    fecha: date = Field(primary_key=True)
    nombre: str = Field(max_length=100)
    fuente: str = Field(max_length=20)  # 'CALENDARIFIC' | 'LEY_EMILIANI'
    created_at: Optional[datetime] = Field(default=None, sa_column_kwargs={"server_default": "now()"})
