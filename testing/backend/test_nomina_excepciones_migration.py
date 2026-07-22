"""Regresiones PostgreSQL para el blindaje de excepciones de nómina."""

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.config import config
from app.core.migrations.nomina_excepciones_migration import (
    asegurar_historial_excepcion_unico,
)


@pytest.mark.asyncio
async def test_migracion_instala_unicidad_en_tabla_preexistente():
    engine = create_async_engine(config.database_url, poolclass=NullPool)
    async with engine.connect() as conn:
        transaction = await conn.begin()
        try:
            await conn.execute(text(
                "ALTER TABLE nomina_excepciones_historial "
                "DROP CONSTRAINT IF EXISTS uq_excepcion_historial_periodo"
            ))
            await asegurar_historial_excepcion_unico(conn)
            result = await conn.execute(text("""
                SELECT COUNT(*)
                FROM pg_constraint
                WHERE conname = 'uq_excepcion_historial_periodo'
                  AND conrelid = 'nomina_excepciones_historial'::regclass
            """))
            assert result.scalar_one() == 1
        finally:
            await transaction.rollback()
    await engine.dispose()
