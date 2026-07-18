"""
Tests S8 — Asignacion de OT/centros de costo de M.O. por dia.
"""
import asyncio
import zlib
from datetime import date, time

import pytest
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from pydantic import ValidationError
from sqlmodel import select

from app.models.novedades_nomina.horas_extras import (
    NominaBolsaHoras,
    NominaBolsaHorasMovimiento,
    NominaCalculoSemanal,
    NominaCalculoSemanalDetalle,
    NominaCalculoWorkflowEvento,
    NominaCostoOt,
    NominaHorarioPactado,
)
from app.models.novedades_nomina.planificador_dia_ot import NominaPlanificadorDiaOt
from app.models.novedades_nomina.horas_extras_diario import NominaCalculoDiarioDetalle
from app.models.novedades_nomina.schemas_horas_extras_planificador import (
    PlanAsignacionOtIn,
    PlanConfirmarEmpleadoIn,
    PlanConfirmarParametros,
    PlanConfirmarRequest,
    PlanDiaIn,
    PlanSemanaIn,
)
from app.models.novedades_nomina.schemas_horas_extras import (
    ConfirmarDetalleItem,
    PreLiquidacionConfirmar,
)
from app.config import config
from app.services.erp.ordenes_trabajo_service import OrdenesTrabajoService
from app.services.novedades_nomina.planificador_costos_ot import (
    _distribuir_valor_con_residuo,
    _ot_id_desde_orden,
)
from app.services.novedades_nomina.horas_extras_confirmacion import confirmar_pre_liquidacion
from app.services.novedades_nomina.planificador_persistencia import confirmar_plan
from app.services.novedades_nomina.planificador_ot import validar_asignaciones_ot_dia
from app.services.novedades_nomina.horas_extras_workflow import transicionar_calculo


CEDULA = "TEST-S8-OT-1107068093"
CEDULA_SEGUNDA = "TEST-S8-OT-1107068094"
ANIO = 2026
SEMANA = 26
class _Rows:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows
class _FakeDbErp:
    def __init__(self, rows):
        self.rows = rows
        self.params = None

    def execute(self, _query, params):
        self.params = params
        return _Rows(self.rows)
class _Row:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)
def _ot(orden: str, horas: float) -> PlanAsignacionOtIn:
    return PlanAsignacionOtIn(
        orden=orden,
        cc="3080",
        scc="20",
        sub_indice="300",
        categoria_sub_indice="MANO DE OBRA",
        descripcion="Mantenimiento preventivo",
        horas=horas,
    )
async def _cleanup(db_session) -> None:
    calcs = (await db_session.execute(
        select(NominaCalculoSemanal).where(
            NominaCalculoSemanal.cedula.in_([CEDULA, CEDULA_SEGUNDA])
        )
    )).scalars().all()
    for calc in calcs:
        await db_session.execute(
            delete(NominaCalculoWorkflowEvento).where(
                NominaCalculoWorkflowEvento.calculo_id == calc.id
            )
        )
        await db_session.execute(
            delete(NominaCalculoDiarioDetalle).where(
                NominaCalculoDiarioDetalle.calculo_id == calc.id
            )
        )
        await db_session.execute(
            delete(NominaCalculoSemanalDetalle).where(
                NominaCalculoSemanalDetalle.calculo_id == calc.id
            )
        )
    cedulas = [CEDULA, CEDULA_SEGUNDA]
    await db_session.execute(delete(NominaCalculoSemanal).where(NominaCalculoSemanal.cedula.in_(cedulas)))
    await db_session.execute(delete(NominaBolsaHorasMovimiento).where(NominaBolsaHorasMovimiento.cedula.in_(cedulas)))
    await db_session.execute(delete(NominaBolsaHoras).where(NominaBolsaHoras.cedula.in_(cedulas)))
    await db_session.execute(delete(NominaPlanificadorDiaOt).where(NominaPlanificadorDiaOt.cedula.in_(cedulas)))
    await db_session.execute(delete(NominaHorarioPactado).where(NominaHorarioPactado.cedula.in_(cedulas)))
    await db_session.execute(delete(NominaCostoOt).where(NominaCostoOt.ot_id.in_([9401, 9402, 9403, 9404, 9405, 9406])))
    await db_session.commit()
def test_listar_ot_mano_obra_usa_categoria_y_devuelve_combinaciones():
    db = _FakeDbErp([
        _Row(
            orden="1007",
            cc="3080",
            scc="10",
            sub_indice="300",
            categoria_sub_indice="MANO DE OBRA",
            descripcion="Mantenimiento preventivo",
            vr_contratado=5507000.0,
            estado="ACTIVA",
            cliente="COLCAFE",
        )
    ])

    resultado = OrdenesTrabajoService.listar_ot_mano_obra(
        db,
        q="1007",
        limit=20,
        offset=0,
    )

    assert db.params["cat_mano_obra"] == "MANO DE OBRA"
    assert db.params["cat_contrato_mo"] == "CONTRATO - M.O"
    assert resultado["total"] == 1
    assert resultado["items"][0]["orden"] == "1007"
    assert resultado["items"][0]["cc"] == "3080"
def test_ot_id_desde_orden_usa_entero_o_crc32_estable():
    assert _ot_id_desde_orden(" 9401 ") == 9401
    assert _ot_id_desde_orden("OT-1007") == (
        zlib.crc32("OT-1007".encode("utf-8")) & 0x7FFFFFFF
    )
def test_plan_dia_rechaza_mas_de_tres_asignaciones_ot():
    with pytest.raises(ValidationError):
        PlanDiaIn(
            dia_semana=1,
            hora_entrada=time(7, 30),
            hora_salida=time(17, 0),
            minutos_almuerzo=60,
            novedades=[],
            asignaciones_ot=[_ot("1001", 2), _ot("1002", 2), _ot("1003", 2), _ot("1004", 2)],
        )
def test_validar_asignaciones_ot_rechaza_horas_mayores_al_turno():
    dia = PlanDiaIn(
        dia_semana=1,
        hora_entrada=time(7, 30),
        hora_salida=time(17, 0),
        minutos_almuerzo=60,
        novedades=[],
        asignaciones_ot=[_ot("1001", 5), _ot("1002", 5)],
    )

    with pytest.raises(ValueError, match="supera las horas trabajadas"):
        validar_asignaciones_ot_dia(dia)
def test_distribucion_no_asigna_residuo_a_porcentaje_cero():
    asignaciones = [
        PlanAsignacionOtIn(
            orden="9403", categoria_sub_indice="MANO DE OBRA", porcentaje=50,
        ),
        PlanAsignacionOtIn(
            orden="9404", categoria_sub_indice="MANO DE OBRA", porcentaje=50,
        ),
        PlanAsignacionOtIn(
            orden="9405", categoria_sub_indice="MANO DE OBRA", porcentaje=0,
        ),
    ]
    assert _distribuir_valor_con_residuo(1, asignaciones, decimales=0) == [0, 1, 0]


@pytest.mark.asyncio
async def test_confirmar_plan_distribuye_costo_en_multiples_ot(db_session):
    await _cleanup(db_session)
    dia = PlanDiaIn(
        dia_semana=1,
        hora_entrada=time(7, 30),
        hora_salida=time(19, 0),
        minutos_almuerzo=60,
        novedades=[],
        asignaciones_ot=[_ot("9401", 5.0), _ot("9402", 5.5)],
    )
    payload = PlanConfirmarRequest(
        semana=PlanSemanaIn(
            anio=ANIO, semana_iso=SEMANA,
            fecha_inicio="2026-06-22", fecha_fin="2026-06-28",
        ),
        usuario_confirma="TEST-S8",
        empleados=[PlanConfirmarEmpleadoIn(
            cedula=CEDULA,
            dias=[
                dia,
                PlanDiaIn(dia_semana=2, hora_entrada=time(7, 30), hora_salida=time(17, 0), minutos_almuerzo=60),
                PlanDiaIn(dia_semana=3, hora_entrada=time(7, 30), hora_salida=time(17, 0), minutos_almuerzo=60),
                PlanDiaIn(dia_semana=4, hora_entrada=time(7, 30), hora_salida=time(17, 0), minutos_almuerzo=60),
                PlanDiaIn(dia_semana=5, hora_entrada=time(7, 30), hora_salida=time(17, 0), minutos_almuerzo=60),
            ],
            parametros=PlanConfirmarParametros(
                nivel_riesgo_arl="III", factor_prestacional=0.52436,
                salario_base_mensual=3_000_000, valor_hora_ordinaria=12_500,
                jornada_nocturna=False,
            ),
        )],
    )

    response = await confirmar_plan(db_session, payload)

    costos = (await db_session.execute(select(NominaCostoOt).where(
        NominaCostoOt.anio == ANIO,
        NominaCostoOt.semana_iso == SEMANA,
        NominaCostoOt.ot_id.in_([9401, 9402]),
    ).order_by(NominaCostoOt.ot_id))).scalars().all()
    assert [c.ot_codigo for c in costos] == ["9401", "9402"]
    assert round(sum(c.total_horas for c in costos), 2) == response.resumen.total_horas_extras
    assert costos[0].total_horas == pytest.approx(0.24)
    assert costos[1].total_horas == pytest.approx(0.26)
    await _cleanup(db_session)


@pytest.mark.asyncio
async def test_distribuye_por_porcentaje_concilia_horas_e_importes(db_session):
    await _cleanup(db_session)
    asignaciones = [
        PlanAsignacionOtIn(
            orden=orden, cc=cc, scc="20", sub_indice="300",
            categoria_sub_indice="MANO DE OBRA", porcentaje=50,
        )
        for orden, cc in (("9404", "3080"), ("9405", "3090"))
    ]
    asignaciones.append(PlanAsignacionOtIn(
        orden="9406", cc="3090", scc="20", sub_indice="300",
        categoria_sub_indice="MANO DE OBRA", porcentaje=0,
    ))
    dias = [
        PlanDiaIn(
            dia_semana=dia,
            hora_entrada=time(7, 30),
            hora_salida=time(19, 0) if dia == 1 else time(17, 0),
            minutos_almuerzo=60,
            asignaciones_ot=asignaciones if dia == 1 else [],
        )
        for dia in range(1, 6)
    ]
    payload = PlanConfirmarRequest(
        semana=PlanSemanaIn(
            anio=ANIO, semana_iso=SEMANA,
            fecha_inicio="2026-06-22", fecha_fin="2026-06-28",
        ),
        usuario_confirma="TEST-S8",
        empleados=[PlanConfirmarEmpleadoIn(
            cedula=CEDULA,
            dias=dias,
            parametros=PlanConfirmarParametros(
                nivel_riesgo_arl="III", factor_prestacional=0.52436,
                salario_base_mensual=3_000_000, valor_hora_ordinaria=12_500,
                jornada_nocturna=False,
            ),
        )],
    )

    response = await confirmar_plan(db_session, payload)

    costos = (await db_session.execute(select(NominaCostoOt).where(
        NominaCostoOt.ot_id.in_([9404, 9405, 9406]),
        NominaCostoOt.anio == ANIO,
        NominaCostoOt.semana_iso == SEMANA,
    ))).scalars().all()
    assert response.resumen.ok_count == 1
    assert len(costos) == 2
    assert [c.total_horas for c in costos] == [0.25, 0.25]
    detalle = await db_session.scalar(select(NominaCalculoSemanalDetalle).where(
        NominaCalculoSemanalDetalle.calculo_id == response.calculos[0].calculo_id,
        NominaCalculoSemanalDetalle.codigo_novedad == "HED",
    ))
    assert detalle is not None
    assert sum(c.total_valor_bruto for c in costos) == detalle.valor_bruto
    assert sum(c.total_carga_prestacional for c in costos) == detalle.carga_prestacional
    assert sum(c.total_costo_empresa for c in costos) == detalle.costo_total


@pytest.mark.asyncio
async def test_distribuye_hf_y_hefd_en_ot(db_session):
    await _cleanup(db_session)
    db_session.add(NominaHorarioPactado(
        cedula=CEDULA,
        minutos_jornada_ordinaria=480,
        horas_semana_ordinaria=44,
        autoriza_he_default=True,
    ))
    await db_session.commit()
    dias = [
        PlanDiaIn(
            dia_semana=dia,
            hora_entrada=time(7, 30),
            hora_salida=time(18, 0),
            minutos_almuerzo=30,
            asignaciones_ot=[_ot("9403", 10)] if dia == 1 else [],
        )
        for dia in range(1, 6)
    ]
    payload = PlanConfirmarRequest(
        semana=PlanSemanaIn(
            anio=2026, semana_iso=29,
            fecha_inicio="2026-07-13", fecha_fin="2026-07-19",
        ),
        usuario_confirma="TEST-S8",
        empleados=[PlanConfirmarEmpleadoIn(
            cedula=CEDULA,
            dias=dias,
            parametros=PlanConfirmarParametros(
                nivel_riesgo_arl="III", factor_prestacional=0.52436,
                salario_base_mensual=3_000_000, valor_hora_ordinaria=12_500,
                jornada_nocturna=False,
            ),
        )],
    )

    response = await confirmar_plan(db_session, payload)

    costo = await db_session.scalar(select(NominaCostoOt).where(
        NominaCostoOt.ot_id == 9403,
        NominaCostoOt.anio == 2026,
        NominaCostoOt.semana_iso == 29,
    ))
    assert response.resumen.ok_count == 1
    assert costo is not None
    assert costo.total_horas_hf == response.resumen.total_horas_festivas
    assert costo.total_horas_hefd == 1.0
    detalles = (await db_session.execute(select(NominaCalculoSemanalDetalle).where(
        NominaCalculoSemanalDetalle.calculo_id == response.calculos[0].calculo_id,
        NominaCalculoSemanalDetalle.codigo_novedad.in_(["HF", "HEFD"]),
    ))).scalars().all()
    assert costo.total_valor_bruto == sum(d.valor_bruto for d in detalles)
    assert costo.total_carga_prestacional == sum(d.carga_prestacional for d in detalles)
    assert costo.total_costo_empresa == sum(d.costo_total for d in detalles)
    assert costo.calculo_ids == [response.calculos[0].calculo_id]
    assert costo.total_empleados == 1
    cabecera = await db_session.get(NominaCalculoSemanal, response.calculos[0].calculo_id)
    assert cabecera.total_horas_extras == response.resumen.total_horas_extras

    snapshot_hf = await db_session.scalar(select(NominaCalculoDiarioDetalle).where(
        NominaCalculoDiarioDetalle.calculo_id == response.calculos[0].calculo_id,
        NominaCalculoDiarioDetalle.codigo_calculado == "HF",
    ))
    snapshot_hf.valor_bruto += 1
    await db_session.flush()
    with pytest.raises(ValueError, match="integridad"):
        await transicionar_calculo(
            db_session,
            response.calculos[0].calculo_id,
            "ANULADO",
            "Snapshot alterado",
            "TEST-S8",
        )
    await db_session.rollback()

    await db_session.execute(delete(NominaCalculoDiarioDetalle).where(
        NominaCalculoDiarioDetalle.calculo_id == response.calculos[0].calculo_id,
        NominaCalculoDiarioDetalle.dia_semana == 7,
    ))
    await db_session.flush()
    with pytest.raises(ValueError, match="incompleto"):
        await transicionar_calculo(
            db_session,
            response.calculos[0].calculo_id,
            "ANULADO",
            "Snapshot incompleto",
            "TEST-S8",
        )
    await db_session.rollback()

    await db_session.execute(delete(NominaPlanificadorDiaOt).where(
        NominaPlanificadorDiaOt.cedula == CEDULA,
        NominaPlanificadorDiaOt.anio == 2026,
        NominaPlanificadorDiaOt.semana_iso == 29,
    ))
    await db_session.flush()

    await transicionar_calculo(
        db_session,
        response.calculos[0].calculo_id,
        "ANULADO",
        "Regresión reversión OT festiva",
        "TEST-S8",
    )
    await db_session.commit()
    await db_session.refresh(costo)
    assert costo.total_horas_hf == 0
    assert costo.total_horas_hefd == 0
    assert costo.total_valor_bruto == 0
    assert costo.total_carga_prestacional == 0
    assert costo.total_costo_empresa == 0
    assert costo.calculo_ids == []
    assert costo.total_empleados == 0
    await _cleanup(db_session)


@pytest.mark.asyncio
async def test_anulacion_concurrente_ot_unica_revierte_hf_una_sola_vez(db_session):
    await _cleanup(db_session)
    payload = PreLiquidacionConfirmar(
        cedula=CEDULA,
        anio=2026,
        semana_iso=29,
        fecha_inicio=date(2026, 7, 13),
        fecha_fin=date(2026, 7, 19),
        nivel_riesgo_arl="III",
        factor_prestacional=0.52436,
        salario_base_mensual=3_000_000,
        valor_hora_ordinaria=12_500,
        detalles=[
            ConfirmarDetalleItem(
                codigo_novedad="HF", horas=8, factor_hora_ordinaria=1.8,
                valor_bruto=180_000, carga_prestacional=94_385,
                costo_total=274_385,
            ),
            ConfirmarDetalleItem(
                codigo_novedad="HEFD", horas=1, factor_hora_ordinaria=2.05,
                valor_bruto=25_625, carga_prestacional=13_437,
                costo_total=39_062,
            ),
        ],
        ot_id=9406,
        ot_codigo="9406",
        usuario_confirma="TEST-S8",
    )
    creado = await confirmar_pre_liquidacion(db_session, payload)
    engine = create_async_engine(config.database_url, poolclass=NullPool)
    fabrica = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def anular():
        async with fabrica() as session:
            try:
                await transicionar_calculo(
                    session, creado["calculo_id"], "ANULADO", "Prueba concurrente", "TEST-S8"
                )
                await session.commit()
                return "ok"
            except ValueError:
                await session.rollback()
                return "rechazada"

    try:
        resultados = await asyncio.gather(anular(), anular())
        assert sorted(resultados) == ["ok", "rechazada"]
        await db_session.rollback()
        costo = await db_session.scalar(select(NominaCostoOt).where(
            NominaCostoOt.ot_id == 9406,
            NominaCostoOt.anio == 2026,
            NominaCostoOt.semana_iso == 29,
        ))
        eventos = (await db_session.execute(select(NominaCalculoWorkflowEvento).where(
            NominaCalculoWorkflowEvento.calculo_id == creado["calculo_id"],
            NominaCalculoWorkflowEvento.estado_destino == "ANULADO",
        ))).scalars().all()
        assert costo.total_horas == 0
        assert costo.total_horas_hf == 0
        assert costo.total_horas_hefd == 0
        assert costo.total_valor_bruto == 0
        assert costo.total_carga_prestacional == 0
        assert costo.total_costo_empresa == 0
        assert len(eventos) == 1
    finally:
        await engine.dispose()
        await _cleanup(db_session)


@pytest.mark.asyncio
async def test_confirmaciones_concurrentes_misma_ot_conservan_totales(db_session):
    await _cleanup(db_session)
    engine = create_async_engine(config.database_url, poolclass=NullPool)
    fabrica = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    def payload(cedula: str) -> PreLiquidacionConfirmar:
        return PreLiquidacionConfirmar(
            cedula=cedula,
            anio=2026,
            semana_iso=28,
            fecha_inicio=date(2026, 7, 6),
            fecha_fin=date(2026, 7, 12),
            nivel_riesgo_arl="III",
            factor_prestacional=0.52436,
            salario_base_mensual=3_000_000,
            valor_hora_ordinaria=12_500,
            detalles=[ConfirmarDetalleItem(
                codigo_novedad="HED", horas=1, factor_hora_ordinaria=1.25,
                valor_bruto=15_625, carga_prestacional=8_193,
                costo_total=23_818,
            )],
            ot_id=9406,
            ot_codigo="9406",
            usuario_confirma="TEST-S8",
        )

    async def confirmar(cedula: str):
        async with fabrica() as session:
            return await confirmar_pre_liquidacion(session, payload(cedula))

    try:
        resultados = await asyncio.gather(confirmar(CEDULA), confirmar(CEDULA_SEGUNDA))
        await db_session.rollback()
        costo = await db_session.scalar(select(NominaCostoOt).where(
            NominaCostoOt.ot_id == 9406,
            NominaCostoOt.anio == 2026,
            NominaCostoOt.semana_iso == 28,
        ))
        assert costo.total_horas == 2
        assert costo.total_valor_bruto == 31_250
        assert costo.total_carga_prestacional == 16_386
        assert costo.total_costo_empresa == 47_636
        assert costo.total_empleados == 2
        assert sorted(costo.calculo_ids) == sorted(r["calculo_id"] for r in resultados)

        async def anular(calculo_id: int):
            async with fabrica() as session:
                await transicionar_calculo(
                    session, calculo_id, "ANULADO", "Anulacion concurrente", "TEST-S8"
                )
                await session.commit()

        await asyncio.gather(*(anular(r["calculo_id"]) for r in resultados))
        await db_session.rollback()
        costo = await db_session.scalar(select(NominaCostoOt).where(
            NominaCostoOt.ot_id == 9406,
            NominaCostoOt.anio == 2026,
            NominaCostoOt.semana_iso == 28,
        ))
        assert costo.total_horas == 0
        assert costo.total_costo_empresa == 0
        assert costo.total_empleados == 0
        assert costo.calculo_ids == []
    finally:
        await engine.dispose()
        await _cleanup(db_session)
