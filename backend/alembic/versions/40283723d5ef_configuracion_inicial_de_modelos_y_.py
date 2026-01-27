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
    # Usamos comandos nativos de Postgres para máxima fiabilidad en producción
    op.execute("ALTER TABLE device_tags ADD COLUMN IF NOT EXISTS hysteresis FLOAT DEFAULT 0.0")
    op.execute("ALTER TABLE device_tags ADD COLUMN IF NOT EXISTS alert_delay INTEGER DEFAULT 0")
    op.execute("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS breach_started_at TIMESTAMP WITH TIME ZONE")

def downgrade() -> None:
    op.execute("ALTER TABLE alerts DROP COLUMN IF EXISTS breach_started_at")
    op.execute("ALTER TABLE device_tags DROP COLUMN IF EXISTS alert_delay")
    op.execute("ALTER TABLE device_tags DROP COLUMN IF EXISTS hysteresis")
