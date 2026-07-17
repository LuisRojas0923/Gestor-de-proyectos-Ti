import logging
import asyncio
from typing import Dict
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class AuditoriaWSManager:
    def __init__(self, max_connections: int = 100):
        self.active_connections: Dict[WebSocket, asyncio.Task] = {}
        self.queues: Dict[WebSocket, asyncio.Queue] = {}
        self.max_connections = max_connections

    async def connect(self, websocket: WebSocket) -> bool:
        if len(self.active_connections) >= self.max_connections:
            logger.warning(f"Rechazo WS: límite global de {self.max_connections} conexiones alcanzado.")
            return False

        queue = asyncio.Queue(maxsize=2)
        worker_task = asyncio.create_task(self._worker(websocket, queue))
        
        self.active_connections[websocket] = worker_task
        self.queues[websocket] = queue
        logger.info(f"Dashboard de Auditoría conectado vía WS. Conexiones activas: {len(self.active_connections)}")
        return True

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            task = self.active_connections.pop(websocket)
            task.cancel()
            self.queues.pop(websocket, None)
            logger.info(f"Dashboard de Auditoría desconectado de WS. Conexiones activas: {len(self.active_connections)}")

    async def _worker(self, websocket: WebSocket, queue: asyncio.Queue):
        try:
            while True:
                message = await queue.get()
                try:
                    await asyncio.wait_for(websocket.send_json(message), timeout=2.0)
                except (asyncio.TimeoutError, Exception) as e:
                    logger.warning(f"Error o timeout enviando mensaje a WS: {e}")
                    # En fastAPI, el código 1011 significa error inesperado en servidor
                    try:
                        await websocket.close(code=1011)
                    except Exception:
                        pass
                    break
        except asyncio.CancelledError:
            pass
        finally:
            self.disconnect(websocket)

    def notify_update(self):
        for queue in self.queues.values():
            try:
                queue.put_nowait({"type": "UPDATE_INDICADORES"})
            except asyncio.QueueFull:
                pass

    async def shutdown(self):
        for ws in list(self.active_connections.keys()):
            self.disconnect(ws)

auditoria_ws_manager = AuditoriaWSManager()
