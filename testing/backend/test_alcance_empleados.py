"""TDD de relaciones gestor-empleado y autorización por fila."""

import hashlib
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException, Response
from sqlalchemy import func, select, text

from app.api.auth import alcance_empleados_router
from app.api.auth.alcance_empleados_router import requerir_admin_alcance
from app.services.auth.alcance_empleados_service import (
    autorizar_cedula,
    cedulas_visibles_planificador,
    normalizar_cedula,
    obtener_resultado_relaciones_idempotente,
    validar_cambio_relaciones,
    usuario_tiene_bypass_alcance,
    cambiar_relaciones,
)
from app.models.auth.relacion_gestor_empleado import (
    HistorialRelacionGestorEmpleado, RelacionGestorEmpleado,
)
from app.models.auth.usuario import Usuario
from app.services.erp.empleados_horarios_service import filtrar_paginar_empleados
from app.services.erp import empleados_horarios_service
from app.services.auth.servicio import ServicioAuth
from testing.backend.test_horarios_plantillas_service import _sesion_reversible


def test_normaliza_cedula_erp():
    assert normalizar_cedula("  1.007.021.351  ") == "1007021351"


@pytest.mark.parametrize("cedula", ["", "ABC", "1-2", "1" * 51])
def test_rechaza_cedula_fuera_del_contrato(cedula):
    with pytest.raises(ValueError, match="cédula"):
        normalizar_cedula(cedula)


def test_relacion_muchos_a_muchos_permite_misma_cedula_en_gestores_distintos():
    uno = validar_cambio_relaciones(
        gestor_id="GESTOR-1",
        actor_id="ADMIN",
        actor_es_admin=True,
        cedulas_agregar=["100", "200"],
        cedulas_quitar=[],
    )
    dos = validar_cambio_relaciones(
        gestor_id="GESTOR-2",
        actor_id="ADMIN",
        actor_es_admin=True,
        cedulas_agregar=["100"],
        cedulas_quitar=[],
    )

    assert uno.cedulas_agregar == ["100", "200"]
    assert dos.cedulas_agregar == ["100"]


def test_cambio_relaciones_normaliza_y_deduplica_antes_del_limite():
    cambio = validar_cambio_relaciones(
        gestor_id="GESTOR-1",
        actor_id="ADMIN",
        actor_es_admin=True,
        cedulas_agregar=[" 1.007 ", "1007", "2008"],
        cedulas_quitar=[],
    )

    assert cambio.cedulas_agregar == ["1007", "2008"]


def test_rechaza_cedula_en_altas_y_bajas():
    with pytest.raises(ValueError, match="agregar y quitar"):
        validar_cambio_relaciones(
            gestor_id="GESTOR-1",
            actor_id="ADMIN",
            actor_es_admin=True,
            cedulas_agregar=["100"],
            cedulas_quitar=["100"],
        )


def test_no_admin_no_puede_modificar_su_propio_alcance():
    with pytest.raises(PermissionError, match="propio alcance"):
        validar_cambio_relaciones(
            gestor_id="GESTOR-1",
            actor_id="GESTOR-1",
            actor_es_admin=False,
            cedulas_agregar=["100"],
            cedulas_quitar=[],
        )


def test_bypass_solo_para_rol_admin_canonico():
    assert usuario_tiene_bypass_alcance(SimpleNamespace(rol="admin")) is True
    assert usuario_tiene_bypass_alcance(SimpleNamespace(rol="administrador")) is False


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("rol", "esperado"),
    [("admin", None), ("gestor", set())],
)
async def test_visibilidad_planificador_sin_relaciones_conserva_fallback_por_rol(
    rol, esperado
):
    resultado = SimpleNamespace(
        scalars=lambda: SimpleNamespace(all=lambda: [])
    )
    sesion = SimpleNamespace(execute=AsyncMock(return_value=resultado))

    visibles = await cedulas_visibles_planificador(
        sesion, SimpleNamespace(id="GESTOR-1", rol=rol)
    )

    assert visibles == esperado


@pytest.mark.asyncio
async def test_replay_relaciones_marca_resultado_idempotente_sin_duplicar_campo():
    solicitud_id = uuid4()
    actor = SimpleNamespace(id="ADMIN", rol="admin")
    sesion = SimpleNamespace(get=AsyncMock(return_value=SimpleNamespace(
        actor_usuario_id="ADMIN",
        recurso_objetivo="GESTOR-1",
        payload_hash=(
            hashlib.sha256(
                b'{"agregar":["100"],"gestor_id":"GESTOR-1","quitar":[]}'
            ).hexdigest()
        ),
        estado="FINALIZADA",
        resultado={
            "gestor_id": "GESTOR-1",
            "agregadas": 1,
            "reactivadas": 0,
            "desactivadas": 0,
            "sin_cambio": 0,
            "idempotente": False,
        },
    )))

    resultado = await obtener_resultado_relaciones_idempotente(
        sesion, solicitud_id, "GESTOR-1", actor, ["100"], []
    )

    assert resultado.idempotente is True


def test_filtros_orden_y_facetas_se_aplican_antes_de_paginar():
    items = [
        {
            "cedula": "2", "nombre": "B", "cargo": "Técnico", "area": "Norte",
            "ciudadcontratacion": "Cali", "jefe": "Jefe B", "autoriza_he": True,
            "disponible_semana": True, "relacionado": True,
        },
        {
            "cedula": "1", "nombre": "A", "cargo": "Analista", "area": "Sur",
            "ciudadcontratacion": "Bogotá", "jefe": "Jefe A", "autoriza_he": False,
            "disponible_semana": False, "relacionado": False,
        },
        {
            "cedula": "3", "nombre": "C", "cargo": "Técnico", "area": "Norte",
            "ciudadcontratacion": "Cali", "jefe": "Jefe B", "autoriza_he": True,
            "disponible_semana": True, "relacionado": False,
        },
    ]

    pagina = filtrar_paginar_empleados(
        items, cargos=["Técnico"], areas=[], ciudades=[], jefes=[],
        autoriza_he=True, disponible_semana=True, relacionado=None,
        orden="nombre", direccion="desc", limit=1, offset=0,
    )

    assert pagina["total"] == 2
    assert [item["cedula"] for item in pagina["items"]] == ["3"]
    assert pagina["facetas"]["cargos"] == ["Analista", "Técnico"]


@pytest.mark.asyncio
async def test_cedula_fuera_de_alcance_se_deniega_sin_revelar_existencia():
    resultado = SimpleNamespace(
        scalars=lambda: SimpleNamespace(all=lambda: [])
    )
    sesion = SimpleNamespace(execute=AsyncMock(return_value=resultado))
    usuario = SimpleNamespace(id="GESTOR-1", rol="gestor")

    with pytest.raises(PermissionError, match="no encontrado"):
        await autorizar_cedula(sesion, usuario, "100")


@pytest.mark.asyncio
async def test_endpoint_relaciones_exige_permiso_funcional(monkeypatch):
    usuario = SimpleNamespace(id="GESTOR-1", rol="gestor")
    monkeypatch.setattr(
        ServicioAuth,
        "obtener_permisos_por_rol",
        AsyncMock(return_value=[]),
    )

    with pytest.raises(HTTPException) as error:
        await requerir_admin_alcance(db=SimpleNamespace(), usuario=usuario)

    assert error.value.status_code == 403


def test_worker_erp_crea_y_cierra_sesion_en_el_mismo_hilo(monkeypatch):
    sesion = SimpleNamespace(cerrada=False)
    sesion.close = lambda: setattr(sesion, "cerrada", True)
    listar = lambda *_args, **_kwargs: {"items": [], "total": 0}
    monkeypatch.setattr(empleados_horarios_service, "SessionErp", lambda: sesion)
    monkeypatch.setattr(
        empleados_horarios_service.EmpleadosService,
        "listar_empleados_paginado",
        listar,
    )

    resultado = empleados_horarios_service.consultar_empleados_erp_worker(
        None, 20, 0, True, ["100"], True
    )

    assert resultado == {"items": [], "total": 0}
    assert sesion.cerrada is True


@pytest.mark.asyncio
async def test_catalogo_relaciones_consulta_solo_empleados_activos(monkeypatch):
    argumentos_worker = None

    async def ejecutar_worker(_funcion, *argumentos):
        nonlocal argumentos_worker
        argumentos_worker = argumentos
        return {"items": [], "total": 0}

    monkeypatch.setattr(
        alcance_empleados_router,
        "cedulas_relacionadas_gestor",
        AsyncMock(return_value=set()),
    )
    monkeypatch.setattr(
        alcance_empleados_router,
        "run_in_threadpool",
        ejecutar_worker,
    )

    await alcance_empleados_router.listar_empleados_gestor(
        response=Response(),
        gestor_id="GESTOR-1",
        q=None,
        anio=2026,
        semana_iso=28,
        cargos=[],
        areas=[],
        ciudades=[],
        jefes=[],
        autoriza_he=None,
        disponible_semana=None,
        relacionado=None,
        orden="cedula",
        direccion="asc",
        limit=20,
        offset=0,
        db=SimpleNamespace(),
        _=SimpleNamespace(),
    )

    assert argumentos_worker is not None
    assert argumentos_worker[3] is True


async def _usuarios_relaciones(session):
    sufijo = uuid4().hex[:10]
    actor = Usuario(
        id=f"ACT-{sufijo}", cedula=str(uuid4().int)[:25],
        hash_contrasena="hash", nombre="Actor", rol="admin",
    )
    gestor = Usuario(
        id=f"GES-{sufijo}", cedula=str(uuid4().int)[:25],
        hash_contrasena="hash", nombre="Gestor", rol="gestor",
    )
    session.add_all([actor, gestor])
    await session.commit()
    return actor, gestor


@pytest.mark.asyncio
async def test_relaciones_alta_baja_reactivacion_historial_y_replay(db_session):
    async with _sesion_reversible(db_session) as session:
        actor, gestor = await _usuarios_relaciones(session)
        actor_ref = SimpleNamespace(id=actor.id, rol="admin")
        gestor_id = gestor.id
        cedula = str(uuid4().int)[:25]
        alta_id = uuid4()
        alta = await cambiar_relaciones(
            session, alta_id, gestor_id, actor_ref, [cedula], []
        )
        replay = await cambiar_relaciones(
            session, alta_id, gestor_id, actor_ref, [cedula], []
        )
        baja = await cambiar_relaciones(
            session, uuid4(), gestor_id, actor_ref, [], [cedula]
        )
        reactivacion = await cambiar_relaciones(
            session, uuid4(), gestor_id, actor_ref, [cedula], []
        )
        historial = int(await session.scalar(
            select(func.count()).select_from(HistorialRelacionGestorEmpleado)
            .join(
                RelacionGestorEmpleado,
                RelacionGestorEmpleado.id == HistorialRelacionGestorEmpleado.relacion_id,
            )
            .where(RelacionGestorEmpleado.gestor_usuario_id == gestor_id)
        ) or 0)
        with pytest.raises(RuntimeError, match="idempotencia"):
            await cambiar_relaciones(
                session, alta_id, gestor_id,
                SimpleNamespace(id="ACTOR-DIFERENTE", rol="admin"), [cedula], [],
            )

        assert alta.agregadas == 1
        assert replay.idempotente is True
        assert baja.desactivadas == 1
        assert reactivacion.reactivadas == 1
        assert historial == 3


@pytest.mark.asyncio
async def test_relaciones_revierte_lote_completo_ante_fallo(db_session):
    async with _sesion_reversible(db_session) as session:
        actor, gestor = await _usuarios_relaciones(session)
        gestor_id = gestor.id
        cedula_uno = "8" + str(uuid4().int)[:24]
        cedula_dos = "9" + str(uuid4().int)[:24]
        funcion = f"fallar_relacion_{uuid4().hex}"
        await session.execute(text(f"""
            CREATE FUNCTION {funcion}() RETURNS trigger AS $$ BEGIN
                IF NEW.empleado_cedula = '{cedula_dos}' THEN
                    RAISE EXCEPTION 'fallo controlado relaciones';
                END IF;
                RETURN NEW;
            END; $$ LANGUAGE plpgsql
        """))
        await session.execute(text(f"""
            CREATE TRIGGER trg_{funcion} BEFORE INSERT ON relaciones_gestor_empleado
            FOR EACH ROW EXECUTE FUNCTION {funcion}()
        """))
        await session.commit()

        with pytest.raises(Exception, match="fallo controlado relaciones"):
            await cambiar_relaciones(
                session, uuid4(), gestor.id, actor, [cedula_uno, cedula_dos], []
            )

        total = int(await session.scalar(
            select(func.count()).select_from(RelacionGestorEmpleado).where(
                RelacionGestorEmpleado.gestor_usuario_id == gestor_id
            )
        ) or 0)
        assert total == 0
