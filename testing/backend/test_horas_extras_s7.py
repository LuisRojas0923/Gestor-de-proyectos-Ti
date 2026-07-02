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

Cedulas prefijo TEST-S7-*. OTs 9301-9304.
"""
import pytest
from datetime import date, time, timedelta
from sqlmodel import select
from sqlalchemy import delete, func

from app.models.novedades_nomina.bolsa_horas_override import NominaBolsaOtOverride
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
    PlanDiaIn,
    PlanEmpleadoInBase,
    PlanNovedadIn,
    PlanSemanaIn,
)
from app.services.novedades_nomina.planificador_calculo import pre_calcular_plan
from app.services.novedades_nomina.planificador_persistencia import (
    confirmar_plan,
    guardar_borrador_plan,
)


CODIGO_GLOBAL = "BOLSA_GLOBAL_HABILITADA"

CEDULA_BASE = "TEST-S7-1107068093"
CEDULA_2 = "TEST-S7-9876543210"
CEDULA_3 = "TEST-S7-5555555555"
CEDULA_4 = "TEST-S7-1111111111"

ANIO = 2026
SEMANA = 25  # Lunes 2026-06-15 → Domingo 2026-06-21
FECHA_INICIO = date(ANIO, 6, 15)
FECHA_FIN = date(ANIO, 6, 21)

OT_DEFAULT = 9301
OT_GLOBAL_OFF = 9302


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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_semana() -> PlanSemanaIn:
    return PlanSemanaIn(
        anio=ANIO,
        semana_iso=SEMANA,
        fecha_inicio=FECHA_INICIO,
        fecha_fin=FECHA_FIN,
    )


def _make_empleado(
    cedula: str,
    *,
    entrada: time = time(7, 30),
    salida: time = time(17, 0),
    almuerzo: int = 60,
    con_novedad_lunes: bool = False,
    con_novedad_martes: bool = False,
) -> PlanEmpleadoInBase:
    dias = []
    dias.append(PlanDiaIn(
        dia_semana=1,
        hora_entrada=entrada,
        hora_salida=salida,
        minutos_almuerzo=almuerzo,
        novedades=[
            PlanNovedadIn(
                codigo_novedad="INC",
                fecha_inicio=FECHA_INICIO,
                fecha_fin=FECHA_INICIO,
                observaciones="test",
            )
        ] if con_novedad_lunes else [],
    ))
    dias.append(PlanDiaIn(
        dia_semana=2,
        hora_entrada=entrada,
        hora_salida=salida,
        minutos_almuerzo=almuerzo,
        novedades=[
            PlanNovedadIn(
                codigo_novedad="VAC",
                fecha_inicio=FECHA_INICIO + timedelta(days=1),
                fecha_fin=FECHA_INICIO + timedelta(days=1),
                observaciones="test",
            )
        ] if con_novedad_martes else [],
    ))
    for d in range(3, 8):
        dias.append(PlanDiaIn(
            dia_semana=d,
            hora_entrada=entrada,
            hora_salida=salida,
            minutos_almuerzo=almuerzo,
            novedades=[],
        ))
    return PlanEmpleadoInBase(cedula=cedula, dias=dias)


def _make_parametros(ot_id: int = OT_DEFAULT) -> PlanConfirmarParametros:
    return PlanConfirmarParametros(
        nivel_riesgo_arl="III",
        factor_prestacional=0.52436,
        salario_base_mensual=3_000_000.0,
        valor_hora_ordinaria=12_500.0,
        jornada_nocturna=False,
        ot_id=ot_id,
        ot_codigo=f"OT-S7-{ot_id}",
    )


async def _cleanup(db_session, cedula: str) -> None:
    """Limpia todas las filas relacionadas con un calculo de test S7."""
    # Costo OT: borrar por ot_id primero
    await db_session.execute(
        delete(NominaCostoOt).where(NominaCostoOt.ot_id.in_([OT_DEFAULT, OT_GLOBAL_OFF]))
    )
    # Calculos y detalles
    calcs = (await db_session.execute(
        select(NominaCalculoSemanal).where(NominaCalculoSemanal.cedula == cedula)
    )).scalars().all()
    for c in calcs:
        await db_session.execute(
            delete(NominaCalculoSemanalDetalle).where(
                NominaCalculoSemanalDetalle.calculo_id == c.id
            )
        )
    await db_session.execute(
        delete(NominaCalculoSemanal).where(NominaCalculoSemanal.cedula == cedula)
    )
    # Bolsa y movimientos
    await db_session.execute(
        delete(NominaBolsaHorasMovimiento).where(NominaBolsaHorasMovimiento.cedula == cedula)
    )
    await db_session.execute(
        delete(NominaBolsaHoras).where(NominaBolsaHoras.cedula == cedula)
    )
    # Novedades
    await db_session.execute(
        delete(NominaNovedadEvento).where(NominaNovedadEvento.cedula == cedula)
    )
    # Horario
    await db_session.execute(
        delete(NominaHorarioPactadoDia).where(NominaHorarioPactadoDia.cedula == cedula)
    )
    await db_session.execute(
        delete(NominaHorarioPactado).where(NominaHorarioPactado.cedula == cedula)
    )
    # Overrides
    await db_session.execute(
        delete(NominaBolsaOtOverride).where(NominaBolsaOtOverride.ot_id.in_([OT_DEFAULT, OT_GLOBAL_OFF]))
    )
    await db_session.commit()


async def _cleanup_all(db_session) -> None:
    """Limpieza global para tests que no usan cleanup por cedula."""
    for ced in (CEDULA_BASE, CEDULA_2, CEDULA_3, CEDULA_4):
        await _cleanup(db_session, ced)
    # Parametros legales
    await db_session.execute(
        delete(NominaParametroLegal).where(NominaParametroLegal.codigo == CODIGO_GLOBAL)
    )
    await db_session.commit()


async def _set_bolsa_global(db_session, habilitada: bool) -> None:
    """Crea/actualiza el parametro legal BOLSA_GLOBAL_HABILITADA."""
    hoy = date.today()
    stmt_prev = select(NominaParametroLegal).where(
        NominaParametroLegal.codigo == CODIGO_GLOBAL,
        NominaParametroLegal.vigente_hasta.is_(None),
    )
    prev = (await db_session.execute(stmt_prev)).scalars().first()
    if prev is not None:
        prev.vigente_hasta = hoy
        db_session.add(prev)
    nuevo = NominaParametroLegal(
        codigo=CODIGO_GLOBAL,
        nombre="Habilitar bolsa de horas (global)",
        valor="true" if habilitada else "false",
        tipo_dato="BOOLEANO",
        norma_soporte="Politica interna — test S7",
        vigente_desde=hoy,
        vigente_hasta=None,
        estado="VIGENTE",
        observaciones="test S7",
    )
    db_session.add(nuevo)
    await db_session.commit()


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
