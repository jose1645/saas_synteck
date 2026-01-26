import asyncio
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models
from app.services.mqtt_bridge import start_mqtt_bridge
from app.services.websocket_manager import ws_manager

class BackgroundHistorian:
    """
    Servicio encargado de mantener conexiones MQTT permanentes para dispositivos
    que requieren grabación de históricos 24/7.
    """
    def __init__(self):
        # { "device_uid": {"client": mqtt_obj, "persistence": True} }
        self.active_bridges = {}

    async def start_all_enabled(self):
        """Busca dispositivos con historial habilitado e inicia sus bridges."""
        print("🔍 [Historian] Buscando dispositivos para historización 24/7...")
        db = SessionLocal()
        try:
            # Traer dispositivos activos con historial habilitado
            devices = db.query(models.Device).filter(
                models.Device.history_enabled == True,
                models.Device.is_active == True
            ).all()

            for device in devices:
                await self.start_device_bridge(device, db)
        finally:
            db.close()

    async def start_device_bridge(self, device, db: Session):
        """Inicia un bridge individual en modo persistente."""
        if device.aws_iot_uid in self.active_bridges:
            return

        print(f"📡 [Historian] Iniciando grabación permanente para: {device.aws_iot_uid}")
        
        # Obtener metadata para el tópico MQTT
        # (Snippet similar al de monitor.py para consistencia)
        metadata = {
            "partner_name": device.plant.client.partner.name,
            "client_name": device.plant.client.name,
            "plant_name": device.plant.name,
            "device_name": device.name
        }

        mqtt_client = start_mqtt_bridge(
            ws_manager=ws_manager,
            partner_id=device.plant.client.partner_id,
            client_id=device.plant.client_id,
            plant_id=device.plant_id,
            device_id=device.aws_iot_uid,
            metadata=metadata
        )

        self.active_bridges[device.aws_iot_uid] = {
            "client": mqtt_client,
            "persistence": True
        }

    def is_persistent(self, device_uid):
        """Verifica si un bridge es permanente."""
        return self.active_bridges.get(device_uid, {}).get("persistence", False)

    def stop_all(self):
        """Detiene todos los bridges al apagar el servidor."""
        for uid, data in self.active_bridges.items():
            print(f"🛑 [Historian] Deteniendo bridge: {uid}")
            data["client"].stop()
        self.active_bridges.clear()

# Instancia única del servicio
historian = BackgroundHistorian()
