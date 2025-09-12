"""Add missing tables for developments, activity_logs, incidents

Revision ID: 002
Revises: 001
Create Date: 2025-01-09 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create developments table
    op.create_table('developments',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('module', sa.String(length=100), nullable=True),
        sa.Column('type', sa.String(length=50), nullable=True),
        sa.Column('start_date', sa.DateTime(), nullable=True),
        sa.Column('estimated_end_date', sa.DateTime(), nullable=True),
        sa.Column('target_closure_date', sa.DateTime(), nullable=True),
        sa.Column('estimated_days', sa.Integer(), nullable=True),
        sa.Column('main_responsible', sa.String(length=100), nullable=True),
        sa.Column('provider', sa.String(length=100), nullable=True),
        sa.Column('requesting_area', sa.String(length=100), nullable=True),
        sa.Column('general_status', sa.String(length=50), nullable=True),
        sa.Column('current_stage', sa.String(length=100), nullable=True),
        sa.Column('observations', sa.Text(), nullable=True),
        sa.Column('estimated_cost', sa.Float(), nullable=True),
        sa.Column('proposal_number', sa.String(length=100), nullable=True),
        sa.Column('environment', sa.String(length=100), nullable=True),
        sa.Column('remedy_link', sa.String(length=255), nullable=True),
        sa.Column('scheduled_delivery_date', sa.DateTime(), nullable=True),
        sa.Column('actual_delivery_date', sa.DateTime(), nullable=True),
        sa.Column('returns_count', sa.Integer(), nullable=True),
        sa.Column('test_defects_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_developments_id'), 'developments', ['id'], unique=False)

    # Create activity_logs table
    op.create_table('activity_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('development_id', sa.String(length=50), nullable=True),
        sa.Column('date', sa.DateTime(), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['development_id'], ['developments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_activity_logs_id'), 'activity_logs', ['id'], unique=False)

    # Create incidents table
    op.create_table('incidents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('development_id', sa.String(length=50), nullable=True),
        sa.Column('report_date', sa.DateTime(), nullable=True),
        sa.Column('resolution_date', sa.DateTime(), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['development_id'], ['developments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_incidents_id'), 'incidents', ['id'], unique=False)


def downgrade() -> None:
    # Drop tables
    op.drop_index(op.f('ix_incidents_id'), table_name='incidents')
    op.drop_table('incidents')
    op.drop_index(op.f('ix_activity_logs_id'), table_name='activity_logs')
    op.drop_table('activity_logs')
    op.drop_index(op.f('ix_developments_id'), table_name='developments')
    op.drop_table('developments')
