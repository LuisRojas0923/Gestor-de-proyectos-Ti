"""API privada de notificaciones del usuario actual."""
import asyncio
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, WebSocket
from fastapi.websockets import WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.profile_router import obtener_usuario_actual_db
from app.core.rate_limiter import limiter
from app.database import AsyncSessionLocal, obtener_db
from app.models.alerta.notificacion import (
    NotificacionUsuario,
    NotificacionUsuarioActualizar
)
from app.models.auth.usuario import Usuario
from app.services.auth.sesion_service import (
    hash_token_sesion,
    validar_sesion_hash_activa,
)
from app.services.notificacion.servicio import ServicioNotificacion
from app.services.notificacion.ws_manager import notification_manager
from app.services.notificacion.ws_security import (
    extraer_ticket_subprotocolo as _extraer_ticket_subprotocolo,
    origen_websocket_permitido as _origen_websocket_permitido,
)

router = APIRouter()


@router.get("/mias", response_model=List[NotificacionUsuario])
async def listar_notificaciones_propias(
    response: Response,
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    response.headers["Cache-Control"] = "no-store, private"
    response.headers["Pragma"] = "no-cache"
    return await ServicioNotificacion.listar_notificaciones_usuario(
        db, usuario.id, limit=limit
    )

@router.put("/mias/{notificacion_id}/leido", response_model=NotificacionUsuario)
async def actualizar_estado_leido(
    notificacion_id: int,
    actualizar: NotificacionUsuarioActualizar,
    db: AsyncSession = Depends(obtener_db),
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    db_notif = await ServicioNotificacion.actualizar_estado_leido_propio(
        db,
        notificacion_id=notificacion_id,
        usuario_id=usuario.id,
        leido=actualizar.leido,
    )
    if not db_notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    await db.commit()
    await db.refresh(db_notif)
    return db_notif


@router.post("/ws-ticket")
@limiter.limit("12/minute")
async def emitir_ticket_websocket(
    request: Request,
    response: Response,
    usuario: Usuario = Depends(obtener_usuario_actual_db),
):
    origen = request.headers.get("origin") or ""
    if not _origen_websocket_permitido(origen):
        raise HTTPException(status_code=403, detail="Origen no permitido")
    auth_header = request.headers.get("authorization") or ""
    if not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sesión no autenticada")
    token = auth_header.split(" ", 1)[1].strip()
    try:
        ticket = await notification_manager.emitir_ticket_ws(
            usuario.id,
            hash_token_sesion(token),
            origen.rstrip("/").lower(),
        )
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Canal de notificaciones no disponible",
        )
    response.headers["Cache-Control"] = "no-store, private"
    response.headers["Pragma"] = "no-cache"
    return {
        "ticket": ticket,
        "expira_en_segundos": notification_manager.ticket_ttl_seconds,
    }


@router.websocket("/ws")
async def websocket_notificaciones(
    websocket: WebSocket,
):
    origen = (websocket.headers.get("origin") or "").rstrip("/").lower()
    if not _origen_websocket_permitido(origen):
        await websocket.close(code=1008)
        return
    subprotocolo, ticket = _extraer_ticket_subprotocolo(
        websocket.headers.get("sec-websocket-protocol") or ""
    )
    if not subprotocolo or not ticket:
        await websocket.close(code=1008)
        return
    try:
        identidad = await notification_manager.consumir_ticket_ws(ticket)
    except Exception:
        await websocket.close(code=1013)
        return
    if not identidad:
        await websocket.close(code=1008)
        return
    if identidad["origen"] != origen:
        await websocket.close(code=1008)
        return
    try:
        async with AsyncSessionLocal() as db:
            sesion = await validar_sesion_hash_activa(db, identidad["sesion_hash"])
    except Exception:
        await websocket.close(code=1013)
        return
    if not sesion or sesion.usuario_id != identidad["usuario_id"]:
        await websocket.close(code=1008)
        return

    usuario_id = identidad["usuario_id"]
    conectada = await notification_manager.connect(
        websocket,
        usuario_id,
        identidad["sesion_hash"],
        subprotocolo,
    )
    if not conectada:
        return
    try:
        while True:
            try:
                _ = await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                activa = await notification_manager.sesion_esta_activa(
                    usuario_id, identidad["sesion_hash"]
                )
                if not activa:
                    await websocket.close(code=1008)
                    break
    except WebSocketDisconnect:
        pass
    finally:
        notification_manager.disconnect(websocket, usuario_id)
