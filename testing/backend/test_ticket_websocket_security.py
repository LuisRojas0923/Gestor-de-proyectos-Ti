from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from importlib import import_module

import pytest
from fastapi import WebSocketDisconnect

tickets_api = import_module("app.api.tickets.websocket_router")
from app.services.ticket.ws_manager import TicketConnectionManager


class WebSocketFalso:
    def __init__(self, protocolos="tickets.v1", origen="https://portal.example.com"):
        self.headers = {
            "origin": origen,
            "sec-websocket-protocol": protocolos,
        }
        self.close = AsyncMock()
        self.receive_text = AsyncMock(side_effect=WebSocketDisconnect())


class ContextoSesionFalso:
    def __init__(self, db):
        self.db = db

    async def __aenter__(self):
        return self.db

    async def __aexit__(self, *_args):
        return False


@pytest.mark.asyncio
async def test_websocket_ticket_rechaza_conexion_sin_ticket_efimero(monkeypatch):
    websocket = WebSocketFalso()
    monkeypatch.setattr(tickets_api, "origen_websocket_permitido", lambda _origen: True)
    monkeypatch.setattr(tickets_api.manager, "connect", AsyncMock())

    await tickets_api.websocket_ticket_chat(websocket, "TKT-0001")

    websocket.close.assert_awaited_once_with(code=1008)
    tickets_api.manager.connect.assert_not_awaited()


@pytest.mark.asyncio
async def test_websocket_ticket_rechaza_sesion_inactiva(monkeypatch):
    websocket = WebSocketFalso("tickets.v1, ticket.efimero")
    db = SimpleNamespace()
    monkeypatch.setattr(tickets_api, "origen_websocket_permitido", lambda _origen: True)
    monkeypatch.setattr(
        tickets_api.notification_manager,
        "consumir_ticket_ws",
        AsyncMock(return_value={
            "usuario_id": "USR-1",
            "sesion_hash": "hash-sesion",
            "origen": "https://portal.example.com",
        }),
    )
    monkeypatch.setattr(tickets_api, "AsyncSessionLocal", lambda: ContextoSesionFalso(db))
    monkeypatch.setattr(tickets_api, "validar_sesion_hash_activa", AsyncMock(return_value=None))
    monkeypatch.setattr(tickets_api.manager, "connect", AsyncMock())

    await tickets_api.websocket_ticket_chat(websocket, "TKT-0001")

    websocket.close.assert_awaited_once_with(code=1008)
    tickets_api.manager.connect.assert_not_awaited()


@pytest.mark.asyncio
async def test_websocket_ticket_admite_propietario_autenticado(monkeypatch):
    websocket = WebSocketFalso("tickets.v1, ticket.efimero")
    db = SimpleNamespace()
    monkeypatch.setattr(tickets_api, "origen_websocket_permitido", lambda _origen: True)
    monkeypatch.setattr(
        tickets_api.notification_manager,
        "consumir_ticket_ws",
        AsyncMock(return_value={
            "usuario_id": "USR-1",
            "sesion_hash": "hash-sesion",
            "origen": "https://portal.example.com",
        }),
    )
    monkeypatch.setattr(tickets_api, "AsyncSessionLocal", lambda: ContextoSesionFalso(db))
    monkeypatch.setattr(
        tickets_api,
        "validar_sesion_hash_activa",
        AsyncMock(return_value=SimpleNamespace(usuario_id="USR-1")),
    )
    monkeypatch.setattr(
        tickets_api,
        "usuario_puede_acceder_ticket",
        AsyncMock(return_value=True),
        raising=False,
    )
    monkeypatch.setattr(tickets_api.manager, "connect", AsyncMock())
    monkeypatch.setattr(tickets_api.manager, "disconnect", Mock())

    await tickets_api.websocket_ticket_chat(websocket, "TKT-0001")

    tickets_api.manager.connect.assert_awaited_once_with(
        websocket,
        "TKT-0001",
        "tickets.v1",
        "USR-1",
        "hash-sesion",
    )
    tickets_api.manager.disconnect.assert_called_once_with(websocket, "TKT-0001")


@pytest.mark.asyncio
async def test_websocket_ticket_revocado_cierra_antes_de_enviar(monkeypatch):
    manager = TicketConnectionManager()

    class ConexionEventoFalsa:
        def __init__(self):
            self.send_text = AsyncMock()
            self.close = AsyncMock()

    websocket = ConexionEventoFalsa()
    manager.active_connections = {"TKT-0001": [websocket]}
    manager.connection_identities = {
        websocket: ("USR-1", "hash-revocado"),
    }
    monkeypatch.setattr(
        manager,
        "_conexion_autorizada",
        AsyncMock(return_value=False),
        raising=False,
    )

    await manager._send_local_broadcast("TKT-0001", {"type": "ticket_updated"})

    websocket.close.assert_awaited_once_with(code=1008)
    websocket.send_text.assert_not_awaited()
    assert "TKT-0001" not in manager.active_connections
