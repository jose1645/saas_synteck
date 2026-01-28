from app.database import SessionLocal
from app import models

def check_devices():
    db = SessionLocal()
    try:
        devices = db.query(models.Device).all()
        print(f"Found {len(devices)} devices:")
        for d in devices:
            print(f"ID: {d.id}, Name: {d.name}, UID: {d.aws_iot_uid}, Active: {d.is_active}, History: {d.history_enabled}")
            
        # Also check if there are recent logs
        logs = db.query(models.TelemetryLog).order_by(models.TelemetryLog.timestamp.desc()).limit(5).all()
        print("\nLast 5 Telemetry Loops:")
        for log in logs:
            print(f"Time: {log.timestamp}, UID: {log.device_uid}, Data keys: {list(log.data.keys())} Path: {log.path}")

    finally:
        db.close()

if __name__ == "__main__":
    check_devices()
