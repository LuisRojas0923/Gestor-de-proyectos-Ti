import logging
from typing import List
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class AuditoriaWSManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Dashboard de Auditoría conectado vía WS. Conexiones activas: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Dashboard de Auditoría desconectado de WS. Conexiones activas: {len(self.active_connections)}")

    async def broadcast_update(self):
        """Envía una señal a todos los clientes para que actualicen sus datos"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json({"type": "UPDATE_INDICADORES"})
            except Exception as e:
                logger.warning(f"Error enviando broadcast a WS: {e}")
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)

auditoria_ws_manager = AuditoriaWSManager()
