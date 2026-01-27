import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Si en el futuro detecta una URL de Postgres en AWS, la usará. 
# De lo contrario, crea el archivo local synteck.db
from app.config import settings

# Si tenemos credenciales de DB en las settings, construimos la URL de Postgres
if settings.db_user and settings.db_host:
    SQLALCHEMY_DATABASE_URL = f"postgresql://{settings.db_user}:{settings.db_password}@{settings.db_host}:{settings.db_port}/{settings.db_name}"
    print(f"✅ USANDO BASE DE DATOS: PostgreSQL ({settings.db_host})")
else:
    # Fallback a SQLite local si no hay variables definidas
    SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./synteck.db")
    print("⚠️ USANDO BASE DE DATOS: SQLite Local")

# check_same_thread es solo necesario para SQLite
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args=connect_args,
    echo=True # Esto imprimirá en tu consola todas las consultas SQL que haga SQLAlchemy
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Esta función es el "Dependency Injection" para FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()