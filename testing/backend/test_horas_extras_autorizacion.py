"""Contrato de autorización posterior para cálculos de horas extras."""
import asyncio
from datetime import date

import pytest
from sqlalchemy import delete, func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from sqlmodel import select

from app.models.novedades_nomina.horas_extras import (
    NominaBolsaHoras,
    NominaBolsaHorasMovimiento,
    NominaCalculoSemanal,
    NominaCalculoSemanalDetalle,
    NominaCalculoWorkflowEvento,
    NominaCatalogoNovedad,
    NominaCostoOt,
    NominaParametroLegal,
)
from app.config import config
from app.models.novedades_nomina.schemas_horas_extras import (
    ConfirmarDetalleItem,
    PreLiquidacionConfirmar,
)
from app.services.novedades_nomina.horas_extras_autorizacion import (
    autorizar_calculo_pendiente,
)
from app.services.novedades_nomina.horas_extras_confirmacion import (
    confirmar_pre_liquidacion,
)
from app.services.novedades_nomina.horas_extras_workflow import transicionar_calculo


CEDULA = "TEST-AUT-HE-001"
ANIO = 2026
SEMANA = 31
OT_ID = 9401
CODIGO_BOLSA = "BOLSA_GLOBAL_HABILITADA"


def _payload(semana: int = SEMANA) -> PreLiquidacionConfirmar:
    return PreLiquidacionConfirmar(
        cedula=CEDULA,
        anio=ANIO,
        semana_iso=semana,
        fecha_inicio=date.fromisocalendar(ANIO, semana, 1),
        fecha_fin=date.fromisocalendar(ANIO, semana, 7),
        nivel_riesgo_arl="III",
        factor_prestacional=0.52436,
        salario_base_mensual=3_000_000,
        valor_hora_ordinaria=12_500,
        detalles=[
            ConfirmarDetalleItem(
                codigo_novedad="HED",
                horas=2,
                factor_hora_ordinaria=1.25,
                valor_bruto=31_250,
                carga_prestacional=16_386.25,
                costo_total=47_636.25,
            )
        ],
        ot_id=OT_ID,
        ot_codigo="OT-AUT-HE-001",
        usuario_confirma="TEST-CONFIRMA",
    )


async def _cleanup(db_session) -> None:
    calculos = select(NominaCalculoSemanal.id).where(NominaCalculoSemanal.cedula == CEDULA)
    await db_session.execute(
        delete(NominaCalculoWorkflowEvento).where(
            NominaCalculoWorkflowEvento.calculo_id.in_(calculos)
        )
    )
    await db_session.execute(
        delete(NominaBolsaHorasMovimiento).where(NominaBolsaHorasMovimiento.cedula == CEDULA)
    )
    await db_session.execute(
        delete(NominaCalculoSemanalDetalle).where(
            NominaCalculoSemanalDetalle.calculo_id.in_(calculos)
        )
    )
    await db_session.execute(delete(NominaCalculoSemanal).where(NominaCalculoSemanal.cedula == CEDULA))
    await db_session.execute(delete(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA))
    await db_session.execute(delete(NominaCostoOt).where(NominaCostoOt.ot_id == OT_ID))
    await db_session.execute(delete(NominaParametroLegal).where(NominaParametroLegal.codigo == CODIGO_BOLSA))
    await db_session.commit()


async def _habilitar_bolsa(db_session, habilitada: bool = True) -> None:
    db_session.add(
        NominaParametroLegal(
            codigo=CODIGO_BOLSA,
            nombre="Bolsa global test autorización",
            valor="true" if habilitada else "false",
            tipo_dato="BOOLEANO",
            vigente_desde=date.today(),
            estado="VIGENTE",
        )
    )
    novedad = await db_session.scalar(
        select(NominaCatalogoNovedad).where(NominaCatalogoNovedad.codigo == "HED")
    )
    if novedad is None:
        novedad = NominaCatalogoNovedad(
            codigo="HED",
            descripcion_corta="Hora extra diurna",
            categoria="HORA_EXTRA",
            subcategoria="DIURNA",
            factor_hora_ordinaria=1.25,
            acredita_bolsa=True,
            descuenta_bolsa=True,
            requiere_autorizacion=True,
            unidad="HORAS",
            estado="ACTIVO",
            vigente_desde=date(2026, 1, 1),
        )
    else:
        novedad.acredita_bolsa = True
    db_session.add(novedad)
    await db_session.commit()


@pytest.mark.asyncio
async def test_confirmacion_no_autorizada_queda_pendiente_sin_acreditar(db_session):
    await _cleanup(db_session)
    try:
        await _habilitar_bolsa(db_session)

        resultado = await confirmar_pre_liquidacion(
            db_session,
            _payload(),
            autorizacion_he=False,
        )

        calculo = await db_session.get(NominaCalculoSemanal, resultado["calculo_id"])
        bolsa = await db_session.scalar(
            select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA)
        )
        assert calculo.estado == "PENDIENTE_AUTORIZACION"
        assert calculo.confirmado_por is None
        assert calculo.confirmado_en is None
        assert bolsa is None
        assert resultado["horas_acreditadas_bolsa"] == 0
        assert resultado["estado"] == "PENDIENTE_AUTORIZACION"
    finally:
        await _cleanup(db_session)


@pytest.mark.asyncio
async def test_autorizacion_acredita_una_sola_vez_y_es_idempotente(db_session):
    await _cleanup(db_session)
    try:
        await _habilitar_bolsa(db_session)
        creado = await confirmar_pre_liquidacion(
            db_session,
            _payload(),
            autorizacion_he=False,
        )

        primero = await autorizar_calculo_pendiente(db_session, creado["calculo_id"], "TEST-AUTORIZA")
        await db_session.commit()
        segundo = await autorizar_calculo_pendiente(db_session, creado["calculo_id"], "TEST-AUTORIZA")
        await db_session.commit()

        bolsa = await db_session.scalar(
            select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA)
        )
        movimientos = await db_session.scalar(
            select(func.count()).select_from(NominaBolsaHorasMovimiento).where(
                NominaBolsaHorasMovimiento.cedula == CEDULA,
                NominaBolsaHorasMovimiento.tipo_movimiento == "ACREDITACION",
            )
        )
        eventos = await db_session.scalar(
            select(func.count()).select_from(NominaCalculoWorkflowEvento).where(
                NominaCalculoWorkflowEvento.calculo_id == creado["calculo_id"],
                NominaCalculoWorkflowEvento.estado_destino == "CONFIRMADO",
            )
        )
        assert primero["estado_nuevo"] == "CONFIRMADO"
        assert segundo["estado_nuevo"] == "CONFIRMADO"
        assert segundo["ya_autorizado"] is True
        assert bolsa.horas_acreditadas == pytest.approx(2)
        assert movimientos == 1
        assert eventos == 1
    finally:
        await _cleanup(db_session)


@pytest.mark.asyncio
async def test_autorizaciones_concurrentes_preservan_saldo_y_movimientos(db_session):
    await _cleanup(db_session)
    engine = create_async_engine(config.database_url, poolclass=NullPool)
    fabrica = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        await _habilitar_bolsa(db_session)
        primero = await confirmar_pre_liquidacion(
            db_session, _payload(SEMANA), autorizacion_he=False
        )
        segundo = await confirmar_pre_liquidacion(
            db_session, _payload(SEMANA + 1), autorizacion_he=False
        )

        async def autorizar(calculo_id: int) -> None:
            async with fabrica() as session:
                await autorizar_calculo_pendiente(session, calculo_id, "TEST-AUTORIZA")
                await session.commit()

        await asyncio.gather(
            autorizar(primero["calculo_id"]),
            autorizar(segundo["calculo_id"]),
        )
        await db_session.rollback()
        bolsa = await db_session.scalar(
            select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA)
        )
        movimientos = await db_session.scalar(
            select(func.count()).select_from(NominaBolsaHorasMovimiento).where(
                NominaBolsaHorasMovimiento.cedula == CEDULA,
                NominaBolsaHorasMovimiento.tipo_movimiento == "ACREDITACION",
            )
        )
        assert bolsa.horas_acreditadas == pytest.approx(4)
        assert movimientos == 2
    finally:
        await engine.dispose()
        await _cleanup(db_session)


@pytest.mark.asyncio
async def test_mismo_calculo_concurrente_genera_un_solo_credito(db_session):
    await _cleanup(db_session)
    engine = create_async_engine(config.database_url, poolclass=NullPool)
    fabrica = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        await _habilitar_bolsa(db_session)
        creado = await confirmar_pre_liquidacion(
            db_session, _payload(), autorizacion_he=False
        )

        async def autorizar() -> None:
            async with fabrica() as session:
                await autorizar_calculo_pendiente(
                    session, creado["calculo_id"], "TEST-AUTORIZA"
                )
                await session.commit()

        await asyncio.gather(autorizar(), autorizar())
        await db_session.rollback()
        movimientos = await db_session.scalar(
            select(func.count()).select_from(NominaBolsaHorasMovimiento).where(
                NominaBolsaHorasMovimiento.cedula == CEDULA,
                NominaBolsaHorasMovimiento.tipo_movimiento == "ACREDITACION",
            )
        )
        eventos = await db_session.scalar(
            select(func.count()).select_from(NominaCalculoWorkflowEvento).where(
                NominaCalculoWorkflowEvento.calculo_id == creado["calculo_id"],
                NominaCalculoWorkflowEvento.estado_destino == "CONFIRMADO",
            )
        )
        assert movimientos == 1
        assert eventos == 1
    finally:
        await engine.dispose()
        await _cleanup(db_session)


@pytest.mark.asyncio
async def test_endpoint_generico_no_puede_confirmar_pendiente(db_session):
    await _cleanup(db_session)
    try:
        await _habilitar_bolsa(db_session)
        creado = await confirmar_pre_liquidacion(
            db_session,
            _payload(),
            autorizacion_he=False,
        )

        with pytest.raises(ValueError, match="Transición no permitida"):
            await transicionar_calculo(
                db_session,
                creado["calculo_id"],
                "CONFIRMADO",
                "Intento de bypass",
                "TEST-CONFIRMA",
            )
    finally:
        await db_session.rollback()
        await _cleanup(db_session)
