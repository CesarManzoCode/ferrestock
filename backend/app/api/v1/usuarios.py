from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlmodel import select

from app.core.deps import CurrentUser, AdminUser, DBSession
from app.core.security import hash_password, verify_password
from app.models.usuario import Usuario
from app.models.tenant import Tenant

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

LIMITE_USUARIOS = 3  # incluidos en el plan base


# ── Schemas ───────────────────────────────────────────────────────────────

class UsuarioRead(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str
    activo: bool
    creado_en: datetime
    ultimo_login: Optional[datetime]
    model_config = {"from_attributes": True}


class UsuarioCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    rol: str = "empleado"


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None


class CambiarPasswordInput(BaseModel):
    password_actual: str
    password_nueva: str


class MiCuentaUpdate(BaseModel):
    nombre: Optional[str] = None


class TenantUpdate(BaseModel):
    nombre: Optional[str] = None


class MiCuentaRead(BaseModel):
    usuario: UsuarioRead
    negocio: dict


# ── Mi cuenta ─────────────────────────────────────────────────────────────

@router.get("/mi-cuenta", response_model=MiCuentaRead)
def mi_cuenta(current_user: CurrentUser, session: DBSession):
    tenant = session.get(Tenant, current_user.tenant_id)
    from datetime import date

    dias_trial = None
    if tenant.plan == "trial" and tenant.trial_hasta:
        dias_trial = (tenant.trial_hasta - date.today()).days

    return MiCuentaRead(
        usuario=UsuarioRead.model_validate(current_user),
        negocio={
            "id": tenant.id,
            "nombre": tenant.nombre,
            "email_contacto": tenant.email_contacto,
            "plan": tenant.plan,
            "trial_hasta": str(tenant.trial_hasta) if tenant.trial_hasta else None,
            "dias_trial_restantes": dias_trial,
            "activo": tenant.activo,
        }
    )


@router.patch("/mi-cuenta", response_model=UsuarioRead)
def actualizar_mi_cuenta(
    data: MiCuentaUpdate,
    current_user: CurrentUser,
    session: DBSession,
):
    if data.nombre:
        current_user.nombre = data.nombre.strip()
        session.add(current_user)
        session.commit()
        session.refresh(current_user)
    return current_user


@router.patch("/mi-cuenta/negocio")
def actualizar_negocio(
    data: TenantUpdate,
    current_user: AdminUser,
    session: DBSession,
):
    """Solo admins pueden cambiar el nombre del negocio."""
    tenant = session.get(Tenant, current_user.tenant_id)
    if data.nombre:
        tenant.nombre = data.nombre.strip()
        tenant.actualizado_en = datetime.now(timezone.utc)
        session.add(tenant)
        session.commit()
    return {"nombre": tenant.nombre}


@router.post("/mi-cuenta/cambiar-password")
def cambiar_password(
    data: CambiarPasswordInput,
    current_user: CurrentUser,
    session: DBSession,
):
    if not verify_password(data.password_actual, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta",
        )
    if len(data.password_nueva) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La nueva contraseña debe tener al menos 8 caracteres",
        )
    current_user.password_hash = hash_password(data.password_nueva)
    session.add(current_user)
    session.commit()
    return {"ok": True, "mensaje": "Contraseña actualizada correctamente"}


# ── Gestión de usuarios del tenant ────────────────────────────────────────

class UsuarioPublicoRead(BaseModel):
    id: int
    nombre: str
    activo: bool
    model_config = {"from_attributes": True}


@router.get("", response_model=list[UsuarioRead])
def listar_usuarios(current_user: CurrentUser, session: DBSession):
    usuarios = session.exec(
        select(Usuario)
        .where(Usuario.tenant_id == current_user.tenant_id)
        .order_by(Usuario.creado_en)
    ).all()

    # Empleados ven lista reducida (sin rol ni correo de otros)
    if current_user.rol == "empleado":
        return [
            UsuarioRead(
                id=u.id,
                nombre=u.nombre,
                email="",          # oculto para empleados
                rol="",            # oculto para empleados
                activo=u.activo,
                creado_en=u.creado_en,
                ultimo_login=None,
            )
            for u in usuarios
        ]

    return usuarios


@router.post("", response_model=UsuarioRead, status_code=status.HTTP_201_CREATED)
def crear_usuario(data: UsuarioCreate, current_user: AdminUser, session: DBSession):
    # Verificar límite de usuarios
    total = len(session.exec(
        select(Usuario).where(
            Usuario.tenant_id == current_user.tenant_id,
            Usuario.activo == True,
        )
    ).all())

    if total >= LIMITE_USUARIOS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Has alcanzado el límite de {LIMITE_USUARIOS} usuarios incluidos en tu plan. Contáctanos para agregar más.",
        )

    # Verificar email único global
    existe = session.exec(select(Usuario).where(Usuario.email == data.email)).first()
    if existe:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese correo",
        )

    # Validar rol
    if data.rol not in ("admin", "empleado"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Rol inválido. Usa 'admin' o 'empleado'",
        )

    usuario = Usuario(
        tenant_id=current_user.tenant_id,
        nombre=data.nombre.strip(),
        email=data.email,
        password_hash=hash_password(data.password),
        rol=data.rol,
    )
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario


@router.patch("/{usuario_id}", response_model=UsuarioRead)
def actualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    current_user: AdminUser,
    session: DBSession,
):
    usuario = session.get(Usuario, usuario_id)

    if not usuario or usuario.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if usuario.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="No puedes modificar tu propio usuario desde aquí. Usa 'Mi cuenta'.",
        )

    if data.nombre:
        usuario.nombre = data.nombre.strip()
    if data.rol and data.rol in ("admin", "empleado"):
        usuario.rol = data.rol
    if data.activo is not None:
        usuario.activo = data.activo

    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario
