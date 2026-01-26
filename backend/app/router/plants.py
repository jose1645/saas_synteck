from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from .. import models, schemas, database
from ..auth import get_current_user
from typing import List  # <--- ESTO ES LO QUE FALTA
router = APIRouter(
    prefix="/plants",
    tags=["Plants"]
)

@router.get("/client/{client_id}", response_model=List[schemas.PlantOut])
def get_plants_by_client(
    client_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Buscamos el cliente con una validación lógica:
    # "Tráeme el cliente si soy su Partner O si soy un empleado de ese cliente"
    client = db.query(models.Client).filter(models.Client.id == client_id).first()

    if not client:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    # 2. VALIDACIÓN DE SEGURIDAD (Multi-tenant)
    # Si el usuario es un Cliente, solo puede ver sus propias plantas
    if current_user.client_id:
        if current_user.client_id != client_id:
            raise HTTPException(status_code=403, detail="Acceso denegado a esta terminal")
    
    # Si el usuario es un Partner, solo puede ver clientes que le pertenecen
    elif current_user.partner_id:
        if client.partner_id != current_user.partner_id:
            raise HTTPException(status_code=403, detail="No tienes autoridad sobre este cliente")

    # 3. Si pasó las pruebas, entregamos las plantas
    plants = db.query(models.Plant).filter(models.Plant.client_id == client_id).all()
    return plants

@router.post("/", response_model=schemas.PlantOut)
def create_plant(
    data: schemas.PlantCreate, 
    db: Session = Depends(database.get_db), # <--- Aquí usamos la sesión
    current_user: models.User = Depends(get_current_user)
):
    # 1. Seguridad Multi-tenant: 
    # Validamos que el cliente destino pertenezca al Partner logueado
    client = db.query(models.Client).filter(
        models.Client.id == data.client_id,
        models.Client.partner_id == current_user.partner_id
    ).first()

    if not client:
        raise HTTPException(
            status_code=403, 
            detail="No tienes permiso para asignar plantas a este cliente."
        )

    # 2. Creación de la planta
    new_plant = models.Plant(
        name=data.name,
        city=data.city,
        client_id=data.client_id
    )
    
    db.add(new_plant)
    db.commit()
    db.refresh(new_plant)
    return new_plant


@router.get("/{device_id}/full-context", response_model=schemas.DeviceOut)
def get_device_full_context(
    device_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Recupera un dispositivo con toda su jerarquía (Planta -> Cliente -> Partner).
    Útil para inicializar el Dashboard con todos los IDs del WebSocket.
    """
    # Buscamos el equipo con JOINs hacia arriba
    device = db.query(models.Device).options(
        joinedload(models.Device.plant)
        .joinedload(models.Plant.client)
    ).filter(models.Device.id == device_id).first()

    if not device:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    # VALIDACIÓN DE SEGURIDAD (Multi-tenant)
    # Si soy un cliente, solo puedo ver mis equipos
    if current_user.client_id and device.plant.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="No tienes permiso sobre este activo")
    
    # Si soy un partner, solo puedo ver equipos de mis clientes
    elif current_user.partner_id and device.plant.client.partner_id != current_user.partner_id:
        raise HTTPException(status_code=403, detail="Este activo no pertenece a tu red")

    # Inyectamos dinámicamente el partner_id para el frontend si el esquema lo permite
    # o simplemente confiamos en que el objeto anidado lo lleva.
    return device