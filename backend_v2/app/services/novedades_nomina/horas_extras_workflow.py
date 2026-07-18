"""
Engine de workflow de estados del cálculo semanal de horas extras (S4).

Decisiones:
  - CONFIRMADO es el estado de entrada (lo deja confirmar_pre_liquidacion).
  - Transiciones válidas desde CONFIRMADO: PAGADO, COMPENSADO, ANULADO.
  - PAGADO: solo cambia estado. El pago en sí se registra en otro sistema
    (nomina externa). Aquí marcamos que la decisión de pago fue tomada.
  - COMPENSADO: consume horas de la bolsa del empleado (parcial o total).
    Crea movimiento tipo CONSUMO_TIEMPO y decrementa horas_acreditadas /
    incrementa horas_consumidas.
  - ANULADO: revierte la ACREDITACION original y resta los totales al
    nomina_costo_ot. Crea movimiento tipo REVERSION_ACREDITACION. Solo
    permitido desde CONFIRMADO (si ya se compensó o pagó, no se puede
    anular en este sprint — se debe compensar/revertir manualmente).
  - Cada transición queda registrada en nomina_calculo_workflow_evento.

Fuera de este engine: el endpoint POST /bolsa/compensar permite consumir
horas de la bolsa sin un cálculo de origen (ej. compensaciones manuales
por decisiones administrativas).
"""
import logging
from datetime import datetime, date
from typing import List, Optional
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...models.novedades_nomina.horas_extras import (
    NominaCalculoSemanal,
    NominaCalculoSemanalDetalle,
    NominaCalculoWorkflowEvento,
    NominaBolsaHoras,
    NominaBolsaHorasMovimiento,
    NominaCostoOt,
)
from .bolsa_horas_resolver import resolver_bolsa_habilitada
from .planificador_costos_ot import revertir_costos_ot_plan

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Máquina de estados
# ---------------------------------------------------------------------------

TRANSICIONES_VALIDAS = {
    "PENDIENTE_AUTORIZACION": set(),
    "CONFIRMADO": {"PAGADO", "COMPENSADO", "ANULADO"},
    "PAGADO": set(),
    "COMPENSADO": set(),
    "ANULADO": set(),
    "BORRADOR": set(),
}


def _es_transicion_valida(origen: str, destino: str) -> bool:
    return destino in TRANSICIONES_VALIDAS.get(origen, set())


# ---------------------------------------------------------------------------
# Transición de estado
# ---------------------------------------------------------------------------

async def transicionar_calculo(
    session: AsyncSession,
    calculo_id: int,
    estado_destino: str,
    justificacion: Optional[str],
    usuario_id: Optional[str],
    horas_compensar: Optional[float] = None,
    fecha_compensacion: Optional[date] = None,
) -> dict:
    """
    Aplica una transición de estado al cálculo. Retorna dict con
    estado anterior, nuevo, evento_id, movimiento_bolsa_id, horas_afectadas.
    """
    estado_destino = estado_destino.upper()

    calc = (
        await session.execute(
            select(NominaCalculoSemanal)
            .where(NominaCalculoSemanal.id == calculo_id)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if calc is None:
        raise ValueError(f"Cálculo {calculo_id} no encontrado")

    estado_origen = calc.estado
    if estado_origen == estado_destino:
        raise ValueError(f"El cálculo ya está en estado {estado_destino}")

    if not _es_transicion_valida(estado_origen, estado_destino):
        raise ValueError(
            f"Transición no permitida: {estado_origen} → {estado_destino}. "
            f"Válidas desde {estado_origen}: {sorted(TRANSICIONES_VALIDAS.get(estado_origen, set()))}"
        )

    movimiento_id: Optional[int] = None
    horas_afectadas = 0.0

    if estado_destino == "COMPENSADO":
        horas = horas_compensar if horas_compensar is not None else calc.total_horas_extras
        if horas <= 0:
            raise ValueError("horas debe ser > 0 para COMPENSADO")
        if horas > calc.total_horas_extras:
            raise ValueError(
                f"No se pueden compensar {horas}h: el cálculo solo tiene {calc.total_horas_extras}h."
            )
        movimiento_id = await _compensar_desde_calculo(
            session,
            calc=calc,
            horas=horas,
            fecha=fecha_compensacion or date.today(),
            usuario_id=usuario_id,
        )
        horas_afectadas = horas

    elif estado_destino == "ANULADO":
        # Devolver las horas a la bolsa (revierte la ACREDITACION) y restar
        # del costo_ot. Si no hay bolsa o no hay costo_ot, el flujo sigue.
        movimiento_id = await _anular_calculo(
            session,
            calc=calc,
            usuario_id=usuario_id,
        )
        horas_afectadas = calc.total_horas_extras

    calc.estado = estado_destino
    session.add(calc)

    evento = NominaCalculoWorkflowEvento(
        calculo_id=calc.id,
        estado_origen=estado_origen,
        estado_destino=estado_destino,
        justificacion=justificacion,
        usuario_id=usuario_id,
    )
    session.add(evento)
    await session.flush()

    return {
        "calculo_id": calc.id,
        "estado_anterior": estado_origen,
        "estado_nuevo": estado_destino,
        "evento_id": evento.id,
        "movimiento_bolsa_id": movimiento_id,
        "horas_afectadas": horas_afectadas,
    }


async def _compensar_desde_calculo(
    session: AsyncSession,
    calc: NominaCalculoSemanal,
    horas: float,
    fecha: date,
    usuario_id: Optional[str],
) -> int:
    """Mueve horas de horas_acreditadas a horas_consumidas en la bolsa."""
    habilitada, fuente = await resolver_bolsa_habilitada(session, calc.ot_id)
    if not habilitada:
        raise ValueError(
            f"BOLSA_DESACTIVADA: la compensacion requiere bolsa activa "
            f"(fuente actual={fuente}, ot_id={calc.ot_id}). "
            f"Use transicion PAGADO para liquidar el extra en nomina."
        )

    bolsa = (
        await session.execute(
            select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == calc.cedula)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if bolsa is None:
        # Sin bolsa no se puede compensar; crearla con 0 acreditadas
        bolsa = NominaBolsaHoras(cedula=calc.cedula)
        session.add(bolsa)
        await session.flush()

    disponibles = bolsa.horas_acreditadas - bolsa.horas_consumidas - bolsa.horas_pagadas
    if horas > disponibles:
        raise ValueError(
            f"Bolsa del empleado {calc.cedula} solo tiene {disponibles}h disponibles "
            f"(acreditadas={bolsa.horas_acreditadas}, consumidas={bolsa.horas_consumidas}, "
            f"pagadas={bolsa.horas_pagadas})."
        )

    bolsa.horas_consumidas += horas
    bolsa.fecha_ultimo_movimiento = datetime.now()
    bolsa.actualizado_en = datetime.now()
    session.add(bolsa)

    mov = NominaBolsaHorasMovimiento(
        bolsa_id=bolsa.id,
        cedula=calc.cedula,
        tipo_movimiento="CONSUMO_TIEMPO",
        horas=horas,
        fecha=datetime.combine(fecha, datetime.min.time()),
        calculo_id=calc.id,
        usuario_id=usuario_id,
        observaciones=f"Compensación desde cálculo #{calc.id}",
    )
    session.add(mov)
    await session.flush()
    return mov.id


async def _anular_calculo(
    session: AsyncSession,
    calc: NominaCalculoSemanal,
    usuario_id: Optional[str],
) -> Optional[int]:
    """Revierte la ACREDITACION original y resta del costo_ot."""
    # 1. Revertir bolsa (si existe)
    bolsa = (
        await session.execute(
            select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == calc.cedula)
            .with_for_update()
        )
    ).scalar_one_or_none()
    movimiento_id: Optional[int] = None
    if bolsa is not None:
        # Calcular horas a revertir: las que se acreditaron en este cálculo.
        # Para esto consultamos los movimientos tipo ACREDITACION vinculados.
        acred_movs = (
            await session.execute(
                select(NominaBolsaHorasMovimiento).where(
                    NominaBolsaHorasMovimiento.calculo_id == calc.id,
                    NominaBolsaHorasMovimiento.tipo_movimiento == "ACREDITACION",
                )
            )
        ).scalars().all()
        horas_revertir = sum(m.horas for m in acred_movs)

        if horas_revertir > 0:
            bolsa.horas_acreditadas = max(0.0, bolsa.horas_acreditadas - horas_revertir)
            bolsa.fecha_ultimo_movimiento = datetime.now()
            bolsa.actualizado_en = datetime.now()
            session.add(bolsa)

            mov_rev = NominaBolsaHorasMovimiento(
                bolsa_id=bolsa.id,
                cedula=calc.cedula,
                tipo_movimiento="REVERSION_ACREDITACION",
                horas=horas_revertir,
                fecha=datetime.now(),
                calculo_id=calc.id,
                usuario_id=usuario_id,
                observaciones=f"Reversión por anulación de cálculo #{calc.id}",
            )
            session.add(mov_rev)
            await session.flush()
            movimiento_id = mov_rev.id

    # 2. Restar del costo_ot (si existe)
    detalles = (
        await session.execute(
            select(NominaCalculoSemanalDetalle).where(
                NominaCalculoSemanalDetalle.calculo_id == calc.id
            )
        )
    ).scalars().all()
    horas_por_codigo: dict = {}
    for d in detalles:
        horas_por_codigo[d.codigo_novedad] = horas_por_codigo.get(d.codigo_novedad, 0.0) + d.horas

    if calc.ot_id is not None and horas_por_codigo:
        costo = (
            await session.execute(
                select(NominaCostoOt).where(
                    NominaCostoOt.ot_id == calc.ot_id,
                    NominaCostoOt.anio == calc.anio,
                    NominaCostoOt.semana_iso == calc.semana_iso,
                ).with_for_update()
            )
        ).scalar_one_or_none()
        if costo is not None:
            horas_totales = sum(horas_por_codigo.values())
            costo.total_horas = max(0.0, costo.total_horas - horas_totales)
            costo.total_horas_hed = max(0.0, costo.total_horas_hed - horas_por_codigo.get("HED", 0.0))
            costo.total_horas_hen = max(0.0, costo.total_horas_hen - horas_por_codigo.get("HEN", 0.0))
            costo.total_horas_hefd = max(0.0, costo.total_horas_hefd - horas_por_codigo.get("HEFD", 0.0))
            costo.total_horas_hefn = max(0.0, costo.total_horas_hefn - horas_por_codigo.get("HEFN", 0.0))
            costo.total_horas_hf = max(0.0, costo.total_horas_hf - horas_por_codigo.get("HF", 0.0))
            costo.total_valor_bruto = max(0.0, costo.total_valor_bruto - calc.total_valor_bruto)
            costo.total_carga_prestacional = max(
                0.0, costo.total_carga_prestacional - calc.total_carga_prestacional
            )
            costo.total_costo_empresa = max(
                0.0, costo.total_costo_empresa - calc.total_costo_empresa
            )
            ids = list(costo.calculo_ids or [])
            if calc.id in ids:
                ids.remove(calc.id)
            costo.calculo_ids = ids
            costo.total_empleados = max(0, costo.total_empleados - 1)
            costo.ultima_actualizacion = datetime.now()
            session.add(costo)
    elif horas_por_codigo:
        await revertir_costos_ot_plan(session, calc)

    return movimiento_id


# ---------------------------------------------------------------------------
# Lectura de eventos
# ---------------------------------------------------------------------------

async def listar_eventos_calculo(
    session: AsyncSession, calculo_id: int
) -> List[NominaCalculoWorkflowEvento]:
    result = await session.execute(
        select(NominaCalculoWorkflowEvento)
        .where(NominaCalculoWorkflowEvento.calculo_id == calculo_id)
        .order_by(NominaCalculoWorkflowEvento.created_at.asc())
    )
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Compensación directa de bolsa (sin cálculo de origen)
# ---------------------------------------------------------------------------

async def compensar_bolsa(
    session: AsyncSession,
    cedula: str,
    horas: float,
    fecha: date,
    usuario_id: Optional[str],
    calculo_id: Optional[int] = None,
    observaciones: Optional[str] = None,
) -> dict:
    """
    Consume horas de la bolsa del empleado. Crea movimiento CONSUMO_TIEMPO.
    No requiere un cálculo como origen: las compensaciones administrativas
    (ej. tiempo compensado por festivos) usan este endpoint.
    """
    if horas <= 0:
        raise ValueError("horas debe ser > 0")

    bolsa = (
        await session.execute(
            select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == cedula)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if bolsa is None:
        raise ValueError(
            f"Empleado {cedula} no tiene bolsa registrada. Acumule horas extras primero."
        )

    disponibles = bolsa.horas_acreditadas - bolsa.horas_consumidas - bolsa.horas_pagadas
    if horas > disponibles:
        raise ValueError(
            f"Bolsa solo tiene {disponibles}h disponibles. Solicitado: {horas}h."
        )

    bolsa.horas_consumidas += horas
    bolsa.fecha_ultimo_movimiento = datetime.now()
    bolsa.actualizado_en = datetime.now()
    session.add(bolsa)

    mov = NominaBolsaHorasMovimiento(
        bolsa_id=bolsa.id,
        cedula=cedula,
        tipo_movimiento="CONSUMO_TIEMPO",
        horas=horas,
        fecha=datetime.combine(fecha, datetime.min.time()),
        calculo_id=calculo_id,
        usuario_id=usuario_id,
        observaciones=observaciones or "Compensación manual",
    )
    session.add(mov)
    await session.flush()

    return {
        "movimiento_id": mov.id,
        "horas_compensadas": horas,
        "horas_disponibles_despues": disponibles - horas,
    }
