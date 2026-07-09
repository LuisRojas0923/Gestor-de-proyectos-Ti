"""
Tests del Sprint S2 — Engine de confirmación y persistencia.

Cobertura:
  - confirmar_pre_liquidacion (happy path: cálculo sin bolsa por defecto + UPSERT costo_ot)
  - Idempotencia: confirmar 2 veces la misma (cedula, anio, semana) → 409
  - _acreditar_bolsa: solo acredita códigos con acredita_bolsa=True
  - _acreditar_bolsa: acumula en bolsa existente a través de confirmaciones
  - _upsert_costo_ot: primer caso crea, segundo caso suma
  - listar_calculos: filtros por cedula, anio, semana, estado
  - obtener_calculo_completo: retorna cálculo con detalles
  - listar_costos_ot: filtros por ot_id, ot_codigo

Usa cédulas únicas con prefijo TEST-S2- para evitar choques con datos de
producción o de otros tests.
"""
import pytest
from datetime import date, datetime
from sqlalchemy import delete

from app.models.novedades_nomina.horas_extras import (
    NominaCalculoSemanal,
    NominaCalculoSemanalDetalle,
    NominaBolsaHoras,
    NominaBolsaHorasMovimiento,
    NominaCostoOt,
    NominaHorarioPactado,
    NominaCatalogoNovedad,
    NominaParametroLegal,
)
from app.models.novedades_nomina.schemas_horas_extras import (
    PreLiquidacionConfirmar,
    ConfirmarDetalleItem,
    CalculoSemanalRead,
)
from app.services.novedades_nomina.horas_extras_confirmacion import (
    confirmar_pre_liquidacion,
    listar_calculos,
    obtener_calculo_completo,
    listar_costos_ot,
)


# ---------------------------------------------------------------------------
# Fixtures auxiliares
# ---------------------------------------------------------------------------

CEDULA_BASE = "TEST-S2-1234567890"
ANIO = 2026
SEMANA = 25
OT_ID = 9001
OT_CODIGO = "OT-TEST-S2-001"
CODIGO_GLOBAL_BOLSA = "BOLSA_GLOBAL_HABILITADA"


def _detalle(codigo, horas, factor, valor_bruto):
    """Helper para crear un ConfirmarDetalleItem válido."""
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
    """Helper para construir un PreLiquidacionConfirmar válido."""
    if detalles is None:
        detalles = [
            _detalle("HED", 2.0, 1.25, 31_250.0),
            _detalle("HEN", 1.0, 1.75, 21_875.0),
        ]
    return PreLiquidacionConfirmar(
        cedula=cedula,
        anio=anio,
        semana_iso=semana,
        fecha_inicio=date(anio, 6, 16),
        fecha_fin=date(anio, 6, 22),
        nivel_riesgo_arl="III",
        factor_prestacional=0.52436,
        salario_base_mensual=3_000_000,
        valor_hora_ordinaria=12_500.0,
        detalles=detalles,
        ot_id=ot_id,
        ot_codigo=ot_codigo,
        usuario_confirma="TEST-USER-S2",
    )


async def _cleanup(db_session, cedula: str, anio: int = ANIO, semana: int = SEMANA):
    """Limpia todas las filas relacionadas con un cálculo de test."""
    # 1. Detalles y cálculo
    calc_ids_q = (
        await db_session.execute(
            delete(NominaCalculoSemanalDetalle).where(
                NominaCalculoSemanalDetalle.calculo_id.in_(
                    select(NominaCalculoSemanal.id).where(
                        NominaCalculoSemanal.cedula == cedula
                    )
                )
            )
        )
    )
    await db_session.execute(
        delete(NominaCalculoSemanal).where(NominaCalculoSemanal.cedula == cedula)
    )

    # 2. Movimientos y bolsa
    bolsa = (
        await db_session.execute(
            delete(NominaBolsaHorasMovimiento).where(
                NominaBolsaHorasMovimiento.cedula == cedula
            )
        )
    )
    await db_session.execute(
        delete(NominaBolsaHoras).where(NominaBolsaHoras.cedula == cedula)
    )

    # 3. Costos OT de la OT de test
    await db_session.execute(
        delete(NominaCostoOt).where(NominaCostoOt.ot_id == OT_ID)
    )

    # 4. Horario cacheado
    await db_session.execute(
        delete(NominaHorarioPactado).where(NominaHorarioPactado.cedula == cedula)
    )

    await db_session.commit()


async def _set_bolsa_global(db_session, habilitada: bool):
    await db_session.execute(
        delete(NominaParametroLegal).where(NominaParametroLegal.codigo == CODIGO_GLOBAL_BOLSA)
    )
    db_session.add(
        NominaParametroLegal(
            codigo=CODIGO_GLOBAL_BOLSA,
            nombre="Habilitar bolsa de horas (global)",
            valor="true" if habilitada else "false",
            tipo_dato="BOOLEANO",
            norma_soporte="Politica interna - test S2",
            vigente_desde=date.today(),
            estado="VIGENTE",
            observaciones="test S2",
        )
    )
    await db_session.commit()


async def _limpiar_bolsa_global(db_session):
    await db_session.execute(
        delete(NominaParametroLegal).where(NominaParametroLegal.codigo == CODIGO_GLOBAL_BOLSA)
    )
    await db_session.commit()


# Select necesario para subquery de cleanup
from sqlmodel import select


# ---------------------------------------------------------------------------
# Engine principal: confirmar_pre_liquidacion (happy path)
# ---------------------------------------------------------------------------

class TestConfirmarPreLiquidacionHappyPath:
    @pytest.mark.asyncio
    async def test_crea_calculo_detalle_y_costo_ot_sin_bolsa_por_default(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        await _limpiar_bolsa_global(db_session)

        # Sembrar horario (requisito para contexto)
        horario = NominaHorarioPactado(
            cedula=CEDULA_BASE,
            minutos_jornada_ordinaria=480,
            horas_semana_ordinaria=48.0,
            autoriza_he_default=True,
        )
        db_session.add(horario)
        await db_session.commit()

        try:
            payload = _payload()
            resultado = await confirmar_pre_liquidacion(db_session, payload)

            # Resultado: IDs presentes
            assert resultado["calculo_id"] is not None
            assert resultado["bolsa_id"] is None
            assert resultado["horas_acreditadas_bolsa"] == 0.0
            assert resultado["movimientos_bolsa"] == []
            assert resultado["bolsa_habilitada_en_confirmacion"] is False
            assert resultado["costo_ot_id"] is not None

            # Verificar persistencia del cálculo
            calc = await obtener_calculo_completo(db_session, resultado["calculo_id"])
            assert calc is not None
            assert calc.cedula == CEDULA_BASE
            assert calc.estado == "CONFIRMADO"
            assert calc.total_horas_extras == pytest.approx(3.0)
            assert calc.total_valor_bruto == pytest.approx(53_125.0)
            assert len(calc.detalles) == 2

            # Verificar costo_ot
            costo = (
                await db_session.execute(
                    select(NominaCostoOt).where(
                        NominaCostoOt.ot_id == OT_ID,
                        NominaCostoOt.anio == ANIO,
                        NominaCostoOt.semana_iso == SEMANA,
                    )
                )
            ).scalar_one()
            assert costo.ot_codigo == OT_CODIGO
            assert costo.total_horas == pytest.approx(3.0)
            assert costo.total_horas_hed == pytest.approx(2.0)
            assert costo.total_horas_hen == pytest.approx(1.0)
            assert costo.total_empleados == 1
        finally:
            await _cleanup(db_session, CEDULA_BASE)
            await _limpiar_bolsa_global(db_session)

# ---------------------------------------------------------------------------
# Idempotencia
# ---------------------------------------------------------------------------

class TestIdempotencia:
    @pytest.mark.asyncio
    async def test_confirmar_dos_veces_misma_semana_raises(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        try:
            payload = _payload()
            # Primera confirmación: OK
            await confirmar_pre_liquidacion(db_session, payload)

            # Segunda confirmación: debe fallar con mensaje apto para usuario final.
            with pytest.raises(ValueError) as excinfo:
                await confirmar_pre_liquidacion(db_session, payload)
            mensaje = str(excinfo.value)
            assert "ya tiene un cálculo registrado" in mensaje
            assert "PUT" not in mensaje
            assert "id=" not in mensaje
        finally:
            await _cleanup(db_session, CEDULA_BASE)

    @pytest.mark.asyncio
    async def test_idempotencia_por_semana_distinta_no_choca(self, db_session):
        """Confirmar la misma cédula en semanas distintas debe funcionar."""
        await _cleanup(db_session, CEDULA_BASE, semana=SEMANA)
        await _cleanup(db_session, CEDULA_BASE, semana=SEMANA + 1)
        try:
            await confirmar_pre_liquidacion(db_session, _payload(semana=SEMANA))
            # OK: no choca con semana distinta
            await confirmar_pre_liquidacion(
                db_session, _payload(
                    semana=SEMANA + 1,
                    detalles=[_detalle("HED", 1.0, 1.25, 15_625.0)],
                )
            )
        finally:
            await _cleanup(db_session, CEDULA_BASE, semana=SEMANA)
            await _cleanup(db_session, CEDULA_BASE, semana=SEMANA + 1)


# ---------------------------------------------------------------------------
# Acreditación a bolsa
# ---------------------------------------------------------------------------

class TestAcreditarBolsa:
    @pytest.mark.asyncio
    async def test_solo_acredita_codigos_que_acreditan_bolsa(self, db_session):
        """VAC, LIC, PNR, AUS NO deben acreditar bolsa; solo HE sí."""
        await _cleanup(db_session, CEDULA_BASE)
        await _set_bolsa_global(db_session, True)
        try:
            # Detalles mixtos: HED (acredita) + VAC (no acredita)
            detalles_mixtos = [
                _detalle("HED", 2.0, 1.25, 31_250.0),
                _detalle("VAC", 1.0, 1.0, 12_500.0),
                _detalle("HEN", 1.0, 1.75, 21_875.0),
            ]
            payload = _payload(detalles=detalles_mixtos)
            resultado = await confirmar_pre_liquidacion(db_session, payload)

            # Solo 3h (HED 2 + HEN 1) deben estar en bolsa; VAC (1h) NO
            assert resultado["horas_acreditadas_bolsa"] == pytest.approx(3.0)

            bolsa = (
                await db_session.execute(
                    select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA_BASE)
                )
            ).scalar_one()
            assert bolsa.horas_acreditadas == pytest.approx(3.0)

            # El cálculo SÍ incluye VAC (es una novedad que paga)
            calc = await obtener_calculo_completo(db_session, resultado["calculo_id"])
            assert any(d.codigo_novedad == "VAC" for d in calc.detalles)
        finally:
            await _limpiar_bolsa_global(db_session)
            await _cleanup(db_session, CEDULA_BASE)

    @pytest.mark.asyncio
    async def test_crea_bolsa_si_no_existe(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        await _set_bolsa_global(db_session, True)
        try:
            resultado = await confirmar_pre_liquidacion(db_session, _payload())
            assert resultado["bolsa_id"] is not None
            bolsa = (
                await db_session.execute(
                    select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA_BASE)
                )
            ).scalar_one()
            assert bolsa.cedula == CEDULA_BASE
        finally:
            await _limpiar_bolsa_global(db_session)
            await _cleanup(db_session, CEDULA_BASE)

    @pytest.mark.asyncio
    async def test_acumula_bolsa_en_confirmaciones_seguidas(self, db_session):
        """Semana 25 acredita 3h, semana 26 acredita 1h → bolsa = 4h."""
        await _cleanup(db_session, CEDULA_BASE, semana=SEMANA)
        await _cleanup(db_session, CEDULA_BASE, semana=SEMANA + 1)
        await _set_bolsa_global(db_session, True)
        try:
            await confirmar_pre_liquidacion(
                db_session,
                _payload(semana=SEMANA, detalles=[_detalle("HED", 3.0, 1.25, 46_875.0)]),
            )
            await confirmar_pre_liquidacion(
                db_session,
                _payload(
                    semana=SEMANA + 1,
                    detalles=[_detalle("HED", 1.0, 1.25, 15_625.0)],
                ),
            )
            bolsa = (
                await db_session.execute(
                    select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA_BASE)
                )
            ).scalar_one()
            assert bolsa.horas_acreditadas == pytest.approx(4.0)
        finally:
            await _limpiar_bolsa_global(db_session)
            await _cleanup(db_session, CEDULA_BASE, semana=SEMANA)
            await _cleanup(db_session, CEDULA_BASE, semana=SEMANA + 1)


# ---------------------------------------------------------------------------
# UPSERT costo_ot
# ---------------------------------------------------------------------------

class TestUpsertCostoOt:
    @pytest.mark.asyncio
    async def test_primera_confirmacion_crea_costo_ot(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        try:
            resultado = await confirmar_pre_liquidacion(db_session, _payload())
            assert resultado["costo_ot_id"] is not None
            costo = (
                await db_session.execute(
                    select(NominaCostoOt).where(NominaCostoOt.id == resultado["costo_ot_id"])
                )
            ).scalar_one()
            assert costo.ot_id == OT_ID
            assert costo.ot_codigo == OT_CODIGO
            assert costo.total_horas == pytest.approx(3.0)
            assert costo.total_empleados == 1
        finally:
            await _cleanup(db_session, CEDULA_BASE)

    @pytest.mark.asyncio
    async def test_segunda_cedula_misma_ot_suma_a_existente(self, db_session):
        """Si dos empleados confirman HE sobre la misma OT/semana, los totales se suman."""
        cedula_2 = "TEST-S2-9876543210"
        await _cleanup(db_session, CEDULA_BASE)
        await _cleanup(db_session, cedula_2)
        try:
            # Empleado 1: 2h HED + 1h HEN = 3h
            r1 = await confirmar_pre_liquidacion(
                db_session, _payload(cedula=CEDULA_BASE, semana=SEMANA)
            )
            # Empleado 2: 4h HED = 4h (misma OT, misma semana)
            r2 = await confirmar_pre_liquidacion(
                db_session,
                _payload(
                    cedula=cedula_2,
                    semana=SEMANA,
                    detalles=[_detalle("HED", 4.0, 1.25, 62_500.0)],
                ),
            )

            # Ambos deben apuntar al mismo registro consolidado
            assert r1["costo_ot_id"] == r2["costo_ot_id"]
            costo = (
                await db_session.execute(
                    select(NominaCostoOt).where(NominaCostoOt.id == r1["costo_ot_id"])
                )
            ).scalar_one()
            assert costo.total_horas == pytest.approx(7.0)  # 3 + 4
            assert costo.total_horas_hed == pytest.approx(6.0)  # 2 + 4
            assert costo.total_horas_hen == pytest.approx(1.0)
            # calculo_ids debe contener ambos
            assert r1["calculo_id"] in costo.calculo_ids
            assert r2["calculo_id"] in costo.calculo_ids
        finally:
            await _cleanup(db_session, CEDULA_BASE)
            await _cleanup(db_session, cedula_2)

    @pytest.mark.asyncio
    async def test_sin_ot_no_genera_costo_ot(self, db_session):
        """Si el payload no trae ot_id, no se crea registro de costo_ot."""
        await _cleanup(db_session, CEDULA_BASE)
        try:
            payload = _payload(ot_id=None, ot_codigo=None)
            resultado = await confirmar_pre_liquidacion(db_session, payload)
            assert resultado["costo_ot_id"] is None
        finally:
            await _cleanup(db_session, CEDULA_BASE)


# ---------------------------------------------------------------------------
# Lectura de cálculos
# ---------------------------------------------------------------------------

class TestListarCalculos:
    @pytest.mark.asyncio
    async def test_filtra_por_cedula(self, db_session):
        cedula_a = "TEST-S2-A-111"
        cedula_b = "TEST-S2-B-222"
        await _cleanup(db_session, cedula_a)
        await _cleanup(db_session, cedula_b)
        try:
            await confirmar_pre_liquidacion(db_session, _payload(cedula=cedula_a))
            await confirmar_pre_liquidacion(db_session, _payload(cedula=cedula_b))

            resultados_a = await listar_calculos(db_session, cedula=cedula_a, limit=10)
            assert all(c.cedula == cedula_a for c in resultados_a)
            assert len(resultados_a) == 1
        finally:
            await _cleanup(db_session, cedula_a)
            await _cleanup(db_session, cedula_b)

    @pytest.mark.asyncio
    async def test_filtra_por_anio_y_semana(self, db_session):
        await _cleanup(db_session, CEDULA_BASE, semana=SEMANA)
        await _cleanup(db_session, CEDULA_BASE, semana=SEMANA + 1)
        try:
            await confirmar_pre_liquidacion(db_session, _payload(semana=SEMANA))
            await confirmar_pre_liquidacion(
                db_session,
                _payload(
                    semana=SEMANA + 1,
                    detalles=[_detalle("HED", 1.0, 1.25, 15_625.0)],
                ),
            )
            r25 = await listar_calculos(
                db_session, cedula=CEDULA_BASE, anio=ANIO, semana_iso=SEMANA
            )
            assert len(r25) == 1
            assert r25[0].semana_iso == SEMANA
        finally:
            await _cleanup(db_session, CEDULA_BASE, semana=SEMANA)
            await _cleanup(db_session, CEDULA_BASE, semana=SEMANA + 1)

    @pytest.mark.asyncio
    async def test_filtra_por_estado(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        try:
            await confirmar_pre_liquidacion(db_session, _payload())
            confirmados = await listar_calculos(db_session, estado="CONFIRMADO", limit=10)
            assert all(c.estado == "CONFIRMADO" for c in confirmados)
        finally:
            await _cleanup(db_session, CEDULA_BASE)

    @pytest.mark.asyncio
    async def test_lista_detalles_eager_loaded_para_response_model(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        try:
            await confirmar_pre_liquidacion(db_session, _payload())

            resultados = await listar_calculos(db_session, cedula=CEDULA_BASE, limit=10)

            assert len(resultados) == 1
            serializado = CalculoSemanalRead.model_validate(resultados[0])
            assert len(serializado.detalles) == 2
        finally:
            await _cleanup(db_session, CEDULA_BASE)


class TestObtenerCalculoCompleto:
    @pytest.mark.asyncio
    async def test_retorna_detalle_eager_loaded(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        try:
            r = await confirmar_pre_liquidacion(db_session, _payload())
            calc = await obtener_calculo_completo(db_session, r["calculo_id"])

            assert calc is not None
            assert calc.id == r["calculo_id"]
            assert calc.cedula == CEDULA_BASE
            # detalles debe estar cargado (no requiere refresh)
            assert len(calc.detalles) == 2
            codigos = {d.codigo_novedad for d in calc.detalles}
            assert codigos == {"HED", "HEN"}
        finally:
            await _cleanup(db_session, CEDULA_BASE)

    @pytest.mark.asyncio
    async def test_id_inexistente_retorna_none(self, db_session):
        resultado = await obtener_calculo_completo(db_session, 999_999_999)
        assert resultado is None


# ---------------------------------------------------------------------------
# Lectura de costos_ot
# ---------------------------------------------------------------------------

class TestListarCostosOt:
    @pytest.mark.asyncio
    async def test_filtra_por_ot_id(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        try:
            await confirmar_pre_liquidacion(db_session, _payload())
            costos = await listar_costos_ot(db_session, ot_id=OT_ID)
            assert len(costos) >= 1
            assert all(c.ot_id == OT_ID for c in costos)
        finally:
            await _cleanup(db_session, CEDULA_BASE)

    @pytest.mark.asyncio
    async def test_filtra_por_ot_codigo_y_semana(self, db_session):
        await _cleanup(db_session, CEDULA_BASE)
        try:
            await confirmar_pre_liquidacion(db_session, _payload())
            costos = await listar_costos_ot(
                db_session, ot_codigo=OT_CODIGO, anio=ANIO, semana_iso=SEMANA
            )
            assert len(costos) == 1
            assert costos[0].ot_codigo == OT_CODIGO
            assert costos[0].semana_iso == SEMANA
        finally:
            await _cleanup(db_session, CEDULA_BASE)
