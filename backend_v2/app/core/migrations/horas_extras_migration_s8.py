"""Migraciones S8 para asignaciones OT/CC del planificador semanal."""
import logging

from sqlalchemy import text

logger = logging.getLogger(__name__)


async def _safe_execute(conn, sql: str) -> None:
    await conn.execute(text(sql))  # @audit-ok: el job propaga cualquier fallo


async def crear_tabla_planificador_dia_ot(conn) -> None:
    """Crea tabla de reparto OT/CC por empleado, semana y dia."""
    await _safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS nomina_planificador_dia_ot (
            id SERIAL PRIMARY KEY,
            anio INT NOT NULL,
            semana_iso INT NOT NULL CHECK (semana_iso BETWEEN 1 AND 53),
            cedula VARCHAR(50) NOT NULL,
            dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
            orden VARCHAR(50) NOT NULL,
            cc VARCHAR(50),
            scc VARCHAR(50),
            sub_indice VARCHAR(50),
            categoria_sub_indice VARCHAR(50) NOT NULL,
            descripcion VARCHAR(500),
            vr_contratado DOUBLE PRECISION,
            horas DOUBLE PRECISION,
            porcentaje DOUBLE PRECISION,
            creado_en TIMESTAMP DEFAULT now(),
            actualizado_en TIMESTAMP DEFAULT now()
        )
        """,
    )
    await _safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_plan_dia_ot_semana ON nomina_planificador_dia_ot (anio, semana_iso, cedula, dia_semana)",
    )
    await _safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_plan_dia_ot_orden ON nomina_planificador_dia_ot (orden)",
    )
    await _safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_plan_dia_ot_cc ON nomina_planificador_dia_ot (cc)",
    )
