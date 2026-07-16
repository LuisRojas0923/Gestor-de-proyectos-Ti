import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect

from app.main import app
from unittest.mock import patch, AsyncMock, MagicMock
from app.models.auth.usuario import Usuario
from app.services.auth.servicio import ServicioAuth
from datetime import datetime, timedelta

def test_websocket_auditoria_dashboard_sin_token():
    client = TestClient(app)
    with pytest.raises(Exception):
        with client.websocket_connect("/api/v2/auditoria/ws/dashboard") as websocket:
            pass

def test_websocket_con_token_invalido():
    client = TestClient(app)
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/api/v2/auditoria/ws/dashboard", subprotocols=["invalido123"]) as websocket:
            websocket.receive_text()
    assert exc_info.value.code == 1008

@pytest.mark.asyncio
async def test_validar_token_ws_mcp_revocado():
    mock_db = AsyncMock()
    # Simular token MCP pero sesión no existe
    with patch.object(ServicioAuth, 'obtener_payload_token', return_value={"sub": "123", "token_type": "mcp", "jti": "jti-1"}):
        # mock db.execute().scalars().first() to return None
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = None
        mock_db.execute.return_value = mock_result

        usuario, error = await ServicioAuth.validar_token_ws(mock_db, "token")
        assert usuario is None
        assert "revocado" in error.lower()

@pytest.mark.asyncio
async def test_validar_token_ws_usuario_inactivo():
    mock_db = AsyncMock()
    with patch.object(ServicioAuth, 'obtener_payload_token', return_value={"sub": "123", "token_type": "session"}):
        with patch.object(ServicioAuth, 'obtener_usuario_por_cedula', return_value=Usuario(cedula="123", esta_activo=False)):
            usuario, error = await ServicioAuth.validar_token_ws(mock_db, "token")
            assert usuario is None
            assert error == "Usuario inactivo"

@pytest.mark.asyncio
async def test_validar_token_ws_sin_permiso():
    mock_db = AsyncMock()
    with patch.object(ServicioAuth, 'obtener_payload_token', return_value={"sub": "123", "token_type": "session"}):
        with patch.object(ServicioAuth, 'obtener_usuario_por_cedula', return_value=Usuario(cedula="123", esta_activo=True, rol="invitado")):
            with patch.object(ServicioAuth, 'obtener_permisos_por_rol', return_value=["otro_modulo"]):
                usuario, error = await ServicioAuth.validar_token_ws(mock_db, "token", modulo_requerido="auditoria_sistema")
                assert usuario is None
                assert "Sin permiso" in error

@pytest.mark.asyncio
async def test_validar_token_ws_conexion_valida():
    mock_db = AsyncMock()
    test_user = Usuario(cedula="123", esta_activo=True, rol="admin")
    with patch.object(ServicioAuth, 'obtener_payload_token', return_value={"sub": "123", "token_type": "session"}):
        with patch.object(ServicioAuth, 'obtener_usuario_por_cedula', return_value=test_user):
            with patch.object(ServicioAuth, 'obtener_permisos_por_rol', return_value=["auditoria_sistema"]):
                usuario, error = await ServicioAuth.validar_token_ws(mock_db, "token", modulo_requerido="auditoria_sistema")
                assert usuario == test_user
                assert error is None

@patch("app.api.auditoria.router.ServicioAuth.validar_token_ws")
def test_websocket_integracion_acepta(mock_validar):
    # Simulamos que la validacion pasa
    mock_validar.return_value = (Usuario(cedula="123", esta_activo=True, rol="admin"), None)
    client = TestClient(app)
    with client.websocket_connect("/api/v2/auditoria/ws/dashboard", subprotocols=["token_valido"]) as websocket:
        assert True
