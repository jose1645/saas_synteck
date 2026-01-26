from fastapi import APIRouter,Header, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import secrets
from datetime import datetime, timedelta
from .. import models, schemas, database
from ..auth import get_current_user, pwd_context, hash_password
from sqlalchemy.orm import joinedload
from ..utils.mailer import send_invitation_email  # Asegúrate de que esta sea la ruta real
router = APIRouter(
    prefix="/clients",
    tags=["Clients"]
)

@router.get("/", response_model=List[schemas.ClientOut])
def read_clients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Client).filter(
        models.Client.partner_id == current_user.partner_id,
        models.Client.is_active == True
    ).offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.ClientOut)
def create_client(
    client: schemas.ClientCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_client = models.Client(
        **client.dict(),
        partner_id=current_user.partner_id
    )
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client


@router.get("/{client_id}", response_model=schemas.ClientOut)
def read_client(
    client_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    print(f"🔍 [DEBUG] Buscando info base del Cliente ID: {client_id}")
    
    # 1. Buscamos el cliente
    query = db.query(models.Client).filter(models.Client.id == client_id)

    # 2. VALIDACIÓN DE ACCESO CRUZADO
    # Si NO es Superadmin (no tiene partner_id ni client_id), filtramos:
    if current_user.partner_id or current_user.client_id:
        # Si es un usuario de nivel CLIENTE, solo puede verse a sí mismo
        if current_user.client_id:
            if current_user.client_id != client_id:
                raise HTTPException(status_code=403, detail="No tienes permiso para ver esta empresa")
        # Si es un PARTNER, solo puede ver clientes que él creó
        else:
            query = query.filter(models.Client.partner_id == current_user.partner_id)

    db_client = query.first()

    if not db_client:
        print(f"❌ [DEBUG] Cliente {client_id} no encontrado o sin acceso")
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
    print(f"✅ [DEBUG] Enviando info de: {db_client.name}")
    return db_client

@router.get("/{client_id}/users", response_model=List[schemas.UserOut])
def read_client_users(
    client_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Lista todos los usuarios asociados a un cliente específico.
    Solo accesible si el cliente pertenece al Partner logueado.
    """
    # Verificamos primero que el cliente sea propiedad del partner actual
    client = db.query(models.Client).filter(
        models.Client.id == client_id, 
        models.Client.partner_id == current_user.partner_id
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado o acceso denegado")

    return db.query(models.User).filter(models.User.client_id == client_id).all()


@router.post("/{client_id}/users", response_model=schemas.UserOut)
async def create_client_user( # <--- Agregamos 'async'
    client_id: int,
    user_in: schemas.UserCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # ... (Validaciones de cliente y email iguales a las anteriores)

    invitation_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=24)

    db_user = models.User(
        email=user_in.email,
        full_name=user_in.full_name,
        password_hash=pwd_context.hash(secrets.token_hex(16)), 
        client_id=client_id,
        is_verified=False,
        is_active=True,
        verification_token=invitation_token,
        token_expires_at=expires_at
    )

    try:
        db.add(db_user)
        db.flush() 

        # LLAMADA AL MAILER CORREGIDA
        # 1. Usamos 'await' porque la función es async
        # 2. Usamos 'partner_name' porque así está en tu mailer.py
        await send_invitation_email(
            email_to=db_user.email,
            token=invitation_token,
            partner_name=db_user.full_name 
        )

        db.commit()
        db.refresh(db_user)
        return db_user

    except Exception as e:
        db.rollback()
        print(f"🔥 Error en el proceso: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    
@router.get("/plants/{plant_id}/devices", response_model=List[schemas.DeviceOut])
def get_devices_by_plant_for_client(
    plant_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Lista los equipos de una planta validando que el usuario pertenezca 
    al cliente dueño de la planta.
    """
    # 1. Buscamos la planta y su cliente de una vez
    plant = db.query(models.Plant).options(
        joinedload(models.Plant.client)
    ).filter(models.Plant.id == plant_id).first()

    if not plant:
        raise HTTPException(status_code=404, detail="Planta no encontrada")

    # 2. VALIDACIÓN DE SEGURIDAD
    # Acceso permitido si:
    # - Es el Partner dueño del cliente
    # - Es un usuario del propio cliente
    is_partner_owner = current_user.partner_id and plant.client.partner_id == current_user.partner_id
    is_client_member = current_user.client_id == plant.client_id

    if not (is_partner_owner or is_client_member):
        raise HTTPException(
            status_code=403, 
            detail="No tienes autoridad para ver los equipos de esta planta"
        )

    # 3. Retornar los dispositivos vinculados
    return db.query(models.Device).filter(models.Device.plant_id == plant_id).all()

# ==========================================
# GESTIÓN DE MÓDULOS (Client Modules)
# ==========================================

@router.get("/{client_id}/modules", response_model=List[schemas.ClientModuleOut])
def get_client_modules(
    client_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Validar acceso (Partner dueño o Admin)
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.partner_id == current_user.partner_id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    return db.query(models.ClientModule).filter(models.ClientModule.client_id == client_id).all()


@router.post("/{client_id}/modules", response_model=schemas.ClientModuleOut)
def update_client_module(
    client_id: int,
    module_in: schemas.ClientModuleCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Activa/Desactiva un módulo para un cliente.
    SIDE EFFECT: Si es 'history', actualiza todos los equipos de ese cliente.
    """
    # 1. Validar Cliente
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.partner_id == current_user.partner_id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # 2. Upsert (Buscar si ya existe)
    db_module = db.query(models.ClientModule).filter(
        models.ClientModule.client_id == client_id,
        models.ClientModule.module_code == module_in.module_code
    ).first()

    if db_module:
        db_module.is_active = module_in.is_active
        db_module.config = module_in.config
    else:
        db_module = models.ClientModule(
            client_id=client_id,
            **module_in.dict()
        )
        db.add(db_module)

    db.commit()
    db.refresh(db_module)

    # 3. SIDE EFFECT: Propagar a dispositivos (Backward Compatibility)
    if module_in.module_code == 'history':
        print(f"🔄 [SYNC] Sincronizando módulo History para cliente {client.name}")
        
        # Buscar todas las plantas del cliente
        plants = db.query(models.Plant).filter(models.Plant.client_id == client_id).all()
        plant_ids = [p.id for p in plants]
        
        # Buscar equipos
        devices = db.query(models.Device).filter(models.Device.plant_id.in_(plant_ids)).all()
        
        for dev in devices:
            dev.history_enabled = module_in.is_active
        
        db.commit()
        print(f"✅ [SYNC] {len(devices)} equipos actualizados a history_enabled={module_in.is_active}")

    return db_module