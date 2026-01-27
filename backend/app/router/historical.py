from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import boto3
import os
from app.database import get_db
from sqlalchemy.orm import Session
from app import models, auth
from datetime import datetime, timedelta
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
    print(f"📡 [Historical] Petición recibida: {device_uid} | Rango: {time_range} | Start: {start} | End: {end}")
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

        # Determinar rango de tiempo SQL y resolución (Agregación)
        resolution = "1s" # Default
        if time_range == "custom" and start and end:
            s_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
            e_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
            duration = e_dt - s_dt
            
            if duration > timedelta(days=7): resolution = "1h"
            elif duration > timedelta(days=1): resolution = "5m"
            elif duration > timedelta(hours=6): resolution = "1m"
            else: resolution = "1s"

            time_predicate = f"time BETWEEN from_iso8601_timestamp('{start}') AND from_iso8601_timestamp('{end}')"
        else:
            interval = "24h" # Default
            if time_range == "1h": 
                interval = "1h"
                resolution = "1s"
            elif time_range == "6h":
                interval = "6h"
                resolution = "10s"
            elif time_range == "24h":
                interval = "24h"
                resolution = "1m"
            elif time_range == "7d":
                interval = "7d"
                resolution = "5m"
            elif time_range in ["30d", "custom"]:
                interval = "30d"
                resolution = "1h"
            
            time_predicate = f"time > ago({interval})"
        
        # Consulta con AGREGACIÓN (bin) para Timestream
        sql = f"""
        SELECT bin(time, {resolution}) as binned_time, measure_name, 
               AVG(measure_value::double) as avg_double,
               MAX(measure_value::boolean) as val_bool,
               MAX(measure_value::varchar) as val_str
        FROM "{DB_NAME}"."{TABLE_NAME}"
        WHERE {time_predicate}
        AND device_uid = '{device_uid}'
        GROUP BY bin(time, {resolution}), measure_name
        ORDER BY binned_time ASC
        """
        
        try:
            print(f"📊 [Timestream] Executing: {sql}")
            response = query_client.query(QueryString=sql)
            raw_rows = response.get('Rows', [])
            processed_data = {}
            
            for row in raw_rows:
                data = row['Data']
                ts = data[0]['ScalarValue'][:-3] 
                # binned_time ya viene agrupado por Timestream
                dt_obj = datetime.strptime(ts, '%Y-%m-%d %H:%M:%S.%f000') 
                time_key = dt_obj.strftime("%Y-%m-%d %H:%M:%S")
                
                if time_key not in processed_data:
                    processed_data[time_key] = {"time": time_key}

                measure_name = data[1]['ScalarValue']
                all_measure_names.add(measure_name)
                
                val = None
                # Si es double/float usamos el promedio calculado por AWS
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
        
        # Agrupación por intervalo dinámico para evitar saturar el navegador (SQLite Fallback)
        bucket_minutes = 1
        if time_range == "7d": bucket_minutes = 5
        elif time_range == "30d": bucket_minutes = 60
        elif time_range == "custom" and start and end:
            s_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
            e_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
            duration = e_dt - s_dt
            if duration > timedelta(days=7): bucket_minutes = 60
            elif duration > timedelta(days=1): bucket_minutes = 5
            elif duration > timedelta(hours=6): bucket_minutes = 1
            else: bucket_minutes = 0 # 0 significa data cruda (segundo a segundo)
        elif time_range == "6h": bucket_minutes = 1 # Opcional: promedios por minuto para 6h
        
        aggregated_rows = {}
        for log in logs:
            # Calcular marca de tiempo truncada al bucket_minutes
            ts = log.timestamp
            if bucket_minutes > 1:
                # Redondear hacia abajo al inicio del bucket
                replaced_minute = (ts.minute // bucket_minutes) * bucket_minutes
                ts = ts.replace(minute=replaced_minute, second=0, microsecond=0)
            
            time_key = ts.strftime("%Y-%m-%d %H:%M:%S")
            
            if time_key not in aggregated_rows:
                aggregated_rows[time_key] = {"time": time_key, "_counts": {}}
            
            if isinstance(log.data, dict):
                for k, v in log.data.items():
                    all_measure_names.add(k)
                    if isinstance(v, (int, float)):
                        current_val = aggregated_rows[time_key].get(k, 0)
                        aggregated_rows[time_key][k] = current_val + v
                        aggregated_rows[time_key]["_counts"][k] = aggregated_rows[time_key]["_counts"].get(k, 0) + 1
                    else:
                        # Para booleanos/strings, tomamos el último
                        aggregated_rows[time_key][k] = v
        
        # Calcular promedios finales
        final_list = []
        for row in aggregated_rows.values():
            counts = row.pop("_counts")
            for k in list(row.keys()):
                if k != "time" and k in counts:
                    row[k] = row[k] / counts[k]
            final_list.append(row)

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
