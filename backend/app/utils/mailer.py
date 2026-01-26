import logging
import sys
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr

# 1. Configuración de logging ultra detallada
logging.basicConfig(level=logging.DEBUG) # Cambiado a DEBUG
logger = logging.getLogger("fastapi_mail")
# Esto forzará a que los logs salgan incluso si hay buffers
handler = logging.StreamHandler(sys.stdout)
logger.addHandler(handler)

conf = ConnectionConfig(
    MAIL_USERNAME="noreply@synteck.org",
    MAIL_PASSWORD="ckA1zu&s", 
    MAIL_FROM="noreply@synteck.org",
    MAIL_PORT=587,
    MAIL_SERVER="smtp.zoho.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
    # Añadimos MAIL_FROM_NAME porque Zoho a veces rechaza correos sin nombre de remitente
    MAIL_FROM_NAME="Synteck System" 
)

async def send_invitation_email(email_to: str, token: str, partner_name: str):
    logger.info(f"🚀 Iniciando proceso de envío para: {email_to}")
    
    setup_url = f"https://integradores.synteck.org/setup-password?token={token}&email={email_to}"
    html = f"<h3>Hola {partner_name}, configura tu cuenta aquí: <a href='{setup_url}'>Enlace</a></h3>"

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
        logger.info(f"✅ FastMail reporta éxito al enviar a {email_to}")
        
    except ConnectionError as ce:
        logger.error(f"❌ ERROR DE CONEXIÓN: ¿El servidor tiene salida al puerto 587? {str(ce)}")
    except Exception as e:
        # Capturamos el tipo de error específico para entender qué dice Zoho
        logger.error(f"❌ ERROR DETALLADO ({type(e).__name__}): {str(e)}")
        import traceback
        logger.error(traceback.format_exc()) # Esto te dirá exactamente en qué línea falló