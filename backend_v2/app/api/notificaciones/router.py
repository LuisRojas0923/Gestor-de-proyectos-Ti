"""
API de Notificaciones - Backend V2
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import obtener_db
from app.models.alerta.notificacion import (
    NotificacionUsuario,
    NotificacionUsuarioCrear,
    NotificacionUsuarioActualizar
)
from app.services.notificacion.servicio import ServicioNotificacion
from app.services.notificacion.ws_manager import notification_manager

router = APIRouter()

@router.post("/", response_model=NotificacionUsuario)
async def crear_notificacion(
    notificacion: NotificacionUsuarioCrear,
    db: AsyncSession = Depends(obtener_db)
):
    """Crea una nueva notificación para un usuario"""
    return await ServicioNotificacion.crear_notificacion(db, notificacion)

@router.get("/usuario/{usuario_id}", response_model=List[NotificacionUsuario])
async def listar_notificaciones_usuario(
    usuario_id: str,
    db: AsyncSession = Depends(obtener_db)
):
    """Obtiene el listado de notificaciones para un usuario específico"""
    return await ServicioNotificacion.listar_notificaciones_usuario(db, usuario_id)

@router.put("/{notificacion_id}/leido", response_model=NotificacionUsuario)
async def actualizar_estado_leido(
    notificacion_id: int,
    actualizar: NotificacionUsuarioActualizar,
    db: AsyncSession = Depends(obtener_db)
):
    """Actualiza el estado leído/no leído de una notificación"""
    db_notif = await ServicioNotificacion.actualizar_estado_leido(db, notificacion_id, actualizar)
    if not db_notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return db_notif

@router.websocket("/ws/{usuario_id}")
async def websocket_notificaciones(websocket: WebSocket, usuario_id: str):
    """Canal WebSocket para notificaciones personales de un usuario en tiempo real"""
    await notification_manager.connect(websocket, usuario_id)
    try:
        while True:
            # Mantener conexión y descartar mensajes entrantes (solo para push del servidor)
            _ = await websocket.receive_text()
    except Exception:
        # Errores de desconexión controlados
        pass
    finally:
        notification_manager.disconnect(websocket, usuario_id)
