"""Configuracion inicial de modelos y alertas

Revision ID: 40283723d5ef
Revises: 
Create Date: 2026-01-27 13:54:44.098956

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '40283723d5ef'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # 1. Verificar columnas en device_tags
    dt_cols = [c['name'] for c in inspector.get_columns('device_tags')]
    if 'hysteresis' not in dt_cols:
        op.add_column('device_tags', sa.Column('hysteresis', sa.Float(), nullable=True, server_default='0.0'))
    if 'alert_delay' not in dt_cols:
        op.add_column('device_tags', sa.Column('alert_delay', sa.Integer(), nullable=True, server_default='0'))
    
    # 2. Verificar columnas en alerts
    a_cols = [c['name'] for c in inspector.get_columns('alerts')]
    if 'breach_started_at' not in a_cols:
        op.add_column('alerts', sa.Column('breach_started_at', sa.DateTime(timezone=True), nullable=True))

def downgrade() -> None:
    # Downgrade manual si es necesario, ignorando errores si no existen
    try:
        op.drop_column('alerts', 'breach_started_at')
        op.drop_column('device_tags', 'alert_delay')
        op.drop_column('device_tags', 'hysteresis')
    except:
        pass
