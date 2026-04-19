from typing import Any, Optional
from pydantic import BaseModel, field_validator


class ProductoCreate(BaseModel):
    nombre: str
    precio: float
    existencias: float = 0
    descripcion: Optional[str] = None
    campos_extra: Optional[dict[str, Any]] = None

    @field_validator("precio", "existencias")
    @classmethod
    def no_negativo(cls, v: float) -> float:
        if v < 0:
            raise ValueError("No puede ser negativo")
        return v


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    precio: Optional[float] = None
    existencias: Optional[float] = None
    descripcion: Optional[str] = None
    campos_extra: Optional[dict[str, Any]] = None


class ProductoRead(BaseModel):
    id: int
    nombre: str
    precio: float
    existencias: float
    descripcion: Optional[str]
    campos_extra: Optional[dict[str, Any]]
    activo: bool

    model_config = {"from_attributes": True}


class ProductoSearchResult(BaseModel):
    id: int
    nombre: str
    precio: float
    existencias: float
    score: float  # relevancia de búsqueda 0-100
