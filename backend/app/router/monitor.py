from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app import models
from app.services.mqtt_bridge import start_mqtt_bridge
from app.services.websocket_manager import ws_manager
import asyncio

from app.services.historian import historian

router = APIRouter(prefix="/monitor", tags=["Real-time Monitoring"])

# Estructura: { "device_uid": {"client": mqtt_obj, "ref_count": int, "stop_task": Task} }
active_bridges = {}

@router.websocket("/ws/{partner_id}/{client_id}/{plant_id}/{device_uid}")
async def websocket_endpoint(
    websocket: WebSocket, 
    partner_id: int, client_id: int, plant_id: int, device_uid: str,
    db: Session = Depends(get_db)
):
    await ws_manager.connect(websocket, device_uid)
    
    # 1. VERIFICAR SI EL HISTORIAN YA TIENE ESTE BRIDGE CORRIENDO
    if device_uid in historian.active_bridges:
        print(f"🔗 [Monitor] Usando bridge permanente del Historian para {device_uid}")
        # No sumamos ref_count para evitar colisiones con la lógica de apagado,
        # simplemente dejamos que el WS se conecte al manager.
    
    elif device_uid not in active_bridges:
        print(f"🚀 Iniciando Bridge Maestro (Temporal): {device_uid}")
        
        # Búsqueda de metadata (Join profundo)
        device_info = db.query(models.Device).options(
            joinedload(models.Device.plant).joinedload(models.Plant.client).joinedload(models.Client.partner)
        ).filter(models.Device.aws_iot_uid == device_uid).first()
        
        metadata = {
            "partner_name": device_info.plant.client.partner.name if device_info else "Partner",
            "client_name": device_info.plant.client.name if device_info else "Client",
            "plant_name": device_info.plant.name if device_info else "Plant",
            "device_name": device_info.name if device_info else device_uid
        }

        mqtt_client = start_mqtt_bridge(
            ws_manager=ws_manager,
            partner_id=partner_id, client_id=client_id, 
            plant_id=plant_id, device_id=device_uid,
            metadata=metadata
        )
        active_bridges[device_uid] = {"client": mqtt_client, "ref_count": 1, "stop_task": None}
    else:
        # SI EL BRIDGE ESTABA POR MORIR (en periodo de gracia), CANCELAMOS EL CIERRE
        if active_bridges[device_uid]["stop_task"]:
            active_bridges[device_uid]["stop_task"].cancel()
            active_bridges[device_uid]["stop_task"] = None
            print(f"🛡️ Apagado cancelado: Usuario regresó a {device_uid}")
        
        active_bridges[device_uid]["ref_count"] += 1
        print(f"♻️ Bridge reutilizado. Oyentes: {active_bridges[device_uid]['ref_count']}")

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, device_uid)
        
        # 2. SOLO APAGAR SI NO ES UN BRIDGE DEL HISTORIAN
        if device_uid in active_bridges:
            active_bridges[device_uid]["ref_count"] -= 1
            
            # Si ya no hay nadie, iniciamos el conteo regresivo para apagar
            if active_bridges[device_uid]["ref_count"] <= 0:
                print(f"⏳ Iniciando periodo de gracia (5s) para {device_uid}...")
                
                async def delayed_stop(uid):
                    await asyncio.sleep(5) 
                    if uid in active_bridges:
                        print(f"🛑 Tiempo agotado. Matando Bridge Temporal de {uid}")
                        active_bridges[uid]["client"].stop()
                        del active_bridges[uid]

                active_bridges[device_uid]["stop_task"] = asyncio.create_task(delayed_stop(device_uid))
            else:
                print(f"📉 Quedan {active_bridges[device_uid]['ref_count']} oyentes en {device_uid}")