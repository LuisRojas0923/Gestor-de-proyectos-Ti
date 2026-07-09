"""
Test unit para JIT con autogestion validada contra ERP activo.

Cubre que usuarios creados por JIT queden activos solo si ERP confirma contrato
activo, pero sin entregar token hasta configurar contraseña.
NO requiere Docker ni DB real. Pico RAM ~100MB.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from fastapi.security import OAuth2PasswordRequestForm


def _build_form_data(username: str, password: str) -> OAuth2PasswordRequestForm:
    return OAuth2PasswordRequestForm(username=username, password=password, scope="")


def _build_request():
    from starlette.requests import Request
    scope = {
        "type": "http", "method": "POST", "path": "/api/v2/auth/login",
        "headers": [], "client": ("127.0.0.1", 5000), "query_string": b"",
    }
    return Request(scope)


def _build_empleado_erp() -> dict:
    return {
        "nombre": "EMPLEADO JIT",
        "viaticante": False,
        "area": "TI", "cargo": "DEV", "ciudadcontratacion": "Bogotá",
        "centrocosto": "001", "baseviaticos": 100000,
        "correocorporativo": "jit@empresa.com",
    }


def _build_async_db_mock():
    """
    SQLAlchemy AsyncSession tiene métodos sync (add, flush) y async (commit, rollback).
    AsyncMock hace TODO async → db.add() devuelve coroutine y rompe el código.
    MagicMock hace TODO sync → db.rollback() no es awaitable.
    Solución: MagicMock base con commit/rollback explícitamente AsyncMock.
    """
    db = MagicMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    return db


class TestJitApprovalFlag:
    """Verifica que JIT ya no depende de jit_auto_aprobar para autogestion."""

    @pytest.mark.asyncio
    async def test_jit_auto_aprobar_false_crea_usuario_activo_y_retorna_400_password_not_set(self):
        """ERP activo: se crea activo y se exige configurar contraseña."""
        from app.api.auth.login_router import login
        login_handler = getattr(login, "__wrapped__", login)

        form = _build_form_data(username="1107068093", password="ClaveSegura#2026")
        request = _build_request()
        db = _build_async_db_mock()
        db_erp = AsyncMock()

        captured_usuario = {}

        def _capture_add(usuario):
            captured_usuario["obj"] = usuario

        db.add.side_effect = _capture_add

        with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula",
                   new=AsyncMock(return_value=None)), \
             patch("app.services.erp.empleados_service.EmpleadosService.validar_empleado_activo_autogestion",
                    new=AsyncMock(return_value=_build_empleado_erp())), \
             patch("app.services.auth.servicio.ServicioAuth.obtener_hash_contrasena",
                   return_value="$2b$04$fakehash"), \
             patch("app.api.auth.login_router.obtener_configuracion") as mock_cfg:
            mock_cfg.return_value.jit_auto_aprobar = False
            mock_cfg.return_value.portal_pending_pwd = "test_pending"

            with pytest.raises(HTTPException) as excinfo:
                await login_handler(request, form, db, db_erp)

            assert excinfo.value.status_code == 400
            assert excinfo.value.headers.get("X-Password-Not-Set") == "true"

            # El usuario SÍ fue creado (db.add fue llamado)
            db.add.assert_called_once()
            assert captured_usuario["obj"].esta_activo is True

    @pytest.mark.asyncio
    async def test_jit_auto_aprobar_true_crea_usuario_activo_y_retorna_400_password_not_set(self):
        """El flag true conserva la misma respuesta: contraseña no configurada."""
        from app.api.auth.login_router import login
        login_handler = getattr(login, "__wrapped__", login)

        form = _build_form_data(username="1107068093", password="ClaveSegura#2026")
        request = _build_request()
        db = _build_async_db_mock()
        db_erp = AsyncMock()

        captured_usuario = {}

        def _capture_add(usuario):
            captured_usuario["obj"] = usuario

        db.add.side_effect = _capture_add

        with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula",
                   new=AsyncMock(return_value=None)), \
             patch("app.services.erp.empleados_service.EmpleadosService.validar_empleado_activo_autogestion",
                   new=AsyncMock(return_value=_build_empleado_erp())), \
             patch("app.services.auth.servicio.ServicioAuth.obtener_hash_contrasena",
                   return_value="$2b$04$fakehash"), \
             patch("app.api.auth.login_router.obtener_configuracion") as mock_cfg:
            mock_cfg.return_value.jit_auto_aprobar = True
            mock_cfg.return_value.portal_pending_pwd = "test_pending"

            with pytest.raises(HTTPException) as excinfo:
                await login_handler(request, form, db, db_erp)

            # 400 PASSWORD_NOT_SET: usuario activo pero sin contraseña
            assert excinfo.value.status_code == 400
            assert "contraseña no configurada" in excinfo.value.detail.lower() or \
                   "Contrasena no configurada" in excinfo.value.detail

            # Header X-Password-Not-Set presente (señal al frontend para abrir PasswordSetupModal)
            assert excinfo.value.headers is not None
            assert excinfo.value.headers.get("X-Password-Not-Set") == "true"

            # Usuario creado con esta_activo=True
            assert captured_usuario["obj"].esta_activo is True, \
                "El usuario JIT confirmado por ERP debe quedar activo"

    @pytest.mark.asyncio
    async def test_jit_default_es_false_incluso_sin_flag(self):
        """Defensa en profundidad: si alguien borra el flag del .env, el default
        en código debe ser False. Verificamos que Settings() sin jit_auto_aprobar
        explícito retorna False."""
        from app.core.config import Settings

        s = Settings(entorno="desarrollo")
        assert s.jit_auto_aprobar is False, \
            "Default de jit_auto_aprobar debe ser False (política de aprobación)"


class TestJitIntegrityError:
    """Cubre F2.2: race condition en JIT (C4).
    Si dos requests concurrentes intentan crear el mismo usuario, el segundo
    debe capturar IntegrityError, hacer rollback, y continuar con el flujo
    normal (no retornar 500)."""

    @pytest.mark.asyncio
    async def test_integrity_error_hace_rollback_y_relee_usuario(self):
        """Si db.commit() lanza IntegrityError, el endpoint debe:
        1. Hacer rollback
        2. Releer el usuario (que ya fue creado por el request concurrente)
        3. NO retornar 500 — continúa con el flujo normal de validación"""
        from app.api.auth.login_router import login
        login_handler = getattr(login, "__wrapped__", login)
        from sqlalchemy.exc import IntegrityError

        form = _build_form_data(username="1107068093", password="ClaveSegura#2026")
        request = _build_request()
        db = _build_async_db_mock()
        db_erp = AsyncMock()

        # El commit falla con IntegrityError (race condition con request concurrente)
        db.commit.side_effect = IntegrityError("duplicate key", params=None, orig=Exception("dup"))

        # Mock del usuario re-leído después del rollback
        usuario_existente = MagicMock()
        usuario_existente.cedula = "1107068093"
        usuario_existente.esta_activo = True
        usuario_existente.hash_contrasena = "PORTAL_PENDING_PWD"  # aún sin configurar

        call_count = [0]

        async def _obtener_usuario_side_effect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return None  # 1ra: no existe → intenta crear
            return usuario_existente  # 2da (post-rollback): ya existe

        with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula",
                   new=AsyncMock(side_effect=_obtener_usuario_side_effect)), \
             patch("app.services.erp.empleados_service.EmpleadosService.validar_empleado_activo_autogestion",
                   new=AsyncMock(return_value=_build_empleado_erp())), \
             patch("app.services.auth.servicio.ServicioAuth.obtener_hash_contrasena",
                   return_value="$2b$04$fakehash"), \
             patch("app.services.auth.servicio.ServicioAuth.es_password_configurado",
                   return_value=False), \
             patch("app.api.auth.login_router.obtener_configuracion") as mock_cfg:
            mock_cfg.return_value.jit_auto_aprobar = True
            mock_cfg.return_value.portal_pending_pwd = "test_pending"

            with pytest.raises(HTTPException) as excinfo:
                await login_handler(request, form, db, db_erp)

            # Crítico: se hizo rollback
            db.rollback.assert_called_once()

            assert excinfo.value.status_code == 400
            assert excinfo.value.headers.get("X-Password-Not-Set") == "true"

    @pytest.mark.asyncio
    async def test_integrity_error_sin_usuario_releido_retorna_500(self):
        """Si después del rollback no se puede recuperar el usuario (caso
        patológico extremo), el endpoint retorna 500 con mensaje claro."""
        from app.api.auth.login_router import login
        login_handler = getattr(login, "__wrapped__", login)
        from sqlalchemy.exc import IntegrityError

        form = _build_form_data(username="1107068093", password="ClaveSegura#2026")
        request = _build_request()
        db = _build_async_db_mock()
        db_erp = AsyncMock()

        db.commit.side_effect = IntegrityError("duplicate key", params=None, orig=Exception("dup"))

        with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula",
                   new=AsyncMock(return_value=None)), \
             patch("app.services.erp.empleados_service.EmpleadosService.validar_empleado_activo_autogestion",
                   new=AsyncMock(return_value=_build_empleado_erp())), \
             patch("app.services.auth.servicio.ServicioAuth.obtener_hash_contrasena",
                   return_value="$2b$04$fakehash"), \
             patch("app.api.auth.login_router.obtener_configuracion") as mock_cfg:
            mock_cfg.return_value.jit_auto_aprobar = True
            mock_cfg.return_value.portal_pending_pwd = "test_pending"

            with pytest.raises(HTTPException) as excinfo:
                await login_handler(request, form, db, db_erp)

            db.rollback.assert_called_once()
            assert excinfo.value.status_code == 500
            assert "jit" in excinfo.value.detail.lower() or "crear" in excinfo.value.detail.lower()


class TestJitIdempotencia:
    """Verifica que re-intentar login con la misma cédula nueva no rompe."""

    @pytest.mark.asyncio
    async def test_segundo_intento_con_mismo_usuario_no_lo_recrea(self):
        """Si el usuario ya existe (fue creado en un intento anterior), el
        segundo intento NO debe pasar por la rama JIT. Debe ir al path
        'usuario existe → validar contraseña' (que fallará porque no tiene
        contraseña configurada → 400 PASSWORD_NOT_SET)."""
        from app.api.auth.login_router import login
        login_handler = getattr(login, "__wrapped__", login)

        form = _build_form_data(username="1107068093", password="ClaveSegura#2026")
        request = _build_request()
        db = AsyncMock()
        db_erp = AsyncMock()

        # Usuario ya existe (segundo intento)
        usuario_existente = AsyncMock()
        usuario_existente.cedula = "1107068093"
        usuario_existente.esta_activo = True
        usuario_existente.hash_contrasena = "PORTAL_PENDING_PWD"  # no configurada

        with patch("app.services.auth.servicio.ServicioAuth.obtener_usuario_por_cedula",
                   new=AsyncMock(return_value=usuario_existente)), \
             patch("app.api.auth.login_router.obtener_configuracion") as mock_cfg:
            mock_cfg.return_value.jit_auto_aprobar = True
            mock_cfg.return_value.portal_pending_pwd = "test_pending"

            with pytest.raises(HTTPException) as excinfo:
                await login_handler(request, form, db, db_erp)

            # NO se intentó crear de nuevo (db.add NO debe ser llamado)
            db.add.assert_not_called()

            # Y se llegó al path normal: 400 PASSWORD_NOT_SET
            assert excinfo.value.status_code == 400
            assert "contraseña no configurada" in excinfo.value.detail.lower() or \
                   "Contrasena no configurada" in excinfo.value.detail
