from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, model_validator,ConfigDict
from typing import Optional, Dict, Any


# =========================
# COMPONENTES DE RESPUESTA (SUB-SCHEMAS)
# =========================
# =========================
# CLIENTS (Asegúrate de tener este para anidar)
# =========================
class ClientSimple(BaseModel):
    id: int
    name: str
    location: Optional[str] = None

    class Config:
        from_attributes = True
        

class DeviceSummary(BaseModel):
    id: int
    name: str
    protocol: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True  # Permite leer modelos de SQLAlchemy directamente

# =========================
# DASHBOARD / STATS
# =========================

class DashboardSummary(BaseModel):
    """
    Este es el esquema que usa el endpoint /stats/summary
    """
    partners_count: int
    clients_count: int
    devices_online: int
    recent_devices: List[DeviceSummary]
# =========================
# AUTH
# =========================
class UserLoginOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    partner_id: Optional[int]
    client_id: Optional[int]
    permissions: List[str] # Lista de códigos: ["dashboard.view", "devices.create"]

class AlertOut(BaseModel):
    id: int
    device_id: int
    tag_id: int
    severity: str
    status: str
    title: str
    message: Optional[str]
    value_detected: Optional[float]
    limit_value: Optional[float]
    breach_started_at: Optional[datetime]
    created_at: datetime
    acknowledged_at: Optional[datetime]
    acknowledged_by: Optional[int]

    class Config:
        from_attributes = True

class TagConfigOut(BaseModel):
    id: int
    device_id: int
    device_name: str
    plant_name: str
    mqtt_key: str
    display_name: Optional[str] = None
    unit: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    hysteresis: Optional[float] = 0.0
    alert_delay: Optional[int] = 0

    class Config:
        from_attributes = True

class AlertACKRequest(BaseModel):
    alert_id: int

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None
    user: UserLoginOut # Agregamos el objeto user aquí

# =========================
# PARTNERS
# =========================

class PartnerBase(BaseModel):
    name: str
    email: EmailStr
    # Este campo almacenará todo lo que no sea nombre o email
    extra_data: Optional[Dict[str, Any]] = {} 

class PartnerCreate(PartnerBase):
    pass

class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    extra_data: Optional[Dict[str, Any]] = None

class UserMiniOut(BaseModel):
    id: int
    is_verified: bool
    email: EmailStr
    full_name: Optional[str]

    class Config:
        from_attributes = True
class PartnerOut(PartnerBase):
    id: int
    is_active: bool
    created_at: datetime
    # Se incluye en la respuesta para que el frontend pueda leerlo
    extra_data: Optional[Dict[str, Any]] = {}
    user: Optional[UserMiniOut] = None
    class Config:
        from_attributes = True

class CompleteSetupRequest(BaseModel):
    email: EmailStr
    token: str
    password: str

    class Config:
        from_attributes = True
# =========================
# CLIENTS
# =========================

class ClientBase(BaseModel):
    name: str
    location: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientOut(ClientBase):
    id: int
    is_active: bool
    partner_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# =========================
# PLANTS
# =========================

class PlantBase(BaseModel):
    name: str
    city: Optional[str] = None
    is_active: Optional[bool] = True

class PlantCreate(PlantBase):
    client_id: int  # <--- Obligatorio para asignar a un cliente

class PlantOut(PlantBase):
    id: int
    client_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# =========================
# CLIENT MODULES
# =========================
class ClientModuleBase(BaseModel):
    module_code: str
    is_active: bool = True
    config: Optional[Dict[str, Any]] = {}

class ClientModuleCreate(ClientModuleBase):
    pass

class ClientModuleOut(ClientModuleBase):
    id: int
    client_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ModuleUpdateSchema(BaseModel):
    """Schema para actualizar el estado de un módulo desde el frontend"""
    module_code: str
    is_active: bool
    config: Optional[Dict[str, Any]] = {}

# =========================
# DEVICES
# =========================


# =========================
# PLANTS (Actualizado para incluir al Cliente)
# =========================
class PlantOut(PlantBase):
    id: int
    client_id: int
    created_at: datetime
    # Anidamos el objeto cliente completo
    client: Optional[ClientSimple] = None 

    class Config:
        from_attributes = True
class DeviceBase(BaseModel):
    name: str
    device_type: Optional[str] = None
    protocol: Optional[str] = None
    modbus_config: Optional[Dict[str, Any]] = None
    history_enabled: Optional[bool] = False


class DeviceCreate(DeviceBase):
    aws_iot_uid: str # Normalmente obligatorio para aprovisionamiento
    plant_id: int    # <--- Obligatorio para asignar a una planta

# =========================
# DEVICES (Actualizado para incluir la Planta y su Cliente)
# =========================
class DeviceOut(DeviceBase):
    id: int
    aws_iot_uid: Optional[str]
    thing_arn: Optional[str] = None  # <--- AGREGA ESTA LÍNEA
    cert_id: Optional[str] = None    # <--- AGREGA ESTA LÍNEA (Opcional, pero útil)
    plant_id: int
    client_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    # Anidamos el objeto planta (que ya trae al cliente)
    plant: Optional[PlantOut] = None 

    class Config:
        from_attributes = True

    @model_validator(mode='before')
    @classmethod
    def get_client_id(cls, data):
        if hasattr(data, 'plant') and data.plant:
            data.client_id = data.plant.client_id
        return data
class ProvisionResponse(BaseModel):
    status: str
    certificatePem: str
    privateKey: str
    publicKey: str
    endpoint: str
    aws_iot_uid: str
    rootCA: str  # <--- Agrega este campo
    class Config:
        from_attributes = True

# =========================
# USERS
# =========================

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: Optional[str] = None  # <--- Cambia esto
    partner_id: Optional[int] = None
    client_id: Optional[int] = None


class UserOut(UserBase):
    id: int
    is_active: bool
    is_verified: bool  # <--- ASEGÚRATE DE QUE ESTA LÍNEA ESTÉ AQUÍ
    partner_id: Optional[int]
    client_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# =========================
# ROLES & PERMISSIONS
# =========================

class PermissionOut(BaseModel):
    id: int
    code: str
    description: Optional[str]

    class Config:
        from_attributes = True


class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    permissions: List[PermissionOut] = []

    class Config:
        from_attributes = True


class UserWithRolesOut(UserOut):
    roles: List[RoleOut] = []


class TagRegistration(BaseModel):
    device_uid: str
    path: str
    mqtt_key: str
    display_name: Optional[str] = None
    data_type: str
    unit: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    label_0: Optional[str] = None
    label_1: Optional[str] = None
    
    # Parámetros de Alerta
    hysteresis: Optional[float] = 0.0
    alert_delay: Optional[int] = 0
    
    model_config = ConfigDict(from_attributes=True)