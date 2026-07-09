"""Migración S10: snapshot diario confirmado de horas extras."""
import logging

from sqlalchemy import text

logger = logging.getLogger(__name__)


async def crear_tabla_calculo_diario_detalle(conn) -> None:
    try:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS nomina_calculo_diario_detalle (
                id SERIAL PRIMARY KEY,
                calculo_id INTEGER NOT NULL REFERENCES nomina_calculo_semanal(id),
                cedula VARCHAR(50) NOT NULL,
                anio INTEGER NOT NULL,
                semana_iso INTEGER NOT NULL,
                fecha DATE NOT NULL,
                dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
                hora_entrada TIME NULL,
                hora_salida TIME NULL,
                minutos_almuerzo INTEGER NOT NULL DEFAULT 0 CHECK (minutos_almuerzo >= 0),
                horas_trabajadas DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (horas_trabajadas >= 0),
                horas_ordinarias DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (horas_ordinarias >= 0),
                horas_extras DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (horas_extras >= 0),
                codigo_calculado VARCHAR(20) NULL,
                horas_concepto DOUBLE PRECISION NULL CHECK (horas_concepto IS NULL OR horas_concepto >= 0),
                factor_hora_ordinaria DOUBLE PRECISION NULL CHECK (factor_hora_ordinaria IS NULL OR factor_hora_ordinaria >= 0),
                valor_bruto DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (valor_bruto >= 0),
                carga_prestacional DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (carga_prestacional >= 0),
                costo_total DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (costo_total >= 0),
                es_festivo BOOLEAN NOT NULL DEFAULT FALSE,
                nombre_festivo VARCHAR(150) NULL,
                es_domingo BOOLEAN NOT NULL DEFAULT FALSE,
                es_jornada_nocturna BOOLEAN NOT NULL DEFAULT FALSE,
                novedad_codigo VARCHAR(20) NULL,
                novedad_evento_id INTEGER NULL,
                fuente_horario VARCHAR(30) NOT NULL DEFAULT 'PLANIFICADOR',
                fuente_evidencia_id INTEGER NULL,
                hash_snapshot VARCHAR(128) NULL,
                creado_por VARCHAR(50) NULL,
                ot_id INTEGER NULL,
                ot_codigo VARCHAR(50) NULL,
                observaciones TEXT NULL,
                creado_en TIMESTAMP NOT NULL DEFAULT now()
            )
        """))
        for sql in (
            "CREATE INDEX IF NOT EXISTS idx_calc_diario_calculo ON nomina_calculo_diario_detalle (calculo_id)",
            "CREATE INDEX IF NOT EXISTS idx_calc_diario_empleado_semana ON nomina_calculo_diario_detalle (cedula, anio, semana_iso)",
            "CREATE INDEX IF NOT EXISTS idx_calc_diario_fecha ON nomina_calculo_diario_detalle (fecha)",
            "CREATE INDEX IF NOT EXISTS idx_calc_diario_codigo ON nomina_calculo_diario_detalle (codigo_calculado)",
            "CREATE INDEX IF NOT EXISTS idx_calc_diario_ot ON nomina_calculo_diario_detalle (ot_id, anio, semana_iso)",
        ):
            await conn.execute(text(sql))
    except Exception:
        logger.exception("Error creando tabla nomina_calculo_diario_detalle")
        raise
