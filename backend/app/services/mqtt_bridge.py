import json
import asyncio
import os
from datetime import datetime
from awsiot import mqtt5_client_builder
from awscrt import mqtt5, auth
from dotenv import load_dotenv
import time # Importar al inicio
from app.database import SessionLocal
from app import models
load_dotenv()

def start_mqtt_bridge(ws_manager, partner_id, client_id, plant_id, device_id, metadata=None):
    ENDPOINT = "a1uw1qi4z3nyi4-ats.iot.us-east-1.amazonaws.com"
    
    # 1. NOMBRES PARA LA RUTA
    p_name = metadata.get('partner_name', partner_id) if metadata else partner_id
    c_name = metadata.get('client_name', client_id) if metadata else client_id
    pl_name = metadata.get('plant_name', plant_id) if metadata else plant_id

    # Suscripción recursiva con '#' para capturar N sub-tópicos
    TOPIC_FILTER = f"{p_name}/{c_name}/{pl_name}/{device_id}/#"
    
    try:
        main_loop = asyncio.get_running_loop()
    except RuntimeError:
        main_loop = asyncio.get_event_loop()

    # --- MOTOR DE PROCESAMIENTO RECURSIVO ---
    def clean_industrial_node(node):
        """Aplanado automático de listas [0] en cualquier profundidad"""
        if isinstance(node, list):
            return clean_industrial_node(node[0]) if len(node) > 0 else None
        elif isinstance(node, dict):
            return {k: clean_industrial_node(v) for k, v in node.items()}
        return node

    def round_values(node):
        """Redondeo recursivo a 2 decimales para cualquier profundidad"""
        if isinstance(node, float):
            return round(node, 2)
        elif isinstance(node, dict):
            return {k: round_values(v) for k, v in node.items()}
        elif isinstance(node, list):
            return [round_values(i) for i in node]
        return node

    def on_publish_received(publish_packet_data):
        try:
            actual_topic = publish_packet_data.publish_packet.topic
            payload_raw = publish_packet_data.publish_packet.payload.decode('utf-8')
            payload = json.loads(payload_raw)

            # --- DEBUGGER: ENTRADA CRUDA ---
            print(f"\n📥 [RECV] Tópico: {actual_topic}")
            print(f"📦 [RAW DATA]: {payload_raw}")

            # 2. IDENTIFICAR LA RAMA (SUB-TÓPICO)
            topic_parts = actual_topic.split('/')
            try:
                # Todo lo que esté después del UID es la rama del proceso
                device_index = topic_parts.index(str(device_id))
                subtopic_path = "/".join(topic_parts[device_index + 1:])
            except ValueError:
                subtopic_path = "root"

            # 3. LIMPIEZA Y ENRIQUECIMIENTO
            # Buscamos en 'd', 'values' o raíz (según lo que mande la HMI)
            raw_industrial_values = payload.get('values', payload.get('d', payload))
            clean_telemetry = round_values(clean_industrial_node(raw_industrial_values))
            
            # Timestamp del Servidor (Server-side timestamping)
            server_ts = time.time()
            # 4. OBJETO FINAL (EL QUE IRÁ A LA UI)
            enriched_data = {
                "telemetry": clean_telemetry,
                "metadata": {
                    "subtopic": subtopic_path,
                    "server_ts": server_ts,
                    "device_id": device_id,
                    "client": c_name,
                    "plant": pl_name
                }
            }

            # --- DEBUGGER: SALIDA PROCESADA ---
            print(f"✨ [PROCESSED] Rama: {subtopic_path}")
            print(f"📊 [CLEAN VALS]: {json.dumps(clean_telemetry, indent=2)}")
            print(f"⏰ [TS]: {server_ts}")
            print(f"--------------------------------------------------")

            if ws_manager:
                asyncio.run_coroutine_threadsafe(
                    ws_manager.send_personal_message(enriched_data, str(device_id)), 
                    main_loop
                )

            # --- PERSISTENCIA LOCAL (SQLite) ---
            try:
                db = SessionLocal()
                # Verificar si el dispositivo tiene historia habilitada
                device = db.query(models.Device).filter(models.Device.aws_iot_uid == str(device_id)).first()
                if device and device.history_enabled:
                    new_log = models.TelemetryLog(
                        device_uid=str(device_id),
                        data=clean_telemetry,
                        path=subtopic_path
                    )
                    db.add(new_log)
                    db.commit()
                    # print(f"💾 [DB] Histórico guardado localmente para {device_id}")
                db.close()
            except Exception as db_err:
                print(f"❌ [DB ERROR] No se pudo guardar histórico: {db_err}")

        except Exception as e:
            print(f"❌ [BRIDGE ERROR] Fallo al procesar mensaje: {e}")

    def on_lifecycle_connection_success(lifecycle_connect_success_data):
        print(f"\n✅ [MQTT5 CONNECTED] AWS IoT Core")
        print(f"📡 ESCUCHANDO ÁRBOL: {TOPIC_FILTER}")
        
        client.subscribe(subscribe_packet=mqtt5.SubscribePacket(
            subscriptions=[mqtt5.Subscription(topic_filter=TOPIC_FILTER, qos=mqtt5.QoS.AT_LEAST_ONCE)]
        ))

    # --- CONFIGURACIÓN CLIENTE ---
    credentials_provider = auth.AwsCredentialsProvider.new_default_chain()
    client = mqtt5_client_builder.websockets_with_default_aws_signing(
        endpoint=ENDPOINT,
        region="us-east-1",
        credentials_provider=credentials_provider,
        on_publish_received=on_publish_received,
        on_lifecycle_connection_success=on_lifecycle_connection_success,
        client_id=f"Synteck-Bridge-{device_id}"
    )

    client.start()
    return client