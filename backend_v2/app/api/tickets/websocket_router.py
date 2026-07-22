"""Canal WebSocket privado para eventos de tickets."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.database import AsyncSessionLocal
from app.services.auth.sesion_service import validar_sesion_hash_activa
from app.services.notificacion.ws_manager import notification_manager
from app.services.notificacion.ws_security import (
    extraer_ticket_subprotocolo,
    origen_websocket_permitido,
)
from app.services.ticket.access_service import usuario_puede_acceder_ticket
from app.services.ticket.ws_manager import manager

router = APIRouter()


@router.websocket("/ws/{ticket_id}")
async def websocket_ticket_chat(websocket: WebSocket, ticket_id: str):
    origen = (websocket.headers.get("origin") or "").rstrip("/").lower()
    if not origen_websocket_permitido(origen):
        await websocket.close(code=1008)
        return
    subprotocolo, ticket = extraer_ticket_subprotocolo(
        websocket.headers.get("sec-websocket-protocol") or "",
        "tickets.v1",
    )
    if not subprotocolo or not ticket:
        await websocket.close(code=1008)
        return
    try:
        identidad = await notification_manager.consumir_ticket_ws(ticket)
    except Exception:
        await websocket.close(code=1013)
        return
    if not identidad or identidad["origen"] != origen:
        await websocket.close(code=1008)
        return
    try:
        async with AsyncSessionLocal() as db:
            sesion = await validar_sesion_hash_activa(db, identidad["sesion_hash"])
            autorizada = bool(
                sesion
                and sesion.usuario_id == identidad["usuario_id"]
                and await usuario_puede_acceder_ticket(
                    db, ticket_id, identidad["usuario_id"]
                )
            )
    except Exception:
        await websocket.close(code=1013)
        return
    if not autorizada:
        await websocket.close(code=1008)
        return

    await manager.connect(
        websocket, ticket_id, subprotocolo,
        identidad["usuario_id"], identidad["sesion_hash"],
    )
    try:
        while True:
            await websocket.receive_text()
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        manager.disconnect(websocket, ticket_id)
