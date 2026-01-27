from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Definimos las variables con el MISMO nombre que en el .env
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = "us-east-1"
    lambda_function_name: str = "Aprovisionador-Iot_core"
    
    # Base de Datos
    db_user: str | None = None
    db_password: str | None = None
    db_host: str | None = None
    db_name: str | None = None
    db_port: str = "5432"
    
    # Esta configuración le dice a Pydantic que busque un archivo .env
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore" # Ignora otras variables que existan en el .env pero no aquí
    )

# Instanciamos para que pueda ser importado
settings = Settings()