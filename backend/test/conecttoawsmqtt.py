import paho.mqtt.client as mqtt
import ssl
import json
import time

# --- CONFIGURACIÓN DE CONEXIÓN ---
# El endpoint real que sacamos de tu consola
ENDPOINT = "a1uw1qi4z3nyi4-ats.iot.us-east-1.amazonaws.com" 
THING_NAME = "SN-FOQ9DB7Z7"

# Archivos de certificados (Asegúrate de que los nombres coincidan con tus archivos)
CA_PATH = "AmazonRootCA1.pem" 
CERT_PATH = f"{THING_NAME}-cert.pem.crt"
KEY_PATH = f"{THING_NAME}-private.pem.key"

# --- JERARQUÍA WHITE LABEL (Nombres descriptivos) ---
# Estructura: partner/client/plant/device_id/subtopic
PARTNER = "synteck"
CLIENT = "asd"
PLANT = "asda"

# El tópico de publicación final
TOPIC = f"{PARTNER}/{CLIENT}/{PLANT}/{THING_NAME}/telemetry"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("\n" + "="*40)
        print("✅ CONECTADO EXITOSAMENTE AL BROKER")
        print(f"📡 ENDPOINT: {ENDPOINT}")
        print(f"🔒 SEGURIDAD: TLS 1.2 (Certificados X.509)")
        print("="*40 + "\n")
    else:
        errors = {
            1: "Protocolo incorrecto",
            2: "ID de cliente inválido",
            3: "Servidor no disponible",
            4: "Usuario/Contraseña mal (o certificado inválido)",
            5: "No autorizado (Problema de Política IoT)"
        }
        print(f"❌ ERROR DE CONEXIÓN: {errors.get(rc, 'Desconocido')}")

# Inicializar cliente
client = mqtt.Client(client_id=THING_NAME)
client.on_connect = on_connect

# Configuración de Seguridad SSL/TLS
try:
    client.tls_set(
        ca_certs=CA_PATH,
        certfile=CERT_PATH,
        keyfile=KEY_PATH,
        cert_reqs=ssl.CERT_REQUIRED,
        tls_version=ssl.PROTOCOL_TLSv1_2,
        ciphers=None
    )
except Exception as e:
    print(f"❌ Error al cargar certificados: {e}")
    exit()

print(f"🚀 Iniciando conexión hacia el Broker...")

try:
    client.connect(ENDPOINT, 8883, keepalive=60)
    client.loop_start()

    while True:
        # Simulamos datos de una caldera o proceso industrial
        payload = {
            "ts": int(time.time() * 1000), # Timestamp en ms
            "d": THING_NAME,
            "values": {
                "temp": 24.5,
                "press": 101.3,
                "status": "RUNNING",
                "vibration": 0.02
            }
        }
        
        print(f"📤 [PUBLISH] -> {TOPIC}")
        # print(f"📦 PAYLOAD: {json.dumps(payload)}")
        
        result = client.publish(TOPIC, json.dumps(payload), qos=1)
        
        # Verificar si la publicación fue exitosa
        if result.rc != mqtt.MQTT_ERR_SUCCESS:
            print("⚠️ Error al publicar. ¿Tópico permitido por la política?")
            
        time.sleep(5) # Publicar cada 5 segundos

except KeyboardInterrupt:
    print("\n🛑 Simulación detenida por el usuario.")
    client.loop_stop()
    client.disconnect()
except Exception as e:
    print(f"💥 Fallo crítico: {e}")