"""Cobertura de RBAC granular para Horas Extras."""
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from fastapi.routing import APIRoute
from sqlalchemy.exc import SQLAlchemyError

from app.core.rbac_manifest import SYSTEM_MODULES_REGISTRY
from app.models.auth.usuario import Usuario
from app.models.novedades_nomina.schemas_horas_extras import (
    CompensarBolsaRequest,
    WorkflowTransicionRequest,
)
from app.main import app
from app.api.novedades_nomina.routers.horas_extras import (
    obtener_bolsa,
)
from app.api.novedades_nomina.routers.horas_extras_workflow import (
    autorizar_calculo_endpoint,
    compensar_bolsa_endpoint,
    transicionar_calculo_endpoint,
)
from app.api.novedades_nomina.routers.horas_extras_plantillas import (
    listar as listar_plantillas_endpoint,
)
from app.api.novedades_nomina.routers.horas_extras_permisos import (
    PERMISO_HE_ADMIN,
    PERMISO_HE_AUTORIZAR,
    PERMISO_HE_COMPENSAR,
    PERMISO_HE_CONFIRMAR,
    PERMISO_HE_LEER,
    PERMISO_HE_PLANIFICAR,
    PERMISO_PLANTILLAS_ADMIN,
    requiere_permiso_plantillas_consultar,
    validar_permiso_he,
)


def _route(path: str, method: str) -> APIRoute:
    return next(
        route for route in app.routes
        if isinstance(route, APIRoute)
        and route.path == path
        and method in route.methods
    )


def _dependency_names(path: str, method: str) -> set[str]:
    route = _route(path, method)
    return {getattr(dep.call, "__name__", "") for dep in route.dependant.dependencies}


def _usuario() -> Usuario:
    return Usuario(
        id="TEST-RBAC-HE",
        cedula="TEST-RBAC-HE",
        hash_contrasena="hash-test",
        nombre="Usuario Test RBAC HE",
        rol="rol_test_he",
    )


def test_manifest_incluye_permisos_granulares_he():
    ids = {modulo["id"] for modulo in SYSTEM_MODULES_REGISTRY}
    assert PERMISO_HE_LEER in ids
    assert PERMISO_HE_PLANIFICAR in ids
    assert PERMISO_HE_CONFIRMAR in ids
    assert PERMISO_HE_AUTORIZAR in ids
    assert PERMISO_HE_COMPENSAR in ids
    assert PERMISO_HE_ADMIN in ids


def test_permiso_admin_he_no_habilita_panel_maestro():
    modulos = {modulo["id"]: modulo for modulo in SYSTEM_MODULES_REGISTRY}
    assert modulos[PERMISO_HE_ADMIN]["categoria"] == "portal"


def test_rutas_criticas_exigen_permiso_granular_correcto():
    base = "/api/v2/novedades-nomina/horas-extras"
    assert "requiere_permiso_he_leer" in _dependency_names(f"{base}/calculos", "GET")
    assert "requiere_permiso_he_planificar" in _dependency_names(
        f"{base}/planificador/pre-calcular", "POST"
    )
    assert "requiere_permiso_he_confirmar" in _dependency_names(
        f"{base}/pre-liquidacion/confirmar", "POST"
    )
    assert "requiere_permiso_he_confirmar" in _dependency_names(
        f"{base}/planificador/confirmar", "POST"
    )
    assert "requiere_permiso_he_autorizar" in _dependency_names(
        f"{base}/calculos/{{calculo_id}}/autorizar", "POST"
    )
    assert "requiere_permiso_he_compensar" in _dependency_names(
        f"{base}/bolsa/compensar", "POST"
    )
    assert "requiere_permiso_he_admin" in _dependency_names(
        f"{base}/parametros-calculo", "PUT"
    )
    assert "requiere_permiso_plantillas_consultar" in _dependency_names(
        f"{base}/plantillas-horario", "GET"
    )
    assert "requiere_permiso_plantillas_administrar" in _dependency_names(
        f"{base}/plantillas-horario", "POST"
    )
    assert "requiere_permiso_plantillas_administrar" in _dependency_names(
        f"{base}/plantillas-horario/{{plantilla_id}}", "PATCH"
    )
    assert "requiere_permiso_plantillas_administrar" in _dependency_names(
        f"{base}/plantillas-horario/{{plantilla_id}}/desactivar", "POST"
    )
    assert "requiere_permiso_plantillas_administrar" in _dependency_names(
        f"{base}/plantillas-horario/{{plantilla_id}}/duplicar", "POST"
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("endpoint", ["consultar", "compensar"])
async def test_bolsa_oculta_empleado_fuera_del_alcance(monkeypatch, endpoint):
    async def denegar(*_args):
        raise PermissionError("Empleado no encontrado")

    monkeypatch.setattr(
        "app.api.novedades_nomina.routers.horas_extras.autorizar_cedula",
        denegar,
    )
    monkeypatch.setattr(
        "app.api.novedades_nomina.routers.horas_extras_workflow.autorizar_cedula",
        denegar,
    )
    with pytest.raises(HTTPException) as exc:
        if endpoint == "consultar":
            await obtener_bolsa(cedula="1107068093", db=None, usuario=_usuario())
        else:
            await compensar_bolsa_endpoint(
                payload=CompensarBolsaRequest(
                    cedula="1107068093", horas=1, fecha=date(2026, 7, 17)
                ),
                db=None,
                usuario=_usuario(),
            )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_compensacion_rechaza_calculo_de_otro_empleado(monkeypatch):
    async def autorizar_cedula_fake(*_args):
        return "1107068093"

    async def autorizar_calculo_fake(*_args):
        return "9999999999"

    monkeypatch.setattr(
        "app.api.novedades_nomina.routers.horas_extras_workflow.autorizar_cedula",
        autorizar_cedula_fake,
    )
    monkeypatch.setattr(
        "app.api.novedades_nomina.routers.horas_extras_workflow.autorizar_calculo_id",
        autorizar_calculo_fake,
    )
    with pytest.raises(HTTPException) as exc:
        await compensar_bolsa_endpoint(
            payload=CompensarBolsaRequest(
                cedula="1107068093", horas=1, fecha=date(2026, 7, 17),
                calculo_id=99,
            ),
            db=None,
            usuario=_usuario(),
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
@pytest.mark.parametrize("permiso", [PERMISO_HE_PLANIFICAR, PERMISO_PLANTILLAS_ADMIN])
async def test_consultar_plantillas_acepta_planificador_o_administrador(
    monkeypatch, permiso
):
    async def fake_permisos(_db, _rol):
        return [permiso]

    monkeypatch.setattr(
        "app.api.novedades_nomina.routers.horas_extras_permisos."
        "ServicioAuth.obtener_permisos_por_rol",
        fake_permisos,
    )

    usuario = await requiere_permiso_plantillas_consultar(None, _usuario())
    assert usuario.id == "TEST-RBAC-HE"


@pytest.mark.asyncio
async def test_consultar_plantillas_rechaza_usuario_sin_permisos(monkeypatch):
    async def fake_permisos(_db, _rol):
        return [PERMISO_HE_LEER]

    monkeypatch.setattr(
        "app.api.novedades_nomina.routers.horas_extras_permisos."
        "ServicioAuth.obtener_permisos_por_rol",
        fake_permisos,
    )

    with pytest.raises(HTTPException) as exc:
        await requiere_permiso_plantillas_consultar(None, _usuario())

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_planificador_no_puede_consultar_plantillas_inactivas(monkeypatch):
    async def fake_permisos(_db, _rol):
        return [PERMISO_HE_PLANIFICAR]

    monkeypatch.setattr(
        "app.api.novedades_nomina.routers.horas_extras_permisos."
        "ServicioAuth.obtener_permisos_por_rol",
        fake_permisos,
    )

    with pytest.raises(HTTPException) as exc:
        await listar_plantillas_endpoint(
            limit=20,
            offset=0,
            incluir_inactivas=True,
            q=None,
            db=None,
            actor=_usuario(),
        )

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_validar_permiso_he_rechaza_permiso_faltante(monkeypatch):
    async def fake_permisos(_db, _rol):
        return [PERMISO_HE_PLANIFICAR]

    monkeypatch.setattr(
        "app.api.novedades_nomina.routers.horas_extras_permisos."
        "ServicioAuth.obtener_permisos_por_rol",
        fake_permisos,
    )

    with pytest.raises(HTTPException) as exc:
        await validar_permiso_he(None, _usuario(), PERMISO_HE_ADMIN)

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_validar_permiso_he_acepta_permiso_exacto(monkeypatch):
    async def fake_permisos(_db, _rol):
        return [PERMISO_HE_ADMIN]

    monkeypatch.setattr(
        "app.api.novedades_nomina.routers.horas_extras_permisos."
        "ServicioAuth.obtener_permisos_por_rol",
        fake_permisos,
    )

    usuario = await validar_permiso_he(None, _usuario(), PERMISO_HE_ADMIN)
    assert usuario.id == "TEST-RBAC-HE"


@pytest.mark.asyncio
async def test_transicion_compensado_exige_permiso_compensar(monkeypatch):
    permisos_validados = []

    async def fake_validar(_db, _usuario, permiso):
        permisos_validados.append(permiso)
        raise HTTPException(status_code=403, detail="Sin permiso para compensar")

    monkeypatch.setattr(
        "app.api.novedades_nomina.routers.horas_extras_workflow.validar_permiso_he",
        fake_validar,
    )

    with pytest.raises(HTTPException) as exc:
        await transicionar_calculo_endpoint(
            calculo_id=1,
            payload=WorkflowTransicionRequest(estado_destino="COMPENSADO", horas=1),
            db=None,
            usuario=_usuario(),
        )

    assert exc.value.status_code == 403
    assert permisos_validados == [PERMISO_HE_COMPENSAR]


@pytest.mark.asyncio
async def test_autorizar_calculo_atribuye_auditoria_y_confirma(monkeypatch):
    async def autorizar_alcance(*_args):
        return "1107068093"

    async def autorizar_pendiente(*_args):
        return {
            "calculo_id": 7,
            "estado_anterior": "PENDIENTE_AUTORIZACION",
            "estado_nuevo": "CONFIRMADO",
            "evento_id": 9,
            "movimiento_bolsa_id": None,
            "horas_afectadas": 0.0,
            "ya_autorizado": False,
        }

    monkeypatch.setattr(
        "app.api.novedades_nomina.routers.horas_extras_workflow.autorizar_calculo_id",
        autorizar_alcance,
    )
    monkeypatch.setattr(
        "app.api.novedades_nomina.routers.horas_extras_workflow.autorizar_calculo_pendiente",
        autorizar_pendiente,
    )
    db = SimpleNamespace(commit=AsyncMock(), rollback=AsyncMock())
    request = SimpleNamespace(state=SimpleNamespace())

    resultado = await autorizar_calculo_endpoint(
        request=request,
        calculo_id=7,
        db=db,
        usuario=_usuario(),
    )

    assert resultado.estado_nuevo == "CONFIRMADO"
    assert request.state.auditoria_modulo == PERMISO_HE_AUTORIZAR
    assert request.state.auditoria_entidad_tipo == "calculo_horas_extras"
    assert request.state.auditoria_entidad_id == "7"
    db.commit.assert_awaited_once()
    db.rollback.assert_not_awaited()


@pytest.mark.asyncio
async def test_autorizar_calculo_error_db_hace_rollback(monkeypatch):
    async def autorizar_alcance(*_args):
        return "1107068093"

    async def fallar_persistencia(*_args):
        raise SQLAlchemyError("db no disponible")

    monkeypatch.setattr(
        "app.api.novedades_nomina.routers.horas_extras_workflow.autorizar_calculo_id",
        autorizar_alcance,
    )
    monkeypatch.setattr(
        "app.api.novedades_nomina.routers.horas_extras_workflow.autorizar_calculo_pendiente",
        fallar_persistencia,
    )
    db = SimpleNamespace(commit=AsyncMock(), rollback=AsyncMock())

    with pytest.raises(HTTPException) as exc:
        await autorizar_calculo_endpoint(
            request=SimpleNamespace(state=SimpleNamespace()),
            calculo_id=7,
            db=db,
            usuario=_usuario(),
        )

    assert exc.value.status_code == 503
    db.rollback.assert_awaited_once()
    db.commit.assert_not_awaited()
