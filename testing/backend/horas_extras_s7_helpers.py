"""Datos y limpieza compartidos por las pruebas del planificador S7."""
from datetime import date, time, timedelta

from sqlalchemy import delete
from sqlmodel import select

from app.models.auth.usuario import Usuario
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
from app.models.novedades_nomina.horas_extras_diario import NominaCalculoDiarioDetalle
from app.models.novedades_nomina.horas_extras_horario_dia import NominaHorarioPactadoDia
from app.models.novedades_nomina.horas_extras_novedad_evento import NominaNovedadEvento
from app.models.novedades_nomina.schemas_horas_extras_planificador import (
    PlanConfirmarParametros,
    PlanDiaIn,
    PlanEmpleadoInBase,
    PlanNovedadIn,
    PlanSemanaIn,
)

CODIGO_GLOBAL = "BOLSA_GLOBAL_HABILITADA"
CEDULA_BASE = "9900000000000001"
CEDULA_2 = "9900000000000002"
CEDULA_3 = "9900000000000003"
CEDULA_4 = "9900000000000004"
ANIO = 2026
SEMANA = 25
FECHA_INICIO = date(ANIO, 6, 15)
FECHA_FIN = date(ANIO, 6, 21)
OT_DEFAULT = 9301
OT_GLOBAL_OFF = 9302


def make_semana() -> PlanSemanaIn:
    return PlanSemanaIn(
        anio=ANIO,
        semana_iso=SEMANA,
        fecha_inicio=FECHA_INICIO,
        fecha_fin=FECHA_FIN,
    )


def make_empleado(
    cedula: str,
    *,
    entrada: time = time(7, 30),
    salida: time = time(17, 0),
    almuerzo: int = 60,
    con_novedad_lunes: bool = False,
    con_novedad_martes: bool = False,
) -> PlanEmpleadoInBase:
    dias = [
        PlanDiaIn(
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
        ),
        PlanDiaIn(
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
        ),
    ]
    dias.extend(
        PlanDiaIn(
            dia_semana=dia,
            hora_entrada=entrada,
            hora_salida=salida,
            minutos_almuerzo=almuerzo,
            novedades=[],
        )
        for dia in range(3, 8)
    )
    return PlanEmpleadoInBase(cedula=cedula, dias=dias)


def make_parametros(ot_id: int = OT_DEFAULT) -> PlanConfirmarParametros:
    return PlanConfirmarParametros(
        nivel_riesgo_arl="III",
        factor_prestacional=0.52436,
        salario_base_mensual=3_000_000.0,
        valor_hora_ordinaria=12_500.0,
        jornada_nocturna=False,
        ot_id=ot_id,
        ot_codigo=f"OT-S7-{ot_id}",
    )


def usuario_test() -> Usuario:
    return Usuario(
        id="TEST-USER-ENDPOINT-S7",
        cedula="TEST-USER-ENDPOINT-S7",
        hash_contrasena="hash-test",
        nombre="Usuario Test HE S7",
        rol="admin",
    )


async def cleanup(db_session, cedula: str) -> None:
    await db_session.execute(
        delete(NominaCostoOt).where(
            NominaCostoOt.ot_id.in_([OT_DEFAULT, OT_GLOBAL_OFF])
        )
    )
    calculos = (await db_session.execute(
        select(NominaCalculoSemanal).where(NominaCalculoSemanal.cedula == cedula)
    )).scalars().all()
    for calculo in calculos:
        await db_session.execute(
            delete(NominaCalculoDiarioDetalle).where(
                NominaCalculoDiarioDetalle.calculo_id == calculo.id
            )
        )
        await db_session.execute(
            delete(NominaCalculoSemanalDetalle).where(
                NominaCalculoSemanalDetalle.calculo_id == calculo.id
            )
        )
    await db_session.execute(
        delete(NominaCalculoSemanal).where(NominaCalculoSemanal.cedula == cedula)
    )
    await db_session.execute(
        delete(NominaBolsaHorasMovimiento).where(
            NominaBolsaHorasMovimiento.cedula == cedula
        )
    )
    await db_session.execute(
        delete(NominaBolsaHoras).where(NominaBolsaHoras.cedula == cedula)
    )
    await db_session.execute(
        delete(NominaNovedadEvento).where(NominaNovedadEvento.cedula == cedula)
    )
    await db_session.execute(
        delete(NominaHorarioPactadoDia).where(
            NominaHorarioPactadoDia.cedula == cedula
        )
    )
    await db_session.execute(
        delete(NominaHorarioPactado).where(NominaHorarioPactado.cedula == cedula)
    )
    await db_session.execute(
        delete(NominaBolsaOtOverride).where(
            NominaBolsaOtOverride.ot_id.in_([OT_DEFAULT, OT_GLOBAL_OFF])
        )
    )
    await db_session.commit()


async def cleanup_all(db_session) -> None:
    for cedula in (CEDULA_BASE, CEDULA_2, CEDULA_3, CEDULA_4):
        await cleanup(db_session, cedula)
    await db_session.execute(
        delete(NominaParametroLegal).where(NominaParametroLegal.codigo == CODIGO_GLOBAL)
    )
    await db_session.commit()


async def set_bolsa_global(db_session, habilitada: bool) -> None:
    hoy = date.today()
    existente = (await db_session.execute(
        select(NominaParametroLegal).where(NominaParametroLegal.codigo == CODIGO_GLOBAL)
    )).scalars().first()
    if existente is None:
        existente = NominaParametroLegal(
            codigo=CODIGO_GLOBAL,
            nombre="Habilitar bolsa de horas (global)",
            tipo_dato="BOOLEANO",
            norma_soporte="Politica interna - test S7",
        )
    existente.valor = "true" if habilitada else "false"
    existente.vigente_desde = hoy
    existente.vigente_hasta = None
    existente.estado = "VIGENTE"
    existente.observaciones = "test S7"
    db_session.add(existente)
    await db_session.commit()
