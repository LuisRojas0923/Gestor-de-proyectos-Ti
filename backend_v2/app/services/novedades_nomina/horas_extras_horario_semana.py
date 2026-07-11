"""
Service de horario pactado por día (Sprint S5'').

Responsabilidades:
  - Leer y persistir el detalle diario del horario (hora_entrada,
    hora_salida, minutos_almuerzo) de un empleado.
  - Crear la fila padre en `nomina_horario_pactado` si no existe (cache
    manual: el ERP puede no haber sincronizado aún).

Decisión: el reemplazo de los 7 días es TOTAL en el PUT. Esto evita
diffs sutiles y mantiene la semántica del "horario del contrato":
o tienes 7 días configurados, o no tienes ninguno. Los días que el
usuario omita (hora_entrada = null) se tratan como francos.
"""
import logging
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ...models.novedades_nomina.horas_extras import NominaHorarioPactado
from ...models.novedades_nomina.horas_extras_horario_dia import NominaHorarioPactadoDia
from ...models.novedades_nomina.turnos import minutos_jornada
from .horario_lock_service import bloquear_horario_empleado
from ...models.novedades_nomina.schemas_horas_extras import (
    HorarioPactadoDiaUpdate,
)

logger = logging.getLogger(__name__)


async def _asegurar_horario_padre(session: AsyncSession, cedula: str) -> None:
    """Crea la fila padre en nomina_horario_pactado si no existe."""
    existe = (
        await session.execute(
            select(NominaHorarioPactado).where(NominaHorarioPactado.cedula == cedula)
        )
    ).scalar_one_or_none()
    if existe is not None:
        return
    padre = NominaHorarioPactado(
        cedula=cedula,
        minutos_jornada_ordinaria=480,
        horas_semana_ordinaria=42.0,
        es_jornada_nocturna=False,
        autoriza_he_default=False,
        fuente_sincronizacion="MANUAL",
    )
    session.add(padre)
    await session.flush()


async def obtener_horario_semana(
    session: AsyncSession, cedula: str
) -> List[NominaHorarioPactadoDia]:
    """
    Devuelve los 7 días del horario (1-7, L-D). Si la fila padre no existe,
    la crea vacía. Si hay días sin detalle, devuelve filas con hora_entrada
    = null (franco) para completar la semana.
    """
    padre = await bloquear_horario_empleado(session, cedula)
    existentes = (
        await session.execute(
            select(NominaHorarioPactadoDia)
            .where(NominaHorarioPactadoDia.cedula == cedula)
        )
    ).scalars().all()
    por_dia = {d.dia_semana: d for d in existentes}
    resultado: List[NominaHorarioPactadoDia] = []
    for dia in range(1, 8):
        if dia in por_dia:
            resultado.append(por_dia[dia])
        else:
            resultado.append(
                NominaHorarioPactadoDia(
                    cedula=cedula,
                    dia_semana=dia,
                    hora_entrada=None,
                    hora_salida=None,
                    minutos_almuerzo=0,
                    cruza_medianoche=False,
                )
            )
    return resultado


async def actualizar_horario_semana(
    session: AsyncSession,
    cedula: str,
    dias: List[HorarioPactadoDiaUpdate],
    usuario_id: str,
) -> List[NominaHorarioPactadoDia]:
    """
    Reemplaza los 7 días del horario. La lista debe traer exactamente 7
    entradas (1-7, L-D). Días con hora_entrada/hora_salida null = franco.

    Crea la fila padre si no existe (cache manual).
    """
    if len(dias) != 7:
        raise ValueError("dias debe tener exactamente 7 entradas (L-D)")

    # Validación: días únicos y rango 1-7
    dias_orden = sorted(dias, key=lambda d: d.dia_semana)
    for i, d in enumerate(dias_orden):
        if d.dia_semana != i + 1:
            raise ValueError(
                f"dias debe cubrir días 1-7 consecutivos; falta día {i + 1}"
            )

    padre = await bloquear_horario_empleado(session, cedula)

    # Borrar existentes y reinsertar (reemplazo total).
    from sqlalchemy import delete
    await session.execute(
        delete(NominaHorarioPactadoDia).where(
            NominaHorarioPactadoDia.cedula == cedula
        )
    )
    await session.flush()

    for d in dias_orden:
        session.add(
            NominaHorarioPactadoDia(
                cedula=cedula,
                dia_semana=d.dia_semana,
                hora_entrada=d.hora_entrada,
                hora_salida=d.hora_salida,
                minutos_almuerzo=d.minutos_almuerzo,
                cruza_medianoche=d.cruza_medianoche,
            )
        )
    await session.flush()

    # Recalcular horas_semana_ordinaria y minutos_jornada_ordinaria en el padre
    # (promedio de la jornada efectiva de los 7 días, redondeado a 2 decimales).
    total_min = 0
    dias_con_jornada = 0
    for d in dias_orden:
        if d.hora_entrada is None or d.hora_salida is None:
            continue
        minutos = minutos_jornada(
            d.hora_entrada,
            d.hora_salida,
            d.minutos_almuerzo,
            d.cruza_medianoche,
        )
        if minutos > 0:
            total_min += minutos
            dias_con_jornada += 1

    padre.fuente_sincronizacion = "MANUAL"
    if dias_con_jornada > 0:
        padre.minutos_jornada_ordinaria = round(total_min / dias_con_jornada, 0)
        padre.horas_semana_ordinaria = round(total_min / 60.0, 2)

    logger.info(
        "Horario semanal de %s actualizado por %s (jornada=%smin, semana=%.2fh)",
        cedula,
        usuario_id,
        padre.minutos_jornada_ordinaria,
        padre.horas_semana_ordinaria,
    )

    return await obtener_horario_semana(session, cedula)
