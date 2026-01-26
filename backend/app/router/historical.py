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
import pandas as pd
import pytz
from typing import Optional

router = APIRouter(prefix="/historical", tags=["Historical Data"])

# Config Timestream
DB_NAME = os.getenv("AWS_TIMESTREAM_DB")
TABLE_NAME = os.getenv("AWS_TIMESTREAM_TABLE")
REGION = os.getenv("AWS_REGION", "us-east-1")

from datetime import datetime, timedelta

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
    # Traemos el timezone del cliente a través de la relación Device -> Plant -> Client
    device = db.query(models.Device).filter(models.Device.aws_iot_uid == device_uid).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Obtener zona horaria del cliente
    client_tz_str = device.plant.client.timezone or "America/Mexico_City"
    client_tz = pytz.timezone(client_tz_str)

    # Feature Toggle Check
    if not device.history_enabled:
        raise HTTPException(status_code=403, detail="Historical data is disabled for this device")
    
    # 2. DETERMINAR MODO: AWS O LOCAL (SQLITE)
    USE_AWS = DB_NAME is not None and TABLE_NAME is not None
    
    final_list = []
    all_measure_names = set()

    if USE_AWS:
        # --- LÓGICA AWS TIMESTREAM (EXISTENTE) ---
        try:
            query_client = boto3.client('timestream-query', region_name=REGION)
        except Exception as e:
             raise HTTPException(status_code=500, detail="Error connecting to AWS")

        # Determinar rango de tiempo SQL
        if time_range == "custom" and start and end:
            time_predicate = f"time BETWEEN from_iso8601_timestamp('{start}') AND from_iso8601_timestamp('{end}')"
        else:
            interval = "24h" # Default
            if time_range in ["1h", "6h", "24h", "7d", "30d"]:
                interval = time_range
            time_predicate = f"time > ago({interval})"
        
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
            raw_rows = response.get('Rows', [])
            processed_data = {}
            
            for row in raw_rows:
                data = row['Data']
                ts = data[0]['ScalarValue'][:-3] 
                # Timestream devuelve UTC naive string. La guardamos tal cual (UTC).
                dt_obj = datetime.strptime(ts, '%Y-%m-%d %H:%M:%S.%f000') 
                time_key = dt_obj.strftime("%Y-%m-%d %H:%M:%S")
                
                if time_key not in processed_data:
                    processed_data[time_key] = {"time": time_key}

                measure_name = data[1]['ScalarValue']
                all_measure_names.add(measure_name)
                
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
        except Exception as e:
            print(f"AWS Error: {e}")
            final_list = []

    else:
        # --- LÓGICA LOCAL (SQLITE) ---
        print(f"🏠 [Historical] Usando Fallback Local (SQLite) para {device_uid}")
        
        query = db.query(models.TelemetryLog).filter(models.TelemetryLog.device_uid == device_uid)
        
        if time_range == "custom" and start and end:
            # Parsear fechas ISO (vienen de JS astoISOString = UTC)
            s_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
            e_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
            query = query.filter(models.TelemetryLog.timestamp.between(s_dt, e_dt))
        else:
            # Calcular intervalo
            now = datetime.utcnow()
            offsets = {"1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720}
            hours = offsets.get(time_range, 24)
            threshold = now - timedelta(hours=hours)
            query = query.filter(models.TelemetryLog.timestamp >= threshold)
        
        logs = query.order_by(models.TelemetryLog.timestamp.asc()).all()
        
        # Agrupación por segundo para evitar filas fragmentadas
        aggregated_rows = {}
        for log in logs:
            time_key = log.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            
            if time_key not in aggregated_rows:
                aggregated_rows[time_key] = {"time": time_key}
            
            if isinstance(log.data, dict):
                for k, v in log.data.items():
                    aggregated_rows[time_key][k] = v
                    all_measure_names.add(k)
        
        final_list = list(aggregated_rows.values())

    # --- REDONDEO GLOBAL (Para todos los formatos) ---
    for item in final_list:
        for key, value in item.items():
            if isinstance(value, float):
                item[key] = round(value, 2)

    # --- EXPORTAR A CSV ---
    if format == "csv":
        output = io.StringIO()
        fieldnames = ["time"] + sorted(list(all_measure_names))
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for row in final_list:
            # Convertir UTC string a Local Client Time para el CSV
            dt_utc = datetime.strptime(row["time"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=pytz.UTC)
            local_dt = dt_utc.astimezone(client_tz)
            
            row_copy = row.copy()
            row_copy["time"] = local_dt.strftime("%Y-%m-%d %H:%M:%S")
            writer.writerow(row_copy)
            
        output.seek(0)
        filename = f"history_{device_uid}_{datetime.now().strftime('%Y%m%d')}.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    # --- EXPORTAR A EXCEL (.xlsx) ---
    if format == "xlsx":
        # Preparar datos convertidos a zona horaria local
        local_data = []
        for row in final_list:
            dt_utc = datetime.strptime(row["time"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=pytz.UTC)
            local_dt = dt_utc.astimezone(client_tz)
            
            row_copy = row.copy()
            row_copy["time"] = local_dt.strftime("%Y-%m-%d %H:%M:%S")
            local_data.append(row_copy)

        df = pd.DataFrame(local_data)
        cols = ['time'] + [c for c in df.columns if c != 'time']
        df = df[cols]
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Historical Data')
        
        output.seek(0)
        filename = f"history_{device_uid}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        
        return StreamingResponse(
            io.BytesIO(output.getvalue()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    # --- RETORNO JSON (Format para Gráfica) ---
    # Enviamos el ISO completo (UTC) para que el navegador lo convierta a local del operador
    json_list = []
    for item in final_list:
        graph_item = item.copy()
        try:
            # Convertir a ISO 8601 UTC
            if " " in item["time"]:
                graph_item["time"] = item["time"].replace(" ", "T") + "Z"
        except:
            pass
        json_list.append(graph_item)

    return json_list
