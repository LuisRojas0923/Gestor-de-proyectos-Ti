"""merge_branches

Revision ID: 870a12d5f838
Revises: 1918967cf7ca, 812831bb3379
Create Date: 2026-01-08 19:57:02.718168

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '870a12d5f838'
down_revision = ('1918967cf7ca', '812831bb3379')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
