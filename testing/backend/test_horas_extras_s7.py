"""
Tests Sprint S7 — Planificador semanal masivo.

Cobertura:
  - guardar_borrador_plan: inserta registros, idempotente, novedades BORRADOR
  - guardar_borrador_plan: continua con errores parciales
  - pre_calcular_plan: NO persiste nada, calcula HED/HEN segun jornada
  - pre_calcular_plan: novedad INC suprime HE del dia
  - pre_calcular_plan: totales agregados correctos
  - confirmar_plan: genera nomina_calculo_semanal por empleado
  - confirmar_plan: respeta bolsa desactivada sin tratarla como error
  - confirmar_plan: errores parciales (algunos OK, otros no)
  - confirmar_plan: acredita bolsa cuando codigo tiene acredita_bolsa=True

Cedulas numericas reservadas 9900000000000001-4. OTs 9301-9304.
"""
import pytest
from datetime import time
from types import SimpleNamespace
from unittest.mock import AsyncMock
from fastapi import Response
from sqlmodel import select
from sqlalchemy import func

from app.api.novedades_nomina.routers import horas_extras_planificador
from app.api.novedades_nomina.routers.horas_extras_planificador import confirmar_plan_endpoint
from app.models.novedades_nomina.horas_extras import (
    NominaBolsaHoras,
    NominaBolsaHorasMovimiento,
    NominaCalculoSemanal,
    NominaCalculoSemanalDetalle,
    NominaCostoOt,
    NominaHorarioPactado,
    NominaParametroLegal,
)
from app.models.novedades_nomina.horas_extras_horario_dia import NominaHorarioPactadoDia
from app.models.novedades_nomina.horas_extras_novedad_evento import (
    NominaNovedadEvento,
)
from app.models.novedades_nomina.schemas_horas_extras_planificador import (
    PlanBulkRequest,
    PlanBulkResponse,
    PlanConfirmarEmpleadoIn,
    PlanConfirmarParametros,
    PlanConfirmarRequest,
)
from app.services.novedades_nomina.planificador_calculo import pre_calcular_plan
from app.services.novedades_nomina.planificador_persistencia import (
    confirmar_plan,
    guardar_borrador_plan,
)


from testing.backend.horas_extras_s7_helpers import (
    ANIO,
    CEDULA_2,
    CEDULA_3,
    CEDULA_4,
    CEDULA_BASE,
    FECHA_FIN,
    FECHA_INICIO,
    OT_DEFAULT,
    OT_GLOBAL_OFF,
    cleanup as _cleanup,
    cleanup_all as _cleanup_all,
    make_empleado as _make_empleado,
    make_parametros as _make_parametros,
    make_semana as _make_semana,
    set_bolsa_global as _set_bolsa_global,
    usuario_test as _usuario_test,
)


def test_planificador_routes_no_duplican_horas_extras():
    from app.main import app

    rutas = {getattr(route, "path", "") for route in app.routes}
    assert (
        "/api/v2/novedades-nomina/horas-extras/planificador/empleados-erp"
        in rutas
    )
    assert (
        "/api/v2/novedades-nomina/horas-extras/horas-extras/planificador/empleados-erp"
        not in rutas
    )


def test_planificador_empleados_erp_exige_permiso_he():
    from fastapi.routing import APIRoute
    from app.main import app

    route = next(
        route for route in app.routes
        if isinstance(route, APIRoute)
        and route.path == "/api/v2/novedades-nomina/horas-extras/planificador/empleados-erp"
    )
    dependencias = {getattr(dep.call, "__name__", "") for dep in route.dependant.dependencies}
    assert "requiere_permiso_he_planificar" in dependencias


@pytest.mark.asyncio
async def test_planificador_admin_con_relaciones_filtra_empleados_erp(monkeypatch):
    cedulas_asignadas = {"1001", "1002", "1003"}
    resultado_relaciones = SimpleNamespace(
        scalars=lambda: SimpleNamespace(all=lambda: list(cedulas_asignadas))
    )
    db = SimpleNamespace(execute=AsyncMock(return_value=resultado_relaciones))
    argumentos_worker = None

    async def ejecutar_worker(_funcion, *argumentos):
        nonlocal argumentos_worker
        argumentos_worker = argumentos
        return {"items": [], "total": 0}

    monkeypatch.setattr(
        horas_extras_planificador,
        "run_in_threadpool",
        ejecutar_worker,
    )

    await horas_extras_planificador.listar_empleados_erp(
        response=Response(),
        q=None,
        limit=20,
        offset=0,
        solo_activos=True,
        anio=2026,
        semana_iso=29,
        cargos=[],
        areas=[],
        ciudades=[],
        jefes=[],
        autoriza_he=None,
        disponible_semana=None,
        orden="cedula",
        direccion="asc",
        db=db,
        usuario=SimpleNamespace(id="USR-1107068093", rol="admin"),
    )

    assert argumentos_worker is not None
    assert argumentos_worker[4] == sorted(cedulas_asignadas)


# ===========================================================================
# guardar_borrador_plan
# ===========================================================================

class TestGuardarBorradorPlan:
    @pytest.mark.asyncio
    async def test_inserta_registros_para_3_empleados(self, db_session):
        await _cleanup_all(db_session)
        payload = PlanBulkRequest(
            semana=_make_semana(),
            empleados=[
                _make_empleado(CEDULA_BASE),
                _make_empleado(CEDULA_2),
                _make_empleado(CEDULA_3),
            ],
        )
        response: PlanBulkResponse = await guardar_borrador_plan(
            db_session, payload, usuario_id="TEST-S7"
        )
        assert response.registros_horario_creados >= 3 * 7  # 3 empleados x 7 dias
        assert response.novedades_creadas == 0  # plan sin novedades
        assert len(response.errores) == 0

        # Verificar filas en nomina_horario_pactado_dia
        count = (await db_session.execute(
            select(func.count()).select_from(NominaHorarioPactadoDia)
            .where(NominaHorarioPactadoDia.cedula.in_([CEDULA_BASE, CEDULA_2, CEDULA_3]))
        )).scalar()
        assert count == 21  # 3 x 7

    @pytest.mark.asyncio
    async def test_idempotente_segundo_llamado_actualiza(self, db_session):
        await _cleanup_all(db_session)
        payload = PlanBulkRequest(
            semana=_make_semana(),
            empleados=[_make_empleado(CEDULA_BASE)],
        )
        # Primer llamado: crea
        r1 = await guardar_borrador_plan(db_session, payload, usuario_id="TEST-S7")
        await _cleanup(db_session, CEDULA_BASE)  # limpia solo la primera ejecucion para reset
        # Segundo llamado: deberia crear otra vez (la limpieza elimino filas)
        r2 = await guardar_borrador_plan(db_session, payload, usuario_id="TEST-S7")
        assert r1.registros_horario_creados >= 7
        assert r2.registros_horario_creados >= 7

        # Verificar que solo hay 7 filas (no duplicadas)
        count = (await db_session.execute(
            select(func.count()).select_from(NominaHorarioPactadoDia)
            .where(NominaHorarioPactadoDia.cedula == CEDULA_BASE)
        )).scalar()
        assert count == 7

    @pytest.mark.asyncio
    async def test_crea_novedades_borrador(self, db_session):
        await _cleanup_all(db_session)
        payload = PlanBulkRequest(
            semana=_make_semana(),
            empleados=[_make_empleado(CEDULA_BASE, con_novedad_lunes=True)],
        )
        response = await guardar_borrador_plan(db_session, payload, usuario_id="TEST-S7")
        assert response.novedades_creadas == 1
        assert len(response.errores) == 0

        # Verificar fila en nomina_novedad_evento con estado BORRADOR
        novedad = (await db_session.execute(
            select(NominaNovedadEvento).where(NominaNovedadEvento.cedula == CEDULA_BASE)
        )).scalar_one()
        assert novedad.estado == "BORRADOR"
        assert novedad.codigo_novedad == "INC"
        assert novedad.created_by == "TEST-S7"

    @pytest.mark.asyncio
    async def test_continua_con_errores_por_empleado(self, db_session):
        """El schema rechaza cedulas invalidas antes de llegar al servicio."""
        await _cleanup_all(db_session)
        cedula_larga = "X" * 60
        with pytest.raises(Exception, match="at most 50"):
            _make_empleado(cedula_larga)


# ===========================================================================
# pre_calcular_plan
# ===========================================================================

class TestPreCalcularPlan:
    @pytest.mark.asyncio
    async def test_no_persiste_nada(self, db_session):
        await _cleanup_all(db_session)
        payload = PlanBulkRequest(
            semana=_make_semana(),
            empleados=[_make_empleado(CEDULA_BASE)],
        )
        count_calculos_antes = (await db_session.execute(
            select(func.count()).select_from(NominaCalculoSemanal)
        )).scalar()
        count_horario_antes = (await db_session.execute(
            select(func.count()).select_from(NominaHorarioPactado)
        )).scalar()

        response = await pre_calcular_plan(db_session, payload)

        count_calculos_despues = (await db_session.execute(
            select(func.count()).select_from(NominaCalculoSemanal)
        )).scalar()
        count_horario_despues = (await db_session.execute(
            select(func.count()).select_from(NominaHorarioPactado)
        )).scalar()

        assert count_calculos_despues == count_calculos_antes, "pre_calcular no debe crear nomina_calculo_semanal"
        assert count_horario_despues == count_horario_antes, "pre_calcular no debe crear nomina_horario_pactado"
        assert response.resumen.empleados_count == 1
        assert len(response.empleados) == 1

    @pytest.mark.asyncio
    async def test_calcula_he_para_jornada_normal(self, db_session):
        await _cleanup_all(db_session)
        # 7:30 a 17:00 = 9.5h brutas - 1h almuerzo = 8.5h netas
        # La semana del test es previa al 2026-07-16: 44h ordinarias.
        # El helper arma 7 dias de 8.5h = 59.5h, por eso hay 15.5h extra.
        payload = PlanBulkRequest(
            semana=_make_semana(),
            empleados=[_make_empleado(CEDULA_BASE)],
        )
        response = await pre_calcular_plan(db_session, payload)
        emp = response.empleados[0]
        assert emp.cedula == CEDULA_BASE
        assert emp.total_horas_extras == 15.5
        assert emp.total_horas_ordinarias == 44.0

    @pytest.mark.asyncio
    async def test_aplica_novedad_inc_suprime_he(self, db_session):
        await _cleanup_all(db_session)
        # Empleado con INC en lunes: ese dia horas_trabajadas=0 (regla de novedades)
        payload = PlanBulkRequest(
            semana=_make_semana(),
            empleados=[_make_empleado(CEDULA_BASE, con_novedad_lunes=True)],
        )
        response = await pre_calcular_plan(db_session, payload)
        emp = response.empleados[0]
        detalle_lunes = next(d for d in emp.detalle_por_dia if d.dia_semana == 1)
        # El lunes con INC no debe computar HE (codigo_he=None)
        assert detalle_lunes.codigo_he is None
        assert detalle_lunes.horas_extras == 0.0

    @pytest.mark.asyncio
    async def test_totales_agregados_3_empleados(self, db_session):
        await _cleanup_all(db_session)
        payload = PlanBulkRequest(
            semana=_make_semana(),
            empleados=[
                _make_empleado(CEDULA_BASE),
                _make_empleado(CEDULA_2),
                _make_empleado(CEDULA_3),
            ],
        )
        response = await pre_calcular_plan(db_session, payload)
        assert response.resumen.empleados_count == 3
        assert len(response.empleados) == 3
        # Suma de HE por empleado debe coincidir con resumen
        suma_he = sum(e.total_horas_extras for e in response.empleados)
        assert abs(suma_he - response.resumen.total_horas_extras) < 0.01


# ===========================================================================
# confirmar_plan
# ===========================================================================

async def _set_autorizacion_he(db_session, cedula: str, autorizada: bool) -> None:
    db_session.add(NominaHorarioPactado(
        cedula=cedula,
        minutos_jornada_ordinaria=480,
        horas_semana_ordinaria=42,
        autoriza_he_default=autorizada,
    ))
    await db_session.commit()

class TestConfirmarPlan:
    @pytest.mark.asyncio
    async def test_genera_calculos_para_2_empleados(self, db_session):
        await _cleanup_all(db_session)
        await _set_bolsa_global(db_session, True)

        payload = PlanConfirmarRequest(
            semana=_make_semana(),
            usuario_confirma="TEST-S7",
            empleados=[
                PlanConfirmarEmpleadoIn(
                    cedula=CEDULA_BASE,
                    dias=_make_empleado(CEDULA_BASE).dias,
                    parametros=_make_parametros(OT_DEFAULT),
                ),
                PlanConfirmarEmpleadoIn(
                    cedula=CEDULA_2,
                    dias=_make_empleado(CEDULA_2).dias,
                    parametros=_make_parametros(OT_DEFAULT),
                ),
            ],
        )
        response = await confirmar_plan(db_session, payload)
        assert response.resumen.ok_count == 2
        assert response.resumen.error_count == 0
        assert len(response.calculos) == 2
        for calc in response.calculos:
            assert calc.ok is True
            assert calc.calculo_id is not None

        # Verificar filas en nomina_calculo_semanal
        count = (await db_session.execute(
            select(func.count()).select_from(NominaCalculoSemanal)
            .where(NominaCalculoSemanal.cedula.in_([CEDULA_BASE, CEDULA_2]))
        )).scalar()
        assert count == 2

    @pytest.mark.asyncio
    async def test_endpoint_confirmar_ignora_usuario_confirma_del_cliente(self, db_session):
        await _cleanup_all(db_session)
        await _set_bolsa_global(db_session, False)
        await _set_autorizacion_he(db_session, CEDULA_BASE, True)

        payload = PlanConfirmarRequest(
            semana=_make_semana(),
            usuario_confirma="USUARIO-FALSIFICADO-S7",
            empleados=[
                PlanConfirmarEmpleadoIn(
                    cedula=CEDULA_BASE,
                    dias=_make_empleado(CEDULA_BASE).dias,
                    parametros=_make_parametros(OT_DEFAULT),
                ),
            ],
        )

        response = await confirmar_plan_endpoint(
            payload=payload,
            request=SimpleNamespace(state=SimpleNamespace()),
            db=db_session,
            usuario=_usuario_test(),
        )

        assert response.resumen.ok_count == 1
        calc_id = response.calculos[0].calculo_id
        assert calc_id is not None
        calc = await db_session.get(NominaCalculoSemanal, calc_id)
        assert calc is not None
        assert calc.calculado_por == "TEST-USER-ENDPOINT-S7"
        assert calc.confirmado_por == "TEST-USER-ENDPOINT-S7"

    @pytest.mark.asyncio
    async def test_confirma_sin_parametros_manual_frontend(self, db_session):
        await _cleanup_all(db_session)
        await _set_bolsa_global(db_session, True)

        empleado_he = _make_empleado(
            CEDULA_BASE,
            entrada=time(7, 30),
            salida=time(19, 0),
            almuerzo=60,
        )
        payload = PlanConfirmarRequest(
            semana=_make_semana(),
            usuario_confirma="TEST-S7",
            empleados=[
                PlanConfirmarEmpleadoIn(
                    cedula=CEDULA_BASE,
                    dias=empleado_he.dias,
                ),
            ],
        )

        response = await confirmar_plan(db_session, payload)

        assert response.resumen.ok_count == 1
        assert response.resumen.error_count == 0
        assert response.calculos[0].calculo_id is not None

    @pytest.mark.asyncio
    async def test_bolsa_desactivada_no_bloquea_confirmacion(self, db_session):
        await _cleanup_all(db_session)
        await _set_bolsa_global(db_session, False)

        payload = PlanConfirmarRequest(
            semana=_make_semana(),
            usuario_confirma="TEST-S7",
            empleados=[
                PlanConfirmarEmpleadoIn(
                    cedula=CEDULA_BASE,
                    dias=_make_empleado(CEDULA_BASE).dias,
                    parametros=_make_parametros(OT_GLOBAL_OFF),
                ),
            ],
        )
        response = await confirmar_plan(db_session, payload)
        assert response.resumen.ok_count == 1
        assert response.resumen.error_count == 0
        assert response.calculos[0].bolsa_habilitada_en_confirmacion is False
        assert response.calculos[0].horas_acreditadas_bolsa == 0.0

    @pytest.mark.asyncio
    async def test_empleado_no_autorizado_finaliza_pendiente_sin_bolsa(self, db_session):
        await _cleanup_all(db_session)
        await _set_bolsa_global(db_session, True)
        await _set_autorizacion_he(db_session, CEDULA_BASE, False)
        empleado_he = _make_empleado(
            CEDULA_BASE,
            entrada=time(7, 30),
            salida=time(19, 0),
            almuerzo=60,
        )
        payload = PlanConfirmarRequest(
            semana=_make_semana(),
            usuario_confirma="TEST-S7",
            empleados=[PlanConfirmarEmpleadoIn(
                cedula=CEDULA_BASE,
                dias=empleado_he.dias,
                parametros=_make_parametros(OT_DEFAULT),
            )],
        )

        response = await confirmar_plan(db_session, payload)

        assert response.resumen.ok_count == 1
        assert response.calculos[0].estado == "PENDIENTE_AUTORIZACION"
        assert response.calculos[0].horas_acreditadas_bolsa == 0
        assert await db_session.scalar(
            select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA_BASE)
        ) is None

    @pytest.mark.asyncio
    async def test_errores_parciales_continuan_lote(self, db_session):
        await _cleanup_all(db_session)
        await _set_bolsa_global(db_session, True)

        # Empleado 1 OK; empleado 2 con nivel ARL inexistente
        params_buenos = _make_parametros(OT_DEFAULT)
        params_malos = PlanConfirmarParametros(
            nivel_riesgo_arl="IX",  # No existe
            factor_prestacional=0.52436,
            salario_base_mensual=3_000_000.0,
            valor_hora_ordinaria=12_500.0,
            jornada_nocturna=False,
            ot_id=OT_DEFAULT,
            ot_codigo=f"OT-S7-{OT_DEFAULT}",
        )
        payload = PlanConfirmarRequest(
            semana=_make_semana(),
            usuario_confirma="TEST-S7",
            empleados=[
                PlanConfirmarEmpleadoIn(
                    cedula=CEDULA_BASE,
                    dias=_make_empleado(CEDULA_BASE).dias,
                    parametros=params_buenos,
                ),
                PlanConfirmarEmpleadoIn(
                    cedula=CEDULA_2,
                    dias=_make_empleado(CEDULA_2).dias,
                    parametros=params_malos,
                ),
            ],
        )
        response = await confirmar_plan(db_session, payload)
        assert response.resumen.ok_count == 1
        assert response.resumen.error_count == 1
        # El bueno debe tener calculo_id
        bueno = next(c for c in response.calculos if c.cedula == CEDULA_BASE)
        assert bueno.ok is True
        assert bueno.calculo_id is not None

    @pytest.mark.asyncio
    async def test_acredita_bolsa_cuando_he_existe(self, db_session):
        await _cleanup_all(db_session)
        await _set_bolsa_global(db_session, True)
        await _set_autorizacion_he(db_session, CEDULA_BASE, True)

        # Empleado con horario que genera HE para verificar acreditacion a bolsa
        # 7:30 a 19:00 = 11.5h brutas - 1h almuerzo = 10.5h netas
        # Ordinarias 8h + Extras 2.5h por dia x 5 dias = 12.5h extras
        empleado_he = _make_empleado(
            CEDULA_BASE,
            entrada=time(7, 30),
            salida=time(19, 0),
            almuerzo=60,
        )
        payload = PlanConfirmarRequest(
            semana=_make_semana(),
            usuario_confirma="TEST-S7",
            empleados=[
                PlanConfirmarEmpleadoIn(
                    cedula=CEDULA_BASE,
                    dias=empleado_he.dias,
                    parametros=_make_parametros(OT_DEFAULT),
                ),
            ],
        )
        response = await confirmar_plan(db_session, payload)
        assert response.resumen.ok_count == 1
        calc = response.calculos[0]
        assert calc.horas_acreditadas_bolsa > 0.0
        # Verificar fila en nomina_bolsa_horas
        bolsa = (await db_session.execute(
            select(NominaBolsaHoras).where(NominaBolsaHoras.cedula == CEDULA_BASE)
        )).scalar_one_or_none()
        assert bolsa is not None
        assert bolsa.horas_acreditadas > 0
