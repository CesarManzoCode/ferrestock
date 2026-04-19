from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, UploadFile, File, status
from sqlmodel import select

from app.core.deps import AdminUser, CurrentUser, DBSession
from app.models.producto import Producto
from app.schemas.producto import ProductoCreate, ProductoRead, ProductoSearchResult, ProductoUpdate
from app.services.busqueda import buscar_productos
from app.services.importacion import importar_productos_desde_excel, leer_columnas_excel

router = APIRouter(prefix="/productos", tags=["productos"])


@router.get("", response_model=list[ProductoRead])
def listar_productos(
    current_user: CurrentUser,
    session: DBSession,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=200),
    solo_activos: bool = True,
):
    query = select(Producto).where(Producto.tenant_id == current_user.tenant_id)
    if solo_activos:
        query = query.where(Producto.activo == True)
    query = query.offset(skip).limit(limit)
    return session.exec(query).all()


@router.get("/buscar", response_model=list[ProductoSearchResult])
def buscar(
    q: str,
    current_user: CurrentUser,
    session: DBSession,
    limite: int = Query(default=20, le=50),
):
    if len(q.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La búsqueda debe tener al menos 2 caracteres",
        )
    resultados = buscar_productos(q, current_user.tenant_id, session, limite)
    return resultados


@router.get("/{producto_id}", response_model=ProductoRead)
def obtener_producto(producto_id: int, current_user: CurrentUser, session: DBSession):
    producto = session.get(Producto, producto_id)
    if not producto or producto.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    return producto


@router.post("", response_model=ProductoRead, status_code=status.HTTP_201_CREATED)
def crear_producto(data: ProductoCreate, current_user: AdminUser, session: DBSession):
    producto = Producto(**data.model_dump(), tenant_id=current_user.tenant_id)
    session.add(producto)
    session.commit()
    session.refresh(producto)
    return producto


@router.patch("/{producto_id}", response_model=ProductoRead)
def actualizar_producto(
    producto_id: int, data: ProductoUpdate, current_user: AdminUser, session: DBSession
):
    producto = session.get(Producto, producto_id)
    if not producto or producto.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    cambios = data.model_dump(exclude_unset=True)
    for campo, valor in cambios.items():
        setattr(producto, campo, valor)

    producto.actualizado_en = datetime.now(timezone.utc)
    session.add(producto)
    session.commit()
    session.refresh(producto)
    return producto


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_producto(producto_id: int, current_user: AdminUser, session: DBSession):
    producto = session.get(Producto, producto_id)
    if not producto or producto.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    # Soft delete
    producto.activo = False
    producto.actualizado_en = datetime.now(timezone.utc)
    session.add(producto)
    session.commit()


# ── Importación Excel ──────────────────────────────────────────────────────────

@router.post("/importar/preview")
async def preview_excel(
    current_user: AdminUser,
    file: UploadFile = File(...),
    fila_inicio: int = Query(default=1, ge=1),
):
    """Paso 1: subir Excel y obtener columnas + sugerencias de mapeo."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Solo se aceptan archivos Excel (.xlsx, .xls)",
        )
    contenido = await file.read()
    return leer_columnas_excel(contenido, fila_inicio=fila_inicio)


@router.post("/importar/confirmar")
async def confirmar_importacion(
    current_user: AdminUser,
    session: DBSession,
    file: UploadFile = File(...),
    fila_inicio: int = Query(default=1, ge=1),
    mapeo: str = Query(..., description='JSON: {"col_excel": "campo_ferrestock"}'),
    campos_extra: Optional[str] = Query(default=None, description='JSON: ["col1", "col2"]'),
):
    """Paso 2: confirmar mapeo e importar productos."""
    import json

    try:
        mapeo_dict: dict[str, str] = json.loads(mapeo)
    except Exception:
        raise HTTPException(status_code=422, detail="Formato de mapeo inválido")

    campos_extra_list: list[str] = []
    if campos_extra:
        try:
            campos_extra_list = json.loads(campos_extra)
        except Exception:
            raise HTTPException(status_code=422, detail="Formato de campos_extra inválido")

    contenido = await file.read()
    productos_data, errores = importar_productos_desde_excel(
        contenido, mapeo_dict, campos_extra_list, fila_inicio, current_user.tenant_id
    )

    if not productos_data:
        return {"importados": 0, "errores": errores}

    # Inserción en bulk
    productos_objs = [Producto(**p) for p in productos_data]
    session.add_all(productos_objs)
    session.commit()

    return {
        "importados": len(productos_objs),
        "errores": errores,
    }
