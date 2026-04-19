from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlmodel import select

from app.core.deps import AdminUser, CurrentUser, DBSession
from app.models.cotizacion import Cotizacion, CotizacionItem
from app.models.tenant import Tenant
from app.schemas.cotizacion import CotizacionCreate, CotizacionRead, CotizacionItemRead
from app.services.pdf import generar_pdf_cotizacion

router = APIRouter(prefix="/cotizaciones", tags=["cotizaciones"])


def _cotizacion_a_schema(cotizacion: Cotizacion, items: list[CotizacionItem]) -> CotizacionRead:
    return CotizacionRead(
        id=cotizacion.id,
        cliente_nombre=cotizacion.cliente_nombre,
        cliente_telefono=cotizacion.cliente_telefono,
        cliente_email=cotizacion.cliente_email,
        notas=cotizacion.notas,
        total=cotizacion.total,
        estado=cotizacion.estado,
        pdf_path=cotizacion.pdf_path,
        items=[
            CotizacionItemRead(
                id=i.id,
                producto_id=i.producto_id,
                nombre_producto=i.nombre_producto,
                precio_unitario=i.precio_unitario,
                cantidad=i.cantidad,
                subtotal=i.subtotal,
            )
            for i in items
        ],
    )


@router.get("", response_model=list[CotizacionRead])
def listar_cotizaciones(
    current_user: CurrentUser,
    session: DBSession,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=200),
):
    cotizaciones = session.exec(
        select(Cotizacion)
        .where(Cotizacion.tenant_id == current_user.tenant_id)
        .order_by(Cotizacion.creado_en.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    resultado = []
    for c in cotizaciones:
        items = session.exec(
            select(CotizacionItem).where(CotizacionItem.cotizacion_id == c.id)
        ).all()
        resultado.append(_cotizacion_a_schema(c, items))

    return resultado


@router.get("/{cotizacion_id}", response_model=CotizacionRead)
def obtener_cotizacion(
    cotizacion_id: int,
    current_user: CurrentUser,
    session: DBSession,
):
    cotizacion = session.get(Cotizacion, cotizacion_id)
    if not cotizacion or cotizacion.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada")

    items = session.exec(
        select(CotizacionItem).where(CotizacionItem.cotizacion_id == cotizacion_id)
    ).all()

    return _cotizacion_a_schema(cotizacion, items)


@router.post("", response_model=CotizacionRead, status_code=status.HTTP_201_CREATED)
def crear_cotizacion(
    data: CotizacionCreate,
    current_user: CurrentUser,
    session: DBSession,
):
    if not data.items:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La cotización debe tener al menos un producto",
        )

    # Calcular subtotales y total
    items_data = []
    total = 0.0
    for item in data.items:
        subtotal = round(item.precio_unitario * item.cantidad, 2)
        total += subtotal
        items_data.append({
            "producto_id": item.producto_id,
            "nombre_producto": item.nombre_producto,
            "precio_unitario": item.precio_unitario,
            "cantidad": item.cantidad,
            "subtotal": subtotal,
        })

    cotizacion = Cotizacion(
        tenant_id=current_user.tenant_id,
        cliente_nombre=data.cliente_nombre,
        cliente_telefono=data.cliente_telefono,
        cliente_email=data.cliente_email,
        notas=data.notas,
        total=round(total, 2),
        estado="borrador",
        creado_por_id=current_user.id,
    )
    session.add(cotizacion)
    session.flush()  # necesitamos cotizacion.id para los items

    items_objs = [CotizacionItem(cotizacion_id=cotizacion.id, **i) for i in items_data]
    session.add_all(items_objs)
    session.commit()
    session.refresh(cotizacion)

    return _cotizacion_a_schema(cotizacion, items_objs)


@router.patch("/{cotizacion_id}/estado", response_model=CotizacionRead)
def cambiar_estado(
    cotizacion_id: int,
    estado: str,
    current_user: CurrentUser,
    session: DBSession,
):
    estados_validos = {"borrador", "enviada", "aceptada", "cancelada"}
    if estado not in estados_validos:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Estado inválido. Valores posibles: {estados_validos}",
        )

    cotizacion = session.get(Cotizacion, cotizacion_id)
    if not cotizacion or cotizacion.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada")

    cotizacion.estado = estado
    cotizacion.actualizado_en = datetime.now(timezone.utc)
    session.add(cotizacion)
    session.commit()
    session.refresh(cotizacion)

    items = session.exec(
        select(CotizacionItem).where(CotizacionItem.cotizacion_id == cotizacion_id)
    ).all()
    return _cotizacion_a_schema(cotizacion, items)


@router.post("/{cotizacion_id}/pdf")
def generar_pdf(
    cotizacion_id: int,
    current_user: CurrentUser,
    session: DBSession,
):
    cotizacion = session.get(Cotizacion, cotizacion_id)
    if not cotizacion or cotizacion.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada")

    tenant = session.get(Tenant, current_user.tenant_id)
    items = session.exec(
        select(CotizacionItem).where(CotizacionItem.cotizacion_id == cotizacion_id)
    ).all()

    cotizacion_dict = {
        "id": cotizacion.id,
        "tenant_id": cotizacion.tenant_id,
        "cliente_nombre": cotizacion.cliente_nombre,
        "notas": cotizacion.notas,
        "total": cotizacion.total,
        "creado_en": cotizacion.creado_en,
    }
    items_list = [
        {
            "nombre_producto": i.nombre_producto,
            "cantidad": i.cantidad,
            "precio_unitario": i.precio_unitario,
            "subtotal": i.subtotal,
        }
        for i in items
    ]

    ruta_pdf = generar_pdf_cotizacion(cotizacion_dict, items_list, tenant.nombre)

    cotizacion.pdf_path = ruta_pdf
    cotizacion.actualizado_en = datetime.now(timezone.utc)
    session.add(cotizacion)
    session.commit()

    return FileResponse(
        path=ruta_pdf,
        media_type="application/pdf",
        filename=f"cotizacion_{cotizacion_id:04d}.pdf",
    )


@router.delete("/{cotizacion_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_cotizacion(
    cotizacion_id: int,
    current_user: AdminUser,
    session: DBSession,
):
    cotizacion = session.get(Cotizacion, cotizacion_id)
    if not cotizacion or cotizacion.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada")

    # Eliminar items primero por FK
    items = session.exec(
        select(CotizacionItem).where(CotizacionItem.cotizacion_id == cotizacion_id)
    ).all()
    for item in items:
        session.delete(item)

    session.delete(cotizacion)
    session.commit()
