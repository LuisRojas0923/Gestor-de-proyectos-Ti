"""Parciales legacy y normalización canónica del planificador."""
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text

from app.api.novedades_nomina.routers.horas_extras_planificador import (
    _aplicar_cedulas_canonicas,
)
from app.models.novedades_nomina.horas_extras_horario_dia import NominaHorarioPactadoDia
from app.models.novedades_nomina.schemas_horas_extras_planificador import PlanBulkRequest
from app.services.novedades_nomina.planificador_persistencia import guardar_borrador_plan
from app.services.erp import ordenes_trabajo_service
from testing.backend.horas_extras_s7_helpers import make_empleado, make_semana
from testing.backend.test_horarios_plantillas_service import _sesion_reversible


def test_aplica_identidades_canonicas_devuelta_por_autorizacion():
    empleados = [SimpleNamespace(cedula=" 1.007 "), SimpleNamespace(cedula="2008")]
    _aplicar_cedulas_canonicas(empleados, ["1007", "2008"])
    assert [empleado.cedula for empleado in empleados] == ["1007", "2008"]


@pytest.mark.asyncio
async def test_bulk_savepoints_conserva_exito_error_exito_y_contadores(db_session):
    async with _sesion_reversible(db_session) as session:
        cedula_a = "7" + str(uuid4().int)[:20]
        cedula_b = "8" + str(uuid4().int)[:20]
        cedula_c = "9" + str(uuid4().int)[:20]
        funcion = f"fallar_bulk_{uuid4().hex}"
        await session.execute(text(f"""
            CREATE FUNCTION {funcion}() RETURNS trigger AS $$ BEGIN
                IF NEW.cedula = '{cedula_b}' THEN
                    RAISE EXCEPTION 'fallo controlado bulk';
                END IF;
                RETURN NEW;
            END; $$ LANGUAGE plpgsql
        """))
        await session.execute(text(f"""
            CREATE TRIGGER trg_{funcion} BEFORE INSERT OR UPDATE
            ON nomina_horario_pactado_dia
            FOR EACH ROW EXECUTE FUNCTION {funcion}()
        """))
        await session.commit()
        payload = PlanBulkRequest(
            semana=make_semana(),
            empleados=[
                make_empleado(cedula_a),
                make_empleado(cedula_b),
                make_empleado(cedula_c),
            ],
        )

        resultado = await guardar_borrador_plan(session, payload, "TEST")
        conteos = {
            cedula: int(await session.scalar(
                select(func.count()).select_from(NominaHorarioPactadoDia).where(
                    NominaHorarioPactadoDia.cedula == cedula
                )
            ) or 0)
            for cedula in (cedula_a, cedula_b, cedula_c)
        }

        assert conteos == {cedula_a: 7, cedula_b: 0, cedula_c: 7}
        assert resultado.registros_horario_creados == 14
        assert resultado.registros_horario_actualizados == 0
        assert len(resultado.errores) == 1


def test_worker_ot_crea_y_cierra_sesion_erp(monkeypatch):
    sesion = SimpleNamespace(cerrada=False)
    sesion.close = lambda: setattr(sesion, "cerrada", True)
    monkeypatch.setattr(ordenes_trabajo_service, "SessionErp", lambda: sesion)
    monkeypatch.setattr(
        ordenes_trabajo_service.OrdenesTrabajoService,
        "listar_ot_mano_obra",
        lambda *_args, **_kwargs: {"items": [], "total": 0, "limit": 20, "offset": 0},
    )
    resultado = ordenes_trabajo_service.consultar_ots_mano_obra_worker(None, 20, 0)
    assert resultado["items"] == []
    assert sesion.cerrada is True
