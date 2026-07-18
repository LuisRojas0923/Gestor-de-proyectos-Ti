"""Regresiones de festivos en el planificador semanal."""
from datetime import date, time

import pytest
from pydantic import ValidationError
from sqlmodel import select

from app.models.novedades_nomina.horas_extras import (
    NominaCalculoSemanalDetalle,
    NominaHorarioPactado,
)
from app.models.novedades_nomina.horas_extras_diario import NominaCalculoDiarioDetalle
from app.models.novedades_nomina.horas_extras_novedad_evento import NominaNovedadEvento
from app.models.novedades_nomina.schemas_horas_extras_planificador import (
    PlanBulkRequest,
    PlanConfirmarEmpleadoIn,
    PlanConfirmarRequest,
    PlanDiaIn,
    PlanEmpleadoInBase,
    PlanNovedadIn,
    PlanSemanaIn,
)
from app.services.novedades_nomina.planificador_calculo import pre_calcular_plan
from app.services.novedades_nomina.planificador_persistencia import confirmar_plan
from testing.backend.horas_extras_s7_helpers import (
    CEDULA_BASE,
    OT_DEFAULT,
    cleanup_all,
    make_parametros,
    set_bolsa_global,
)


def _semana_festiva() -> PlanSemanaIn:
    return PlanSemanaIn(
        anio=2026,
        semana_iso=29,
        fecha_inicio=date(2026, 7, 13),
        fecha_fin=date(2026, 7, 19),
    )


def _empleado_semana_festiva(
    *,
    salida: time = time(16, 30),
    con_incapacidad: bool = False,
    dias_trabajados: int = 1,
    actividad: str | None = None,
) -> PlanEmpleadoInBase:
    dias = []
    for dia_semana in range(1, dias_trabajados + 1):
        fecha = date.fromisocalendar(2026, 29, dia_semana)
        dias.append(PlanDiaIn(
            dia_semana=dia_semana,
            hora_entrada=time(7, 30),
            hora_salida=salida,
            minutos_almuerzo=30,
            actividad=actividad if dia_semana == 1 else None,
            novedades=[PlanNovedadIn(
                codigo_novedad="INC",
                fecha_inicio=fecha,
                fecha_fin=fecha,
            )] if con_incapacidad and dia_semana == 1 else [],
        ))
    return PlanEmpleadoInBase(cedula=CEDULA_BASE, dias=dias)


class TestPreCalculoFestivo:
    @pytest.mark.asyncio
    async def test_propaga_fallo_inesperado_del_calendario(self, db_session, monkeypatch):
        async def fallar(*_args, **_kwargs):
            raise RuntimeError("calendario no disponible")

        monkeypatch.setattr(
            "app.services.novedades_nomina.planificador_calculo.cargar_festivos_semana",
            fallar,
        )
        with pytest.raises(RuntimeError, match="calendario no disponible"):
            await pre_calcular_plan(db_session, PlanBulkRequest(
                semana=_semana_festiva(),
                empleados=[_empleado_semana_festiva()],
            ))

    @pytest.mark.asyncio
    async def test_calcula_hf_para_13_julio_2026(self, db_session):
        await cleanup_all(db_session)
        response = await pre_calcular_plan(db_session, PlanBulkRequest(
            semana=_semana_festiva(),
            empleados=[_empleado_semana_festiva()],
        ))

        lunes = response.empleados[0].detalle_por_dia[0]
        assert lunes.es_festivo is True
        assert lunes.codigo_he == "HF"
        assert [(c.codigo, c.horas) for c in lunes.conceptos] == [("HF", 8.5)]
        assert lunes.costo_estimado > 0
        assert response.empleados[0].total_horas_extras == 0
        assert response.empleados[0].total_horas_festivas == 8.5
        assert response.resumen.total_costo_estimado > 0

    @pytest.mark.asyncio
    async def test_calcula_hf_y_hefd_cuando_festivo_tiene_exceso(self, db_session):
        await cleanup_all(db_session)
        response = await pre_calcular_plan(db_session, PlanBulkRequest(
            semana=_semana_festiva(),
            empleados=[_empleado_semana_festiva(
                salida=time(18, 0),
                dias_trabajados=5,
            )],
        ))

        lunes = response.empleados[0].detalle_por_dia[0]
        assert lunes.es_festivo is True
        assert [(c.codigo, c.horas) for c in lunes.conceptos] == [
            ("HF", lunes.horas_ordinarias),
            ("HEFD", lunes.horas_extras),
        ]

    @pytest.mark.asyncio
    async def test_incapacidad_prevalece_sobre_festivo(self, db_session):
        await cleanup_all(db_session)
        response = await pre_calcular_plan(db_session, PlanBulkRequest(
            semana=_semana_festiva(),
            empleados=[_empleado_semana_festiva(con_incapacidad=True)],
        ))

        lunes = response.empleados[0].detalle_por_dia[0]
        assert lunes.es_festivo is True
        assert lunes.horas_trabajadas == 0
        assert lunes.conceptos == []

    @pytest.mark.asyncio
    async def test_precalculo_nocturno_emite_hefn(self, db_session):
        await cleanup_all(db_session)
        db_session.add(NominaHorarioPactado(
            cedula=CEDULA_BASE,
            minutos_jornada_ordinaria=480,
            horas_semana_ordinaria=44,
            es_jornada_nocturna=True,
            autoriza_he_default=True,
        ))
        await db_session.commit()
        response = await pre_calcular_plan(db_session, PlanBulkRequest(
            semana=_semana_festiva(),
            empleados=[_empleado_semana_festiva(
                salida=time(18, 0),
                dias_trabajados=5,
            )],
        ))

        codigos = [c.codigo for c in response.empleados[0].detalle_por_dia[0].conceptos]
        assert codigos == ["HF", "HEFN"]

    @pytest.mark.asyncio
    async def test_semana_iso_entre_anios_carga_anio_nuevo(self, db_session):
        await cleanup_all(db_session)
        semana = PlanSemanaIn(
            anio=2026,
            semana_iso=1,
            fecha_inicio=date(2025, 12, 29),
            fecha_fin=date(2026, 1, 4),
        )
        empleado = PlanEmpleadoInBase(cedula=CEDULA_BASE, dias=[PlanDiaIn(
            dia_semana=4,
            hora_entrada=time(8, 0),
            hora_salida=time(16, 30),
            minutos_almuerzo=30,
        )])

        response = await pre_calcular_plan(
            db_session,
            PlanBulkRequest(semana=semana, empleados=[empleado]),
        )

        jueves = response.empleados[0].detalle_por_dia[3]
        assert jueves.es_festivo is True
        assert jueves.codigo_he == "HF"


class TestConfirmacionFestiva:
    @pytest.mark.asyncio
    async def test_confirma_actividad_diaria_en_snapshot(self, db_session):
        await cleanup_all(db_session)
        await set_bolsa_global(db_session, False)
        empleado = _empleado_semana_festiva(
            actividad="Instalacion de evaporador en cuarto frio",
        )

        response = await confirmar_plan(db_session, PlanConfirmarRequest(
            semana=_semana_festiva(),
            usuario_confirma="TEST-S7",
            empleados=[PlanConfirmarEmpleadoIn(
                cedula=CEDULA_BASE,
                dias=empleado.dias,
                parametros=make_parametros(OT_DEFAULT),
            )],
        ))

        diario = await db_session.scalar(select(NominaCalculoDiarioDetalle).where(
            NominaCalculoDiarioDetalle.calculo_id == response.calculos[0].calculo_id,
            NominaCalculoDiarioDetalle.dia_semana == 1,
        ))
        assert diario.observaciones == "Instalacion de evaporador en cuarto frio"

    @pytest.mark.asyncio
    async def test_confirmacion_ignora_novedad_no_confirmada_del_payload(self, db_session):
        await cleanup_all(db_session)
        await set_bolsa_global(db_session, False)
        empleado = _empleado_semana_festiva(con_incapacidad=True)

        response = await confirmar_plan(db_session, PlanConfirmarRequest(
            semana=_semana_festiva(),
            usuario_confirma="TEST-S7",
            empleados=[PlanConfirmarEmpleadoIn(
                cedula=CEDULA_BASE,
                dias=empleado.dias,
                parametros=make_parametros(OT_DEFAULT),
            )],
        ))

        detalles = (await db_session.execute(select(NominaCalculoSemanalDetalle).where(
            NominaCalculoSemanalDetalle.calculo_id == response.calculos[0].calculo_id,
        ))).scalars().all()
        assert [detalle.codigo_novedad for detalle in detalles] == ["HF"]

    @pytest.mark.asyncio
    async def test_confirmacion_aplica_novedad_oficial_aunque_no_venga_en_payload(self, db_session):
        await cleanup_all(db_session)
        await set_bolsa_global(db_session, False)
        db_session.add(NominaNovedadEvento(
            cedula=CEDULA_BASE,
            codigo_novedad="INC",
            fecha_inicio=date(2026, 7, 13),
            fecha_fin=date(2026, 7, 13),
            estado="CONFIRMADO",
            confirmado_by="TEST-S7",
        ))
        await db_session.commit()
        empleado = _empleado_semana_festiva()

        response = await confirmar_plan(db_session, PlanConfirmarRequest(
            semana=_semana_festiva(),
            usuario_confirma="TEST-S7",
            empleados=[PlanConfirmarEmpleadoIn(
                cedula=CEDULA_BASE,
                dias=empleado.dias,
                parametros=make_parametros(OT_DEFAULT),
            )],
        ))

        assert response.calculos == []
        assert response.resumen.error_count == 1

    @pytest.mark.asyncio
    async def test_confirma_hf_y_trazabilidad_del_13_julio_2026(self, db_session):
        await cleanup_all(db_session)
        await set_bolsa_global(db_session, False)
        empleado = _empleado_semana_festiva()
        response = await confirmar_plan(db_session, PlanConfirmarRequest(
            semana=_semana_festiva(),
            usuario_confirma="TEST-S7",
            empleados=[PlanConfirmarEmpleadoIn(
                cedula=CEDULA_BASE,
                dias=empleado.dias,
                parametros=make_parametros(OT_DEFAULT),
            )],
        ))

        assert response.resumen.ok_count == 1
        assert response.resumen.total_horas_extras == 0
        assert response.resumen.total_horas_festivas == 8.5
        calculo_id = response.calculos[0].calculo_id
        detalle = await db_session.scalar(select(NominaCalculoSemanalDetalle).where(
            NominaCalculoSemanalDetalle.calculo_id == calculo_id,
            NominaCalculoSemanalDetalle.codigo_novedad == "HF",
        ))
        assert detalle is not None
        assert detalle.horas == 8.5
        diario = await db_session.scalar(select(NominaCalculoDiarioDetalle).where(
            NominaCalculoDiarioDetalle.calculo_id == calculo_id,
            NominaCalculoDiarioDetalle.dia_semana == 1,
            NominaCalculoDiarioDetalle.codigo_calculado == "HF",
        ))
        assert diario is not None
        assert diario.es_festivo is True

    @pytest.mark.asyncio
    async def test_confirma_hefn_en_festivo_nocturno(self, db_session):
        await cleanup_all(db_session)
        await set_bolsa_global(db_session, False)
        empleado = _empleado_semana_festiva(salida=time(18, 0), dias_trabajados=5)
        parametros = make_parametros(OT_DEFAULT).model_copy(
            update={"jornada_nocturna": True}
        )
        response = await confirmar_plan(db_session, PlanConfirmarRequest(
            semana=_semana_festiva(),
            usuario_confirma="TEST-S7",
            empleados=[PlanConfirmarEmpleadoIn(
                cedula=CEDULA_BASE,
                dias=empleado.dias,
                parametros=parametros,
            )],
        ))

        calculo_id = response.calculos[0].calculo_id
        detalle = await db_session.scalar(select(NominaCalculoSemanalDetalle).where(
            NominaCalculoSemanalDetalle.calculo_id == calculo_id,
            NominaCalculoSemanalDetalle.codigo_novedad == "HEFN",
        ))
        assert detalle is not None


def test_rechaza_fechas_incoherentes_con_semana_iso():
    with pytest.raises(ValidationError, match="semana ISO"):
        PlanSemanaIn(
            anio=2026,
            semana_iso=29,
            fecha_inicio=date(2026, 7, 14),
            fecha_fin=date(2026, 7, 20),
        )


def test_rechaza_dias_duplicados_en_plan_empleado():
    dia = PlanDiaIn(dia_semana=1, hora_entrada=time(7, 30), hora_salida=time(17, 0))
    with pytest.raises(ValidationError, match="días de semana duplicados"):
        PlanEmpleadoInBase(cedula=CEDULA_BASE, dias=[dia, dia])
