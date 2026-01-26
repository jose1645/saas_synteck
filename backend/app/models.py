from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime,
    Boolean,
    JSON,
    Table,
    Float
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


# ======================================================
# Tablas de relación (many-to-many)
# ======================================================

user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", ForeignKey("users.id"), primary_key=True),
    Column("role_id", ForeignKey("roles.id"), primary_key=True),
)

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", ForeignKey("roles.id"), primary_key=True),
    Column("permission_id", ForeignKey("permissions.id"), primary_key=True),
)


# ======================================================
# Core SaaS (Multi-tenant)
# ======================================================

class Partner(Base):
    __tablename__ = "partners"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    is_active = Column(Boolean, default=True)

    # --- CAMPO FLEXIBLE PARA EL MVP ---
    # Aquí se guardará: tax_id, country, currency, commercial_conditions, etc.
    extra_data = Column(JSON, nullable=True, default={}) 
    # ----------------------------------

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # 👇 ESTO ES LO QUE FALTA (La relación hacia User)
    user = relationship("User", back_populates="partner_obj", uselist=False)
    clients = relationship("Client", back_populates="partner")
    clients = relationship("Client", back_populates="partner")
class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True) # Indexado para búsquedas rápidas
    
    # --- Gestión Industrial ---
    location = Column(String)  # Ciudad/Estado
    timezone = Column(String, default="America/Mexico_City") # Crucial para gráficas de telemetría
    
    # --- Negocio / SaaS ---
    tax_id = Column(String, unique=True, index=True) # RFC o ID Fiscal (Para evitar duplicados)
    is_active = Column(Boolean, default=True)
    
    # Campo flexible para guardar logos, teléfonos o notas sin cambiar el esquema
    extra_data = Column(JSON, nullable=True, default={}) 

    # --- Relaciones ---
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    partner = relationship("Partner", back_populates="clients")
    plants = relationship("Plant", back_populates="client", cascade="all, delete-orphan")
    users = relationship("User", back_populates="client")
    modules = relationship("ClientModule", back_populates="client", cascade="all, delete-orphan")

class ClientModule(Base):
    __tablename__ = "client_modules"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    
    # Código del módulo (ej: "history", "alarms", "reports")
    module_code = Column(String, nullable=False) 
    
    is_active = Column(Boolean, default=True)
    
    # Configuración específica en JSON (ej: retención=30días, límites, etc)
    config = Column(JSON, nullable=True, default={}) 

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client", back_populates="modules")


# 1. Tabla de Topics Permitidos (Configuración dinámica)
class DeviceTopic(Base):
    __tablename__ = "device_topics"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    
    # El topic relativo (ej: "temperatura", "alertas", "estado")
    # En AWS se verá como: synteck/{device_uid}/{topic_name}
    topic_name = Column(String, nullable=False)
    
    # Permisos: 'pub' (publicar), 'sub' (suscribir), 'both'
    permission_type = Column(String, default="pub") 
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    device = relationship("Device", back_populates="allowed_topics")

class Plant(Base):
    __tablename__ = "plants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    city = Column(String)
    is_active = Column(Boolean, default=True)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client", back_populates="plants")
    devices = relationship("Device", back_populates="plant")


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    device_type = Column(String)
    protocol = Column(String)

    aws_iot_uid = Column(String, unique=True, index=True)
    is_active = Column(Boolean, default=False)
# --- CAMPOS DE AWS ---
    thing_arn = Column(String, nullable=True)      # ARN del 'Thing'
    cert_arn = Column(String, nullable=True)       # ARN del Certificado actual
    cert_id = Column(String, nullable=True)        # ID del Certificado (para activarlo/desactivarlo)
    policy_arn = Column(String, nullable=True)     # ARN de la política específica si usas una por equipo
    # ---------------------
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False)

    history_enabled = Column(Boolean, default=False) # Feature Toggle


    # Config específica (ej. Modbus TCP/RTU)
    modbus_config = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    allowed_topics = relationship("DeviceTopic", back_populates="device")
    plant = relationship("Plant", back_populates="devices")
    tags = relationship("DeviceTag", back_populates="device", cascade="all, delete-orphan")

# ======================================================
# AUTH INTERNO + RBAC
# ======================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True) # <-- Añade esto
    # Multi-tenant scope
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    partner = relationship("Partner")
    client = relationship("Client", back_populates="users")
    verification_token = Column(String, nullable=True, index=True)
    token_expires_at = Column(DateTime, nullable=True) # <-- Campo de seguridad
    roles = relationship(
        "Role",
        secondary=user_roles,
        back_populates="users"
    )
    partner_obj = relationship("Partner", back_populates="user")

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String)

    users = relationship(
        "User",
        secondary=user_roles,
        back_populates="roles"
    )

    permissions = relationship(
        "Permission",
        secondary=role_permissions,
        back_populates="roles"
    )


class Permission(Base):
    """
    Representa pantallas / acciones:
    ej:
      - dashboard.view
      - devices.create
      - devices.edit
      - users.manage
    """
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)
    description = Column(String)

    roles = relationship(
        "Role",
        secondary=role_permissions,
        back_populates="permissions"
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    revoked = Column(Boolean, default=False)

    user = relationship("User")


class DeviceTag(Base):
    """
    Representa el mapeo de una variable MQTT a una entidad de negocio.
    Permite parametrizar alias, unidades y rangos de alerta.
    """
    __tablename__ = "device_tags"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False, index=True)
    
    # Estructura del Tópico / Jerarquía
    path = Column(String, nullable=False)           # Ej: caldera/sensor1
    mqtt_key = Column(String, nullable=False)       # Ej: ASDSD
    display_name = Column(String, nullable=True)    # Ej: Presión Vapor Principal
    
    # Metadatos Técnicos
    data_type = Column(String, default="numeric")   # numeric, boolean, string
    unit = Column(String, nullable=True)            # Ej: PSI, °C, Kwh
    
    # Configuración de Alarmas / Rangos (Para variables numéricas)
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    
    # Configuración de Estados (Para variables booleanas)
    label_0 = Column(String, nullable=True)         # Ej: OFF / FALLA
    label_1 = Column(String, nullable=True)         # Ej: ON / NORMAL
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relación hacia el dispositivo
    device = relationship("Device", back_populates="tags")