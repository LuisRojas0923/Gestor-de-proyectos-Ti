from datetime import date

import pytest
from sqlalchemy import delete
from sqlmodel import select

from app.models.novedades_nomina.horas_extras import (
    NominaBolsaHoras,
    NominaBolsaHorasMovimiento,
    NominaCalculoSemanal,
    NominaCalculoSemanalDetalle,
    NominaCostoOt,
)
from app.models.novedades_nomina.horas_extras_diario import NominaCalculoDiarioDetalle
from app.models.novedades_nomina.schemas_horas_extras import (
    ConfirmarDetalleItem,
    PreLiquidacionConfirmar,
)
from app.services.novedades_nomina.horas_extras_confirmacion import (
    confirmar_pre_liquidacion,
    obtener_calculo_completo,
)
from app.services.novedades_nomina.horas_extras_trazabilidad import cargar_detalle_diario


CEDULA = "TEST-S10-TRAZA-001"


async def _preparar_tabla_y_limpiar(db_session):
    await db_session.execute(delete(NominaCalculoDiarioDetalle).where(NominaCalculoDiarioDetalle.cedula == CEDULA))
    await db_session.execute(
        delete(NominaCalculoSemanalDetalle).where(
            NominaCalculoSemanalDetalle.calculo_id.in_(
                select(NominaCalculoSemanal.id).where(NominaCalculoSemanal.cedula == CEDULA)
            )
        )
    )
    await db_session.execute(delete(NominaBolsaHorasMovimiento).where(NominaBolsaHorasMovimiento.cedula == CEDULA))
    await db_session.execute(delete(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA))
    await db_session.execute(delete(NominaCalculoSemanal).where(NominaCalculoSemanal.cedula == CEDULA))
    await db_session.execute(delete(NominaCostoOt).where(NominaCostoOt.ot_id == 10_010))
    await db_session.commit()


def _payload_con_detalle_diario() -> PreLiquidacionConfirmar:
    valor_bruto = 31_250.0
    carga = valor_bruto * 0.52436
    return PreLiquidacionConfirmar(
        cedula=CEDULA,
        anio=2026,
        semana_iso=25,
        fecha_inicio=date(2026, 6, 15),
        fecha_fin=date(2026, 6, 21),
        nivel_riesgo_arl="III",
        factor_prestacional=0.52436,
        salario_base_mensual=3_000_000,
        valor_hora_ordinaria=12_500.0,
        detalles=[
            ConfirmarDetalleItem(
                codigo_novedad="HED",
                horas=2.0,
                factor_hora_ordinaria=1.25,
                valor_bruto=valor_bruto,
                carga_prestacional=carga,
                costo_total=valor_bruto + carga,
            )
        ],
        usuario_confirma="TEST-S10",
        detalle_diario=[
            {
                "fecha": date(2026, 6, 15),
                "dia_semana": 1,
                "hora_entrada": "08:00",
                "hora_salida": "18:00",
                "minutos_almuerzo": 60,
                "horas_trabajadas": 9.0,
                "horas_ordinarias": 7.0,
                "horas_extras": 2.0,
                "codigo_calculado": "HED",
                "horas_concepto": 2.0,
                "factor_hora_ordinaria": 1.25,
                "valor_bruto": valor_bruto,
                "carga_prestacional": carga,
                "costo_total": valor_bruto + carga,
                "es_festivo": False,
                "es_domingo": False,
                "es_jornada_nocturna": False,
                "fuente_horario": "PLANIFICADOR",
            },
            *[
                {
                    "fecha": date(2026, 6, 15 + offset),
                    "dia_semana": offset + 1,
                    "minutos_almuerzo": 0,
                    "horas_trabajadas": 0.0,
                    "horas_ordinarias": 0.0,
                    "horas_extras": 0.0,
                    "es_festivo": False,
                    "es_domingo": offset == 6,
                    "es_jornada_nocturna": False,
                    "fuente_horario": "PLANIFICADOR",
                }
                for offset in range(1, 7)
            ],
        ],
    )


@pytest.mark.asyncio
async def test_confirmacion_persiste_snapshot_diario_de_7_dias(db_session):
    await _preparar_tabla_y_limpiar(db_session)
    payload = _payload_con_detalle_diario()
    try:
        resultado = await confirmar_pre_liquidacion(db_session, payload)

        calculo = await obtener_calculo_completo(db_session, resultado["calculo_id"])

        assert calculo is not None
        assert calculo.detalle_diario_estado == "DISPONIBLE"
        assert len(calculo.detalle_diario) == 7
        lunes = next(d for d in calculo.detalle_diario if d.dia_semana == 1)
        assert lunes.codigo_calculado == "HED"
        assert lunes.horas_concepto == pytest.approx(2.0)
    finally:
        await _preparar_tabla_y_limpiar(db_session)


@pytest.mark.asyncio
async def test_cargar_detalle_diario_reporta_historico_sin_snapshot(db_session):
    await _preparar_tabla_y_limpiar(db_session)
    calculo = NominaCalculoSemanal(
        cedula=CEDULA,
        anio=2026,
        semana_iso=26,
        fecha_inicio=date(2026, 6, 22),
        fecha_fin=date(2026, 6, 28),
        nivel_riesgo_arl="III",
        factor_prestacional=0.52436,
        salario_base_mensual=3_000_000,
        valor_hora_ordinaria=12_500.0,
        estado="CONFIRMADO",
    )
    db_session.add(calculo)
    await db_session.flush()

    try:
        estado, detalles = await cargar_detalle_diario(db_session, calculo.id)

        assert estado == "HISTORICO_SIN_SNAPSHOT"
        assert detalles == []
    finally:
        await _preparar_tabla_y_limpiar(db_session)


@pytest.mark.asyncio
async def test_cargar_detalle_diario_reporta_snapshot_incompleto(db_session):
    await _preparar_tabla_y_limpiar(db_session)
    calculo = NominaCalculoSemanal(
        cedula=CEDULA,
        anio=2026,
        semana_iso=27,
        fecha_inicio=date(2026, 6, 29),
        fecha_fin=date(2026, 7, 5),
        nivel_riesgo_arl="III",
        factor_prestacional=0.52436,
        salario_base_mensual=3_000_000,
        valor_hora_ordinaria=12_500.0,
        estado="CONFIRMADO",
    )
    db_session.add(calculo)
    await db_session.flush()
    db_session.add(NominaCalculoDiarioDetalle(
        calculo_id=calculo.id,
        cedula=CEDULA,
        anio=2026,
        semana_iso=27,
        fecha=date(2026, 6, 29),
        dia_semana=1,
        horas_trabajadas=9.0,
        horas_ordinarias=7.0,
        horas_extras=2.0,
        codigo_calculado="HED",
        horas_concepto=2.0,
        factor_hora_ordinaria=1.25,
        valor_bruto=31_250.0,
        carga_prestacional=16_386.25,
        costo_total=47_636.25,
        fuente_horario="PLANIFICADOR",
    ))
    await db_session.flush()

    try:
        estado, detalles = await cargar_detalle_diario(db_session, calculo.id)

        assert estado == "INCOMPLETO"
        assert len(detalles) == 1
    finally:
        await _preparar_tabla_y_limpiar(db_session)
