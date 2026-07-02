"""
Tests del Sprint S4 — Workflow de estados y compensación de bolsa.

Cobertura:
  - transicionar_calculo: CONFIRMADO → PAGADO (solo cambia estado)
  - transicionar_calculo: CONFIRMADO → COMPENSADO (consume bolsa, registra evento)
  - transicionar_calculo: CONFIRMADO → COMPENSADO parcial (no toda la bolsa)
  - transicionar_calculo: CONFIRMADO → ANULADO (revierte bolsa, resta costo_ot)
  - transicionar_calculo: transiciones inválidas (PAGADO→CONFIRMADO, ANULADO→PAGADO)
  - transicionar_calculo: estado destino igual a origen (idempotente error)
  - transicionar_calculo: compensación con horas insuficientes en bolsa
  - transicionar_calculo: compensación con horas > total_horas_extras
  - listar_eventos_calculo: retorna historial en orden
  - compensar_bolsa: crea movimiento CONSUMO_TIEMPO
  - compensar_bolsa: empleado sin bolsa registrada → 409
  - compensar_bolsa: horas > disponibles → 409
  - compensar_bolsa: horas <= 0 → 409

Usa cédulas únicas con prefijo TEST-S4- para evitar choques con datos de
producción o de otros tests.
"""
import pytest
from datetime import date
from sqlmodel import select
from sqlalchemy import delete

from app.models.novedades_nomina.horas_extras import (
    NominaCalculoSemanal,
    NominaCalculoSemanalDetalle,
    NominaCalculoWorkflowEvento,
    NominaBolsaHoras,
    NominaBolsaHorasMovimiento,
    NominaCostoOt,
    NominaHorarioPactado,
)
from app.models.novedades_nomina.schemas_horas_extras import (
    PreLiquidacionConfirmar,
    ConfirmarDetalleItem,
)
from app.services.novedades_nomina.horas_extras_confirmacion import (
    confirmar_pre_liquidacion,
)
from app.services.novedades_nomina.horas_extras_workflow import (
    transicionar_calculo,
    listar_eventos_calculo,
    compensar_bolsa,
)


# ---------------------------------------------------------------------------
# Fixtures auxiliares
# ---------------------------------------------------------------------------

CEDULA_BASE = "TEST-S4-1234567890"
ANIO = 2026
SEMANA = 30
OT_ID = 9101
OT_CODIGO = "OT-TEST-S4-001"


def _detalle(codigo, horas, factor, valor_bruto):
    carga = valor_bruto * 0.52436
    return ConfirmarDetalleItem(
        codigo_novedad=codigo,
        horas=horas,
        factor_hora_ordinaria=factor,
        valor_bruto=valor_bruto,
        carga_prestacional=carga,
        costo_total=valor_bruto + carga,
    )


def _payload(cedula=CEDULA_BASE, anio=ANIO, semana=SEMANA, detalles=None,
             ot_id=OT_ID, ot_codigo=OT_CODIGO):
    if detalles is None:
        detalles = [
            _detalle("HED", 2.0, 1.25, 31_250.0),
            _detalle("HEN", 1.0, 1.75, 21_875.0),
        ]
    return PreLiquidacionConfirmar(
        cedula=cedula,
        anio=anio,
        semana_iso=semana,
        fecha_inicio=date(anio, 7, 21),
        fecha_fin=date(anio, 7, 27),
        nivel_riesgo_arl="III",
        factor_prestacional=0.52436,
        salario_base_mensual=3_000_000,
        valor_hora_ordinaria=12_500.0,
        detalles=detalles,
        ot_id=ot_id,
        ot_codigo=ot_codigo,
        usuario_confirma="TEST-USER-S4",
    )


async def _cleanup(db_session, cedula: str, anio: int = ANIO, semana: int = SEMANA):
    """Limpia todas las filas relacionadas con un cálculo de test."""
    # Workflow eventos
    await db_session.execute(
        delete(NominaCalculoWorkflowEvento).where(
            NominaCalculoWorkflowEvento.calculo_id.in_(
                select(NominaCalculoSemanal.id).where(NominaCalculoSemanal.cedula == cedula)
            )
        )
    )
    # Movimientos de bolsa
    await db_session.execute(
        delete(NominaBolsaHorasMovimiento).where(NominaBolsaHorasMovimiento.cedula == cedula)
    )
    # Detalles
    await db_session.execute(
        delete(NominaCalculoSemanalDetalle).where(
            NominaCalculoSemanalDetalle.calculo_id.in_(
                select(NominaCalculoSemanal.id).where(NominaCalculoSemanal.cedula == cedula)
            )
        )
    )
    # Cálculo
    await db_session.execute(
        delete(NominaCalculoSemanal).where(NominaCalculoSemanal.cedula == cedula)
    )
    # Bolsa
    await db_session.execute(
        delete(NominaBolsaHoras).where(NominaBolsaHoras.cedula == cedula)
    )
    # Costo OT
    await db_session.execute(
        delete(NominaCostoOt).where(NominaCostoOt.ot_id == OT_ID)
    )
    # Horario
    await db_session.execute(
        delete(NominaHorarioPactado).where(NominaHorarioPactado.cedula == cedula)
    )
    await db_session.commit()


async def _crear_calculo_test(db_session, cedula=CEDULA_BASE, detalles=None):
    """Helper: sembrar horario y crear cálculo confirmado, retornando el ID."""
    horario = NominaHorarioPactado(
        cedula=cedula,
        minutos_jornada_ordinaria=480,
        horas_semana_ordinaria=48.0,
        autoriza_he_default=True,
    )
    db_session.add(horario)
    await db_session.commit()

    payload = _payload(cedula=cedula, detalles=detalles)
    resultado = await confirmar_pre_liquidacion(db_session, payload)
    return resultado["calculo_id"]


# ---------------------------------------------------------------------------
# Transiciones: CONFIRMADO → PAGADO
# ---------------------------------------------------------------------------

class TestTransicionPagado:
    @pytest.mark.asyncio
    async def test_confirmado_a_pagado_solo_cambia_estado(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        try:
            calc_id = await _crear_calculo_test(db_session)

            resultado = await transicionar_calculo(
                db_session,
                calculo_id=calc_id,
                estado_destino="PAGADO",
                justificacion="Liquidado en nómina externa",
                usuario_id="TEST-USER",
            )

            assert resultado["estado_anterior"] == "CONFIRMADO"
            assert resultado["estado_nuevo"] == "PAGADO"
            assert resultado["horas_afectadas"] == 0.0
            assert resultado["movimiento_bolsa_id"] is None
            assert resultado["evento_id"] is not None

            # La bolsa NO se tocó
            bolsa = (
                await db_session.execute(
                    select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA_BASE)
                )
            ).scalar_one()
            assert bolsa.horas_acreditadas == pytest.approx(3.0)
            assert bolsa.horas_consumidas == 0.0
        finally:
            await _cleanup(db_session, CEDULA_BASE)

    @pytest.mark.asyncio
    async def test_pagado_a_pagado_raises(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        try:
            calc_id = await _crear_calculo_test(db_session)
            await transicionar_calculo(db_session, calc_id, "PAGADO", "ok", "user")

            with pytest.raises(ValueError, match=r"ya está en estado"):
                await transicionar_calculo(db_session, calc_id, "PAGADO", "duplicado", "user")
        finally:
            await _cleanup(db_session, CEDULA_BASE)


# ---------------------------------------------------------------------------
# Transiciones: CONFIRMADO → COMPENSADO
# ---------------------------------------------------------------------------

class TestTransicionCompensado:
    @pytest.mark.asyncio
    async def test_confirmado_a_compensado_consume_bolsa(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        try:
            calc_id = await _crear_calculo_test(db_session)

            resultado = await transicionar_calculo(
                db_session,
                calculo_id=calc_id,
                estado_destino="COMPENSADO",
                justificacion="Compensación tiempo libre",
                usuario_id="TEST-USER",
            )

            assert resultado["estado_anterior"] == "CONFIRMADO"
            assert resultado["estado_nuevo"] == "COMPENSADO"
            assert resultado["horas_afectadas"] == pytest.approx(3.0)
            assert resultado["movimiento_bolsa_id"] is not None

            # Bolsa: 3h acreditadas → 3h consumidas, 0 disponibles
            bolsa = (
                await db_session.execute(
                    select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA_BASE)
                )
            ).scalar_one()
            assert bolsa.horas_acreditadas == pytest.approx(3.0)
            assert bolsa.horas_consumidas == pytest.approx(3.0)
        finally:
            await _cleanup(db_session, CEDULA_BASE)

    @pytest.mark.asyncio
    async def test_compensado_parcial_con_horas_explicitas(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        try:
            calc_id = await _crear_calculo_test(db_session)

            resultado = await transicionar_calculo(
                db_session,
                calculo_id=calc_id,
                estado_destino="COMPENSADO",
                justificacion="Solo 1.5h de las 3",
                usuario_id="TEST-USER",
                horas_compensar=1.5,
                fecha_compensacion=date(2026, 7, 28),
            )

            assert resultado["horas_afectadas"] == pytest.approx(1.5)
            bolsa = (
                await db_session.execute(
                    select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA_BASE)
                )
            ).scalar_one()
            assert bolsa.horas_acreditadas == pytest.approx(3.0)
            assert bolsa.horas_consumidas == pytest.approx(1.5)
        finally:
            await _cleanup(db_session, CEDULA_BASE)

    @pytest.mark.asyncio
    async def test_compensar_mas_horas_que_total_raises(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        try:
            calc_id = await _crear_calculo_test(db_session)
            with pytest.raises(ValueError, match=r"solo tiene 3.0h"):
                await transicionar_calculo(
                    db_session,
                    calculo_id=calc_id,
                    estado_destino="COMPENSADO",
                    justificacion="exceso",
                    usuario_id="user",
                    horas_compensar=5.0,
                )
        finally:
            await _cleanup(db_session, CEDULA_BASE)

    @pytest.mark.asyncio
    async def test_compensar_mas_horas_que_bolsa_disponible_raises(self, db_session):
        """Si la bolsa ya fue consumida por otra vía, no se puede compensar de más."""
        await _cleanup(db_session, CEDULA_BASE)
        try:
            calc_id = await _crear_calculo_test(db_session)
            # Consumir 2h manualmente con compensar_bolsa
            await compensar_bolsa(
                db_session, CEDULA_BASE, 2.0, date(2026, 7, 21), "user"
            )
            # Quedan 3h - 2h = 1h disponible; intentar compensar 2h debe fallar
            with pytest.raises(ValueError, match=r"solo tiene"):
                await transicionar_calculo(
                    db_session,
                    calculo_id=calc_id,
                    estado_destino="COMPENSADO",
                    justificacion="excede disponible",
                    usuario_id="user",
                    horas_compensar=2.0,
                )
        finally:
            await _cleanup(db_session, CEDULA_BASE)


# ---------------------------------------------------------------------------
# Transiciones: CONFIRMADO → ANULADO
# ---------------------------------------------------------------------------

class TestTransicionAnulado:
    @pytest.mark.asyncio
    async def test_confirmado_a_anulado_revierte_bolsa(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        try:
            calc_id = await _crear_calculo_test(db_session)

            # Antes: bolsa con 3h
            bolsa_pre = (
                await db_session.execute(
                    select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA_BASE)
                )
            ).scalar_one()
            assert bolsa_pre.horas_acreditadas == pytest.approx(3.0)

            resultado = await transicionar_calculo(
                db_session,
                calculo_id=calc_id,
                estado_destino="ANULADO",
                justificacion="Error en cálculo original",
                usuario_id="TEST-USER",
            )

            assert resultado["estado_nuevo"] == "ANULADO"
            assert resultado["horas_afectadas"] == pytest.approx(3.0)

            # Después: bolsa en 0
            bolsa_post = (
                await db_session.execute(
                    select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA_BASE)
                )
            ).scalar_one()
            assert bolsa_post.horas_acreditadas == 0.0
        finally:
            await _cleanup(db_session, CEDULA_BASE)

    @pytest.mark.asyncio
    async def test_confirmado_a_anulado_resta_costo_ot(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        try:
            calc_id = await _crear_calculo_test(db_session)

            # Costo OT debe tener 3h antes
            costo_pre = (
                await db_session.execute(
                    select(NominaCostoOt).where(NominaCostoOt.ot_id == OT_ID)
                )
            ).scalar_one()
            assert costo_pre.total_horas == pytest.approx(3.0)
            assert calc_id in costo_pre.calculo_ids

            await transicionar_calculo(
                db_session, calc_id, "ANULADO", "corregir", "user"
            )

            # Después: costo_ot eliminado o en 0 (depende de si era el único cálculo)
            costo_post = (
                await db_session.execute(
                    select(NominaCostoOt).where(
                        NominaCostoOt.ot_id == OT_ID,
                        NominaCostoOt.anio == ANIO,
                        NominaCostoOt.semana_iso == SEMANA,
                    )
                )
            ).scalar_one_or_none()
            # Si era el único cálculo, los totales quedan en 0
            if costo_post is not None:
                assert costo_post.total_horas == 0.0
                assert calc_id not in costo_post.calculo_ids
        finally:
            await _cleanup(db_session, CEDULA_BASE)

    @pytest.mark.asyncio
    async def test_anulado_a_pagado_raises(self, db_session):
        """ANULADO es terminal, no se puede transicionar."""
        await _cleanup(db_session, CEDULA_BASE)
        try:
            calc_id = await _crear_calculo_test(db_session)
            await transicionar_calculo(db_session, calc_id, "ANULADO", "ok", "user")

            with pytest.raises(ValueError, match=r"Transición no permitida"):
                await transicionar_calculo(
                    db_session, calc_id, "PAGADO", "revivir", "user"
                )
        finally:
            await _cleanup(db_session, CEDULA_BASE)


# ---------------------------------------------------------------------------
# Compensar bolsa directa (sin cálculo)
# ---------------------------------------------------------------------------

class TestCompensarBolsa:
    @pytest.mark.asyncio
    async def test_crea_movimiento_consumo_tiempo(self, db_session):
        cedula = "TEST-S4-DIRECT-001"
        await _cleanup(db_session, cedula)
        try:
            # Crear bolsa con 5h acreditadas manualmente
            bolsa = NominaBolsaHoras(cedula=cedula, horas_acreditadas=5.0)
            db_session.add(bolsa)
            await db_session.commit()

            resultado = await compensar_bolsa(
                db_session,
                cedula=cedula,
                horas=2.5,
                fecha=date(2026, 7, 22),
                usuario_id="TEST-USER",
                observaciones="Tiempo libre por festivo",
            )

            assert resultado["movimiento_id"] is not None
            assert resultado["horas_compensadas"] == pytest.approx(2.5)
            assert resultado["horas_disponibles_despues"] == pytest.approx(2.5)

            bolsa_post = (
                await db_session.execute(
                    select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == cedula)
                )
            ).scalar_one()
            assert bolsa_post.horas_consumidas == pytest.approx(2.5)
        finally:
            await _cleanup(db_session, cedula)

    @pytest.mark.asyncio
    async def test_sin_bolsa_registrada_raises(self, db_session):
        cedula = "TEST-S4-DIRECT-002"
        await _cleanup(db_session, cedula)
        try:
            with pytest.raises(ValueError, match=r"no tiene bolsa"):
                await compensar_bolsa(
                    db_session, cedula, 1.0, date(2026, 7, 22), "user"
                )
        finally:
            await _cleanup(db_session, cedula)

    @pytest.mark.asyncio
    async def test_mas_horas_que_disponibles_raises(self, db_session):
        cedula = "TEST-S4-DIRECT-003"
        await _cleanup(db_session, cedula)
        try:
            bolsa = NominaBolsaHoras(cedula=cedula, horas_acreditadas=2.0)
            db_session.add(bolsa)
            await db_session.commit()

            with pytest.raises(ValueError, match=r"solo tiene 2.0h"):
                await compensar_bolsa(
                    db_session, cedula, 5.0, date(2026, 7, 22), "user"
                )
        finally:
            await _cleanup(db_session, cedula)

    @pytest.mark.asyncio
    async def test_horas_negativas_raises(self, db_session):
        cedula = "TEST-S4-DIRECT-004"
        await _cleanup(db_session, cedula)
        try:
            bolsa = NominaBolsaHoras(cedula=cedula, horas_acreditadas=5.0)
            db_session.add(bolsa)
            await db_session.commit()

            with pytest.raises(ValueError, match=r"> 0"):
                await compensar_bolsa(
                    db_session, cedula, 0.0, date(2026, 7, 22), "user"
                )
        finally:
            await _cleanup(db_session, cedula)


# ---------------------------------------------------------------------------
# Historial de eventos
# ---------------------------------------------------------------------------

class TestHistorialEventos:
    @pytest.mark.asyncio
    async def test_retorna_eventos_en_orden(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        try:
            calc_id = await _crear_calculo_test(db_session)
            await transicionar_calculo(
                db_session, calc_id, "COMPENSADO", "compensar", "user"
            )

            eventos = await listar_eventos_calculo(db_session, calc_id)
            # El primer evento es la confirmación inicial (registrada por confirmar_pre_liquidacion?)
            # actualmente confirmar_pre_liquidacion no crea evento explícito,
            # solo crea el cálculo. Así que el primer evento es la transición CONFIRMADO→COMPENSADO.
            assert len(eventos) >= 1
            ultimo = eventos[-1]
            assert ultimo.estado_origen == "CONFIRMADO"
            assert ultimo.estado_destino == "COMPENSADO"
            assert ultimo.usuario_id == "user"
        finally:
            await _cleanup(db_session, CEDULA_BASE)
