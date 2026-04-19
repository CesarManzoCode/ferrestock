from typing import Any, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select

from app.core.deps import AdminUser, CurrentUser, DBSession
from app.models.producto import CampoConfig, Producto

router = APIRouter(tags=["campos"])

ROLES_VALIDOS = {"precio", "codigo", "info"}
TIPOS_VALIDOS = {"texto", "numero"}


# ── Schemas ───────────────────────────────────────────────────────────────

class CampoConfigRead(BaseModel):
    id: int
    nombre_campo: str
    etiqueta: str
    tipo: str
    rol: str
    obligatorio: bool
    orden: int
    model_config = {"from_attributes": True}


class CampoConfigCreate(BaseModel):
    nombre_campo: str
    etiqueta: str
    tipo: str = "texto"
    rol: str = "info"
    obligatorio: bool = False


class ProductoDetalleRead(BaseModel):
    id: int
    nombre: str
    precio: float
    existencias: float
    descripcion: Optional[str]
    activo: bool
    campos: list[dict]  # [{etiqueta, valor, rol, nombre_campo}]
    creado_en: datetime
    actualizado_en: datetime


# ── Campos config ─────────────────────────────────────────────────────────

@router.get("/campos-config", response_model=list[CampoConfigRead])
def listar_campos(current_user: CurrentUser, session: DBSession):
    return session.exec(
        select(CampoConfig)
        .where(CampoConfig.tenant_id == current_user.tenant_id)
        .order_by(CampoConfig.orden, CampoConfig.id)
    ).all()


@router.post("/campos-config", response_model=CampoConfigRead, status_code=status.HTTP_201_CREATED)
def crear_campo(data: CampoConfigCreate, current_user: AdminUser, session: DBSession):
    if data.rol not in ROLES_VALIDOS:
        raise HTTPException(422, detail=f"Rol inválido. Usa: {', '.join(ROLES_VALIDOS)}")
    if data.tipo not in TIPOS_VALIDOS:
        raise HTTPException(422, detail=f"Tipo inválido. Usa: {', '.join(TIPOS_VALIDOS)}")

    # Normalizar nombre_campo: minúsculas sin espacios
    nombre = data.nombre_campo.strip().lower().replace(" ", "_")

    # Verificar unicidad dentro del tenant
    existe = session.exec(
        select(CampoConfig).where(
            CampoConfig.tenant_id == current_user.tenant_id,
            CampoConfig.nombre_campo == nombre,
        )
    ).first()
    if existe:
        raise HTTPException(409, detail="Ya existe un campo con ese nombre")

    # Calcular orden
    ultimo_orden = session.exec(
        select(CampoConfig.orden)
        .where(CampoConfig.tenant_id == current_user.tenant_id)
        .order_by(CampoConfig.orden.desc())
    ).first()

    campo = CampoConfig(
        tenant_id=current_user.tenant_id,
        nombre_campo=nombre,
        etiqueta=data.etiqueta.strip(),
        tipo=data.tipo,
        rol=data.rol,
        obligatorio=data.obligatorio,
        orden=(ultimo_orden or 0) + 1,
    )
    session.add(campo)
    session.commit()
    session.refresh(campo)
    return campo


@router.delete("/campos-config/{campo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_campo(campo_id: int, current_user: AdminUser, session: DBSession):
    campo = session.get(CampoConfig, campo_id)
    if not campo or campo.tenant_id != current_user.tenant_id:
        raise HTTPException(404, detail="Campo no encontrado")
    session.delete(campo)
    session.commit()


# ── Detalle de producto ───────────────────────────────────────────────────

@router.get("/productos/{producto_id}/detalle", response_model=ProductoDetalleRead)
def detalle_producto(producto_id: int, current_user: CurrentUser, session: DBSession):
    producto = session.get(Producto, producto_id)
    if not producto or producto.tenant_id != current_user.tenant_id:
        raise HTTPException(404, detail="Producto no encontrado")

    # Obtener configuración de campos del tenant
    campos_config = session.exec(
        select(CampoConfig)
        .where(CampoConfig.tenant_id == current_user.tenant_id)
        .order_by(CampoConfig.orden)
    ).all()

    # Expandir campos_extra con etiquetas y roles
    campos = []
    for cc in campos_config:
        valor = (producto.campos_extra or {}).get(cc.nombre_campo)
        campos.append({
            "nombre_campo": cc.nombre_campo,
            "etiqueta": cc.etiqueta,
            "valor": valor,
            "rol": cc.rol,
            "tipo": cc.tipo,
        })

    return ProductoDetalleRead(
        id=producto.id,
        nombre=producto.nombre,
        precio=producto.precio,
        existencias=producto.existencias,
        descripcion=producto.descripcion,
        activo=producto.activo,
        campos=campos,
        creado_en=producto.creado_en,
        actualizado_en=producto.actualizado_en,
    )
