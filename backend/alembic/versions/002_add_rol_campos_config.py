"""add rol to campos_config

Revision ID: 002
Revises: 001
Create Date: 2024-01-02 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "campos_config",
        sa.Column(
            "rol",
            sa.String(50),
            nullable=False,
            server_default="info",
        ),
    )


def downgrade() -> None:
    op.drop_column("campos_config", "rol")
