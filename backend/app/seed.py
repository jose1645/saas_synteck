from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app import models
from app.auth import hash_password

# =====================================================
# DATA BASE
# =====================================================

PERMISSIONS = [
    # Clients
    ("clients.read", "Ver clientes"),
    ("clients.create", "Crear clientes"),

    # Plants
    ("plants.read", "Ver plantas"),
    ("plants.create", "Crear plantas"),

    # Devices
    ("devices.read", "Ver dispositivos"),
    ("devices.create", "Crear dispositivos"),

    # Users
    ("users.read", "Ver usuarios"),
    ("users.create", "Crear usuarios"),
    ("users.manage", "Administrar usuarios"),

    # Admin
    ("roles.manage", "Administrar roles"),
]

ROLES = {
    "SUPER_ADMIN": [
        "*"
    ],
    "PARTNER_ADMIN": [
        "clients.*",
        "plants.*",
        "devices.*",
        "users.*"
    ],
    "CLIENT_ADMIN": [
        "plants.*",
        "devices.*",
        "users.read"
    ],
    "CLIENT_USER": [
        "devices.read"
    ]
}

SUPER_ADMIN_USER = {
    "email": "admin@synteck.io",
    "password": "Admin123!",
    "full_name": "Super Admin"
}


# =====================================================
# HELPERS
# =====================================================

def get_or_create_permission(db: Session, code: str, description: str):
    perm = db.query(models.Permission).filter_by(code=code).first()
    if not perm:
        perm = models.Permission(code=code, description=description)
        db.add(perm)
        db.commit()
        db.refresh(perm)
    return perm


def get_or_create_role(db: Session, name: str):
    role = db.query(models.Role).filter_by(name=name).first()
    if not role:
        role = models.Role(name=name, description=name.replace("_", " ").title())
        db.add(role)
        db.commit()
        db.refresh(role)
    return role


def assign_permissions_to_role(db: Session, role: models.Role):
    role.permissions.clear()

    if "*" in ROLES[role.name]:
        perms = db.query(models.Permission).all()
        role.permissions.extend(perms)
    else:
        for perm_code in ROLES[role.name]:
            prefix = perm_code.replace(".*", "")
            perms = db.query(models.Permission).filter(
                models.Permission.code.startswith(prefix)
            ).all()
            role.permissions.extend(perms)

    db.commit()


# =====================================================
# SEED
# =====================================================

def run_seed():
    print("🌱 Running initial seed...")
    # Crea las tablas si no existen (incluyendo la nueva columna is_active)
    models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # 1. Crear Permisos
        for code, desc in PERMISSIONS:
            get_or_create_permission(db, code, desc)

        # 2. Crear Roles y asignar permisos
        for role_name in ROLES:
            role = get_or_create_role(db, role_name)
            assign_permissions_to_role(db, role)

        # 3. Crear Super Admin con todos los flags activos
        admin = db.query(models.User).filter_by(email=SUPER_ADMIN_USER["email"]).first()
        
        if not admin:
            admin = models.User(
                email=SUPER_ADMIN_USER["email"],
                full_name=SUPER_ADMIN_USER["full_name"],
                password_hash=hash_password(SUPER_ADMIN_USER["password"]),
                is_verified=True,  # <--- Acceso directo sin verificar mail
                is_active=True     # <--- Cuenta habilitada
            )

            super_role = db.query(models.Role).filter_by(name="SUPER_ADMIN").first()
            if super_role:
                admin.roles.append(super_role)

            db.add(admin)
            db.commit()
            print(f"✅ Super admin creado ({SUPER_ADMIN_USER['email']})")

        else:
            # Por si ya existe pero quieres asegurarte que esté activo tras el cambio de modelo
            admin.is_verified = True
            admin.is_active = True
            db.commit()
            print("ℹ️ Super admin actualizado a verificado y activo")

    except Exception as e:
        print(f"❌ Error durante el seed: {e}")
        db.rollback()
    finally:
        db.close()

    print("🌱 Seed completado correctamente")


if __name__ == "__main__":
    run_seed()
