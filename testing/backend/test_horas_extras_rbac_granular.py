"""Cobertura de RBAC granular para Horas Extras."""
import pytest
from fastapi import HTTPException
from fastapi.routing import APIRoute

from app.core.rbac_manifest import SYSTEM_MODULES_REGISTRY
from app.models.auth.usuario import Usuario
from app.models.novedades_nomina.schemas_horas_extras import WorkflowTransicionRequest
from app.main import app
from app.api.novedades_nomina.routers.horas_extras import transicionar_calculo_endpoint
from app.api.novedades_nomina.routers.horas_extras_permisos import (
    PERMISO_HE_ADMIN,
    PERMISO_HE_COMPENSAR,
    PERMISO_HE_CONFIRMAR,
    PERMISO_HE_LEER,
    PERMISO_HE_PLANIFICAR,
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
    assert "requiere_permiso_he_compensar" in _dependency_names(
        f"{base}/bolsa/compensar", "POST"
    )
    assert "requiere_permiso_he_admin" in _dependency_names(
        f"{base}/parametros-calculo", "PUT"
    )


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
        "app.api.novedades_nomina.routers.horas_extras.validar_permiso_he",
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
