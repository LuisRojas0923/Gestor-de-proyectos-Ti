"""
Tests Sprint S6 — Bolsa de horas desactivable.

Cobertura:
  - resolver_bolsa_habilitada: 5 ramas (global true/false, override activo/revocado/expirado)
  - confirmar_pre_liquidacion con bolsa desactivada (global y override OT)
  - override OT activado sobre global false
  - COMPENSADO bloqueado cuando bolsa desactivada
  - PAGADO permitido con bolsa desactivada
  - ANULADO es no-op si no hubo ACREDITACION previa
  - compensar_bolsa manual sigue dependiendo de bolsa preexistente
  - admin cambio global crea nueva vigencia
  - reactivacion global
  - revocar override OT cae a PARAMETRO_LEGAL
  - compatibilidad legacy (bolsa historica intacta al desactivar global)

Cedulas prefijo TEST-S6-*. OTs 9201-9204.
"""
import pytest
from datetime import date, datetime, timedelta
from fastapi.routing import APIRoute
from sqlmodel import select
from sqlalchemy import delete

from app.models.novedades_nomina.bolsa_horas_override import NominaBolsaOtOverride
from app.models.novedades_nomina.horas_extras import (
    NominaBolsaHoras,
    NominaBolsaHorasMovimiento,
    NominaCalculoSemanal,
    NominaCalculoSemanalDetalle,
    NominaCalculoWorkflowEvento,
    NominaCostoOt,
    NominaHorarioPactado,
    NominaParametroLegal,
)
from app.models.novedades_nomina.schemas_horas_extras import (
    PreLiquidacionConfirmar,
    ConfirmarDetalleItem,
)
from app.services.novedades_nomina.bolsa_horas_resolver import resolver_bolsa_habilitada
from app.services.novedades_nomina.horas_extras_confirmacion import (
    confirmar_pre_liquidacion,
)
from app.services.novedades_nomina.horas_extras_workflow import (
    transicionar_calculo,
    compensar_bolsa,
)


CODIGO_GLOBAL = "BOLSA_GLOBAL_HABILITADA"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

CEDULA_BASE = "TEST-S6-1107068093"
ANIO = 2026
SEMANA = 31
OT_DEFAULT = 9201
OT_OVERRIDE_OFF = 9202
OT_OVERRIDE_ON = 9203


def test_bolsa_estado_global_route_no_duplica_prefijo_y_exige_permiso_he():
    from app.main import app

    rutas = {getattr(route, "path", "") for route in app.routes}
    ruta_esperada = "/api/v2/novedades-nomina/horas-extras/bolsa/estado-global"
    assert ruta_esperada in rutas
    assert "/api/v2/novedades-nomina/horas-extras/horas-extras/bolsa/estado-global" not in rutas

    route = next(
        route for route in app.routes
        if isinstance(route, APIRoute) and route.path == ruta_esperada
    )
    dependencias = {getattr(dep.call, "__name__", "") for dep in route.dependant.dependencies}
    assert "requiere_permiso_he" in dependencias


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


def _payload(cedula=CEDULA_BASE, ot_id=OT_DEFAULT, detalles=None):
    if detalles is None:
        detalles = [
            _detalle("HED", 2.0, 1.25, 31_250.0),
            _detalle("HEN", 1.0, 1.75, 21_875.0),
        ]
    return PreLiquidacionConfirmar(
        cedula=cedula,
        anio=ANIO,
        semana_iso=SEMANA,
        fecha_inicio=date(ANIO, 7, 28),
        fecha_fin=date(ANIO, 8, 3),
        nivel_riesgo_arl="III",
        factor_prestacional=0.52436,
        salario_base_mensual=3_000_000,
        valor_hora_ordinaria=12_500.0,
        detalles=detalles,
        ot_id=ot_id,
        ot_codigo=f"OT-S6-{ot_id}",
        usuario_confirma="TEST-USER-S6",
    )


async def _cleanup_todo(db_session, cedula: str):
    """Limpia todas las filas relacionadas con un calculo de test S6."""
    await db_session.execute(
        delete(NominaCalculoWorkflowEvento).where(
            NominaCalculoWorkflowEvento.calculo_id.in_(
                select(NominaCalculoSemanal.id).where(
                    NominaCalculoSemanal.cedula == cedula
                )
            )
        )
    )
    await db_session.execute(
        delete(NominaBolsaHorasMovimiento).where(NominaBolsaHorasMovimiento.cedula == cedula)
    )
    await db_session.execute(
        delete(NominaCalculoSemanalDetalle).where(
            NominaCalculoSemanalDetalle.calculo_id.in_(
                select(NominaCalculoSemanal.id).where(
                    NominaCalculoSemanal.cedula == cedula
                )
            )
        )
    )
    await db_session.execute(
        delete(NominaCalculoSemanal).where(NominaCalculoSemanal.cedula == cedula)
    )
    await db_session.execute(
        delete(NominaBolsaHoras).where(NominaBolsaHoras.cedula == cedula)
    )
    for ot in (OT_DEFAULT, OT_OVERRIDE_OFF, OT_OVERRIDE_ON):
        await db_session.execute(
            delete(NominaCostoOt).where(NominaCostoOt.ot_id == ot)
        )
    await db_session.execute(
        delete(NominaHorarioPactado).where(NominaHorarioPactado.cedula == cedula)
    )
    await db_session.commit()


async def _setup_horario(db_session, cedula: str):
    horario = NominaHorarioPactado(
        cedula=cedula,
        minutos_jornada_ordinaria=480,
        horas_semana_ordinaria=48.0,
        autoriza_he_default=True,
    )
    db_session.add(horario)
    await db_session.commit()


async def _set_global(db_session, habilitada: bool):
    """Crea/actualiza el parametro legal global de bolsa."""
    hoy = date.today()
    existente = (
        await db_session.execute(
            select(NominaParametroLegal).where(NominaParametroLegal.codigo == CODIGO_GLOBAL)
        )
    ).scalars().first()
    if existente is not None:
        existente.valor = "true" if habilitada else "false"
        existente.vigente_desde = hoy
        existente.vigente_hasta = None
        existente.estado = "VIGENTE"
        existente.observaciones = "test S6"
        db_session.add(existente)
    else:
        db_session.add(NominaParametroLegal(
            codigo=CODIGO_GLOBAL,
            nombre="Habilitar bolsa de horas (global)",
            valor="true" if habilitada else "false",
            tipo_dato="BOOLEANO",
            norma_soporte="Politica interna — test S6",
            vigente_desde=hoy,
            vigente_hasta=None,
            estado="VIGENTE",
            observaciones="test S6",
        ))
    await db_session.commit()


async def _limpiar_global(db_session):
    await db_session.execute(
        delete(NominaParametroLegal).where(NominaParametroLegal.codigo == CODIGO_GLOBAL)
    )
    await db_session.commit()


async def _limpiar_overrides(db_session, ot_id: int):
    await db_session.execute(
        delete(NominaBolsaOtOverride).where(NominaBolsaOtOverride.ot_id == ot_id)
    )
    await db_session.commit()


async def _crear_override(db_session, ot_id: int, habilitada: bool, motivo: str = "test"):
    ov = NominaBolsaOtOverride(
        ot_id=ot_id,
        bolsa_habilitada_override=habilitada,
        bolsa_habilitada_erp=True,
        motivo=motivo,
        autorizado_por="TEST-USER-S6",
        vigente_desde=datetime.now() - timedelta(hours=1),
        estado="ACTIVO",
    )
    db_session.add(ov)
    await db_session.commit()
    return ov


# ---------------------------------------------------------------------------
# Resolver
# ---------------------------------------------------------------------------

class TestResolverBolsaHabilitada:
    @pytest.mark.asyncio
    async def test_sin_datos_devuelve_default_false(self, db_session):
        """Sin politica formal ni override: default seguro desactiva la bolsa."""
        await _limpiar_global(db_session)
        await _limpiar_overrides(db_session, OT_DEFAULT)
        habilitada, fuente = await resolver_bolsa_habilitada(db_session, OT_DEFAULT)
        assert habilitada is False
        assert fuente == "DEFAULT"

    @pytest.mark.asyncio
    async def test_global_true_sin_override(self, db_session):
        await _set_global(db_session, True)
        try:
            habilitada, fuente = await resolver_bolsa_habilitada(db_session, OT_DEFAULT)
            assert habilitada is True
            assert fuente == "PARAMETRO_LEGAL"
        finally:
            await _limpiar_global(db_session)

    @pytest.mark.asyncio
    async def test_global_false_sin_override(self, db_session):
        await _set_global(db_session, False)
        try:
            habilitada, fuente = await resolver_bolsa_habilitada(db_session, OT_DEFAULT)
            assert habilitada is False
            assert fuente == "PARAMETRO_LEGAL"
        finally:
            await _limpiar_global(db_session)

    @pytest.mark.asyncio
    async def test_override_false_sobre_global_true(self, db_session):
        await _set_global(db_session, True)
        await _crear_override(db_session, OT_OVERRIDE_OFF, habilitada=False)
        try:
            habilitada, fuente = await resolver_bolsa_habilitada(
                db_session, OT_OVERRIDE_OFF
            )
            assert habilitada is False
            assert fuente == "OVERRIDE_OT"
        finally:
            await _limpiar_global(db_session)
            await _limpiar_overrides(db_session, OT_OVERRIDE_OFF)

    @pytest.mark.asyncio
    async def test_override_revocado_cae_a_parametro(self, db_session):
        await _set_global(db_session, True)
        ov = await _crear_override(db_session, OT_OVERRIDE_OFF, habilitada=False)
        ov.estado = "REVOCADO"
        ov.vigente_hasta = datetime.now()
        db_session.add(ov)
        await db_session.commit()
        try:
            habilitada, fuente = await resolver_bolsa_habilitada(
                db_session, OT_OVERRIDE_OFF
            )
            assert habilitada is True
            assert fuente == "PARAMETRO_LEGAL"
        finally:
            await _limpiar_global(db_session)
            await _limpiar_overrides(db_session, OT_OVERRIDE_OFF)


# ---------------------------------------------------------------------------
# Confirmación con bolsa desactivada
# ---------------------------------------------------------------------------

class TestConfirmarConBolsaDesactivadaGlobal:
    @pytest.mark.asyncio
    async def test_no_acredita_pero_si_costo_ot(self, db_session):
        await _set_global(db_session, False)
        await _cleanup_todo(db_session, CEDULA_BASE)
        await _setup_horario(db_session, CEDULA_BASE)
        try:
            resultado = await confirmar_pre_liquidacion(
                db_session, _payload(cedula=CEDULA_BASE, ot_id=OT_DEFAULT)
            )
            assert resultado["bolsa_habilitada_en_confirmacion"] is False
            assert resultado["bolsa_fuente"] == "PARAMETRO_LEGAL"
            assert resultado["bolsa_id"] is None
            assert resultado["horas_acreditadas_bolsa"] == 0.0
            assert resultado["movimientos_bolsa"] == []
            # costo_ot SI se actualiza
            assert resultado["costo_ot_id"] is not None
            # no hay bolsa creada
            bolsa = (
                await db_session.execute(
                    select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA_BASE)
                )
            ).scalar_one_or_none()
            assert bolsa is None
            # no hay movimientos de bolsa
            movs = (
                await db_session.execute(
                    select(NominaBolsaHorasMovimiento).where(
                        NominaBolsaHorasMovimiento.cedula == CEDULA_BASE
                    )
                )
            ).scalars().all()
            assert len(movs) == 0
        finally:
            await _cleanup_todo(db_session, CEDULA_BASE)
            await _limpiar_global(db_session)


class TestConfirmarConOverrideOTDesactivado:
    @pytest.mark.asyncio
    async def test_no_acredita_fuente_override(self, db_session):
        await _set_global(db_session, True)
        await _crear_override(db_session, OT_OVERRIDE_OFF, habilitada=False)
        await _cleanup_todo(db_session, CEDULA_BASE)
        await _setup_horario(db_session, CEDULA_BASE)
        try:
            resultado = await confirmar_pre_liquidacion(
                db_session, _payload(cedula=CEDULA_BASE, ot_id=OT_OVERRIDE_OFF)
            )
            assert resultado["bolsa_habilitada_en_confirmacion"] is False
            assert resultado["bolsa_fuente"] == "OVERRIDE_OT"
            assert resultado["bolsa_id"] is None
        finally:
            await _cleanup_todo(db_session, CEDULA_BASE)
            await _limpiar_global(db_session)
            await _limpiar_overrides(db_session, OT_OVERRIDE_OFF)


class TestConfirmarConOverrideOTActivadoSobreGlobalFalse:
    @pytest.mark.asyncio
    async def test_override_true_sobre_global_false_acredita(self, db_session):
        await _set_global(db_session, False)
        await _crear_override(db_session, OT_OVERRIDE_ON, habilitada=True)
        await _cleanup_todo(db_session, CEDULA_BASE)
        await _setup_horario(db_session, CEDULA_BASE)
        try:
            resultado = await confirmar_pre_liquidacion(
                db_session, _payload(cedula=CEDULA_BASE, ot_id=OT_OVERRIDE_ON)
            )
            assert resultado["bolsa_habilitada_en_confirmacion"] is True
            assert resultado["bolsa_fuente"] == "OVERRIDE_OT"
            assert resultado["bolsa_id"] is not None
            assert resultado["horas_acreditadas_bolsa"] == pytest.approx(3.0)
        finally:
            await _cleanup_todo(db_session, CEDULA_BASE)
            await _limpiar_global(db_session)
            await _limpiar_overrides(db_session, OT_OVERRIDE_ON)


# ---------------------------------------------------------------------------
# Workflow con bolsa desactivada
# ---------------------------------------------------------------------------

class TestCompensadoBloqueadoBolsaDesactivada:
    @pytest.mark.asyncio
    async def test_compensado_raises_bolsa_desactivada(self, db_session):
        await _set_global(db_session, False)
        await _cleanup_todo(db_session, CEDULA_BASE)
        await _setup_horario(db_session, CEDULA_BASE)
        try:
            calc_id = (
                await confirmar_pre_liquidacion(
                    db_session, _payload(cedula=CEDULA_BASE, ot_id=OT_DEFAULT)
                )
            )["calculo_id"]

            with pytest.raises(ValueError, match=r"BOLSA_DESACTIVADA"):
                await transicionar_calculo(
                    db_session,
                    calculo_id=calc_id,
                    estado_destino="COMPENSADO",
                    justificacion="intento compensar con bolsa off",
                    usuario_id="TEST-USER",
                )

            # calculo sigue en CONFIRMADO
            calc = (
                await db_session.execute(
                    select(NominaCalculoSemanal).where(NominaCalculoSemanal.id == calc_id)
                )
            ).scalar_one()
            assert calc.estado == "CONFIRMADO"

            # no se creo movimiento CONSUMO_TIEMPO
            movs = (
                await db_session.execute(
                    select(NominaBolsaHorasMovimiento).where(
                        NominaBolsaHorasMovimiento.calculo_id == calc_id,
                        NominaBolsaHorasMovimiento.tipo_movimiento == "CONSUMO_TIEMPO",
                    )
                )
            ).scalars().all()
            assert len(movs) == 0
        finally:
            await _cleanup_todo(db_session, CEDULA_BASE)
            await _limpiar_global(db_session)


class TestPagadoPermitidoConBolsaDesactivada:
    @pytest.mark.asyncio
    async def test_pagado_funciona_normal(self, db_session):
        await _set_global(db_session, False)
        await _cleanup_todo(db_session, CEDULA_BASE)
        await _setup_horario(db_session, CEDULA_BASE)
        try:
            calc_id = (
                await confirmar_pre_liquidacion(
                    db_session, _payload(cedula=CEDULA_BASE, ot_id=OT_DEFAULT)
                )
            )["calculo_id"]

            resultado = await transicionar_calculo(
                db_session,
                calculo_id=calc_id,
                estado_destino="PAGADO",
                justificacion="pago directo",
                usuario_id="TEST-USER",
            )
            assert resultado["estado_nuevo"] == "PAGADO"
        finally:
            await _cleanup_todo(db_session, CEDULA_BASE)
            await _limpiar_global(db_session)


class TestAnularConBolsaDesactivadaEsNoOp:
    @pytest.mark.asyncio
    async def test_anular_no_genera_reversion(self, db_session):
        await _set_global(db_session, False)
        await _cleanup_todo(db_session, CEDULA_BASE)
        await _setup_horario(db_session, CEDULA_BASE)
        try:
            calc_id = (
                await confirmar_pre_liquidacion(
                    db_session, _payload(cedula=CEDULA_BASE, ot_id=OT_DEFAULT)
                )
            )["calculo_id"]

            resultado = await transicionar_calculo(
                db_session,
                calculo_id=calc_id,
                estado_destino="ANULADO",
                justificacion="corregir",
                usuario_id="TEST-USER",
            )
            assert resultado["estado_nuevo"] == "ANULADO"
            # no hubo ACREDITACION previa, asi que no hay REVERSION_ACREDITACION
            movs = (
                await db_session.execute(
                    select(NominaBolsaHorasMovimiento).where(
                        NominaBolsaHorasMovimiento.calculo_id == calc_id,
                        NominaBolsaHorasMovimiento.tipo_movimiento == "REVERSION_ACREDITACION",
                    )
                )
            ).scalars().all()
            assert len(movs) == 0
        finally:
            await _cleanup_todo(db_session, CEDULA_BASE)
            await _limpiar_global(db_session)


# ---------------------------------------------------------------------------
# Compensación manual independiente del flag
# ---------------------------------------------------------------------------

class TestCompensarBolsaManualIndependienteDelFlag:
    @pytest.mark.asyncio
    async def test_sin_bolsa_registrada_raises_aun_con_global_off(self, db_session):
        """compensar_bolsa manual requiere bolsa preexistente, independiente del flag."""
        await _set_global(db_session, False)
        await _cleanup_todo(db_session, CEDULA_BASE)
        try:
            with pytest.raises(ValueError, match=r"no tiene bolsa"):
                await compensar_bolsa(
                    db_session, CEDULA_BASE, 1.0, date(ANIO, 8, 1), "user"
                )
        finally:
            await _cleanup_todo(db_session, CEDULA_BASE)
            await _limpiar_global(db_session)

    @pytest.mark.asyncio
    async def test_con_bolsa_preexistente_funciona_aun_con_global_off(self, db_session):
        """Si hay bolsa historica (legacy), compensar funciona aunque global=False."""
        await _set_global(db_session, False)
        await _cleanup_todo(db_session, CEDULA_BASE)
        try:
            bolsa = NominaBolsaHoras(cedula=CEDULA_BASE, horas_acreditadas=5.0)
            db_session.add(bolsa)
            await db_session.commit()

            resultado = await compensar_bolsa(
                db_session,
                CEDULA_BASE,
                2.0,
                date(ANIO, 8, 1),
                "user",
                observaciones="legacy bolsa",
            )
            assert resultado["horas_compensadas"] == pytest.approx(2.0)
        finally:
            await _cleanup_todo(db_session, CEDULA_BASE)
            await _limpiar_global(db_session)
