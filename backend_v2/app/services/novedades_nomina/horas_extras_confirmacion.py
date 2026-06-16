"""
Engine de confirmación de cálculo de horas extras (S2) y lecturas.

Decisiones implementadas:
  - C1: la bolsa se acredita al confirmar, no al cargar.
  - H7: nomina_costo_ot se actualiza en tiempo real (UPSERT).
  - H8: la bolsa es siempre del empleado (cedula), nunca de la OT.

Funciones de lectura usan selectinload para evitar el problema de
lazy-loading que rompe SQLAlchemy async (MissingGreenlet).
"""
import logging
from datetime import datetime
from typing import List, Optional
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ...models.novedades_nomina.horas_extras import (
    NominaCatalogoNovedad,
    NominaBolsaHoras,
    NominaBolsaHorasMovimiento,
    NominaCalculoSemanal,
    NominaCalculoSemanalDetalle,
    NominaCostoOt,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Engine de confirmación
# ---------------------------------------------------------------------------

async def confirmar_pre_liquidacion(
    session: AsyncSession,
    payload,
) -> dict:
    """
    Persiste un cálculo de HE y sus efectos colaterales:
      1. nomina_calculo_semanal (cabecera)
      2. nomina_calculo_semanal_detalle (N filas, una por código)
      3. nomina_bolsa_horas + nomina_bolsa_horas_movimientos (acreditación)
      4. nomina_costo_ot (UPSERT por ot_id + anio + semana)

    Idempotente sobre la cabecera: si ya existe un cálculo para
    (cedula, anio, semana), lanza ValueError.
    """
    existing = (
        await session.execute(
            select(NominaCalculoSemanal).where(
                NominaCalculoSemanal.cedula == payload.cedula,
                NominaCalculoSemanal.anio == payload.anio,
                NominaCalculoSemanal.semana_iso == payload.semana_iso,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise ValueError(
            f"Ya existe un cálculo para {payload.cedula} semana {payload.anio}-W{payload.semana_iso:02d} "
            f"(id={existing.id}, estado={existing.estado}). Use PUT para actualizar estado."
        )

    total_extras = sum(d.horas for d in payload.detalles)
    total_bruto = sum(d.valor_bruto for d in payload.detalles)
    total_carga = sum(d.carga_prestacional for d in payload.detalles)
    total_costo = sum(d.costo_total for d in payload.detalles)

    calculo = NominaCalculoSemanal(
        cedula=payload.cedula,
        anio=payload.anio,
        semana_iso=payload.semana_iso,
        fecha_inicio=payload.fecha_inicio,
        fecha_fin=payload.fecha_fin,
        nivel_riesgo_arl=payload.nivel_riesgo_arl,
        factor_prestacional=payload.factor_prestacional,
        salario_base_mensual=payload.salario_base_mensual,
        valor_hora_ordinaria=payload.valor_hora_ordinaria,
        total_horas_extras=total_extras,
        total_valor_bruto=total_bruto,
        total_carga_prestacional=total_carga,
        total_costo_empresa=total_costo,
        estado="CONFIRMADO",
        calculado_por=payload.usuario_confirma,
        confirmado_por=payload.usuario_confirma,
        confirmado_en=datetime.now(),
        observaciones=payload.observaciones,
    )
    session.add(calculo)
    await session.flush()

    for d in payload.detalles:
        detalle = NominaCalculoSemanalDetalle(
            calculo_id=calculo.id,
            codigo_novedad=d.codigo_novedad,
            horas=d.horas,
            factor_hora_ordinaria=d.factor_hora_ordinaria,
            valor_bruto=d.valor_bruto,
            carga_prestacional=d.carga_prestacional,
            costo_total=d.costo_total,
            ot_id=payload.ot_id,
            ot_codigo=payload.ot_codigo,
            fuente=d.fuente,
        )
        session.add(detalle)

    bolsa_id, horas_acreditadas, mov_ids = await _acreditar_bolsa(
        session,
        cedula=payload.cedula,
        calculo_id=calculo.id,
        detalles=payload.detalles,
        usuario_id=payload.usuario_confirma,
    )

    costo_ot_id = None
    if payload.ot_id is not None and payload.ot_codigo:
        costo_ot_id = await _upsert_costo_ot(session, payload, calculo.id)

    await session.commit()
    return {
        "calculo_id": calculo.id,
        "bolsa_id": bolsa_id,
        "horas_acreditadas_bolsa": horas_acreditadas,
        "movimientos_bolsa": mov_ids,
        "costo_ot_id": costo_ot_id,
    }


async def _acreditar_bolsa(
    session: AsyncSession,
    cedula: str,
    calculo_id: int,
    detalles,
    usuario_id: str,
) -> tuple[Optional[int], float, list[int]]:
    """
    Acredita horas a la bolsa del empleado.

    Solo se acreditan las horas de códigos donde `acredita_bolsa=True`
    (HED, HEN, HEFD, HEFN, HF). VAC, INC, LIC, etc. no.
    """
    bolsa = (
        await session.execute(
            select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == cedula)
        )
    ).scalar_one_or_none()
    if bolsa is None:
        bolsa = NominaBolsaHoras(cedula=cedula)
        session.add(bolsa)
        await session.flush()

    codigos = [d.codigo_novedad for d in detalles]
    if not codigos:
        return bolsa.id, 0.0, []

    novedades = (
        await session.execute(
            select(NominaCatalogoNovedad).where(
                NominaCatalogoNovedad.codigo.in_(codigos)
            )
        )
    ).scalars().all()
    acreditan = {n.codigo for n in novedades if n.acredita_bolsa}

    if not acreditan:
        return bolsa.id, 0.0, []

    horas_a_acreditar = sum(
        d.horas for d in detalles if d.codigo_novedad in acreditan
    )

    bolsa.horas_acreditadas = (bolsa.horas_acreditadas or 0) + horas_a_acreditar
    bolsa.fecha_ultimo_movimiento = datetime.now()
    bolsa.actualizado_en = datetime.now()
    session.add(bolsa)

    movimiento = NominaBolsaHorasMovimiento(
        bolsa_id=bolsa.id,
        cedula=cedula,
        tipo_movimiento="ACREDITACION",
        horas=horas_a_acreditar,
        fecha=datetime.now(),
        calculo_id=calculo_id,
        usuario_id=usuario_id,
        observaciones=f"Acreditación automática desde cálculo #{calculo_id}",
    )
    session.add(movimiento)
    await session.flush()

    return bolsa.id, horas_a_acreditar, [movimiento.id]


async def _upsert_costo_ot(
    session: AsyncSession,
    payload,
    calculo_id: int,
) -> Optional[int]:
    """
    UPSERT en nomina_costo_ot: si ya existe (ot_id, anio, semana),
    suma las horas y costos; si no, crea el registro.
    """
    existente = (
        await session.execute(
            select(NominaCostoOt).where(
                NominaCostoOt.ot_id == payload.ot_id,
                NominaCostoOt.anio == payload.anio,
                NominaCostoOt.semana_iso == payload.semana_iso,
            )
        )
    ).scalar_one_or_none()

    horas_por_codigo: dict = {d.codigo_novedad: 0.0 for d in payload.detalles}
    for d in payload.detalles:
        horas_por_codigo[d.codigo_novedad] = (
            horas_por_codigo.get(d.codigo_novedad, 0.0) + d.horas
        )

    horas_total = sum(d.horas for d in payload.detalles)
    bruto_total = sum(d.valor_bruto for d in payload.detalles)
    carga_total = sum(d.carga_prestacional for d in payload.detalles)
    empleados_set = {payload.cedula}

    if existente is None:
        nuevo = NominaCostoOt(
            ot_id=payload.ot_id,
            ot_codigo=payload.ot_codigo,
            anio=payload.anio,
            semana_iso=payload.semana_iso,
            fecha_inicio=payload.fecha_inicio,
            fecha_fin=payload.fecha_fin,
            total_empleados=1,
            total_horas=horas_total,
            total_horas_hed=horas_por_codigo.get("HED", 0.0),
            total_horas_hen=horas_por_codigo.get("HEN", 0.0),
            total_horas_hefd=horas_por_codigo.get("HEFD", 0.0),
            total_horas_hefn=horas_por_codigo.get("HEFN", 0.0),
            total_horas_hf=horas_por_codigo.get("HF", 0.0),
            total_valor_bruto=bruto_total,
            total_carga_prestacional=carga_total,
            total_costo_empresa=bruto_total + carga_total,
            calculo_ids=[calculo_id],
            ultima_actualizacion=datetime.now(),
        )
        session.add(nuevo)
        await session.flush()
        return nuevo.id

    existente.total_horas += horas_total
    existente.total_horas_hed += horas_por_codigo.get("HED", 0.0)
    existente.total_horas_hen += horas_por_codigo.get("HEN", 0.0)
    existente.total_horas_hefd += horas_por_codigo.get("HEFD", 0.0)
    existente.total_horas_hefn += horas_por_codigo.get("HEFN", 0.0)
    existente.total_horas_hf += horas_por_codigo.get("HF", 0.0)
    existente.total_valor_bruto += bruto_total
    existente.total_carga_prestacional += carga_total
    existente.total_costo_empresa += bruto_total + carga_total
    existente.ultima_actualizacion = datetime.now()

    ids = list(existente.calculo_ids or [])
    if calculo_id not in ids:
        ids.append(calculo_id)
    existente.calculo_ids = ids

    existente.total_empleados = max(existente.total_empleados, 1) + (1 if empleados_set else 0)

    session.add(existente)
    return existente.id


# ---------------------------------------------------------------------------
# Lectura de cálculos
# ---------------------------------------------------------------------------

async def listar_calculos(
    session: AsyncSession,
    cedula: Optional[str] = None,
    anio: Optional[int] = None,
    semana_iso: Optional[int] = None,
    estado: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    stmt = select(NominaCalculoSemanal)
    if cedula:
        stmt = stmt.where(NominaCalculoSemanal.cedula == cedula)
    if anio:
        stmt = stmt.where(NominaCalculoSemanal.anio == anio)
    if semana_iso:
        stmt = stmt.where(NominaCalculoSemanal.semana_iso == semana_iso)
    if estado:
        stmt = stmt.where(NominaCalculoSemanal.estado == estado)
    stmt = stmt.order_by(
        NominaCalculoSemanal.anio.desc(),
        NominaCalculoSemanal.semana_iso.desc(),
    ).offset(offset).limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def obtener_calculo_completo(
    session: AsyncSession, calculo_id: int
) -> Optional[NominaCalculoSemanal]:
    """Devuelve el cálculo con sus detalles (eager load vía selectinload)."""
    calc = (
        await session.execute(
            select(NominaCalculoSemanal)
            .where(NominaCalculoSemanal.id == calculo_id)
            .options(selectinload(NominaCalculoSemanal.detalles))
        )
    ).scalar_one_or_none()
    return calc


async def listar_costos_ot(
    session: AsyncSession,
    ot_id: Optional[int] = None,
    ot_codigo: Optional[str] = None,
    anio: Optional[int] = None,
    semana_iso: Optional[int] = None,
    limit: int = 50,
):
    stmt = select(NominaCostoOt)
    if ot_id:
        stmt = stmt.where(NominaCostoOt.ot_id == ot_id)
    if ot_codigo:
        stmt = stmt.where(NominaCostoOt.ot_codigo == ot_codigo)
    if anio:
        stmt = stmt.where(NominaCostoOt.anio == anio)
    if semana_iso:
        stmt = stmt.where(NominaCostoOt.semana_iso == semana_iso)
    stmt = stmt.order_by(
        NominaCostoOt.anio.desc(),
        NominaCostoOt.semana_iso.desc(),
        NominaCostoOt.ot_codigo,
    ).limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars().all())
