from typing import Dict, List
from fastapi import WebSocket
import json

class TicketConnectionManager:
    """
    Gestiona conexiones WebSocket organizadas por ticket_id (Salas).
    Permite notificaciones en tiempo real solo a los usuarios interesados.
    """
    def __init__(self):
        # Estructura: { "TKT-0001": [ws1, ws2], "TKT-0002": [ws3] }
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, ticket_id: str):
        """Acepta una conexión y la asigna a una sala de ticket"""
        await websocket.accept()
        if ticket_id not in self.active_connections:
            self.active_connections[ticket_id] = []
        self.active_connections[ticket_id].append(websocket)

    def disconnect(self, websocket: WebSocket, ticket_id: str):
        """Elimina una conexión de una sala específica"""
        if ticket_id in self.active_connections:
            if websocket in self.active_connections[ticket_id]:
                self.active_connections[ticket_id].remove(websocket)
            # Limpiar la sala si no hay más conexiones
            if not self.active_connections[ticket_id]:
                del self.active_connections[ticket_id]

    async def broadcast_to_ticket(self, ticket_id: str, message: dict):
        """Envía un mensaje a todos los usuarios conectados a un ticket específico"""
        if ticket_id in self.active_connections:
            # Serializar mensaje
            message_json = json.dumps(message, default=str)
            
            # Crear lista de tareas para enviar en paralelo
            for connection in self.active_connections[ticket_id]:
                try:
                    await connection.send_text(message_json)
                except Exception:
                    # Si falla el envío, probablemente la conexión se cerró
                    pass

# Instancia global del manager
manager = TicketConnectionManager()
