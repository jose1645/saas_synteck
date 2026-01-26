from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid # Usaremos UUID para tokens temporales rápidos
from .. import models, schemas, database
from ..auth import get_current_user
from ..utils.mailer import send_invitation_email
from fastapi import BackgroundTasks
from datetime import datetime, timedelta
import json
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import joinedload
router = APIRouter(
    prefix="/partners",
    tags=["Partners"]
)

@router.get("/", response_model=List[schemas.PartnerOut])
def read_partners(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Lista todos los socios comerciales con depuración.
    """
    # 1. Agregamos joinedload para que traiga al usuario asociado
    query = db.query(models.Partner).options(joinedload(models.Partner.user))
    partners = query.offset(skip).limit(limit).all()

    # 2. Convertimos a formato JSON-compatible para el print
    # Esto simula exactamente lo que FastAPI enviará al frontend
    debug_data = jsonable_encoder(partners)
    
    print("\n" + "="*50)
    print("DEBUG: JSON QUE SE ENVIARÁ AL FRONTEND")
    print(json.dumps(debug_data, indent=4))
    print("="*50 + "\n")

    return partners

@router.post("/", response_model=schemas.PartnerOut, status_code=status.HTTP_201_CREATED)
def create_partner(
    partner: schemas.PartnerCreate, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Verificar unicidad del email (en Partner y en User por seguridad)
    existing_partner = db.query(models.Partner).filter(models.Partner.email == partner.email).first()
    if existing_partner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El socio con este email ya existe."
        )
    
    # 2. Crear el Partner
    db_partner = models.Partner(
        name=partner.name,
        email=partner.email,
        extra_data=partner.extra_data,
        is_active=False
    )
    
    try:
        db.add(db_partner)
        db.flush() # flush() envía a la DB y genera ID sin cerrar la transacción

        # 3. Generar Seguridad: Token y Expiración (24 horas)
        invitation_token = str(uuid.uuid4())
        expiration_date = datetime.utcnow() + timedelta(hours=24)

        # 4. Crear el Usuario del Socio (Esclavo)
        # Se crea inactivo y sin password hasta que use el link
        new_user = models.User(
            email=partner.email,
            full_name=partner.name,
            partner_id=db_partner.id,
            is_verified=False, # <-- Blindaje: No puede entrar hasta validar
            verification_token=invitation_token,
            token_expires_at=expiration_date,
            password_hash="PENDING_ACTIVATION"  # <--- CAMBIAR hashed_password por password_hash
        )
        db.add(new_user)
        
        # Confirmar ambas creaciones
        db.commit()
        db.refresh(db_partner)

        # 5. Disparar Correo Zoho en Background
        background_tasks.add_task(
            send_invitation_email, 
            db_partner.email, 
            invitation_token, 
            db_partner.name
        )

        return db_partner

    except Exception as e:
            db.rollback()
            print("---------- ERROR REAL ----------")
            print(e) # Esto imprimirá el error exacto en tu terminal negra
            print("--------------------------------")
            raise HTTPException(status_code=500, detail=str(e))


@router.get("/{partner_id}", response_model=schemas.PartnerOut)
def read_partner(
    partner_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Obtiene el expediente completo de un socio.
    """
    db_partner = db.query(models.Partner).filter(models.Partner.id == partner_id).first()
    if not db_partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return db_partner


@router.put("/{partner_id}", response_model=schemas.PartnerOut)
def update_partner(
    partner_id: int, 
    partner_update: schemas.PartnerUpdate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Actualiza la información del socio, incluyendo su configuración flexible.
    """
    db_partner = db.query(models.Partner).filter(models.Partner.id == partner_id).first()
    
    if not db_partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Actualizar campos básicos si están presentes
    if partner_update.name: db_partner.name = partner_update.name
    if partner_update.email: db_partner.email = partner_update.email
    # Actualizar el JSON completo
    if partner_update.extra_data: db_partner.extra_data = partner_update.extra_data
    
    db.commit()
    db.refresh(db_partner)
    return db_partner

@router.get("/me/profile", response_model=schemas.PartnerOut)
def get_my_partner_profile(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Obtiene el perfil del Partner logueado.
    """
    if not current_user.partner_id:
        raise HTTPException(status_code=400, detail="Usuario no asociado a un Partner")

    db_partner = db.query(models.Partner).filter(models.Partner.id == current_user.partner_id).first()
    
    if not db_partner:
        raise HTTPException(status_code=404, detail="Partner profile not found")
        
    return db_partner


@router.put("/me/profile", response_model=schemas.PartnerOut)
def update_my_partner_profile(
    partner_update: schemas.PartnerUpdate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Permite al Partner logueado actualizar su propia configuración (Branding, etc).
    """
    if not current_user.partner_id:
        raise HTTPException(status_code=400, detail="Usuario no asociado a un Partner")

    db_partner = db.query(models.Partner).filter(models.Partner.id == current_user.partner_id).first()
    
    if not db_partner:
        raise HTTPException(status_code=404, detail="Partner profile not found")

    # Actualizar solo campo flexible para no romper lo demás (o lo que se envíe)
    if partner_update.name: db_partner.name = partner_update.name
    # if partner_update.email: db_partner.email = partner_update.email # Por seguridad desactivamos cambio de email por self
    if partner_update.extra_data: db_partner.extra_data = partner_update.extra_data
    
    db.commit()
    db.refresh(db_partner)
    return db_partner


@router.delete("/{partner_id}", status_code=status.HTTP_200_OK)
def disable_partner(
    partner_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    BAJA LÓGICA: Desactiva a un socio sin borrarlo de la base de datos.
    """
    db_partner = db.query(models.Partner).filter(models.Partner.id == partner_id).first()
    if not db_partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    db_partner.is_active = False # Cambiamos el estado
    db.commit()
    return {"message": "Partner disabled successfully"}

@router.patch("/{partner_id}/activate", response_model=schemas.PartnerOut)
def activate_partner(
    partner_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    REACTIVACIÓN: Vuelve a activar a un socio.
    """
    db_partner = db.query(models.Partner).filter(models.Partner.id == partner_id).first()
    if not db_partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    db_partner.is_active = True
    db.commit()
    db.refresh(db_partner)
    return db_partner

@router.post("/{partner_id}/invite")
async def resend_invitation(
    partner_id: int, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db)
):
    # Buscar al usuario vinculado a ese partner
    user = db.query(models.User).filter(models.User.partner_id == partner_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado para este socio.")
    
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Este usuario ya activó su cuenta.")

    # Regenerar Token y Expiración (Refresca la seguridad)
    new_token = str(uuid.uuid4())
    user.verification_token = new_token
    user.token_expires_at = datetime.utcnow() + timedelta(hours=24)
    
    db.commit()

    # Re-enviar vía Zoho
    background_tasks.add_task(
        send_invitation_email, 
        user.email, 
        new_token, 
        user.full_name
    )

    return {"message": "Nueva invitación enviada correctamente."}


