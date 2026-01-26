from fastapi import APIRouter,Header, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from fastapi import APIRouter, Depends, HTTPException, status
from .. import models, schemas, database

from ..auth import (
    verify_password,
    create_access_token,
    get_current_user,
    create_refresh_token,
    hash_password
)

router = APIRouter(prefix="/auth", tags=["Auth"])


# routers/auth.py

@router.post("/login", response_model=schemas.TokenResponse)
def login(
    data: schemas.LoginRequest, 
    db: Session = Depends(get_db),
    x_portal_type: str = Header(None) 
):
    # 1. Búsqueda de usuario
    user = db.query(models.User).filter(models.User.email == data.email).first()

    # 2. Validaciones de existencia y contraseña
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    # 3. Lógica de Verificación ( VIP para SuperAdmin )
    # Identificamos si es SuperAdmin: no tiene partner_id ni client_id
    is_super_admin = user.partner_id is None and user.client_id is None
    
    if not is_super_admin and not user.is_verified:
        raise HTTPException(status_code=401, detail="Cuenta no verificada")
    
    if hasattr(user, 'is_active') and not user.is_active:
        raise HTTPException(status_code=401, detail="Cuenta desactivada")

    # 4. Domain Locking (Portales)
    if x_portal_type == "CLIENT_PORTAL":
        if user.client_id is None:
            raise HTTPException(status_code=403, detail="Acceso denegado: Portal de clientes.")

    elif x_portal_type == "PARTNER_PORTAL":
        if user.partner_id is None:
            raise HTTPException(status_code=403, detail="Acceso denegado: Portal de socios.")

    elif x_portal_type == "ADMIN_PORTAL":
        if not is_super_admin:
            raise HTTPException(status_code=403, detail="Acceso denegado: Solo administradores globales.")
    
    else:
        raise HTTPException(status_code=400, detail="Portal de acceso no válido.")

    # 5. Permisos y Roles
    permissions = set()
    for role in user.roles:
        for perm in role.permissions:
            permissions.add(perm.code)
    
    # Comodín de permisos para SuperAdmin si no tiene roles asignados
    if is_super_admin and not permissions:
        permissions.add("*")

    # 6. Generación de Tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(db=db, user_id=user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "partner_id": user.partner_id,
            "client_id": user.client_id,
            "permissions": list(permissions)
        }
    }


@router.get("/me", response_model=schemas.UserOut)
def me(current_user=Depends(get_current_user)):
    return current_user



@router.post("/refresh", response_model=schemas.TokenResponse)
def refresh_token(data: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    # 1. Validar el token
    db_token = db.query(models.RefreshToken).filter(
        models.RefreshToken.token == data.refresh_token,
        models.RefreshToken.revoked == False,
        models.RefreshToken.expires_at > datetime.utcnow()
    ).first()

    if not db_token:
        # Log para depuración en consola
        print(f"DEBUG: Intento de refresh fallido con token: {data.refresh_token[:10]}...")
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")

    # 2. Buscar usuario primero para asegurar que la respuesta sea completa
    user = db.query(models.User).filter(models.User.id == db_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # 3. Rotación: Revocamos el actual ANTES de crear el nuevo (Atomicidad)
    db_token.revoked = True
    
    # 4. Reconstruir permisos
    permissions = set()
    for role in user.roles:
        for perm in role.permissions:
            permissions.add(perm.code)

    # 5. Generar nuevos tokens
    access_token = create_access_token({"sub": str(user.id)})
    new_refresh_token = create_refresh_token(db, user.id)

    # 6. Commit de la revocación y el nuevo token
    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": new_refresh_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "partner_id": user.partner_id,
            "client_id": user.client_id,
            "permissions": list(permissions)
        }
    }
@router.post("/complete-setup")
def complete_setup(data: schemas.CompleteSetupRequest, db: Session = Depends(database.get_db)):
    """
    Endpoint que llama el Portal Esclavo para establecer la contraseña 
    y activar la cuenta del Partner mediante el token.
    """
    # 1. Buscar al usuario por Email y Token (Match estricto)
    user = db.query(models.User).filter(
        models.User.email == data.email,
        models.User.verification_token == data.token
    ).first()

    # VALIDACIÓN 1: ¿Existe la combinación Email/Token?
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de invitación es inválido o ya ha sido utilizado."
        )

    # VALIDACIÓN 2: ¿El token ya expiró?
    if user.token_expires_at and datetime.utcnow() > user.token_expires_at:
        # Limpiamos el token expirado por seguridad
        user.verification_token = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace ha expirado. Por favor, solicita una nueva invitación desde el administrador."
        )

    # VALIDACIÓN 3: ¿Ya estaba verificado? (Doble check)
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta cuenta ya se encuentra activa."
        )

    # 2. TODO OK: Encriptar password y activar cuenta
    try:
        user.password_hash = hash_password(data.password)        
        user.is_verified = True
        # BLINDAJE: El token es de UN SOLO USO, lo quemamos
        user.verification_token = None
        user.token_expires_at = None
        
        db.commit()
        return {"message": "Cuenta activada con éxito. Ya puedes iniciar sesión en tu portal."}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Error interno al procesar la activación."
        )
        
        
@router.post("/logout")
def logout(data: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Invalida el refresh token y loguea la acción en consola para auditoría.
    """
    # 1. Buscamos el token
    db_token = db.query(models.RefreshToken).filter(
        models.RefreshToken.token == data.refresh_token
    ).first()

    if db_token:
        # 2. Marcamos como revocado
        db_token.revoked = True
        db.commit()
        
        # LOG DE ÉXITO: Muestra el ID del usuario y los primeros caracteres del token
        print(f"\n[AUTH] 🚪 Logout exitoso: Usuario ID {db_token.user_id}")
        print(f"[AUTH] 🛡️ Token invalidado: {data.refresh_token[:10]}...\n")
    else:
        # LOG DE ADVERTENCIA: Alguien intentó cerrar sesión con un token que no existe
        print(f"\n[AUTH] ⚠️ Intento de logout con token inexistente o inválido.")
        print(f"[AUTH] Token recibido: {data.refresh_token[:10]}...\n")

    return {"detail": "Sesión cerrada exitosamente."}