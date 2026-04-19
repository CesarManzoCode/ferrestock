from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class Cotizacion(SQLModel, table=True):
    __tablename__ = "cotizaciones"

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)

    cliente_nombre: Optional[str] = Field(default=None, max_length=200)
    cliente_telefono: Optional[str] = Field(default=None, max_length=20)
    cliente_email: Optional[str] = Field(default=None, max_length=254)
    notas: Optional[str] = Field(default=None, max_length=1000)
    total: float = Field(default=0, ge=0)
    estado: str = Field(default="borrador", max_length=50)
    pdf_path: Optional[str] = Field(default=None, max_length=500)

    # Qué campo de precio se usó (nombre_campo del CampoConfig, None = precio base)
    campo_precio_usado: Optional[str] = Field(default=None, max_length=100)

    creado_en: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    actualizado_en: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    creado_por_id: int = Field(foreign_key="usuarios.id")


class CotizacionItem(SQLModel, table=True):
    __tablename__ = "cotizacion_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    cotizacion_id: int = Field(foreign_key="cotizaciones.id", index=True)
    producto_id: Optional[int] = Field(default=None, foreign_key="productos.id")
    nombre_producto: str = Field(max_length=300)
    precio_unitario: float = Field(ge=0)
    cantidad: float = Field(ge=0)
    subtotal: float = Field(ge=0)
