"""Bloqueo compartido para todos los escritores del horario pactado."""
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ...models.novedades_nomina.horas_extras import NominaHorarioPactado


async def bloquear_horario_empleado(
    session: AsyncSession, cedula: str
) -> NominaHorarioPactado:
    await session.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:cedula, 0))"),
        {"cedula": cedula},
    )
    await session.execute(
        pg_insert(NominaHorarioPactado.__table__).values(
            cedula=cedula,
            minutos_jornada_ordinaria=480,
            horas_semana_ordinaria=48.0,
            es_jornada_nocturna=False,
            autoriza_he_default=False,
            fuente_sincronizacion="MANUAL",
        ).on_conflict_do_nothing(index_elements=["cedula"])
    )
    return (await session.execute(
        select(NominaHorarioPactado)
        .where(NominaHorarioPactado.cedula == cedula)
        .with_for_update()
    )).scalar_one()
