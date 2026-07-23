"""Blindaje idempotente del historial de excepciones de nómina."""

from sqlalchemy import text


async def asegurar_historial_excepcion_unico(conn) -> None:
    """Conserva el registro más reciente y garantiza uno por período."""
    await conn.execute(text("""
        SELECT pg_advisory_xact_lock(
            hashtextextended('migration:uq_excepcion_historial_periodo', 0)
        )
    """))
    await conn.execute(text("""
        DELETE FROM nomina_excepciones_historial anterior
        USING nomina_excepciones_historial reciente
        WHERE anterior.excepcion_id = reciente.excepcion_id
          AND anterior.mes = reciente.mes
          AND anterior.anio = reciente.anio
          AND anterior.id < reciente.id
    """))
    await conn.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'uq_excepcion_historial_periodo'
                  AND conrelid = 'nomina_excepciones_historial'::regclass
            ) THEN
                ALTER TABLE nomina_excepciones_historial
                ADD CONSTRAINT uq_excepcion_historial_periodo
                UNIQUE (excepcion_id, mes, anio);
            END IF;
        END $$
    """))
