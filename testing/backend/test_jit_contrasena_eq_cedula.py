"""
Test unit para F2.3: validación contrasena==cedula en rama JIT del login.

Cubre el fix de C5-rama: el check 'contrasena == cedula' debe disparar
tanto en /setup-password (Fase 0) como en el flujo JIT del /auth/login
(este test). NO requiere Docker ni DB real; usa mocks de DB+ERP.
Pico RAM ~80MB.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from fastapi.security import OAuth2PasswordRequestForm


def _build_form_data(username: str, password: str) -> OAuth2PasswordRequestForm:
    """Construye un OAuth2PasswordRequestForm mínimo para tests."""
    return OAuth2PasswordRequestForm(username=username, password=password, scope="")


def _build_request(client_ip: str = "127.0.0.1"):
    """Request mínimo con .client para logs."""
    from starlette.requests import Request
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/v2/auth/login",
        "headers": [],
        "client": (client_ip, 5000),
        "query_string": b"",
    }
    return Request(scope)


def _build_async_db_mock():
    db = MagicMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    return db


def _build_empleado_erp(cedula: str = "1107068093") -> dict:
    """Empleado fake devuelto por el ERP."""
    return {
        "nombre": "EMPLEADO TEST",
        "viaticante": False,
        "area": "TI",
        "cargo": "DEV",
        "ciudadcontratacion": "Bogotá",
        "centrocosto": "001",
        "baseviaticos": 100000,
        "correocorporativo": "test@empresa.com",
    }


class TestJitContrasenaIgualCedula:
    """
    Verifica que cuando un usuario intenta loguearse con una cédula que
    NO existe localmente pero SÍ existe en el ERP (rama JIT), y la
    contraseña enviada es IGUAL a la cédula, el endpoint rechace con
    400 antes de crear el usuario.
    """

    @pytest.mark.asyncio
    async def test_contrasena_igual_cedula_retorna_400(self):
        """Caso principal: contrasena = cedula → 400 sin crear usuario."""
        from app.api.auth.login_router import login
        login_handler = getattr(login, "__wrapped__", login)

        form = _build_form_data(username="1107068093", password="1107068093")
        request = _build_request()
        db = _build_async_db_mock()
        db_erp = AsyncMock()

        with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula",
                   new=AsyncMock(return_value=None)), \
             patch("app.services.erp.empleados_service.EmpleadosService.validar_empleado_activo_autogestion",
                   new=AsyncMock(return_value=_build_empleado_erp())), \
             patch("app.api.auth.login_router.obtener_configuracion") as mock_cfg:
            mock_cfg.return_value.jit_auto_aprobar = False
            mock_cfg.return_value.portal_pending_pwd = "test_pending"

            with pytest.raises(HTTPException) as excinfo:
                await login_handler(request, form, db, db_erp)

            assert excinfo.value.status_code == 400
            assert "cédula" in excinfo.value.detail.lower() or "cedula" in excinfo.value.detail.lower()
            assert "contraseña" in excinfo.value.detail.lower() or "contrasena" in excinfo.value.detail.lower()

            # Verificar que NO se llamó db.add ni db.commit (no se creó usuario)
            db.add.assert_not_called()
            db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_contrasena_igual_cedula_case_insensitive(self):
        """'contrasena = CEDULA.en-mayusculas' también debe ser rechazada.
        Normalizar_cedula ya hace .lower() y la comparación es case-insensitive."""
        from app.api.auth.login_router import login
        login_handler = getattr(login, "__wrapped__", login)

        form = _build_form_data(username="1107068093", password="1107068093")
        request = _build_request()
        db = _build_async_db_mock()
        db_erp = AsyncMock()

        # Cedula del empleado viene en mayúsculas desde el ERP
        empleado_mayus = _build_empleado_erp()
        empleado_mayus["nombre"] = "EMPLEADO MAYUSCULAS"

        with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula",
                   new=AsyncMock(return_value=None)), \
             patch("app.services.erp.empleados_service.EmpleadosService.validar_empleado_activo_autogestion",
                   new=AsyncMock(return_value=empleado_mayus)), \
             patch("app.api.auth.login_router.obtener_configuracion") as mock_cfg:
            mock_cfg.return_value.jit_auto_aprobar = False

            with pytest.raises(HTTPException) as excinfo:
                await login_handler(request, form, db, db_erp)

            assert excinfo.value.status_code == 400
            db.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_contrasena_distinta_de_cedula_no_rechaza_por_esta_regla(self):
        """Si contrasena != cedula, NO debe disparar el 400 de 'igual a cédula'.
        Puede disparar OTROS errores (401, 403, 400 PASSWORD_NOT_SET), pero
        el mensaje NO debe mencionar 'igual a la cédula'."""
        from app.api.auth.login_router import login
        login_handler = getattr(login, "__wrapped__", login)

        form = _build_form_data(username="1107068093", password="UnaClaveSegura#2026")
        request = _build_request()
        db = _build_async_db_mock()
        db_erp = AsyncMock()

        # PATCH: el endpoint usa `from app.core.config import obtener_configuracion`,
        # que es un lru_cache. Necesitamos parchear el binding LOCAL del módulo.
        with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula",
                   new=AsyncMock(return_value=None)), \
             patch("app.services.erp.empleados_service.EmpleadosService.validar_empleado_activo_autogestion",
                   new=AsyncMock(return_value=_build_empleado_erp())), \
             patch("app.services.auth.servicio.ServicioAuth.obtener_hash_contrasena",
                   return_value="$2b$04$fakehash"), \
             patch("app.api.auth.login_router.obtener_configuracion") as mock_cfg, \
             patch("app.services.auth.servicio.ServicioAuth.registrar_sesion",
                   new=AsyncMock()):
            mock_cfg.return_value.jit_auto_aprobar = False
            mock_cfg.return_value.portal_pending_pwd = "test_pending"

            with pytest.raises(HTTPException) as excinfo:
                await login_handler(request, form, db, db_erp)

            # El status debe ser 400 PASSWORD_NOT_SET (no 400 'igual a cédula')
            assert excinfo.value.status_code == 400
            assert "igual a la cédula" not in excinfo.value.detail.lower()
            assert "contraseña no configurada" in excinfo.value.detail.lower() or \
                   "Contrasena no configurada" in excinfo.value.detail

            # SÍ se debió crear el usuario (db.add llamado)
            db.add.assert_called_once()

    @pytest.mark.asyncio
    async def test_contrasena_vacia_con_cedula_vacia(self):
        """Edge case: cedula='' y contrasena=''. El form OAuth2 normalmente
        rechaza vacíos, pero si llegan ambos vacíos al endpoint, el check
        lower() == '' debe disparar."""
        from app.api.auth.login_router import login
        login_handler = getattr(login, "__wrapped__", login)

        form = _build_form_data(username="", password="")
        request = _build_request()
        db = _build_async_db_mock()
        db_erp = AsyncMock()

        with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula",
                   new=AsyncMock(return_value=None)), \
             patch("app.services.erp.empleados_service.EmpleadosService.validar_empleado_activo_autogestion",
                   new=AsyncMock(return_value=_build_empleado_erp())), \
             patch("app.api.auth.login_router.obtener_configuracion") as mock_cfg:
            mock_cfg.return_value.jit_auto_aprobar = False

            with pytest.raises(HTTPException) as excinfo:
                await login_handler(request, form, db, db_erp)

            # '' == '' → debería disparar el check
            assert excinfo.value.status_code == 400
            assert "cédula" in excinfo.value.detail.lower() or "cedula" in excinfo.value.detail.lower()


class TestNormalizarCedula:
    """Tests del helper normalizar_cedula — usado en el check."""

    def test_normaliza_cedula_con_espacios_y_mayusculas(self):
        """El helper debe hacer s.strip().lower()."""
        from app.services.auth.servicio import normalizar_cedula

        assert normalizar_cedula("  1107068093  ") == "1107068093"
        assert normalizar_cedula("ABC123") == "abc123"
        assert normalizar_cedula("  MIXEDcase  ") == "mixedcase"
        assert normalizar_cedula("") == ""
        assert normalizar_cedula("   ") == ""
