import os
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app import models
from app.router import clients, plants, devices, auth, stats, partners, monitor, dashboards

# Crear tablas
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Synteck IoT Cloud API", version="1.1.0")

# 1. Detectar el ambiente desde el .env que inyecta Docker
ENV_TYPE = os.getenv("ENV_TYPE", "local")

# 2. Configurar orígenes dinámicos
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5173").split(",")

if ENV_TYPE == "production":
    # En producción usamos tus dominios finales indicados en env o los hardcodeados por defecto
    default_prod_origins = [
        "https://integradores.synteck.org",
        "https://admin.synteck.org",
        "https://portal.synteck.org",
    ]
    # Si ALLOWED_ORIGINS no se setea a algo distinto al default local, usamos los de prod hardcodeados para seguridad extra si se desea, 
    # o mejor, confiamos en la variable de entorno.
    # Para mezclar ambos enfoques de manera segura:
    if os.getenv("ALLOWED_ORIGINS"):
         origins = ALLOWED_ORIGINS
    else:
         origins = default_prod_origins
else:
    # En local o dev
    origins = ALLOWED_ORIGINS

    # 3. Mensaje de confirmación al iniciar
@app.on_event("startup")
async def startup_event():
    print("\n" + "="*50)
    print(f"SYNTECK API INICIADA")
    print(f"🌐 MODO: {ENV_TYPE.upper()}")
    if ENV_TYPE == "production":
        print("🔒 SEGURIDAD: HTTPS / Dominios Synteck")
    else:
        print("🔓 SEGURIDAD: HTTP / Localhost")
    print("="*50 + "\n")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers (Se mantienen igual)
app.include_router(clients.router, tags=["Clients"])
app.include_router(plants.router, tags=["Plants"])
app.include_router(devices.router, tags=["Devices"])
app.include_router(auth.router, tags=["Auth"])
app.include_router(stats.router, tags=["Stats"])
app.include_router(partners.router)
app.include_router(monitor.router)
app.include_router(dashboards.router)
from app.router import historical
app.include_router(historical.router)