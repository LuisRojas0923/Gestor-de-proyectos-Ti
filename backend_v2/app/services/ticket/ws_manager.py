import asyncio
import json
import logging
from typing import Dict, List
from fastapi import WebSocket
import redis.asyncio as redis
from app.config import config

logger = logging.getLogger(__name__)

class TicketConnectionManager:
    """
    Gestiona conexiones WebSocket organizadas por ticket_id (Salas).
    Usa Redis Pub/Sub para sincronizar mensajes entre múltiples workers de producción.
    """
    def __init__(self):
        # Conexiones locales al worker actual: { "TKT-0001": [ws1, ws2] }
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.connection_identities: Dict[WebSocket, tuple[str, str]] = {}
        self.redis_client = None
        self.pubsub_task = None
        self.redis_channel = "ticket_notifications"

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
            logger.info("WebSocket Manager: conectado a Redis")
        except Exception:
            logger.exception("WebSocket Manager: error conectando a Redis")

    async def _listen_to_redis(self):
        """Escucha mensajes de Redis y los reenvía a las conexiones locales"""
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        ticket_id = data.get("ticket_id")
                        payload = data.get("payload")
                        
                        if ticket_id and payload:
                            await self._send_local_broadcast(ticket_id, payload)
                    except Exception as e:
                        logger.error(f"Error procesando mensaje de Redis: {e}")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error en listener de Redis: {e}")
            # Reintentar conexión tras fallo
            await asyncio.sleep(5)
            self.redis_client = None
            await self._init_redis()

    async def connect(
        self,
        websocket: WebSocket,
        ticket_id: str,
        subprotocolo: str | None = None,
        usuario_id: str | None = None,
        sesion_hash: str | None = None,
    ):
        """Acepta una conexión y la asigna a una sala local"""
        await websocket.accept(subprotocol=subprotocolo)
        
        # Inicializar Redis si es la primera conexión
        if not self.redis_client:
            await self._init_redis()

        if ticket_id not in self.active_connections:
            self.active_connections[ticket_id] = []
        self.active_connections[ticket_id].append(websocket)
        if usuario_id and sesion_hash:
            self.connection_identities[websocket] = (usuario_id, sesion_hash)

    def disconnect(self, websocket: WebSocket, ticket_id: str):
        """Elimina una conexión de una sala local"""
        self.connection_identities.pop(websocket, None)
        if ticket_id in self.active_connections:
            if websocket in self.active_connections[ticket_id]:
                self.active_connections[ticket_id].remove(websocket)
            if not self.active_connections[ticket_id]:
                del self.active_connections[ticket_id]

    async def broadcast_to_ticket(self, ticket_id: str, message: dict):
        """
        Publica el mensaje en Redis para que todos los workers (incluyendo este)
        lo reenvíen a sus clientes locales.
        """
        if not self.redis_client:
            await self._init_redis()
        
        if self.redis_client:
            try:
                broadcast_data = {
                    "ticket_id": ticket_id,
                    "payload": message
                }
                await self.redis_client.publish(self.redis_channel, json.dumps(broadcast_data, default=str))
            except Exception as e:
                logger.error(f"Error publicando en Redis: {e}")
                # Fallback: enviar localmente si falla Redis
                await self._send_local_broadcast(ticket_id, message)
        else:
            # Fallback modo local (si no hay Redis configurado o falla)
            await self._send_local_broadcast(ticket_id, message)

    async def _send_local_broadcast(self, ticket_id: str, message: dict):
        """Envía el mensaje SOLO a las conexiones locales de este worker"""
        if ticket_id in self.active_connections:
            message_json = json.dumps(message, default=str)
            
            # Envío secuencial para evitar race conditions en el socket
            for connection in list(self.active_connections[ticket_id]):
                try:
                    if not await self._conexion_autorizada(connection, ticket_id):
                        await connection.close(code=1008)
                        self.disconnect(connection, ticket_id)
                        continue
                    await connection.send_text(message_json)
                except Exception:
                    self.disconnect(connection, ticket_id)

    async def _conexion_autorizada(self, websocket: WebSocket, ticket_id: str) -> bool:
        """Revalida sesión y acceso antes de transmitir cada evento privado."""
        identidad = self.connection_identities.get(websocket)
        if not identidad:
            return False
        usuario_id, sesion_hash = identidad
        try:
            from app.database import AsyncSessionLocal
            from app.services.auth.sesion_service import validar_sesion_hash_activa
            from app.services.ticket.access_service import usuario_puede_acceder_ticket

            async with AsyncSessionLocal() as db:
                sesion = await validar_sesion_hash_activa(db, sesion_hash)
                if not sesion or sesion.usuario_id != usuario_id:
                    return False
                return await usuario_puede_acceder_ticket(
                    db,
                    ticket_id,
                    usuario_id,
                )
        except Exception:
            logger.warning("No se pudo revalidar el acceso al WebSocket de ticket")
            return False

# Instancia global del manager
manager = TicketConnectionManager()
