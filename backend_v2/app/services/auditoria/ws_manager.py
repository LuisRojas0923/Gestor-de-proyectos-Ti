import logging
from typing import List
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class AuditoriaWSManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        self.active_connections.append(websocket)
        logger.info(f"Dashboard de Auditoría conectado vía WS. Conexiones activas: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Dashboard de Auditoría desconectado de WS. Conexiones activas: {len(self.active_connections)}")

    async def broadcast_update(self):
        """Envía una señal a todos los clientes para que actualicen sus datos"""
        if not self.active_connections:
            return

        import asyncio

        async def send_with_timeout(connection: WebSocket):
            try:
                # Timeout estricto para evitar bloqueos por clientes lentos
                await asyncio.wait_for(connection.send_json({"type": "UPDATE_INDICADORES"}), timeout=2.0)
                return None
            except Exception as e:
                logger.warning(f"Error o timeout enviando broadcast a WS: {e}")
                return connection

        # Ejecutar todos los envíos en paralelo
        results = await asyncio.gather(*(send_with_timeout(conn) for conn in self.active_connections), return_exceptions=True)

        # Desconectar las conexiones que fallaron (ignorando excepciones generales que haya capturado gather)
        for result in results:
            if isinstance(result, WebSocket):
                self.disconnect(result)

auditoria_ws_manager = AuditoriaWSManager()
