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
        with client.websocket_connect("/api/v2/auditoria/ws/dashboard?token=invalido123") as websocket:
            websocket.receive_text()
    assert exc_info.value.code == 1008
