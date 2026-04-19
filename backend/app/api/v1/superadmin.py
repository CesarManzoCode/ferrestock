from datetime import date, datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlmodel import select, func

from app.core.deps import SuperAdmin, DBSession
from app.core.security import hash_password
from app.models.tenant import Tenant
from app.models.usuario import Usuario
from app.models.producto import Producto
from app.models.cotizacion import Cotizacion

router = APIRouter(prefix="/superadmin", tags=["superadmin"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class TenantDetalle(BaseModel):
    id: int
    nombre: str
    email_contacto: str
    plan: str
    trial_hasta: Optional[date]
    activo: bool
    creado_en: datetime
    total_productos: int
    total_cotizaciones: int
    total_usuarios: int

    model_config = {"from_attributes": True}


class TenantUpdate(BaseModel):
    nombre: Optional[str] = None
    plan: Optional[str] = None
    trial_hasta: Optional[date] = None
    activo: Optional[bool] = None


class UsuarioDetalle(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str
    activo: bool
    creado_en: datetime
    ultimo_login: Optional[datetime]
    tenant_nombre: str

    model_config = {"from_attributes": True}


class CrearTenantInput(BaseModel):
    nombre_negocio: str
    nombre_usuario: str
    email: EmailStr
    password: str
    plan: str = "trial"
    trial_dias: int = 14


class StatsGlobales(BaseModel):
    total_tenants: int
    tenants_activos: int
    tenants_trial: int
    tenants_pagando: int
    tenants_suspendidos: int
    total_productos: int
    total_cotizaciones: int
    nuevos_este_mes: int


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=StatsGlobales)
def stats_globales(current_user: SuperAdmin, session: DBSession):
    hoy = date.today()
    inicio_mes = hoy.replace(day=1)

    todos = session.exec(select(Tenant)).all()

    total_tenants     = len(todos)
    tenants_activos   = sum(1 for t in todos if t.activo)
    tenants_trial     = sum(1 for t in todos if t.plan == "trial" and t.activo)
    tenants_pagando   = sum(1 for t in todos if t.plan == "activo" and t.activo)
    tenants_suspendidos = sum(1 for t in todos if not t.activo)

    total_productos   = session.exec(select(func.count(Producto.id))).one()
    total_cotizaciones = session.exec(select(func.count(Cotizacion.id))).one()
    nuevos_este_mes   = sum(
        1 for t in todos
        if t.creado_en and t.creado_en.date() >= inicio_mes
    )

    return StatsGlobales(
        total_tenants=total_tenants,
        tenants_activos=tenants_activos,
        tenants_trial=tenants_trial,
        tenants_pagando=tenants_pagando,
        tenants_suspendidos=tenants_suspendidos,
        total_productos=total_productos,
        total_cotizaciones=total_cotizaciones,
        nuevos_este_mes=nuevos_este_mes,
    )


@router.get("/tenants", response_model=list[TenantDetalle])
def listar_tenants(
    current_user: SuperAdmin,
    session: DBSession,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, le=500),
    buscar: Optional[str] = None,
    plan: Optional[str] = None,
    activo: Optional[bool] = None,
):
    query = select(Tenant).offset(skip).limit(limit).order_by(Tenant.creado_en.desc())

    tenants = session.exec(query).all()

    # Filtros en memoria (dataset pequeño)
    if buscar:
        b = buscar.lower()
        tenants = [t for t in tenants if b in t.nombre.lower() or b in t.email_contacto.lower()]
    if plan:
        tenants = [t for t in tenants if t.plan == plan]
    if activo is not None:
        tenants = [t for t in tenants if t.activo == activo]

    resultado = []
    for t in tenants:
        total_productos    = session.exec(select(func.count(Producto.id)).where(Producto.tenant_id == t.id)).one()
        total_cotizaciones = session.exec(select(func.count(Cotizacion.id)).where(Cotizacion.tenant_id == t.id)).one()
        total_usuarios     = session.exec(select(func.count(Usuario.id)).where(Usuario.tenant_id == t.id)).one()
        resultado.append(TenantDetalle(
            id=t.id,
            nombre=t.nombre,
            email_contacto=t.email_contacto,
            plan=t.plan,
            trial_hasta=t.trial_hasta,
            activo=t.activo,
            creado_en=t.creado_en,
            total_productos=total_productos,
            total_cotizaciones=total_cotizaciones,
            total_usuarios=total_usuarios,
        ))

    return resultado


@router.get("/tenants/{tenant_id}", response_model=TenantDetalle)
def obtener_tenant(tenant_id: int, current_user: SuperAdmin, session: DBSession):
    tenant = session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    return TenantDetalle(
        id=tenant.id,
        nombre=tenant.nombre,
        email_contacto=tenant.email_contacto,
        plan=tenant.plan,
        trial_hasta=tenant.trial_hasta,
        activo=tenant.activo,
        creado_en=tenant.creado_en,
        total_productos=session.exec(select(func.count(Producto.id)).where(Producto.tenant_id == tenant_id)).one(),
        total_cotizaciones=session.exec(select(func.count(Cotizacion.id)).where(Cotizacion.tenant_id == tenant_id)).one(),
        total_usuarios=session.exec(select(func.count(Usuario.id)).where(Usuario.tenant_id == tenant_id)).one(),
    )


@router.patch("/tenants/{tenant_id}", response_model=TenantDetalle)
def actualizar_tenant(
    tenant_id: int,
    data: TenantUpdate,
    current_user: SuperAdmin,
    session: DBSession,
):
    tenant = session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    cambios = data.model_dump(exclude_unset=True)
    for campo, valor in cambios.items():
        setattr(tenant, campo, valor)

    tenant.actualizado_en = datetime.now(timezone.utc)
    session.add(tenant)
    session.commit()
    session.refresh(tenant)

    return TenantDetalle(
        id=tenant.id,
        nombre=tenant.nombre,
        email_contacto=tenant.email_contacto,
        plan=tenant.plan,
        trial_hasta=tenant.trial_hasta,
        activo=tenant.activo,
        creado_en=tenant.creado_en,
        total_productos=session.exec(select(func.count(Producto.id)).where(Producto.tenant_id == tenant_id)).one(),
        total_cotizaciones=session.exec(select(func.count(Cotizacion.id)).where(Cotizacion.tenant_id == tenant_id)).one(),
        total_usuarios=session.exec(select(func.count(Usuario.id)).where(Usuario.tenant_id == tenant_id)).one(),
    )


@router.post("/tenants/{tenant_id}/suspender", response_model=TenantDetalle)
def suspender_tenant(tenant_id: int, current_user: SuperAdmin, session: DBSession):
    tenant = session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    tenant.activo = False
    tenant.actualizado_en = datetime.now(timezone.utc)
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    return obtener_tenant(tenant_id, current_user, session)


@router.post("/tenants/{tenant_id}/activar", response_model=TenantDetalle)
def activar_tenant(tenant_id: int, current_user: SuperAdmin, session: DBSession):
    tenant = session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    tenant.activo = True
    tenant.plan = "activo"
    tenant.actualizado_en = datetime.now(timezone.utc)
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    return obtener_tenant(tenant_id, current_user, session)


@router.post("/tenants/{tenant_id}/extender-trial")
def extender_trial(
    tenant_id: int,
    current_user: SuperAdmin,
    session: DBSession,
    dias: int = Query(default=14, ge=1, le=90),
):
    tenant = session.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    base = tenant.trial_hasta if tenant.trial_hasta and tenant.trial_hasta > date.today() else date.today()
    tenant.trial_hasta = base + timedelta(days=dias)
    tenant.plan = "trial"
    tenant.activo = True
    tenant.actualizado_en = datetime.now(timezone.utc)
    session.add(tenant)
    session.commit()

    return {"trial_hasta": tenant.trial_hasta, "mensaje": f"Trial extendido hasta {tenant.trial_hasta}"}


@router.post("/tenants", response_model=TenantDetalle, status_code=status.HTTP_201_CREATED)
def crear_tenant(data: CrearTenantInput, current_user: SuperAdmin, session: DBSession):
    existe = session.exec(select(Usuario).where(Usuario.email == data.email)).first()
    if existe:
        raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese correo")

    tenant = Tenant(
        nombre=data.nombre_negocio,
        email_contacto=data.email,
        plan=data.plan,
        trial_hasta=date.today() + timedelta(days=data.trial_dias) if data.plan == "trial" else None,
        activo=True,
    )
    session.add(tenant)
    session.flush()

    usuario = Usuario(
        tenant_id=tenant.id,
        nombre=data.nombre_usuario,
        email=data.email,
        password_hash=hash_password(data.password),
        rol="admin",
    )
    session.add(usuario)
    session.commit()
    session.refresh(tenant)

    return TenantDetalle(
        id=tenant.id,
        nombre=tenant.nombre,
        email_contacto=tenant.email_contacto,
        plan=tenant.plan,
        trial_hasta=tenant.trial_hasta,
        activo=tenant.activo,
        creado_en=tenant.creado_en,
        total_productos=0,
        total_cotizaciones=0,
        total_usuarios=1,
    )


@router.get("/usuarios", response_model=list[UsuarioDetalle])
def listar_usuarios(
    current_user: SuperAdmin,
    session: DBSession,
    buscar: Optional[str] = None,
):
    usuarios = session.exec(select(Usuario).order_by(Usuario.creado_en.desc())).all()

    if buscar:
        b = buscar.lower()
        usuarios = [u for u in usuarios if b in u.nombre.lower() or b in u.email.lower()]

    resultado = []
    for u in usuarios:
        tenant = session.get(Tenant, u.tenant_id)
        resultado.append(UsuarioDetalle(
            id=u.id,
            nombre=u.nombre,
            email=u.email,
            rol=u.rol,
            activo=u.activo,
            creado_en=u.creado_en,
            ultimo_login=u.ultimo_login,
            tenant_nombre=tenant.nombre if tenant else "—",
        ))

    return resultado
