"""
Migraciones S5 (Fix S4) y S6 del módulo de Horas Extras.

Separado de ``horas_extras_migration`` para mantener ese archivo bajo
el límite de 500 líneas del pre-commit.

Funciones:
  - agregar_ot_a_calculo_semanal (Fix S4)
  - crear_tabla_bolsa_ot_override (S6)
"""
import logging

from .horas_extras_migration import safe_execute

logger = logging.getLogger(__name__)


async def agregar_ot_a_calculo_semanal(conn) -> None:
    """Sprint S5/Fix S4: añadir columnas ot_id/ot_codigo a nomina_calculo_semanal.

    Requerido para que el workflow de anulación pueda encontrar el
    nomina_costo_ot correspondiente (la cabecera del cálculo debe recordar
    a qué OT pertenece, no solo los detalles).

    Idempotente: usa ADD COLUMN IF NOT EXISTS (Postgres 9.6+).
    """
    logger.info("Agregando ot_id/ot_codigo a nomina_calculo_semanal (Fix S4)...")
    await safe_execute(
        conn,
        "ALTER TABLE nomina_calculo_semanal ADD COLUMN IF NOT EXISTS ot_id INTEGER",
    )
    await safe_execute(
        conn,
        "ALTER TABLE nomina_calculo_semanal ADD COLUMN IF NOT EXISTS ot_codigo VARCHAR(50)",
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_calc_sem_ot ON nomina_calculo_semanal (ot_id)",
    )


async def crear_tabla_bolsa_ot_override(conn) -> None:
    """Sprint S6: tabla nomina_bolsa_ot_override.

    Override por OT del flag global de bolsa (nomina_parametros_legales
    BOLSA_GLOBAL_HABILITADA). Permite activar/desactivar la bolsa de horas
    para una OT especifica sin tocar el parametro global.

    Bitacora inmutable: revocaciones se marcan con vigente_hasta=now() y
    estado='REVOCADO', nunca se borran.
    """
    logger.info("Creando tabla nomina_bolsa_ot_override (S6)...")
    await safe_execute(
        conn,
        """
        CREATE TABLE IF NOT EXISTS nomina_bolsa_ot_override (
            id SERIAL PRIMARY KEY,
            ot_id INTEGER NOT NULL,
            bolsa_habilitada_override BOOLEAN NOT NULL,
            bolsa_habilitada_erp BOOLEAN NOT NULL,
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
        "CREATE INDEX IF NOT EXISTS idx_bolsa_ot_override_ot ON nomina_bolsa_ot_override (ot_id)",
    )
    await safe_execute(
        conn,
        "CREATE INDEX IF NOT EXISTS idx_bolsa_ot_override_estado ON nomina_bolsa_ot_override (estado)",
    )
    await safe_execute(
        conn,
        """
        CREATE INDEX IF NOT EXISTS idx_bolsa_ot_override_activa
            ON nomina_bolsa_ot_override (ot_id)
            WHERE estado = 'ACTIVO'
        """,
    )
