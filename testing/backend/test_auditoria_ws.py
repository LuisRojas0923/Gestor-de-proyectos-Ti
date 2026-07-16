import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect

from app.main import app

def test_websocket_auditoria_dashboard_sin_token():
    client = TestClient(app)
    # FastAPI returns 422 Unprocessable Entity if a required query param is missing,
    # so we expect a WebSocketDisconnect or an exception related to 422/403.
    with pytest.raises(Exception) as exc_info:
        with client.websocket_connect("/api/v2/auditoria/ws/dashboard") as websocket:
            pass

def test_websocket_con_token_invalido():
    client = TestClient(app)
    # The endpoint will close the websocket with code 1008 because the token is invalid.
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/api/v2/auditoria/ws/dashboard", subprotocols=["invalido123"]) as websocket:
            websocket.receive_text()
    assert exc_info.value.code == 1008

from unittest.mock import patch, AsyncMock
from app.models.auth.usuario import Usuario

@patch("app.api.auditoria.router.ServicioAuth.obtener_payload_token")
@patch("app.api.auditoria.router.ServicioAuth.obtener_usuario_por_cedula")
@patch("app.api.auditoria.router.ServicioAuth.obtener_permisos_por_rol")
def test_websocket_rechaza_sin_permiso(mock_permisos, mock_usuario, mock_payload):
    mock_payload.return_value = {"sub": "123"}
    mock_usuario.return_value = Usuario(cedula="123", rol="invitado")
    mock_permisos.return_value = ["otro_modulo"]
    
    client = TestClient(app)
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/api/v2/auditoria/ws/dashboard", subprotocols=["token_valido"]) as websocket:
            websocket.receive_text()
    assert exc_info.value.code == 1008

@patch("app.api.auditoria.router.ServicioAuth.obtener_payload_token")
@patch("app.api.auditoria.router.ServicioAuth.obtener_usuario_por_cedula")
@patch("app.api.auditoria.router.ServicioAuth.obtener_permisos_por_rol")
def test_websocket_acepta_con_permiso(mock_permisos, mock_usuario, mock_payload):
    mock_payload.return_value = {"sub": "123"}
    mock_usuario.return_value = Usuario(cedula="123", rol="admin")
    mock_permisos.return_value = ["auditoria_sistema"]
    
    client = TestClient(app)
    with client.websocket_connect("/api/v2/auditoria/ws/dashboard", subprotocols=["token_valido"]) as websocket:
        # If it doesn't raise WebSocketDisconnect, it means it accepted the connection
        assert True
