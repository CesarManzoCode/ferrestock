"""initial schema

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(200), nullable=False, index=True),
        sa.Column("email_contacto", sa.String(254), nullable=False, unique=True, index=True),
        sa.Column("plan", sa.String(50), nullable=False, server_default="trial"),
        sa.Column("trial_hasta", sa.Date(), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("email", sa.String(254), nullable=False, unique=True, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("rol", sa.String(50), nullable=False, server_default="empleado"),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ultimo_login", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "campos_config",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("nombre_campo", sa.String(100), nullable=False),
        sa.Column("etiqueta", sa.String(100), nullable=False),
        sa.Column("tipo", sa.String(50), nullable=False, server_default="texto"),
        sa.Column("obligatorio", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "productos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("nombre", sa.String(300), nullable=False, index=True),
        sa.Column("precio", sa.Float(), nullable=False),
        sa.Column("existencias", sa.Float(), nullable=False, server_default="0"),
        sa.Column("descripcion", sa.String(1000), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("campos_extra", JSONB(), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), nullable=False),
    )

    # Índice compuesto para búsquedas por tenant activas
    op.create_index("ix_productos_tenant_activo", "productos", ["tenant_id", "activo"])

    op.create_table(
        "cotizaciones",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("cliente_nombre", sa.String(200), nullable=True),
        sa.Column("cliente_telefono", sa.String(20), nullable=True),
        sa.Column("cliente_email", sa.String(254), nullable=True),
        sa.Column("notas", sa.String(1000), nullable=True),
        sa.Column("total", sa.Float(), nullable=False, server_default="0"),
        sa.Column("estado", sa.String(50), nullable=False, server_default="borrador"),
        sa.Column("pdf_path", sa.String(500), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("creado_por_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
    )

    op.create_table(
        "cotizacion_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cotizacion_id", sa.Integer(), sa.ForeignKey("cotizaciones.id"), nullable=False, index=True),
        sa.Column("producto_id", sa.Integer(), sa.ForeignKey("productos.id"), nullable=True),
        sa.Column("nombre_producto", sa.String(300), nullable=False),
        sa.Column("precio_unitario", sa.Float(), nullable=False),
        sa.Column("cantidad", sa.Float(), nullable=False),
        sa.Column("subtotal", sa.Float(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("cotizacion_items")
    op.drop_table("cotizaciones")
    op.drop_index("ix_productos_tenant_activo", "productos")
    op.drop_table("productos")
    op.drop_table("campos_config")
    op.drop_table("usuarios")
    op.drop_table("tenants")
