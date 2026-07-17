"""Contratos de autorización HTTP incorporados por Fase 1P."""
import os
import subprocess
import sys
import tempfile
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.api.auth import profile_router
from app.models.auth.usuario import Usuario
from app.services.auth.servicio import ServicioAuth


def _request(method: str) -> Request:
    return Request({
        "type": "http",
        "method": method,
        "path": "/api/v2/auth/roles",
        "headers": [],
        "client": ("127.0.0.1", 1234),
        "scheme": "http",
        "server": ("test", 80),
    })


@pytest.mark.asyncio
async def test_token_mcp_no_puede_mutar_api_directa(monkeypatch):
    monkeypatch.setattr(
        ServicioAuth,
        "obtener_payload_token",
        Mock(return_value={
            "sub": "123", "token_type": "mcp", "jti": "jti-1", "scope": "read",
        }),
    )
    monkeypatch.setattr(
        profile_router,
        "validar_sesion_activa",
        AsyncMock(return_value=Mock(
            scope="read", ultima_actividad_en=None, fin_sesion=None,
        )),
    )

    with pytest.raises(HTTPException) as exc:
        await profile_router.obtener_usuario_actual_db(
            _request("POST"), "jwt", AsyncMock(), None
        )
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_scope_mcp_debe_coincidir_con_sesion(monkeypatch):
    monkeypatch.setattr(
        ServicioAuth,
        "obtener_payload_token",
        Mock(return_value={
            "sub": "123", "token_type": "mcp", "jti": "jti-1", "scope": "write",
        }),
    )
    monkeypatch.setattr(
        profile_router,
        "validar_sesion_activa",
        AsyncMock(return_value=Mock(scope="read", ultima_actividad_en=None)),
    )

    with pytest.raises(HTTPException) as exc:
        await profile_router.obtener_usuario_actual_db(
            _request("GET"), "jwt", AsyncMock(), None
        )
    assert exc.value.status_code == 401


def test_panel_control_exige_auth_y_no_recibe_jwt_por_query():
    source = (
        profile_router.__file__.replace("auth\\profile_router.py", "panel_control\\router.py")
    )
    with open(source, encoding="utf-8") as panel_file:
        panel = panel_file.read()
    assert "dependencies=[Depends(obtener_usuario_actual_db)]" in panel
    assert "requerir_admin_panel" in panel
    assert "token_sesion: str = Depends(ServicioAuth.oauth2_scheme)" in panel
    assert 'detail=str(e)' not in panel


def test_lockout_no_expone_cedula_en_storage_ni_logs():
    source = profile_router.__file__.replace(
        "api\\auth\\profile_router.py", "core\\rate_limiter.py"
    )
    with open(source, encoding="utf-8") as limiter_file:
        limiter = limiter_file.read()
    assert "lockout:{cedula}" not in limiter
    assert "login_fallos:{cedula}" not in limiter
    assert "cedula=%s" not in limiter


def test_modulos_rbac_no_se_mutan_directamente_desde_runtime():
    source = profile_router.__file__.replace(
        "profile_router.py", "config_router.py"
    )
    with open(source, encoding="utf-8") as config_file:
        config = config_file.read()
    assert "async def crear_modulo_sistema" not in config
    assert '@router.post("/init-modulos")' not in config
    assert "actualizar_modulo_protegido" in config
    assert "modulo.esta_activo =" not in config


def test_forgot_password_no_revela_estado_de_cuenta():
    with open(profile_router.__file__.replace("profile_router.py", "public_auth_router.py"), encoding="utf-8") as public_file:
        source = public_file.read()
    assert "usuario.correo_verificado" in source
    assert "El usuario no tiene un correo corporativo validado" not in source


def test_migrador_y_rbac_no_dependen_de_jwt_ni_estado_activo():
    root = profile_router.__file__.split("backend_v2")[0] + "backend_v2\\app\\"
    with open(root + "core\\migrations\\bootstrap_admin.py", encoding="utf-8") as file:
        bootstrap = file.read()
    with open(root + "services\\auth\\rbac_discovery.py", encoding="utf-8") as file:
        discovery = file.read()
    assert "app.services.auth.servicio" not in bootstrap
    assert 'Usuario.rol == "admin"' in bootstrap
    assert "WHERE esta_activo = TRUE AND id = ANY(:modulos)" not in discovery
    env = os.environ.copy()
    env.update({"PYTHONPATH": root.rsplit("app\\", 1)[0], "ENVIRONMENT": "production"})
    env.pop("JWT_SECRET_KEY", None)
    result = subprocess.run(
        [sys.executable, "-c", "import app.services.auth.rbac_discovery"], env=env,
        cwd=tempfile.gettempdir(), capture_output=True, text=True, check=False,
    )
    assert result.returncode == 0, result.stderr


def test_desbloqueo_usa_identificador_hasheado():
    with open(profile_router.__file__.replace("profile_router.py", "admin_router.py"), encoding="utf-8") as file:
        source = file.read()
    assert "_identificador_cedula(usuario.cedula" in source
    assert "login*:{usuario.cedula" not in source
