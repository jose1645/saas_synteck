import paho.mqtt.client as mqtt
import ssl
import json
import time
import os
import random

# --- CONFIGURACIÓN DE CONEXIÓN ---
ENDPOINT = "a1uw1qi4z3nyi4-ats.iot.us-east-1.amazonaws.com" 
THING_NAME = "SN-FN1OYGQ7W" 

BASE_PATH = r"C:\Users\User\OneDrive\Desktop\SAAS_SYNTECK\backend\test"
CA_PATH = os.path.join(BASE_PATH, "AmazonRootCA1.pem") 
CERT_PATH = os.path.join(BASE_PATH, f"{THING_NAME}-cert.pem.crt")
KEY_PATH = os.path.join(BASE_PATH, f"{THING_NAME}-private.pem.key")

# --- JERARQUÍA BASE (FIJA) ---
PARTNER = "SYNTECK"
CLIENT = "empresa1"
PLANT = "planta1" 
BASE_TOPIC = f"{PARTNER}/{CLIENT}/{PLANT}/{THING_NAME}"

# --- SECCIONES ANIDADAS (DINÁMICAS) ---
SECCIONES = {
    "caldera/sensores": ["temperatura", "presion"],
    "caldera/flujo": ["vapor_tph", "agua_gpm"],
    "motores/bomba_1": ["hz", "amperaje", "vibracion"],
    "tanque/niveles": ["nivel_porcentaje", "volumen_m3"]
}

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("\n" + "💎" * 20)
        print("CONEXIÓN EXITOSA - MODO MULTI-TOPIC")
        print(f"BASE: {BASE_TOPIC}")
        print("💎" * 20 + "\n")
    else:
        print(f"❌ ERROR: Código {rc}")

client = mqtt.Client(client_id=THING_NAME)
client.on_connect = on_connect

client.tls_set(
    ca_certs=CA_PATH,
    certfile=CERT_PATH,
    keyfile=KEY_PATH,
    cert_reqs=ssl.CERT_REQUIRED,
    tls_version=ssl.PROTOCOL_TLSv1_2
)

try:
    print(f"🚀 Conectando a {ENDPOINT}...")
    client.connect(ENDPOINT, 8883, keepalive=60)
    client.loop_start()

    while True:
        for sub_path, variables in SECCIONES.items():
            # Estructura requerida: BASE/SUB_PATH/telemetry
            full_topic = f"{BASE_TOPIC}/{sub_path}"
            
            # Generar datos simulados
            payload = {
                "ts": int(time.time() * 1000),
                "device": THING_NAME,
                "values": {var: round(random.uniform(10, 100), 2) for var in variables}
            }
            
            print(f"📤 [PUBLISH] -> {full_topic}")
            client.publish(full_topic, json.dumps(payload), qos=1)
            
        print("--- Ciclo de telemetría completo ---\n")
        time.sleep(5) 

except KeyboardInterrupt:
    print("\n🛑 Simulación finalizada.")
    client.loop_stop()
    client.disconnect()