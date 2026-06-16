"""
Migración idempotente del módulo de Horas Extras y Novedades.

Crea las 8 tablas del sprint S0:
  - nomina_catalogo_novedades
  - nomina_factor_prestacional_riesgo
  - nomina_horario_pactado
  - nomina_bolsa_horas
  - nomina_bolsa_horas_movimientos
  - nomina_override_autoriza_he
  - nomina_calculo_semanal
  - nomina_calculo_semanal_detalle
  - nomina_costo_ot
  - nomina_parametros_legales

Sigue el patrón de auditoria_acciones_migration.py: safe_execute + función principal.
"""
import logging
from sqlalchemy import text

logger = logging.getLogger(__name__)


async def safe_execute(conn, query: str) -> None:
    try:
        await conn.execute(text(query))
    except Exception as exc:
        logger.warning(
            "Error (ignorado) en migración horas_extras: %s | Query: %s...",
            exc,
            query[:60],
        )


async def crear_tablas_horas_extras(conn) -> None:
    logger.info("Iniciando migración: crear tablas del módulo Horas Extras...")

    # 1. Catálogo maestro de novedades
    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS nomina_catalogo_novedades (
            id SERIAL PRIMARY KEY,
            codigo VARCHAR(20) UNIQUE NOT NULL,
            descripcion_corta VARCHAR(100) NOT NULL,
            descripcion_larga VARCHAR(500),
            categoria VARCHAR(50) NOT NULL,
            subcategoria VARCHAR(50) NOT NULL,
            factor_hora_ordinaria FLOAT NOT NULL DEFAULT 1.0,
            acredita_bolsa BOOLEAN NOT NULL DEFAULT FALSE,
            descuenta_bolsa BOOLEAN NOT NULL DEFAULT FALSE,
            requiere_autorizacion BOOLEAN NOT NULL DEFAULT FALSE,
            unidad VARCHAR(20) NOT NULL DEFAULT 'HORAS',
            estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
            vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE,
            vigente_hasta DATE,
            observaciones TEXT,
            creado_en TIMESTAMPTZ DEFAULT NOW(),
            actualizado_en TIMESTAMPTZ
        )
        """,
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_cat_nov_codigo ON nomina_catalogo_novedades (codigo)",
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_cat_nov_categoria ON nomina_catalogo_novedades (categoria, subcategoria)",
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_cat_nov_vigencia ON nomina_catalogo_novedades (vigente_desde, vigente_hasta)",
    )

    # 2. Factores prestacionales por nivel de riesgo ARL
    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS nomina_factor_prestacional_riesgo (
            id SERIAL PRIMARY KEY,
            nivel_riesgo VARCHAR(20) UNIQUE NOT NULL,
            nivel_macro VARCHAR(30) NOT NULL,
            arl_nombre VARCHAR(100),
            factor_prestacional FLOAT NOT NULL,
            porcentaje_salud FLOAT DEFAULT 0.085,
            porcentaje_pension FLOAT DEFAULT 0.12,
            porcentaje_arl FLOAT DEFAULT 0.00522,
            porcentaje_caja FLOAT DEFAULT 0.04,
            porcentaje_icbf FLOAT DEFAULT 0.03,
            porcentaje_sena FLOAT DEFAULT 0.02,
            porcentaje_prima FLOAT DEFAULT 0.0833,
            porcentaje_cesantia FLOAT DEFAULT 0.0833,
            porcentaje_interes_cesantia FLOAT DEFAULT 0.01,
            porcentaje_vacaciones FLOAT DEFAULT 0.0417,
            vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE,
            vigente_hasta DATE,
            observaciones TEXT,
            creado_en TIMESTAMPTZ DEFAULT NOW()
        )
        """,
    )

    # 3. Horario pactado (cache desde ERP)
    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS nomina_horario_pactado (
            id SERIAL PRIMARY KEY,
            cedula VARCHAR(50) UNIQUE NOT NULL,
            minutos_jornada_ordinaria INTEGER NOT NULL DEFAULT 480,
            horas_semana_ordinaria FLOAT NOT NULL DEFAULT 48.0,
            es_jornada_nocturna BOOLEAN NOT NULL DEFAULT FALSE,
            autoriza_he_default BOOLEAN NOT NULL DEFAULT FALSE,
            autoriza_he_override BOOLEAN,
            override_motivo VARCHAR(500),
            override_autorizado_por VARCHAR(100),
            override_fecha TIMESTAMPTZ,
            sincronizado_en TIMESTAMPTZ DEFAULT NOW(),
            fuente_sincronizacion VARCHAR(20) NOT NULL DEFAULT 'ERP',
            observaciones TEXT
        )
        """,
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_horario_pact_cedula ON nomina_horario_pactado (cedula)",
    )

    # 4. Bolsa de horas del empleado
    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS nomina_bolsa_horas (
            id SERIAL PRIMARY KEY,
            cedula VARCHAR(50) UNIQUE NOT NULL,
            horas_acreditadas FLOAT NOT NULL DEFAULT 0.0,
            horas_consumidas FLOAT NOT NULL DEFAULT 0.0,
            horas_pagadas FLOAT NOT NULL DEFAULT 0.0,
            fecha_ultimo_movimiento TIMESTAMPTZ,
            observaciones TEXT,
            creado_en TIMESTAMPTZ DEFAULT NOW(),
            actualizado_en TIMESTAMPTZ
        )
        """,
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_bolsa_cedula ON nomina_bolsa_horas (cedula)",
    )

    # 5. Movimientos de bolsa
    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS nomina_bolsa_horas_movimientos (
            id SERIAL PRIMARY KEY,
            bolsa_id INTEGER NOT NULL REFERENCES nomina_bolsa_horas(id) ON DELETE CASCADE,
            cedula VARCHAR(50) NOT NULL,
            tipo_movimiento VARCHAR(30) NOT NULL,
            horas FLOAT NOT NULL,
            fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            calculo_id INTEGER,
            liquidacion_id INTEGER,
            usuario_id VARCHAR(50),
            observaciones TEXT
        )
        """,
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_bolsa_mov_cedula ON nomina_bolsa_horas_movimientos (cedula, fecha DESC)",
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_bolsa_mov_tipo ON nomina_bolsa_horas_movimientos (tipo_movimiento)",
    )

    # 6. Override de autorización HE
    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS nomina_override_autoriza_he (
            id SERIAL PRIMARY KEY,
            cedula VARCHAR(50) NOT NULL,
            autoriza_he_erp BOOLEAN NOT NULL,
            autoriza_he_override BOOLEAN NOT NULL,
            motivo VARCHAR(500) NOT NULL,
            autorizado_por VARCHAR(100) NOT NULL,
            autorizado_por_id VARCHAR(50),
            vigente_desde TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            vigente_hasta TIMESTAMPTZ,
            estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
            documento_soporte_url VARCHAR(500),
            creado_en TIMESTAMPTZ DEFAULT NOW()
        )
        """,
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_override_he_cedula ON nomina_override_autoriza_he (cedula)",
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_override_he_estado ON nomina_override_autoriza_he (estado)",
    )

    # 7. Cálculo semanal (cabecera)
    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS nomina_calculo_semanal (
            id SERIAL PRIMARY KEY,
            cedula VARCHAR(50) NOT NULL,
            anio INTEGER NOT NULL,
            semana_iso INTEGER NOT NULL,
            fecha_inicio DATE NOT NULL,
            fecha_fin DATE NOT NULL,
            nivel_riesgo_arl VARCHAR(10) NOT NULL,
            factor_prestacional FLOAT NOT NULL,
            salario_base_mensual FLOAT NOT NULL,
            valor_hora_ordinaria FLOAT NOT NULL,
            total_horas_extras FLOAT NOT NULL DEFAULT 0.0,
            total_horas_recargo_nocturno FLOAT NOT NULL DEFAULT 0.0,
            total_valor_bruto FLOAT NOT NULL DEFAULT 0.0,
            total_carga_prestacional FLOAT NOT NULL DEFAULT 0.0,
            total_costo_empresa FLOAT NOT NULL DEFAULT 0.0,
            estado VARCHAR(30) NOT NULL DEFAULT 'BORRADOR',
            calculado_por VARCHAR(50),
            calculado_en TIMESTAMPTZ DEFAULT NOW(),
            confirmado_por VARCHAR(50),
            confirmado_en TIMESTAMPTZ,
            observaciones TEXT
        )
        """,
    )
    await safe_execute(
        conn,
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_calc_sem_uniq ON nomina_calculo_semanal (cedula, anio, semana_iso)",
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_calc_sem_periodo ON nomina_calculo_semanal (anio, semana_iso)",
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_calc_sem_estado ON nomina_calculo_semanal (estado)",
    )

    # 8. Detalle del cálculo semanal
    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS nomina_calculo_semanal_detalle (
            id SERIAL PRIMARY KEY,
            calculo_id INTEGER NOT NULL REFERENCES nomina_calculo_semanal(id) ON DELETE CASCADE,
            codigo_novedad VARCHAR(20) NOT NULL,
            horas FLOAT NOT NULL,
            factor_hora_ordinaria FLOAT NOT NULL,
            valor_bruto FLOAT NOT NULL,
            carga_prestacional FLOAT NOT NULL,
            costo_total FLOAT NOT NULL,
            ot_id INTEGER,
            ot_codigo VARCHAR(50),
            fuente VARCHAR(20) NOT NULL DEFAULT 'PORTAL'
        )
        """,
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_calc_det_calculo ON nomina_calculo_semanal_detalle (calculo_id)",
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_calc_det_ot ON nomina_calculo_semanal_detalle (ot_id)",
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_calc_det_novedad ON nomina_calculo_semanal_detalle (codigo_novedad)",
    )

    # 9. Costo consolidado por OT
    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS nomina_costo_ot (
            id SERIAL PRIMARY KEY,
            ot_id INTEGER NOT NULL,
            ot_codigo VARCHAR(50) NOT NULL,
            anio INTEGER NOT NULL,
            semana_iso INTEGER NOT NULL,
            fecha_inicio DATE NOT NULL,
            fecha_fin DATE NOT NULL,
            total_empleados INTEGER NOT NULL DEFAULT 0,
            total_horas FLOAT NOT NULL DEFAULT 0.0,
            total_horas_hed FLOAT NOT NULL DEFAULT 0.0,
            total_horas_hen FLOAT NOT NULL DEFAULT 0.0,
            total_horas_hefd FLOAT NOT NULL DEFAULT 0.0,
            total_horas_hefn FLOAT NOT NULL DEFAULT 0.0,
            total_horas_hf FLOAT NOT NULL DEFAULT 0.0,
            total_valor_bruto FLOAT NOT NULL DEFAULT 0.0,
            total_carga_prestacional FLOAT NOT NULL DEFAULT 0.0,
            total_costo_empresa FLOAT NOT NULL DEFAULT 0.0,
            categoria_sub_indice VARCHAR(50),
            cc VARCHAR(50),
            scc VARCHAR(50),
            sub_indice VARCHAR(50),
            ultima_actualizacion TIMESTAMPTZ DEFAULT NOW(),
            calculo_ids JSONB
        )
        """,
    )
    await safe_execute(
        conn,
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_costo_ot_uniq ON nomina_costo_ot (ot_id, anio, semana_iso)",
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_costo_ot_codigo ON nomina_costo_ot (ot_codigo)",
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_costo_ot_periodo ON nomina_costo_ot (anio, semana_iso)",
    )

    # 10. Parámetros legales con vigencia
    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS nomina_parametros_legales (
            id SERIAL PRIMARY KEY,
            codigo VARCHAR(50) UNIQUE NOT NULL,
            nombre VARCHAR(200) NOT NULL,
            valor VARCHAR(500) NOT NULL,
            tipo_dato VARCHAR(20) NOT NULL DEFAULT 'NUMERICO',
            norma_soporte VARCHAR(200),
            vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE,
            vigente_hasta DATE,
            estado VARCHAR(20) NOT NULL DEFAULT 'VIGENTE',
            observaciones TEXT,
            creado_en TIMESTAMPTZ DEFAULT NOW()
        )
        """,
    )


async def crear_tabla_workflow_evento(conn) -> None:
    """Sprint S4: bitácora inmutable de transiciones de estado de cálculos."""
    logger.info("Creando tabla nomina_calculo_workflow_evento (S4)...")
    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS nomina_calculo_workflow_evento (
            id SERIAL PRIMARY KEY,
            calculo_id INTEGER NOT NULL REFERENCES nomina_calculo_semanal(id) ON DELETE CASCADE,
            estado_origen VARCHAR(30) NOT NULL,
            estado_destino VARCHAR(30) NOT NULL,
            justificacion TEXT,
            usuario_id VARCHAR(50),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_wf_evento_calculo ON nomina_calculo_workflow_evento (calculo_id, created_at DESC)",
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_wf_evento_destino ON nomina_calculo_workflow_evento (estado_destino)",
    )


async def crear_tabla_festivo_calendario(conn) -> None:
    """Sprint S5': calendario de festivos nacionales con fuente (Calendarific | Emiliani)."""
    logger.info("Creando tabla nomina_festivo_calendario (S5')...")
    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS nomina_festivo_calendario (
            anio INTEGER NOT NULL,
            fecha DATE NOT NULL,
            nombre VARCHAR(100) NOT NULL,
            fuente VARCHAR(20) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (anio, fecha)
        )
        """,
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_festivo_cal_anio ON nomina_festivo_calendario (anio)",
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_festivo_cal_fuente ON nomina_festivo_calendario (fuente)",
    )
