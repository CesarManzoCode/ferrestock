from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class Usuario(SQLModel, table=True):
    __tablename__ = "usuarios"

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenants.id", index=True)

    nombre: str = Field(max_length=200)
    email: str = Field(max_length=254, unique=True, index=True)
    password_hash: str = Field(max_length=255)

    # "admin" | "empleado"
    rol: str = Field(default="empleado", max_length=50)
    activo: bool = Field(default=True)

    # Timestamps
    creado_en: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    ultimo_login: Optional[datetime] = Field(default=None)
