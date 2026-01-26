from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session,joinedload
from typing import List
from ..database import get_db
from ..models import Device, DeviceTag, Plant, User
from ..schemas import TagRegistration # Usaremos este para el output
from ..auth import get_current_user # Asumiendo que tienes este helper

router = APIRouter(
    prefix="/dashboards",
    tags=["Dashboards"]
)

@router.get("/device/{device_id}/tags", response_model=List[TagRegistration])
def get_device_tags_for_dashboard(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Traemos el device con su planta para validar pertenencia
    device = db.query(Device).filter(Device.id == device_id).first()

    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

    # Multitenancy check
    if current_user.client_id and device.plant.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Acceso denegado a este recurso")

    tags = db.query(DeviceTag).filter(
        DeviceTag.device_id == device_id,
        DeviceTag.is_active == True
    ).all()

    output = []
    for tag in tags:
        output.append({
            "device_uid": device.aws_iot_uid,
            "path": tag.path, # Ej: "caldera/ignicion"
            "mqtt_key": tag.mqtt_key,
            "display_name": tag.display_name,
            "data_type": tag.data_type,
            "unit": tag.unit,
            "min_value": tag.min_value,
            "max_value": tag.max_value,
            "label_0": tag.label_0,
            "label_1": tag.label_1
        })

    return output