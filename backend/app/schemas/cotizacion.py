from typing import Optional
from pydantic import BaseModel


class CotizacionItemInput(BaseModel):
    producto_id: Optional[int] = None
    nombre_producto: str
    precio_unitario: float
    cantidad: float


class CotizacionCreate(BaseModel):
    cliente_nombre: Optional[str] = None
    cliente_telefono: Optional[str] = None
    cliente_email: Optional[str] = None
    notas: Optional[str] = None
    items: list[CotizacionItemInput]


class CotizacionItemRead(BaseModel):
    id: int
    producto_id: Optional[int]
    nombre_producto: str
    precio_unitario: float
    cantidad: float
    subtotal: float

    model_config = {"from_attributes": True}


class CotizacionRead(BaseModel):
    id: int
    cliente_nombre: Optional[str]
    cliente_telefono: Optional[str]
    cliente_email: Optional[str]
    notas: Optional[str]
    total: float
    estado: str
    pdf_path: Optional[str]
    items: list[CotizacionItemRead] = []

    model_config = {"from_attributes": True}
