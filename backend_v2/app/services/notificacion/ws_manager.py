import asyncio
from hashlib import sha256
import json
import logging
import secrets
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
        self.connection_session_hashes: Dict[WebSocket, str] = {}
        self.redis_client = None
        self.pubsub_task = None
        self.redis_channel = "user_notifications"
        self.ticket_ttl_seconds = 30
        self.max_connections_per_user = 3

    async def _init_redis(self):
        """Inicializa la conexión a Redis y la tarea de escucha"""
        if self.redis_client:
            return
        
        try:
            self.redis_client = redis.from_url(
                config.redis_url,
                password=config.redis_password,
                decode_responses=True,
            )
            self.pubsub = self.redis_client.pubsub()
            await self.pubsub.subscribe(self.redis_channel)
            
            # Tarea en segundo plano para procesar mensajes de otros workers
            self.pubsub_task = asyncio.create_task(self._listen_to_redis())
            logger.info("Notification WS Manager: conectado a Redis")
        except Exception:
            self.redis_client = None
            logger.warning("Notification WS Manager: Redis no disponible")

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
                    except Exception:
                        logger.error("Error procesando mensaje de Redis de notificaciones")
        except asyncio.CancelledError:
            pass
        except Exception:
            logger.error("Error en listener de Redis de notificaciones")
            # Reintentar conexión tras fallo
            await asyncio.sleep(5)
            self.redis_client = None
            await self._init_redis()

    async def connect(
        self,
        websocket: WebSocket,
        usuario_id: str,
        sesion_hash: str,
        subprotocolo: str,
    ):
        """Acepta una conexión y la asigna a un usuario local"""
        conexiones = self.active_connections.get(usuario_id, [])
        if len(conexiones) >= self.max_connections_per_user:
            await websocket.close(code=1008)
            return False
        await websocket.accept(subprotocol=subprotocolo)
        
        # Inicializar Redis si es la primera conexión
        if not self.redis_client:
            await self._init_redis()

        if usuario_id not in self.active_connections:
            self.active_connections[usuario_id] = []
        self.active_connections[usuario_id].append(websocket)
        self.connection_session_hashes[websocket] = sesion_hash
        return True

    async def emitir_ticket_ws(
        self,
        usuario_id: str,
        sesion_hash: str,
        origen: str,
    ) -> str:
        """Emite un ticket aleatorio, corto y de un solo uso en Redis."""
        if not self.redis_client:
            await self._init_redis()
        if not self.redis_client:
            raise RuntimeError("Servicio de tickets no disponible")

        for _ in range(3):
            ticket = secrets.token_urlsafe(32)
            clave = self._clave_ticket(ticket)
            creado = await self.redis_client.set(
                clave,
                json.dumps({
                    "usuario_id": usuario_id,
                    "sesion_hash": sesion_hash,
                    "origen": origen,
                }),
                ex=self.ticket_ttl_seconds,
                nx=True,
            )
            if creado:
                return ticket
        raise RuntimeError("No fue posible emitir el ticket")

    async def consumir_ticket_ws(self, ticket: str):
        """Consume atomicamente un ticket y devuelve su identidad vinculada."""
        if not ticket or len(ticket) > 128:
            return None
        if not self.redis_client:
            await self._init_redis()
        if not self.redis_client:
            raise RuntimeError("Servicio de tickets no disponible")

        contenido = await self.redis_client.getdel(self._clave_ticket(ticket))
        if not contenido:
            return None
        try:
            datos = json.loads(contenido)
        except (TypeError, ValueError):
            return None
        if (
            not datos.get("usuario_id")
            or not datos.get("sesion_hash")
            or not datos.get("origen")
        ):
            return None
        return {
            "usuario_id": str(datos["usuario_id"]),
            "sesion_hash": str(datos["sesion_hash"]),
            "origen": str(datos["origen"]),
        }

    @staticmethod
    def _clave_ticket(ticket: str) -> str:
        digest = sha256(ticket.encode("utf-8")).hexdigest()
        return f"notificaciones:ws-ticket:{digest}"

    def disconnect(self, websocket: WebSocket, usuario_id: str):
        """Elimina una conexión de un usuario local"""
        self.connection_session_hashes.pop(websocket, None)
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
            except Exception:
                logger.error("Error publicando en Redis de notificaciones")
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
                    sesion_hash = self.connection_session_hashes.get(connection)
                    if not sesion_hash or not await self.sesion_esta_activa(
                        usuario_id, sesion_hash
                    ):
                        await connection.close(code=1008)
                        self.disconnect(connection, usuario_id)
                        continue
                    await connection.send_text(message_json)
                except Exception:
                    self.disconnect(connection, usuario_id)

    @staticmethod
    async def sesion_esta_activa(usuario_id: str, sesion_hash: str) -> bool:
        """Revalida la sesion en una conexion DB corta y fail-closed."""
        from app.database import AsyncSessionLocal
        from app.services.auth.sesion_service import validar_sesion_hash_activa

        try:
            async with AsyncSessionLocal() as db:
                sesion = await validar_sesion_hash_activa(db, sesion_hash)
            return bool(sesion and sesion.usuario_id == usuario_id)
        except Exception:
            logger.warning("No se pudo revalidar la sesion WebSocket")
            return False

notification_manager = NotificationConnectionManager()
