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
    # 1. Crear columnas faltantes en device_tags
    op.add_column('device_tags', sa.Column('hysteresis', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('device_tags', sa.Column('alert_delay', sa.Integer(), nullable=True, server_default='0'))
    
    # 2. Crear columnas faltantes en alerts si no existen
    op.add_column('alerts', sa.Column('breach_started_at', sa.DateTime(timezone=True), nullable=True))

def downgrade() -> None:
    op.drop_column('alerts', 'breach_started_at')
    op.drop_column('device_tags', 'alert_delay')
    op.drop_column('device_tags', 'hysteresis')
