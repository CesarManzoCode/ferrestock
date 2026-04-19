from datetime import date, timedelta, datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.core.config import settings
from app.core.database import get_session
from app.core.deps import DBSession
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.tenant import Tenant
from app.models.usuario import Usuario
from app.schemas.auth import LoginInput, RefreshInput, RegisterInput, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterInput, session: DBSession):
    # Verificar email único
    existing = session.exec(select(Usuario).where(Usuario.email == data.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con ese correo",
        )

    # Crear tenant con trial de 14 días
    tenant = Tenant(
        nombre=data.nombre_negocio,
        email_contacto=data.email,
        plan="trial",
        trial_hasta=date.today() + timedelta(days=settings.TRIAL_DAYS),
    )
    session.add(tenant)
    session.flush()  # obtener tenant.id sin commit

    # Crear usuario admin del tenant
    usuario = Usuario(
        tenant_id=tenant.id,
        nombre=data.nombre_usuario,
        email=data.email,
        password_hash=hash_password(data.password),
        rol="admin",
    )
    session.add(usuario)
    session.commit()
    session.refresh(usuario)

    access = create_access_token(usuario.id, tenant.id, usuario.rol)
    refresh = create_refresh_token(usuario.id, tenant.id)

    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginInput, session: DBSession):
    usuario = session.exec(
        select(Usuario).where(Usuario.email == data.email)
    ).first()

    if not usuario or not verify_password(data.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo",
        )

    # Actualizar último login
    usuario.ultimo_login = datetime.now(timezone.utc)
    session.add(usuario)
    session.commit()

    access = create_access_token(usuario.id, usuario.tenant_id, usuario.rol)
    refresh = create_refresh_token(usuario.id, usuario.tenant_id)

    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(data: RefreshInput, session: DBSession):
    payload = decode_token(data.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o expirado",
        )

    user_id = payload.get("sub")
    usuario = session.get(Usuario, int(user_id))

    if not usuario or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
        )

    access = create_access_token(usuario.id, usuario.tenant_id, usuario.rol)
    new_refresh = create_refresh_token(usuario.id, usuario.tenant_id)

    return TokenResponse(access_token=access, refresh_token=new_refresh)
