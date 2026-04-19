from datetime import date, datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class Tenant(SQLModel, table=True):
    __tablename__ = "tenants"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=200, index=True)
    email_contacto: str = Field(max_length=254, unique=True, index=True)

    # Plan y estado
    plan: str = Field(default="trial", max_length=50)  # trial | activo | suspendido
    trial_hasta: Optional[date] = Field(default=None)
    activo: bool = Field(default=True)

    # Timestamps
    creado_en: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    actualizado_en: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    @property
    def en_trial(self) -> bool:
        if self.plan != "trial" or not self.trial_hasta:
            return False
        return date.today() <= self.trial_hasta

    @property
    def trial_expirado(self) -> bool:
        if self.plan != "trial" or not self.trial_hasta:
            return False
        return date.today() > self.trial_hasta
