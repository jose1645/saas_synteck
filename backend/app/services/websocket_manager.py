from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        # { "device_id": [ws1, ws2] }
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, device_id: str):
        await websocket.accept()
        if device_id not in self.active_connections:
            self.active_connections[device_id] = []
        self.active_connections[device_id].append(websocket)

    def disconnect(self, websocket: WebSocket, device_id: str):
        if device_id in self.active_connections:
            if websocket in self.active_connections[device_id]:
                self.active_connections[device_id].remove(websocket)

    async def send_personal_message(self, message: dict, device_id: str):
        if device_id in self.active_connections:
            # Iteramos sobre una copia para evitar errores si alguien se desconecta
            for connection in self.active_connections[device_id][:]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Si falla, la conexión probablemente ya no es válida
                    pass

# Instancia única global
ws_manager = ConnectionManager()