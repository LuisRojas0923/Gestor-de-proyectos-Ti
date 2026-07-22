"""Contrato ERP y endpoint protegido para la vista OThorarios."""
import os
from types import SimpleNamespace

from httpx import ASGITransport, AsyncClient
import pytest
from fastapi import HTTPException
from fastapi.routing import APIRoute

from app.api.novedades_nomina.routers import horas_extras_planificador
from app.services.erp import ordenes_trabajo_service


class _Rows:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


class _FakeDbErp:
    def __init__(self, rows):
        self.rows = rows
        self.params = None
        self.sql = ""

    def execute(self, query, params):
        self.sql = str(query)
        self.params = params
        return _Rows(self.rows)


def _fila_ot(**overrides):
    data = {
        "orden": "1007",
        "cc": "3080",
        "scc": "10",
        "sub_indice": "300",
        "categoria_sub_indice": "MANO DE OBRA",
        "descripcion": "Mantenimiento preventivo",
        "vr_contratado": 5_507_000,
        "estado": "ACTIVA",
        "cliente": "COLCAFE",
        "total": 1,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def test_listar_ot_horarios_consulta_vista_y_mapea_contrato_planificador():
    db = _FakeDbErp([_fila_ot()])

    resultado = ordenes_trabajo_service.OrdenesTrabajoService.listar_ot_horarios(
        db, q="1007", limit=20, offset=0,
    )

    assert "public.othorarios" in db.sql.lower()
    assert "basegeneralcostos" not in db.sql.lower()
    assert db.sql.lower().count(
        "order by orden, cc, scc, sub_indice, categoria_sub_indice"
    ) >= 2
    assert "categoria_sub_indice is not null" in db.sql.lower()
    assert "descripcion::text nulls last" in db.sql.lower()
    assert db.params["q"] == "%1007%"
    assert resultado == {
        "items": [{
            "orden": "1007",
            "cc": "3080",
            "scc": "10",
            "sub_indice": "300",
            "categoria_sub_indice": "MANO DE OBRA",
            "descripcion": "Mantenimiento preventivo",
            "vr_contratado": 5_507_000.0,
            "estado": "ACTIVA",
            "cliente": "COLCAFE",
        }],
        "total": 1,
        "limit": 20,
        "offset": 0,
    }


def test_listar_ot_horarios_normaliza_limites_y_admite_resultado_vacio():
    db = _FakeDbErp([])

    resultado = ordenes_trabajo_service.OrdenesTrabajoService.listar_ot_horarios(
        db, q="  ", limit=101, offset=-1,
    )

    assert db.params == {"q": None, "limit": 20, "offset": 0}
    assert resultado == {"items": [], "total": 0, "limit": 20, "offset": 0}


def test_listar_ot_horarios_escapa_comodines_ilike():
    db = _FakeDbErp([])

    ordenes_trabajo_service.OrdenesTrabajoService.listar_ot_horarios(
        db, q=r"OT%_\\", limit=20, offset=0,
    )

    assert db.params["q"] == r"%OT\%\_\\\\%"
    assert db.sql.lower().count("escape '\\'") == 6


def test_listar_ot_horarios_conserva_total_si_offset_deja_pagina_vacia():
    db = _FakeDbErp([_fila_ot(orden=None, total=3)])

    resultado = ordenes_trabajo_service.OrdenesTrabajoService.listar_ot_horarios(
        db, limit=20, offset=40,
    )

    assert resultado == {"items": [], "total": 3, "limit": 20, "offset": 40}


def test_endpoint_ot_horarios_esta_registrado_y_exige_permiso_planificar():
    from app.main import app

    route = next(
        route for route in app.routes
        if isinstance(route, APIRoute)
        and route.path == "/api/v2/novedades-nomina/horas-extras/planificador/ots-horarios"
    )
    dependencias = {getattr(dep.call, "__name__", "") for dep in route.dependant.dependencies}
    assert "requiere_permiso_he_planificar" in dependencias


def test_endpoint_ot_horarios_tiene_cuota_especifica():
    assert hasattr(horas_extras_planificador.listar_ots_horarios, "__wrapped__")


@pytest.mark.asyncio
async def test_endpoint_ot_horarios_requiere_autenticacion():
    from app.main import app

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get(
            "/api/v2/novedades-nomina/horas-extras/planificador/ots-horarios",
            params={"q": "1007"},
        )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_endpoint_ot_horarios_rechaza_usuario_sin_permiso():
    from app.main import app

    async def acceso_denegado():
        raise HTTPException(status_code=403, detail="Acceso denegado")

    app.dependency_overrides[
        horas_extras_planificador.requiere_permiso_he_planificar
    ] = acceso_denegado
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get(
                "/api/v2/novedades-nomina/horas-extras/planificador/ots-horarios",
                params={"q": "1007"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "params",
    [
        {"q": "a"},
        {"q": "  "},
        {"q": "a" * 101},
        {"q": "1007", "limit": 101},
        {"q": "1007", "offset": 10_001},
    ],
)
async def test_endpoint_ot_horarios_valida_limites_http(params, monkeypatch):
    from app.main import app

    monkeypatch.setattr(horas_extras_planificador.limiter, "enabled", False)
    app.dependency_overrides[
        horas_extras_planificador.requiere_permiso_he_planificar
    ] = lambda: SimpleNamespace(id="usuario-prueba")
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get(
                "/api/v2/novedades-nomina/horas-extras/planificador/ots-horarios",
                params=params,
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_endpoint_ot_horarios_degrada_a_503_si_falla_erp(monkeypatch):
    async def ejecutar_worker(*_args):
        raise RuntimeError("ERP no disponible")

    monkeypatch.setattr(horas_extras_planificador, "run_in_threadpool", ejecutar_worker)

    with pytest.raises(HTTPException) as exc:
        await horas_extras_planificador.listar_ots_horarios.__wrapped__(
            request=horas_extras_planificador.Request({"type": "http"}),
            response=horas_extras_planificador.Response(),
            q="1007",
            limit=20,
            offset=0,
            _=SimpleNamespace(id="usuario-prueba"),
        )

    assert exc.value.status_code == 503
    assert exc.value.detail == "ERP no disponible"


@pytest.mark.asyncio
async def test_endpoint_ot_horarios_serializa_respuesta_y_evitar_cache(monkeypatch):
    async def ejecutar_worker(*_args):
        return {
            "items": [{
                "orden": "1007",
                "cc": "3080",
                "scc": "10",
                "sub_indice": "300",
                "categoria_sub_indice": "MANO DE OBRA",
                "descripcion": "Mantenimiento",
                "vr_contratado": 1000,
                "estado": "ACTIVA",
                "cliente": "COLCAFE",
            }],
            "total": 1,
            "limit": 20,
            "offset": 0,
        }

    monkeypatch.setattr(horas_extras_planificador, "run_in_threadpool", ejecutar_worker)
    response = horas_extras_planificador.Response()

    resultado = await horas_extras_planificador.listar_ots_horarios.__wrapped__(
        request=horas_extras_planificador.Request({"type": "http"}),
        response=response,
        q="1007",
        limit=20,
        offset=0,
        _=SimpleNamespace(id="usuario-prueba"),
    )

    assert resultado.items[0].orden == "1007"
    assert response.headers["Cache-Control"] == "no-store, private"


@pytest.mark.asyncio
async def test_endpoint_ot_horarios_degrada_a_503_si_fila_incumple_contrato(monkeypatch):
    async def ejecutar_worker(*_args):
        return {
            "items": [{
                "orden": "1007",
                "categoria_sub_indice": None,
            }],
            "total": 1,
            "limit": 20,
            "offset": 0,
        }

    monkeypatch.setattr(horas_extras_planificador, "run_in_threadpool", ejecutar_worker)

    with pytest.raises(HTTPException) as exc:
        await horas_extras_planificador.listar_ots_horarios.__wrapped__(
            request=horas_extras_planificador.Request({"type": "http"}),
            response=horas_extras_planificador.Response(),
            q="1007",
            limit=20,
            offset=0,
            _=SimpleNamespace(id="usuario-prueba"),
        )

    assert exc.value.status_code == 503


def test_worker_ot_horarios_cierra_sesion_erp(monkeypatch):
    sesion = SimpleNamespace(cerrada=False)
    sesion.close = lambda: setattr(sesion, "cerrada", True)
    monkeypatch.setattr(ordenes_trabajo_service, "SessionErp", lambda: sesion)
    monkeypatch.setattr(
        ordenes_trabajo_service.OrdenesTrabajoService,
        "listar_ot_horarios",
        lambda *_args, **_kwargs: {"items": [], "total": 0, "limit": 20, "offset": 0},
    )

    resultado = ordenes_trabajo_service.consultar_ots_horarios_worker(None, 20, 0)

    assert resultado["items"] == []
    assert sesion.cerrada is True


def test_worker_ot_horarios_cierra_sesion_si_consulta_falla(monkeypatch):
    sesion = SimpleNamespace(cerrada=False)
    sesion.close = lambda: setattr(sesion, "cerrada", True)
    monkeypatch.setattr(ordenes_trabajo_service, "SessionErp", lambda: sesion)

    def fallar(*_args, **_kwargs):
        raise RuntimeError("fallo controlado")

    monkeypatch.setattr(
        ordenes_trabajo_service.OrdenesTrabajoService,
        "listar_ot_horarios",
        fallar,
    )

    with pytest.raises(RuntimeError, match="fallo controlado"):
        ordenes_trabajo_service.consultar_ots_horarios_worker(None, 20, 0)

    assert sesion.cerrada is True


@pytest.mark.skipif(
    os.getenv("RUN_ERP_PROD_CONTRACT") != "1",
    reason="Requiere acceso explicito de solo lectura al ERP de produccion",
)
def test_ot_horarios_contrato_erp_produccion():
    from time import monotonic

    termino = os.environ["ERP_PROD_OT_QUERY"].strip()
    assert len(termino) >= 2

    sesion = ordenes_trabajo_service.SessionErp()
    try:
        inicio = monotonic()
        resultado = ordenes_trabajo_service.OrdenesTrabajoService.listar_ot_horarios(
            sesion, q=termino, limit=1, offset=0,
        )
        duracion = monotonic() - inicio
        pagina_vacia = ordenes_trabajo_service.OrdenesTrabajoService.listar_ot_horarios(
            sesion, q=termino, limit=1, offset=resultado["total"],
        )
    finally:
        sesion.close()

    assert duracion < 30
    assert resultado["limit"] == 1
    assert resultado["offset"] == 0
    assert resultado["total"] >= len(resultado["items"])
    assert resultado["items"], "ERP_PROD_OT_QUERY debe identificar una OT existente"
    item = resultado["items"][0]
    assert item["orden"]
    assert item["categoria_sub_indice"]
    assert pagina_vacia["items"] == []
    assert pagina_vacia["total"] == resultado["total"]
