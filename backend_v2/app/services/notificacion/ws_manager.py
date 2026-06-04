import asyncio
import json
import logging
from typing import Dict, List
from fastapi import WebSocket
import redis.asyncio as redis
from app.config import config

logger = logging.getLogger(__name__)

class NotificationConnectionManager:
    """
    Gestiona conexiones WebSocket de notificaciones organizadas por usuario_id.
    Usa Redis Pub/Sub para sincronizar mensajes entre múltiples workers de producción.
    """
    def __init__(self):
        # Conexiones locales al worker actual: { "USR-0001": [ws1, ws2] }
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.redis_client = None
        self.pubsub_task = None
        self.redis_channel = "user_notifications"

    async def _init_redis(self):
        """Inicializa la conexión a Redis y la tarea de escucha"""
        if self.redis_client:
            return
        
        try:
            self.redis_client = redis.from_url(config.redis_url, decode_responses=True)
            self.pubsub = self.redis_client.pubsub()
            await self.pubsub.subscribe(self.redis_channel)
            
            # Tarea en segundo plano para procesar mensajes de otros workers
            self.pubsub_task = asyncio.create_task(self._listen_to_redis())
            logger.info(f"Notification WS Manager: Conectado a Redis ({config.redis_url}) y suscrito a {self.redis_channel}")
        except Exception as e:
            logger.warning(f"Notification WS Manager: Redis no disponible, operando en modo local fallback: {e}")

    async def _listen_to_redis(self):
        """Escucha notificaciones de Redis y las reenvía a las conexiones locales"""
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        usuario_id = data.get("usuario_id")
                        payload = data.get("payload")
                        
                        if usuario_id and payload:
                            await self._send_local_broadcast(usuario_id, payload)
                    except Exception as e:
                        logger.error(f"Error procesando mensaje de Redis de notificaciones: {e}")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error en listener de Redis de notificaciones: {e}")
            # Reintentar conexión tras fallo
            await asyncio.sleep(5)
            self.redis_client = None
            await self._init_redis()

    async def connect(self, websocket: WebSocket, usuario_id: str):
        """Acepta una conexión y la asigna a un usuario local"""
        await websocket.accept()
        
        # Inicializar Redis si es la primera conexión
        if not self.redis_client:
            await self._init_redis()

        if usuario_id not in self.active_connections:
            self.active_connections[usuario_id] = []
        self.active_connections[usuario_id].append(websocket)

    def disconnect(self, websocket: WebSocket, usuario_id: str):
        """Elimina una conexión de un usuario local"""
        if usuario_id in self.active_connections:
            if websocket in self.active_connections[usuario_id]:
                self.active_connections[usuario_id].remove(websocket)
            if not self.active_connections[usuario_id]:
                del self.active_connections[usuario_id]

    async def broadcast_to_user(self, usuario_id: str, message: dict):
        """
        Publica el mensaje en Redis para que todos los workers (incluyendo este)
        lo reenvíen a los sockets locales de dicho usuario.
        """
        if not self.redis_client:
            await self._init_redis()
        
        if self.redis_client:
            try:
                broadcast_data = {
                    "usuario_id": usuario_id,
                    "payload": message
                }
                await self.redis_client.publish(self.redis_channel, json.dumps(broadcast_data, default=str))
            except Exception as e:
                logger.error(f"Error publicando en Redis de notificaciones: {e}")
                # Fallback: enviar localmente si falla Redis
                await self._send_local_broadcast(usuario_id, message)
        else:
            # Fallback modo local (si no hay Redis configurado o falla)
            await self._send_local_broadcast(usuario_id, message)

    async def _send_local_broadcast(self, usuario_id: str, message: dict):
        """Envía el mensaje SOLO a las conexiones locales de este worker para ese usuario"""
        if usuario_id in self.active_connections:
            message_json = json.dumps(message, default=str)
            for connection in list(self.active_connections[usuario_id]):
                try:
                    await connection.send_text(message_json)
                except Exception:
                    # Conexión rota
                    pass

notification_manager = NotificationConnectionManager()
