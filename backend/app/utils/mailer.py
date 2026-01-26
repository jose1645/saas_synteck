import logging
import sys
import os
from dotenv import load_dotenv
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr

# Cargar variables de entorno
load_dotenv()

# 1. Configuración de logging ultra detallada
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("fastapi_mail")
handler = logging.StreamHandler(sys.stdout)
logger.addHandler(handler)

# 2. Detectar ambiente
ENV_TYPE = os.getenv("ENV_TYPE", "local")

# 3. Configuración SMTP desde variables de entorno
# Debug: Ver qué valores se están cargando
mail_username = os.getenv("MAIL_USERNAME", "noreply@synteck.org")
mail_password = os.getenv("MAIL_PASSWORD", "ckA1zu&s")
mail_server = os.getenv("MAIL_SERVER", "smtp.zoho.com")
mail_port = int(os.getenv("MAIL_PORT", "587"))

logger.info(f"📧 Configuración SMTP: {mail_username}@{mail_server}:{mail_port}")
logger.debug(f"🔐 Password length: {len(mail_password)} caracteres")

conf = ConnectionConfig(
    MAIL_USERNAME=mail_username,
    MAIL_PASSWORD=mail_password, 
    MAIL_FROM=os.getenv("MAIL_FROM", "noreply@synteck.org"),
    MAIL_PORT=mail_port,
    MAIL_SERVER=mail_server,
    MAIL_STARTTLS=True,  # Usar valor directo como en el código que funciona
    MAIL_SSL_TLS=False,  # Usar valor directo como en el código que funciona
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "Synteck System")
)

async def send_invitation_email(email_to: str, token: str, partner_name: str):
    logger.info(f"🚀 Iniciando proceso de envío para: {email_to}")
    
    # 4. URL dinámica según el ambiente
    if ENV_TYPE == "production":
        base_url = "https://integradores.synteck.org"
    else:
        # En desarrollo usa localhost
        base_url = os.getenv("PARTNER_FRONTEND_URL", "http://localhost:5174")
    
    setup_url = f"{base_url}/setup-password?token={token}&email={email_to}"
    
    logger.info(f"🌐 Ambiente: {ENV_TYPE} | URL generada: {setup_url}")
    
    html = f"<h3>Hola {partner_name}, configura tu cuenta aquí: <a href='{setup_url}'>Enlace</a></h3>"

    # 🔥 EN DESARROLLO: Solo mostramos el email sin enviarlo
    if ENV_TYPE != "production":
        logger.info("="*60)
        logger.info("📧 MODO DESARROLLO - Email NO enviado (solo preview)")
        logger.info(f"📬 Para: {email_to}")
        logger.info(f"📝 Asunto: Invitación Synteck")
        logger.info(f"🔗 URL de configuración:")
        logger.info(f"   {setup_url}")
        logger.info("="*60)
        return  # Salimos sin enviar el email
    
    # 🚀 EN PRODUCCIÓN: Enviar email real
    message = MessageSchema(
        subject="Invitación Synteck",
        recipients=[email_to],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    
    try:
        logger.debug("Conectando con el servidor SMTP de Zoho...")
        await fm.send_message(message)
        logger.info(f"✅ Email enviado exitosamente a {email_to}")
        
    except ConnectionError as ce:
        logger.error(f"❌ ERROR DE CONEXIÓN: ¿El servidor tiene salida al puerto 587? {str(ce)}")
        raise  # Re-lanzamos la excepción para que el endpoint maneje el error
    except Exception as e:
        logger.error(f"❌ ERROR DETALLADO ({type(e).__name__}): {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise  # Re-lanzamos la excepción