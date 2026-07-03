"""
Tests S8 — Asignacion de OT/centros de costo de M.O. por dia.
"""
from datetime import time

import pytest
from sqlalchemy import delete
from pydantic import ValidationError
from sqlmodel import select

from app.models.novedades_nomina.horas_extras import (
    NominaBolsaHoras,
    NominaBolsaHorasMovimiento,
    NominaCalculoSemanal,
    NominaCalculoSemanalDetalle,
    NominaCostoOt,
)
from app.models.novedades_nomina.planificador_dia_ot import NominaPlanificadorDiaOt
from app.models.novedades_nomina.schemas_horas_extras_planificador import (
    PlanAsignacionOtIn,
    PlanConfirmarEmpleadoIn,
    PlanConfirmarParametros,
    PlanConfirmarRequest,
    PlanDiaIn,
    PlanSemanaIn,
)
from app.services.erp.ordenes_trabajo_service import OrdenesTrabajoService
from app.services.novedades_nomina.planificador_persistencia import confirmar_plan
from app.services.novedades_nomina.planificador_ot import validar_asignaciones_ot_dia


CEDULA = "TEST-S8-OT-1107068093"
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
        select(NominaCalculoSemanal).where(NominaCalculoSemanal.cedula == CEDULA)
    )).scalars().all()
    for calc in calcs:
        await db_session.execute(
            delete(NominaCalculoSemanalDetalle).where(
                NominaCalculoSemanalDetalle.calculo_id == calc.id
            )
        )
    await db_session.execute(delete(NominaCalculoSemanal).where(NominaCalculoSemanal.cedula == CEDULA))
    await db_session.execute(delete(NominaBolsaHorasMovimiento).where(NominaBolsaHorasMovimiento.cedula == CEDULA))
    await db_session.execute(delete(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA))
    await db_session.execute(delete(NominaPlanificadorDiaOt).where(NominaPlanificadorDiaOt.cedula == CEDULA))
    await db_session.execute(delete(NominaCostoOt).where(NominaCostoOt.ot_id.in_([9401, 9402])))
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
            anio=ANIO,
            semana_iso=SEMANA,
            fecha_inicio="2026-06-22",
            fecha_fin="2026-06-28",
        ),
        usuario_confirma="TEST-S8",
        empleados=[
            PlanConfirmarEmpleadoIn(
                cedula=CEDULA,
                dias=[
                    dia,
                    PlanDiaIn(dia_semana=2, hora_entrada=time(7, 30), hora_salida=time(17, 0), minutos_almuerzo=60, novedades=[]),
                    PlanDiaIn(dia_semana=3, hora_entrada=time(7, 30), hora_salida=time(17, 0), minutos_almuerzo=60, novedades=[]),
                    PlanDiaIn(dia_semana=4, hora_entrada=time(7, 30), hora_salida=time(17, 0), minutos_almuerzo=60, novedades=[]),
                    PlanDiaIn(dia_semana=5, hora_entrada=time(7, 30), hora_salida=time(17, 0), minutos_almuerzo=60, novedades=[]),
                ],
                parametros=PlanConfirmarParametros(
                    nivel_riesgo_arl="III",
                    factor_prestacional=0.52436,
                    salario_base_mensual=3_000_000.0,
                    valor_hora_ordinaria=12_500.0,
                    jornada_nocturna=False,
                ),
            )
        ],
    )

    response = await confirmar_plan(db_session, payload)

    assert response.resumen.ok_count == 1
    costos = (await db_session.execute(
        select(NominaCostoOt).where(
            NominaCostoOt.anio == ANIO,
            NominaCostoOt.semana_iso == SEMANA,
            NominaCostoOt.ot_id.in_([9401, 9402]),
        ).order_by(NominaCostoOt.ot_id)
    )).scalars().all()
    assert [c.ot_codigo for c in costos] == ["9401", "9402"]
    assert round(sum(c.total_horas for c in costos), 2) == response.resumen.total_horas_extras
    assert costos[0].cc == "3080"
    assert costos[0].categoria_sub_indice == "MANO DE OBRA"
    assert costos[0].total_horas < costos[1].total_horas

    await _cleanup(db_session)
