from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import boto3
import os
from app.database import get_db
from sqlalchemy.orm import Session
from app import models, auth
from datetime import datetime
import io
import csv
from typing import Optional

router = APIRouter(prefix="/historical", tags=["Historical Data"])

# Config Timestream
DB_NAME = os.getenv("AWS_TIMESTREAM_DB")
TABLE_NAME = os.getenv("AWS_TIMESTREAM_TABLE")
REGION = os.getenv("AWS_REGION", "us-east-1")

@router.get("/{device_uid}")
def get_device_history(
    device_uid: str,
    time_range: str = "24h", # 1h, 24h, 7d, custom
    start: Optional[str] = None, # ISO Format: YYYY-MM-DDTHH:MM:SS
    end: Optional[str] = None,
    format: str = "json", # json, csv
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # 1. Validar que el dispositivo existe y el usuario tiene acceso
    device = db.query(models.Device).filter(models.Device.aws_iot_uid == device_uid).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Feature Toggle Check
    if not device.history_enabled:
        raise HTTPException(status_code=403, detail="Historical data is disabled for this device")
    
    # Init Boto3 Client
    try:
        query_client = boto3.client('timestream-query', region_name=REGION)
    except Exception as e:
         raise HTTPException(status_code=500, detail="Error connecting to AWS")

    # Determinar rango de tiempo SQL
    if time_range == "custom" and start and end:
        # Convertir a timestamps SQL-friendly
        # Timestream soporta strings ISO 8601 en predicados
        time_predicate = f"time BETWEEN from_iso8601_timestamp('{start}') AND from_iso8601_timestamp('{end}')"
    else:
        interval = "1h"
        if time_range == "6h": interval = "6h"
        elif time_range == "24h": interval = "24h"
        elif time_range == "7d": interval = "7d"
        elif time_range == "30d": interval = "30d"
        
        time_predicate = f"time > ago({interval})"
    
    # Query SQL para Timestream
    sql = f"""
    SELECT time, measure_name, measure_value::double, measure_value::boolean, measure_value::varchar
    FROM "{DB_NAME}"."{TABLE_NAME}"
    WHERE {time_predicate}
    AND device_uid = '{device_uid}'
    ORDER BY time ASC
    """
    
    try:
        print(f"📊 [Timestream] Executing: {sql}")
        response = query_client.query(QueryString=sql)
    except Exception as e:
        print(f"AWS Error: {e}")
        return []

    # Parsear respuesta de Timestream
    raw_rows = response.get('Rows', [])
    processed_data = {}
    
    # Preparamos todos los campos posibles para el CSV header
    all_measure_names = set()

    for row in raw_rows:
        data = row['Data']
        # Timestream devuelve [Time, Name, ValDouble, ValBool, ValStr]
        ts = data[0]['ScalarValue'][:-3] # Quitar nanosegundos sobrantes
        dt_obj = datetime.strptime(ts, '%Y-%m-%d %H:%M:%S.%f000') 
        
        # Formato de Fecha: CSV usa completo, JSON usa hora simple (dashboard)
        time_key = dt_obj.strftime("%Y-%m-%d %H:%M:%S")
        
        if time_key not in processed_data:
            processed_data[time_key] = {"time": time_key} # Key unificada

        measure_name = data[1]['ScalarValue']
        all_measure_names.add(measure_name)
        
        # Extraer valor
        val = None
        if 'ScalarValue' in data[2] and data[2]['ScalarValue'] != 'null':
             val = float(data[2]['ScalarValue'])
        elif 'ScalarValue' in data[3] and data[3]['ScalarValue'] != 'null':
             val = data[3]['ScalarValue'] == 'true'
        elif 'ScalarValue' in data[4] and data[4]['ScalarValue'] != 'null':
             val = data[4]['ScalarValue']
             
        if val is not None:
             processed_data[time_key][measure_name] = val

    final_list = list(processed_data.values())

    # --- EXPORTAR A CSV ---
    if format == "csv":
        output = io.StringIO()
        # Definir columnas: Time + Todas las métricas encontradas
        fieldnames = ["time"] + sorted(list(all_measure_names))
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for row in final_list:
            writer.writerow(row)
            
        output.seek(0)
        
        filename = f"history_{device_uid}_{datetime.now().strftime('%Y%m%d')}.csv"
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    # --- RETORNO JSON (Dashboard) ---
    # Simplificar tiempo para gráfica si es JSON
    json_list = []
    for item in final_list:
        # Convertir tiempo largo a corto para gráfica "HH:MM"
        # Ojo: Si el rango es muy grande (7d), quizás quieras "MM-DD HH:MM"
        graph_item = item.copy()
        try:
             # Recortar solo hora para visualización limpia
             # (Puedes ajustar esto dinámicamente según el rango)
             dt = datetime.strptime(item["time"], "%Y-%m-%d %H:%M:%S")
             graph_item["time"] = dt.strftime("%H:%M") 
             if time_range in ["7d", "30d", "custom"]:
                 graph_item["time"] = dt.strftime("%m-%d %H:%M")
        except:
            pass
        json_list.append(graph_item)

    return json_list
