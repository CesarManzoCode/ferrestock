from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class CampoConfig(SQLModel, table=True):
    """Define los campos extra que un tenant usa en su inventario."""
    __tablename__ = "campos_config"

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)

    nombre_campo: str = Field(max_length=100)   # clave en JSONB, ej: "precio_mayoreo"
    etiqueta: str = Field(max_length=100)        # label visible, ej: "Precio Mayoreo"
    tipo: str = Field(default="texto", max_length=50)   # texto | numero | booleano
    # rol: "precio" | "codigo" | "info"
    rol: str = Field(default="info", max_length=50)
    obligatorio: bool = Field(default=False)
    orden: int = Field(default=0)


class Producto(SQLModel, table=True):
    __tablename__ = "productos"

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)

    nombre: str = Field(max_length=300, index=True)
    precio: float = Field(ge=0)
    existencias: float = Field(default=0, ge=0)
    descripcion: Optional[str] = Field(default=None, max_length=1000)
    activo: bool = Field(default=True)

    campos_extra: Optional[dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )

    creado_en: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    actualizado_en: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
