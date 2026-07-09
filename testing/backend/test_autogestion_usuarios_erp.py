from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError


def _build_request(path: str = "/api/v2/auth/login"):
    from starlette.requests import Request

    return Request({
        "type": "http",
        "method": "POST",
        "path": path,
        "headers": [],
        "client": ("127.0.0.1", 5000),
        "query_string": b"",
    })


def _build_form_data(username: str, password: str) -> OAuth2PasswordRequestForm:
    return OAuth2PasswordRequestForm(username=username, password=password, scope="")


def _empleado_erp(**overrides) -> dict:
    empleado = {
        "nombre": "EMPLEADO ACTIVO",
        "estado": "Activo",
        "viaticante": "N",
        "area": "TI",
        "cargo": "DEV",
        "ciudadcontratacion": "Bogota",
        "centrocosto": "001",
        "baseviaticos": 0,
        "correocorporativo": "activo@empresa.com",
    }
    empleado.update(overrides)
    return empleado


def _build_async_db_mock():
    db = MagicMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.refresh = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_jit_autogestion_erp_activo_crea_usuario_activo_sin_depender_del_flag():
    from app.api.auth.login_router import login
    login_handler = getattr(login, "__wrapped__", login)

    db = _build_async_db_mock()
    capturado = {}
    db.add.side_effect = lambda usuario: capturado.setdefault("usuario", usuario)

    with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula", new=AsyncMock(return_value=None)), \
         patch("app.services.erp.empleados_service.EmpleadosService.validar_empleado_activo_autogestion", new=AsyncMock(return_value=_empleado_erp())), \
         patch("app.services.auth.servicio.ServicioAuth.obtener_hash_contrasena", return_value="$2b$04$fakehash"), \
         patch("app.api.auth.login_router.obtener_configuracion") as mock_cfg:
        mock_cfg.return_value.jit_auto_aprobar = False
        mock_cfg.return_value.portal_pending_pwd = "test_pending"

        with pytest.raises(HTTPException) as excinfo:
            await login_handler(
                _build_request(),
                _build_form_data("1107068093", "ClaveSegura#2026"),
                db,
                object(),
            )

    assert excinfo.value.status_code == 400
    assert excinfo.value.headers["X-Password-Not-Set"] == "true"
    assert capturado["usuario"].esta_activo is True
    assert capturado["usuario"].rol == "usuario"
    assert capturado["usuario"].viaticante is False


@pytest.mark.asyncio
async def test_jit_autogestion_erp_no_activo_no_crea_usuario():
    from app.api.auth.login_router import login
    login_handler = getattr(login, "__wrapped__", login)

    db = _build_async_db_mock()

    with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula", new=AsyncMock(return_value=None)), \
         patch("app.services.erp.empleados_service.EmpleadosService.validar_empleado_activo_autogestion", new=AsyncMock(return_value=None)), \
         patch("app.api.auth.login_router._registrar_fallo_cedula"), \
         patch("app.api.auth.login_router._auditar_login", new=AsyncMock()):
        with pytest.raises(HTTPException) as excinfo:
            await login_handler(
                _build_request(),
                _build_form_data("1107068093", "ClaveSegura#2026"),
                db,
                object(),
            )

    assert excinfo.value.status_code == 401
    assert excinfo.value.detail == "Credenciales incorrectas"
    db.add.assert_not_called()
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_login_usuario_inactivo_con_password_pendiente_no_filtra_password_not_set():
    from app.api.auth.login_router import login

    login_handler = getattr(login, "__wrapped__", login)
    usuario = MagicMock()
    usuario.esta_activo = False
    usuario.hash_contrasena = "hash-pendiente"
    usuario.cedula = "1107068093"

    with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula", new=AsyncMock(return_value=usuario)):
        with pytest.raises(HTTPException) as excinfo:
            await login_handler(
                _build_request(),
                _build_form_data("1107068093", "ClaveSegura#2026"),
                _build_async_db_mock(),
                object(),
            )

    assert excinfo.value.status_code == 403
    assert "desactivada" in excinfo.value.detail.lower()
    assert not excinfo.value.headers


@pytest.mark.asyncio
async def test_registro_publico_erp_activo_crea_usuario_habilitado():
    from app.services.auth.provisioning_service import registrar_usuario_portal

    db = _build_async_db_mock()
    capturado = {}
    db.add.side_effect = lambda usuario: capturado.setdefault("usuario", usuario)

    with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula", new=AsyncMock(return_value=None)), \
         patch("app.services.erp.empleados_service.EmpleadosService.validar_empleado_activo_autogestion", new=AsyncMock(return_value=_empleado_erp(viaticante="S"))), \
         patch("app.services.auth.servicio.ServicioAuth.obtener_hash_contrasena", return_value="$2b$04$fakehash"):
        usuario = await registrar_usuario_portal(
            db,
            object(),
            "1107068093",
            "Nombre Portal",
            "externo@empresa.com",
            "ClaveSegura#2026",
        )

    assert usuario is capturado["usuario"]
    assert usuario.esta_activo is True
    assert usuario.rol == "viaticante"
    assert usuario.viaticante is True
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_registro_publico_erp_no_activo_rechaza_sin_crear_usuario():
    from app.services.auth.provisioning_service import registrar_usuario_portal

    db = _build_async_db_mock()

    with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula", new=AsyncMock(return_value=None)), \
         patch("app.services.erp.empleados_service.EmpleadosService.validar_empleado_activo_autogestion", new=AsyncMock(return_value=None)):
        with pytest.raises(ValueError) as excinfo:
            await registrar_usuario_portal(
                db,
                object(),
                "1107068093",
                "Nombre Portal",
                "externo@empresa.com",
                "ClaveSegura#2026",
            )

    assert "habilitar" in str(excinfo.value).lower()
    db.add.assert_not_called()
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_crear_usuario_portal_desde_erp_integrity_error_hace_rollback():
    from app.services.auth.provisioning_service import crear_usuario_portal_desde_erp

    db = _build_async_db_mock()
    db.commit.side_effect = IntegrityError("duplicate key", params=None, orig=Exception("dup"))

    with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula", new=AsyncMock(return_value=None)), \
         patch("app.services.erp.empleados_service.EmpleadosService.validar_empleado_activo_autogestion", new=AsyncMock(return_value=_empleado_erp())), \
         patch("app.services.auth.servicio.ServicioAuth.obtener_hash_contrasena", return_value="$2b$04$fakehash"):
        with pytest.raises(ValueError) as excinfo:
            await crear_usuario_portal_desde_erp(
                db,
                object(),
                "1107068093",
                "ClaveSegura#2026",
            )

    db.rollback.assert_awaited_once()
    assert "registrada" in str(excinfo.value).lower()


@pytest.mark.asyncio
async def test_setup_password_usuario_inactivo_rechaza_sin_cambiar_contrasena():
    from app.api.auth.public_auth_router import setup_password
    from app.models.auth.usuario import LoginRequest

    setup_handler = getattr(setup_password, "__wrapped__", setup_password)
    usuario = MagicMock()
    usuario.esta_activo = False
    usuario.hash_contrasena = "hash-pendiente"
    usuario.cedula = "1107068093"

    with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula", new=AsyncMock(return_value=usuario)), \
         patch("app.services.auth.servicio.ServicioAuth.cambiar_contrasena", new=AsyncMock()) as cambiar:
        with pytest.raises(HTTPException) as excinfo:
            await setup_handler(
                _build_request("/api/v2/auth/setup-password"),
                LoginRequest(cedula="1107068093", contrasena="ClaveSegura#2026"),
                _build_async_db_mock(),
                object(),
            )

    assert excinfo.value.status_code == 403
    cambiar.assert_not_called()


@pytest.mark.asyncio
async def test_setup_password_sin_usuario_local_erp_activo_crea_usuario_habilitado():
    from app.api.auth.public_auth_router import setup_password
    from app.models.auth.usuario import LoginRequest

    setup_handler = getattr(setup_password, "__wrapped__", setup_password)
    nuevo_usuario = SimpleNamespace(cedula="1107068093")

    with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula", new=AsyncMock(return_value=None)), \
         patch("app.services.auth.servicio.ServicioAuth.crear_usuario_portal_desde_erp", new=AsyncMock(return_value=nuevo_usuario)) as crear:
        respuesta = await setup_handler(
            _build_request("/api/v2/auth/setup-password"),
            LoginRequest(cedula="1107068093", contrasena="ClaveSegura#2026"),
            _build_async_db_mock(),
            object(),
        )

    assert respuesta == {
        "message": "Usuario creado y contraseña configurada exitosamente",
        "cedula": "1107068093",
    }
    crear.assert_awaited_once()


@pytest.mark.asyncio
async def test_validar_empleado_activo_autogestion_rechaza_estado_vacio():
    from app.services.erp.empleados_service import EmpleadosService

    with patch.object(
        EmpleadosService,
        "obtener_empleado_por_cedula",
        new=AsyncMock(return_value=_empleado_erp(estado=None)),
    ):
        respuesta = await EmpleadosService.validar_empleado_activo_autogestion(object(), "1107068093")

    assert respuesta is None


@pytest.mark.asyncio
async def test_obtener_empleado_por_cedula_solo_activos_no_devuelve_contrato_vacio():
    from app.services.erp.empleados_service import EmpleadosService

    class DbFake:
        def execute(self, query, params):
            return SimpleNamespace(first=lambda: SimpleNamespace(
                nrocedula="1107068093",
                nombre="Empleado Sin Contrato",
                cargo=None,
                area=None,
                estado=None,
                empresa=None,
                ciudadcontratacion=None,
                viaticante=None,
                baseviaticos=None,
                centrocosto=None,
                jefe=None,
                fecharetiro=None,
                riesgoarl=None,
                autoriza_he=None,
                salario=None,
                correocorporativo=None,
            ))

    assert await EmpleadosService.obtener_empleado_por_cedula(DbFake(), "1107068093") is None
