import json
import boto3
import os
import time

# Configurar cliente de Timestream
# Asegurate de que la Lambda tenga permisos: timestream:WriteRecords
write_client = boto3.client('timestream-write')

DB_NAME = os.environ.get('DB_NAME', 'saas_iot_db')
TABLE_NAME = os.environ.get('TABLE_NAME', 'telemetry')

def lambda_handler(event, context):
    """
    Se espera que el 'event' sea el payload JSON que viene del IoT Core Rule.
    SQL sugerido en IoT Core: SELECT * FROM 'dt/#'
    """
    print(f"Recibido: {event}")

    # Extraer metadatos si vienen en el topic o payload
    # Asumimos que el payload ya trae datos útiles
    # Estructura esperada del payload (ejemplo):
    # {
    #   "device_uid": "ABC-123",
    #   "temperature": 25.5,
    #   "humidity": 60,
    #   "timestamp": 167... (opcional)
    # }
    
    records = []
    current_time = str(int(time.time() * 1000)) # Milisegundos

    # Dimensiones (Valores que identifican la fuente y no cambian seguido)
    # Si tu regla IoT Core inyecta el topic, úsalo. Si no, debe venir en el payload.
    device_uid = event.get('device_uid', 'unknown')
    
    dimensions = [
        {'Name': 'device_uid', 'Value': device_uid}
    ]

    # Iterar sobre el evento para encontrar métricas numéricas/booleanas
    for key, value in event.items():
        if key in ['device_uid', 'timestamp']:
            continue
            
        # Determinar el tipo de medida
        if isinstance(value, (int, float)):
             records.append({
                'Dimensions': dimensions,
                'MeasureName': key,
                'MeasureValue': str(value),
                'MeasureValueType': 'DOUBLE',
                'Time': current_time
            })
        elif isinstance(value, str):
             records.append({
                'Dimensions': dimensions,
                'MeasureName': key,
                'MeasureValue': value,
                'MeasureValueType': 'VARCHAR',
                'Time': current_time
            })
        elif isinstance(value, bool):
             records.append({
                'Dimensions': dimensions,
                'MeasureName': key,
                'MeasureValue': str(value).lower(), # 'true'/'false'
                'MeasureValueType': 'BOOLEAN',
                'Time': current_time
            })

    if not records:
        print("No se encontraron métricas válidas para guardar.")
        return

    try:
        # Escribir en lotes (Timestream soporta hasta 100 registros por llamada)
        # Aquí simplificamos asumiendo que el payload no es gigante.
        response = write_client.write_records(
            DatabaseName=DB_NAME,
            TableName=TABLE_NAME,
            Records=records
        )
        print(f"Éxito escribiendo {len(records)} registros. RequestId: {response['ResponseMetadata']['RequestId']}")
    except write_client.exceptions.RejectedRecordsException as err:
        print("Registros rechazados:")
        for rr in err.response['RejectedRecords']:
            print(f"Razón: {rr['Reason']}, Índice: {rr['RecordIndex']}")
    except Exception as e:
        print(f"Error escribiendo a Timestream: {str(e)}")
        raise e
