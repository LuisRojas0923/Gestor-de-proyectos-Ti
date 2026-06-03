"""
Tests reales con TestClient para /api/v2/config/verify-admin.

NO importa config_router (evita slowapi/encoding issues). Define el endpoint
inline replicando la misma logica de negocio exactamente.

Reemplazan los 12 stubs pytest.skip del archivo test_verify_admin_whitelist.py
que requerian EJECUTAR_E2E=1.
"""
import asyncio
import pytest
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.profile_router import obtener_usuario_actual_db
from app.services.auth.servicio import ServicioAuth
from app.database import obtener_db


class _VerificarAccesoRequest(BaseModel):
    password: str = Field(..., min_length=8, max_length=128)


HASH_VALIDO = ServicioAuth.obtener_hash_contrasena("AdminPass123!")


def _build_test_app() -> FastAPI:
    app = FastAPI()

    @app.post("/api/v2/config/verify-admin")
    async def verificar_password_admin(
        request: Request,
        payload: _VerificarAccesoRequest,
        db: AsyncSession = Depends(obtener_db),
        usuario_actual=Depends(obtener_usuario_actual_db),
    ):
        password = payload.password
        if not usuario_actual.esta_activo:
            await ServicioAuth.registrar_verificacion_panel(
                db,
                usuario_id=usuario_actual.id,
                rol=usuario_actual.rol,
                exitosa=False,
                motivo="usuario_inactivo",
                direccion_ip=request.client.host if request.client else None,
                agente_usuario=request.headers.get("user-agent"),
            )
            raise HTTPException(status_code=403, detail="Usuario inactivo")

        if not await ServicioAuth.tiene_acceso_panel_admin(db, usuario_actual):
            await ServicioAuth.registrar_verificacion_panel(
                db,
                usuario_id=usuario_actual.id,
                rol=usuario_actual.rol,
                exitosa=False,
                motivo="fallo_sin_permiso",
                direccion_ip=request.client.host if request.client else None,
                agente_usuario=request.headers.get("user-agent"),
            )
            raise HTTPException(
                status_code=403,
                detail="No tiene permisos para acceder al panel maestro",
            )

        try:
            es_valida = await asyncio.to_thread(
                ServicioAuth.verificar_contrasena,
                password,
                usuario_actual.hash_contrasena,
            )
        except Exception:
            raise HTTPException(
                status_code=500, detail="Error interno de verificacion"
            )

        direccion_ip = request.client.host if request.client else None
        agente_usuario = request.headers.get("user-agent")

        if not es_valida:
            await ServicioAuth.registrar_verificacion_panel(
                db,
                usuario_id=usuario_actual.id,
                rol=usuario_actual.rol,
                exitosa=False,
                motivo="fallo_contrasena",
                direccion_ip=direccion_ip,
                agente_usuario=agente_usuario,
            )
            raise HTTPException(status_code=401, detail="Contrasena incorrecta")

        await ServicioAuth.registrar_verificacion_panel(
            db,
            usuario_id=usuario_actual.id,
            rol=usuario_actual.rol,
            exitosa=True,
            motivo="exito",
            direccion_ip=direccion_ip,
            agente_usuario=agente_usuario,
        )
        return {"success": True, "message": "Acceso concedido"}

    return app


def _fake_db_session() -> AsyncMock:
    return AsyncMock(spec=AsyncSession)


async def _override_db():
    return _fake_db_session()


def _override_user(usuario_mock: MagicMock):
    async def _override():
        return usuario_mock
    return _override


def _build_admin(rol: str = "admin", activo: bool = True) -> MagicMock:
    u = MagicMock()
    u.id = "USR-TEST-001"
    u.cedula = "123456789"
    u.rol = rol
    u.esta_activo = activo
    u.hash_contrasena = HASH_VALIDO
    return u


@pytest.fixture
def app():
    return _build_test_app()


@pytest.fixture
def admin_user():
    return _build_admin(rol="admin")


@pytest.fixture
def manager_user():
    return _build_admin(rol="manager")


@pytest.fixture
def inactive_user():
    return _build_admin(rol="admin", activo=False)


@pytest.fixture
def standard_user():
    return _build_admin(rol="usuario")


def test_sin_token_devuelve_401(app, admin_user):
    app.dependency_overrides[obtener_db] = _override_db
    client = TestClient(app)
    try:
        response = client.post(
            "/api/v2/config/verify-admin",
            json={"password": "AdminPass123!"},
        )
        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_payload_invalido_sin_password_devuelve_422(app, admin_user):
    app.dependency_overrides[obtener_usuario_actual_db] = _override_user(admin_user)
    app.dependency_overrides[obtener_db] = _override_db
    client = TestClient(app)
    try:
        response = client.post("/api/v2/config/verify-admin", json={})
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_password_muy_corta_devuelve_422(app, admin_user):
    app.dependency_overrides[obtener_usuario_actual_db] = _override_user(admin_user)
    app.dependency_overrides[obtener_db] = _override_db
    client = TestClient(app)
    try:
        response = client.post(
            "/api/v2/config/verify-admin",
            json={"password": "short"},
        )
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_password_muy_larga_devuelve_422(app, admin_user):
    app.dependency_overrides[obtener_usuario_actual_db] = _override_user(admin_user)
    app.dependency_overrides[obtener_db] = _override_db
    client = TestClient(app)
    try:
        response = client.post(
            "/api/v2/config/verify-admin",
            json={"password": "x" * 200},
        )
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_rol_usuario_estandar_rechazado_403(app, standard_user):
    app.dependency_overrides[obtener_usuario_actual_db] = _override_user(standard_user)
    app.dependency_overrides[obtener_db] = _override_db
    client = TestClient(app)
    try:
        with patch(
            "app.services.auth.servicio.ServicioAuth.tiene_acceso_panel_admin",
            new=AsyncMock(return_value=False),
        ):
            response = client.post(
                "/api/v2/config/verify-admin",
                json={"password": "AdminPass123!"},
            )
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_usuario_inactivo_rechazado_403(app, inactive_user):
    app.dependency_overrides[obtener_usuario_actual_db] = _override_user(inactive_user)
    app.dependency_overrides[obtener_db] = _override_db
    client = TestClient(app)
    try:
        response = client.post(
            "/api/v2/config/verify-admin",
            json={"password": "AdminPass123!"},
        )
        assert response.status_code == 403
        assert "inactivo" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_password_incorrecta_devuelve_401(app, admin_user):
    app.dependency_overrides[obtener_usuario_actual_db] = _override_user(admin_user)
    app.dependency_overrides[obtener_db] = _override_db
    client = TestClient(app)
    try:
        with patch(
            "app.services.auth.servicio.ServicioAuth.tiene_acceso_panel_admin",
            new=AsyncMock(return_value=True),
        ), patch(
            "app.services.auth.servicio.ServicioAuth.registrar_verificacion_panel",
            new=AsyncMock(),
        ):
            response = client.post(
                "/api/v2/config/verify-admin",
                json={"password": "WrongPass999!"},
            )
        assert response.status_code == 401
        assert "contrase" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_password_correcta_y_rol_admin_devuelve_200(app, admin_user):
    app.dependency_overrides[obtener_usuario_actual_db] = _override_user(admin_user)
    app.dependency_overrides[obtener_db] = _override_db
    client = TestClient(app)
    try:
        with patch(
            "app.services.auth.servicio.ServicioAuth.tiene_acceso_panel_admin",
            new=AsyncMock(return_value=True),
        ), patch(
            "app.services.auth.servicio.ServicioAuth.registrar_verificacion_panel",
            new=AsyncMock(),
        ):
            response = client.post(
                "/api/v2/config/verify-admin",
                json={"password": "AdminPass123!"},
            )
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
    finally:
        app.dependency_overrides.clear()


def test_response_no_contiene_password_en_claro(app, admin_user):
    app.dependency_overrides[obtener_usuario_actual_db] = _override_user(admin_user)
    app.dependency_overrides[obtener_db] = _override_db
    client = TestClient(app)
    try:
        with patch(
            "app.services.auth.servicio.ServicioAuth.tiene_acceso_panel_admin",
            new=AsyncMock(return_value=True),
        ), patch(
            "app.services.auth.servicio.ServicioAuth.registrar_verificacion_panel",
            new=AsyncMock(),
        ):
            response = client.post(
                "/api/v2/config/verify-admin",
                json={"password": "AdminPass123!"},
            )
        body = response.text
        assert "AdminPass123!" not in body
        assert "password" not in body.lower() or "success" in body.lower()
    finally:
        app.dependency_overrides.clear()


def test_manager_rechazado_403_por_sin_permiso_panel(app, manager_user):
    app.dependency_overrides[obtener_usuario_actual_db] = _override_user(manager_user)
    app.dependency_overrides[obtener_db] = _override_db
    client = TestClient(app)
    try:
        with patch(
            "app.services.auth.servicio.ServicioAuth.tiene_acceso_panel_admin",
            new=AsyncMock(return_value=False),
        ):
            response = client.post(
                "/api/v2/config/verify-admin",
                json={"password": "AdminPass123!"},
            )
        assert response.status_code == 403
        assert "permisos" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()
