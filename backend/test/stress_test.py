import time
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS

# CONFIGURACIÓN
token = "8rdYfxHKtFZ1GG8YVH7pD8uNbDe90mNl7A4xHOKykV_GPWPsnzhrQJnRXdlVj-OLweofDWiM7kK8kFBD0DdX6A=="
org = "mi_empresa"
bucket = "telemetria"
url = "http://3.88.12.43:8086"

client = InfluxDBClient(url=url, token=token, org=org)
write_api = client.write_api(write_options=SYNCHRONOUS)

print(f"Iniciando carga de 10,000 registros en {url}...")

start_time = time.time()

# Generar 10,000 puntos de datos
# Usamos un solo batch para mayor eficiencia
puntos = []
for i in range(10000):
    puntos.append(
        Point("tags_industriales")
        .tag("dispositivo", "PLC_Principal")
        .tag("planta", "Planta_Norte")
        .field(f"tag_{i}", 20.0 + (i % 5)) # Simula valores variables
        .time(time.time_ns(), WritePrecision.NS)
    )

# Escribir todos los puntos
write_api.write(bucket, org, puntos)

end_time = time.time()
print(f"¡Éxito! 10,000 registros insertados en {end_time - start_time:.2f} segundos.")

client.close()