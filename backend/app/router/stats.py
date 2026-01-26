from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

# Importa tus archivos locales
from .. import models, schemas, auth
from ..database import get_db
router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    # Esta línea es el "Middleware/Decorador": Valida el JWT y regresa al usuario
    current_user: models.User = Depends(auth.get_current_user)
):
    # 1. DEFINICIÓN DE QUERIES BASE
    partner_q = db.query(func.count(models.Partner.id))
    client_q = db.query(func.count(models.Client.id))
    device_q = db.query(models.Device)

    # 2. APLICACIÓN DE FILTROS SEGÚN EL USUARIO
    if current_user.partner_id is None:
        # MODO SUPERADMIN
        p_count = partner_q.filter(models.Partner.is_active == True).scalar()
        c_count = client_q.filter(models.Client.is_active == True).scalar()
        d_base = device_q
    else:
        # MODO INTEGRADOR (PARTNER)
        p_count = 1
        c_count = client_q.filter(
            models.Client.partner_id == current_user.partner_id,
            models.Client.is_active == True
        ).scalar()
        
        # Seguridad: Solo dispositivos que pertenezcan a los clientes de este Partner
        d_base = device_q.join(models.Plant).join(models.Client).filter(
            models.Client.partner_id == current_user.partner_id
        )

    # 3. CÁLCULO DE RESULTADOS FINALES
    return {
        "partners_count": p_count,
        "clients_count": c_count,
        "devices_online": d_base.filter(models.Device.is_active == True).count(),
        "recent_devices": d_base.order_by(models.Device.created_at.desc()).limit(5).all()
    }