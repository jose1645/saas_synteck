from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import boto3
from .. import models, schemas, database
from ..auth import get_current_user
from typing import List
import json
from app.database import get_db  # <--- Esta es la que falta
import logging
from ..config import settings
# Configuración básica de logging si no la tienes en tu app.main
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

AWS_ROOT_CA = """-----BEGIN CERTIFICATE-----
MIIDQTCCAimgAwIBAgITBmyfz5m/jAo54vB4ikPmljZbyjANBgkqhkiG9w0BAQsF
ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6
b24gUm9vdCBDQSAxMB4XDTE1MDUyNjAwMDAwMFoXDTM4MDExNzAwMDAwMFowOTEL
MAkGA1UEBhMCVVMxDzANBgNVBAoTBkFtYXpvbjEZMBcGA1UEAxMQQW1hem9uIFJv
b3QgQ0EgMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALJ4gHHKeNXj
ca9HgFB0fW7Y14h29Jlo91ghYPl0hAEvrAIthtOgQ3pOsqTQNroBvo3bSMgHFzZM
9O6II8c+6zf1tRn4SWiw3te5djgdYZ6k/oI2peVKVuRF4fn9tBb6dNqcmzU5L/qw
IFAGbHrQgLKm+a/sRxmPUDgH3KKHOVj4utWp+UhnMJbulHheb4mjUcAwhmahRWa6
VOujw5H5SNz/0egwLX0tdHA114gk957EWW67c4cX8jJGKLhD+rcdqsq08p8kDi1L
93FcXmn/6pUCyziKrlA4b9v7LWIbxcceVOF34GfID5yHI9Y/QCB/IIDEgEw+OyQm
jgSubJrIqg0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMC
AYYwHQYDVR0OBBYEFIQYzIU07LwMlJQuCFmcx7IQTgoIMA0GCSqGSIb3DQEBCwUA
A4IBAQCY8jdaQZChGsV2USggNiMOruYou6r4lK5IpDB/G/wkjUu0yKGX9rbxenDI
U5PMCCjjmCXPI6T53iHTfIUJrU6adTrCC2qJeHZERxhlbI1Bjjt/msv0tadQ1wUs
N+gDS63pYaACbvXy8MWy7Vu33PqUXHeeE6V/Uq2V8viTO96LXFvKWlJbYK8U90vv
o/ufQJVtMVT8QtPHRh8jrdkPSHCa2XV4cdFyQzR1bldZwgJcJmApzyMZFo6IQ6XU
5MsI+yMRQ+hDKXJioaldXgjUkK642M4UwtBV8ob2xJNDd2ZhwLnoQdeXeGADbkpy
rqXRfboQnoZsG4q5WTP468SQvvG5
-----END CERTIFICATE-----"""


router = APIRouter(
    prefix="/devices",
    tags=["Devices"]
)

# Cliente de Lambda usando los settings del .env
lambda_client = boto3.client(
    'lambda',
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
    region_name=settings.aws_region
)

# Cliente para consultar el estado real en AWS IoT Core
iot_client = boto3.client(
    'iot',
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
    region_name=settings.aws_region
)
@router.get("/", response_model=List[schemas.DeviceOut])
def get_all_partner_devices(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    print(f"📡 [DEBUG] Buscando todos los dispositivos para Partner ID: {current_user.partner_id}")
    
    # Esta query atraviesa: Device -> Plant -> Client -> Partner
    devices = db.query(models.Device)\
        .join(models.Plant)\
        .join(models.Client)\
        .filter(models.Client.partner_id == current_user.partner_id)\
        .all()

    print(f"✅ [DEBUG] Se encontraron {len(devices)} dispositivos")
    return devices


@router.post("/", response_model=schemas.DeviceOut)
def create_device(
    device: schemas.DeviceCreate,  # <-- Pydantic leerá el plant_id de aquí
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    print(f"🚀 [DEBUG] Recibida solicitud para crear: {device.name}")
    
    # 1. Validar seguridad: ¿La planta pertenece al Partner del usuario?
    # Usamos device.plant_id que viene en el JSON
    plant = db.query(models.Plant).join(models.Client).filter(
        models.Plant.id == device.plant_id,
        models.Client.partner_id == current_user.partner_id
    ).first()

    if not plant:
        print(f"❌ [DEBUG] Acceso denegado o planta {device.plant_id} inexistente")
        raise HTTPException(status_code=403, detail="No tienes permisos para esta planta")

    # 2. Crear el objeto con los datos del esquema
    db_device = models.Device(
        **device.dict() # Esto incluye name, device_type, protocol, modbus_config, aws_iot_uid y plant_id
    )
    
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    
    print(f"✅ [DEBUG] Equipo {db_device.id} vinculado con éxito")
    return db_device



@router.get("/plant/{plant_id}", response_model=List[schemas.DeviceOut])
def get_devices_by_plant(
    plant_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    print("\n" + "="*50)
    print(f"🚀 [ENTRADA] Request a /devices/plant/{plant_id}")
    print(f"👤 [USER] Email: {current_user.email} | Partner ID: {current_user.partner_id}")
    print("="*50)

    try:
        # Paso 1: Ver si la planta existe siquiera en la DB
        raw_plant = db.query(models.Plant).filter(models.Plant.id == plant_id).first()
        if not raw_plant:
            print(f"❓ [DB] La planta con ID {plant_id} NO EXISTE en la tabla 'plants'.")
        else:
            print(f"🏠 [DB] Planta encontrada: {raw_plant.name} (Client ID: {raw_plant.client_id})")

        # Paso 2: Verificación con el JOIN y el Partner
        print(f"🔒 [AUTH] Verificando si pertenece al Partner: {current_user.partner_id}...")
        
        query = db.query(models.Plant).join(models.Client).filter(
            models.Plant.id == plant_id,
            models.Client.partner_id == current_user.partner_id
        )
        
        # Imprimir el SQL generado para depurar
        print(f"📑 [SQL] Query generado: {query}")
        
        plant = query.first()

        if not plant:
            print(f"❌ [DENIED] Acceso denegado o relación rota.")
            print(f"REVISAR: ¿El cliente de la planta {plant_id} tiene partner_id = {current_user.partner_id}?")
            # Aquí es donde se dispara el 404 que ves
            raise HTTPException(status_code=404, detail="Planta no encontrada o sin acceso")

        # Paso 3: Buscar dispositivos
        print(f"✅ [SUCCESS] Acceso concedido a la planta: {plant.name}")
        devices = db.query(models.Device).filter(models.Device.plant_id == plant_id).all()
        
        print(f"📦 [RESULT] Dispositivos en DB: {len(devices)}")
        for d in devices:
            print(f"   - ID: {d.id} | Name: {d.name} | UID: {d.aws_iot_uid}")

        return devices

    except Exception as e:
        print(f"💥 [ERROR CRITICO] {str(e)}")
        raise e
    
@router.post("/{device_id}/provision", response_model=schemas.ProvisionResponse)
async def provision_device(
    device_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # <--- AGREGA ESTA LÍNEA
):
    # --- DEBUG DE CREDENCIALES ---
    logger.info("=== DIAGNÓSTICO DE CREDENCIALES AWS ===")
    logger.info(f"Access Key ID: {settings.aws_access_key_id}")
    # Mostramos los primeros 5 y últimos 5 del Secret para verificar el '+'
    secret = settings.aws_secret_access_key
    if secret:
        masked_secret = f"{secret[:5]}...{secret[-5:]}"
        logger.info(f"Secret Key (Masked): {masked_secret}")
        logger.info(f"Longitud del Secret: {len(secret)} (Debería ser 40)")
    else:
        logger.error("¡SECRET KEY ESTÁ VACÍO!")
    logger.info(f"Región: {settings.aws_region}")
    logger.info(f"Función: {settings.lambda_function_name}")
    logger.info("========================================")

    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

    partner_name = current_user.partner.name if current_user.partner else "default_partner"
    payload = {
        "device_id": device.aws_iot_uid,
        "thingName": device.aws_iot_uid,
        "attributes": {
                "planta": device.plant.name if device.plant else "N/A"
            },
        "context": {
   "partner_name": partner_name,
        "client_name": device.plant.client.name if device.plant and device.plant.client else "default_client",
        "plant_name": device.plant.name if device.plant else "default_plant"
        }
    }
    

    try:
        # Forzamos la creación del cliente aquí mismo para asegurar que use los settings actuales
        # Esto ayuda si boto3 está agarrando credenciales de otro lado
        import boto3
        local_lambda = boto3.client(
            'lambda',
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region
        )

        logger.info(f"Invocando Lambda para: {device.aws_iot_uid}")
        
        response = local_lambda.invoke(
            FunctionName=settings.lambda_function_name,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )

        # ... resto de tu lógica igual ...
        res_json = json.loads(response['Payload'].read().decode('utf-8'))
        
        if res_json.get('statusCode') and res_json.get('statusCode') != 200:
            error_msg = res_json.get('body', 'Error desconocido')
            raise HTTPException(status_code=500, detail=f"AWS Lambda Error: {error_msg}")

        iot_data = res_json.get('body') if isinstance(res_json.get('body'), dict) else res_json
        logger.info(AWS_ROOT_CA)

        device.thing_arn = iot_data.get('thingArn')
        device.is_active = True
        db.commit()
        
        return {
            "status": "success",
            "certificatePem": iot_data.get('certificatePem'),
            "privateKey": iot_data.get('privateKey'),
            "publicKey": iot_data.get('publicKey'),
            "endpoint": iot_data.get('endpoint'),
            "aws_iot_uid": device.aws_iot_uid,
            "rootCA": AWS_ROOT_CA  # <--- Enviamos la CA aquí
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error en el proceso: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    
@router.get("/{device_id}/provision-status")
async def get_provision_status(device_id: int, db: Session = Depends(get_db)):
    # 1. Verificar existencia en Base de Datos local
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    
    if not device:
        logger.warning(f" [DB] Dispositivo ID {device_id} no encontrado.")
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

    logger.info(f" [DB] Consultando status para: {device.aws_iot_uid}")
    logger.info(AWS_ROOT_CA)
    # Estado inicial basado en lo que tenemos en nuestra DB
    status = {
        "is_provisioned": bool(device.thing_arn),
        "aws_sync": False,
        "rootCA": AWS_ROOT_CA, # <--- Siempre devolvemos la CA para que el cliente la tenga
        "details": {
            "thing_arn": device.thing_arn,
            "cert_id": device.cert_id,
            "is_active": device.is_active
        }
    }

    # 2. Si en DB dice que está aprovisionado, validamos contra la nube real
    if device.thing_arn:
        try:
            # Usamos el cliente de IoT (asegúrate de tener iot_client definido globalmente)
            # iot_client = boto3.client('iot', ...)
            response = iot_client.describe_thing(thingName=device.aws_iot_uid)
            
            # Si llegamos aquí, el Thing existe en AWS
            status["aws_sync"] = True 
            logger.info(f" [AWS] Sincronización exitosa para {device.aws_iot_uid}")
            
        except iot_client.exceptions.ResourceNotFoundException:
            status["aws_sync"] = False
            status["error"] = "Thing eliminado en AWS pero existe en DB"
            logger.error(f" [AWS] El Thing {device.aws_iot_uid} no existe en la nube.")
            
        except Exception as e:
            status["aws_sync"] = False
            status["error"] = str(e)
            logger.error(f" [AWS] Error de comunicación: {str(e)}")
    else:
        logger.info(f" [AWS] El dispositivo {device.aws_iot_uid} aún no ha sido aprovisionado.")
            
    return status


@router.post("/tags/register")
async def register_device_tag(
    payload: schemas.TagRegistration, # <--- Importado de schemas
    db: Session = Depends(get_db)
):
    # 1. Buscar dispositivo
    device = db.query(models.Device).filter(models.Device.aws_iot_uid == payload.device_uid).first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

    # 2. Upsert (Crear o Actualizar)
    db_tag = db.query(models.DeviceTag).filter(
        models.DeviceTag.device_id == device.id,
        models.DeviceTag.path == payload.path,
        models.DeviceTag.mqtt_key == payload.mqtt_key
    ).first()

    # Extraemos los datos del JSON (payload)
    tag_data = payload.model_dump(exclude={"device_uid"})

    if db_tag:
        # Actualización de la variable existente
        for key, value in tag_data.items():
            setattr(db_tag, key, value)
    else:
        # Registro de nueva variable
        db_tag = models.DeviceTag(device_id=device.id, **tag_data)
        db.add(db_tag)

    db.commit()
    db.refresh(db_tag)
    return db_tag

@router.get("/{device_id}/tags", response_model=List[schemas.TagRegistration])
async def get_device_tags(
    device_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Obtiene todos los mapeos registrados para un dispositivo específico.
    Solo permite el acceso si el dispositivo pertenece al Partner del usuario.
    """
    # 1. Seguridad: Verificar que el equipo pertenece al partner
    device = db.query(models.Device)\
        .join(models.Plant)\
        .join(models.Client)\
        .filter(
            models.Device.id == device_id,
            models.Client.partner_id == current_user.partner_id
        ).first()

    if not device:
        logger.warning(f"⚠️ Intento de acceso denegado a tags del equipo {device_id}")
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado o acceso denegado")

    # 2. Formatear la respuesta para el esquema TagRegistration
    # Esto asegura que el frontend reciba 'device_uid' y los nombres de campos correctos
    tags_list = []
    for tag in device.tags:
        tags_list.append({
            "device_uid": device.aws_iot_uid,
            "path": tag.path,
            "mqtt_key": tag.mqtt_key,
            "display_name": tag.display_name,
            "data_type": tag.data_type,
            "unit": tag.unit,
            "min_value": tag.min_value,
            "max_value": tag.max_value,
            "label_0": tag.label_0,
            "label_1": tag.label_1
        })

    logger.info(f"✅ Se recuperaron {len(tags_list)} tags para el equipo {device.aws_iot_uid}")
    return tags_list

@router.delete("/{device_id}/tags/{mqtt_key}")
async def delete_device_tag(
    device_id: int, 
    mqtt_key: str, 
    path: str, # Lo pedimos como query parameter para identificar exacto
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Seguridad: Verificar pertenencia del equipo
    device = db.query(models.Device).join(models.Plant).join(models.Client).filter(
        models.Device.id == device_id,
        models.Client.partner_id == current_user.partner_id
    ).first()

    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

    # 2. Buscar y borrar el tag específico
    db_tag = db.query(models.DeviceTag).filter(
        models.DeviceTag.device_id == device_id,
        models.DeviceTag.mqtt_key == mqtt_key,
        models.DeviceTag.path == path
    ).first()

    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag no encontrado")

    db.delete(db_tag)
    db.commit()
    
    logger.info(f"🗑️ Tag {mqtt_key} eliminado del equipo {device_id}")
@router.put("/{device_id}", response_model=schemas.DeviceOut)
def update_device(
    device_id: int,
    device_in: schemas.DeviceBase,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    print(f"🔄 [DEBUG] Actualizando dispositivo {device_id}")
    
    # 1. Buscar y verificar propiedad
    device = db.query(models.Device).join(models.Plant).join(models.Client).filter(
        models.Device.id == device_id,
        models.Client.partner_id == current_user.partner_id
    ).first()

    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")

    # 2. Actualizar campos
    update_data = device_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(device, key, value)

    db.commit()
    db.refresh(device)
    
    print(f"✅ [DEBUG] Dispositivo {device_id} actualizado. History Enabled: {device.history_enabled}")
    return device