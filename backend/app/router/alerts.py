from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("/active", response_model=List[schemas.AlertOut])
def get_active_alerts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Lista las alertas activas (status=ACTIVE o ACKNOWLEDGED) 
    filtrando por el scope del usuario (empresa).
    """
    query = db.query(models.Alert).join(models.Device).join(models.Plant)
    
    if current_user.client_id:
        # Modo Cliente Final
        query = query.filter(models.Plant.client_id == current_user.client_id)
    elif current_user.partner_id:
        # Modo Integrador
        query = query.join(models.Client).filter(models.Client.partner_id == current_user.partner_id)
    
    # Solo alertas que no han sido resueltas físicamente
    return query.filter(models.Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"])).order_by(models.Alert.created_at.desc()).all()

@router.post("/ack")
def acknowledge_alert(
    data: schemas.AlertACKRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Marca una alerta como RECONOCIDA.
    """
    alert = db.query(models.Alert).filter(models.Alert.id == data.alert_id).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    # Validar permisos (que pertenezca a su empresa)
    # Por simplicidad ahora solo cambiamos estado
    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_at = datetime.utcnow()
    alert.acknowledged_by = current_user.id
    
    db.commit()
    return {"status": "success", "message": "Alerta reconocida correctamente"}

@router.get("/history", response_model=List[schemas.AlertOut])
def get_alert_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Historial de alertas resueltas o reconocidas.
    """
    query = db.query(models.Alert).join(models.Device).join(models.Plant)
    
    if current_user.client_id:
        query = query.filter(models.Plant.client_id == current_user.client_id)
    elif current_user.partner_id:
        query = query.join(models.Client).filter(models.Client.partner_id == current_user.partner_id)

    return query.order_by(models.Alert.created_at.desc()).limit(limit).all()

@router.get("/config", response_model=List[schemas.TagConfigOut])
def get_alerts_configuration(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Lista todas las variables que tienen umbrales configurados (min/max).
    """
    query = db.query(
        models.DeviceTag.id,
        models.DeviceTag.device_id,
        models.Device.name.label("device_name"),
        models.Plant.name.label("plant_name"),
        models.DeviceTag.mqtt_key,
        models.DeviceTag.display_name,
        models.DeviceTag.unit,
        models.DeviceTag.min_value,
        models.DeviceTag.max_value,
        models.DeviceTag.hysteresis,
        models.DeviceTag.alert_delay
    ).join(models.Device, models.DeviceTag.device_id == models.Device.id)\
     .join(models.Plant, models.Device.plant_id == models.Plant.id)

    if current_user.client_id:
        query = query.filter(models.Plant.client_id == current_user.client_id)
    elif current_user.partner_id:
        query = query.join(models.Client).filter(models.Client.partner_id == current_user.partner_id)

    # Filtrar solo los que tienen al menos un límite
    results = query.filter(
        (models.DeviceTag.min_value.isnot(None)) | (models.DeviceTag.max_value.isnot(None))
    ).all()

    return results
