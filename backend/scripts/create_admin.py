#!/usr/bin/env python3
"""
Script para crear el primer admin de un tenant.
Uso: make create-admin
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from datetime import date, timedelta
from sqlmodel import Session, select
from app.core.database import engine
from app.core.security import hash_password
from app.core.config import settings
from app.models.tenant import Tenant
from app.models.usuario import Usuario


def main():
    print("\n── FerreStock: Crear Admin ──────────────────")

    nombre_negocio = input("Nombre del negocio: ").strip()
    nombre_usuario = input("Nombre del usuario: ").strip()
    email = input("Correo: ").strip().lower()
    password = input("Contraseña: ").strip()

    if not all([nombre_negocio, nombre_usuario, email, password]):
        print("❌ Todos los campos son obligatorios.")
        sys.exit(1)

    if len(password) < 8:
        print("❌ La contraseña debe tener al menos 8 caracteres.")
        sys.exit(1)

    with Session(engine) as session:
        existe = session.exec(select(Usuario).where(Usuario.email == email)).first()
        if existe:
            print(f"❌ Ya existe un usuario con el correo {email}.")
            sys.exit(1)

        tenant = Tenant(
            nombre=nombre_negocio,
            email_contacto=email,
            plan="activo",   # admin creado manualmente = cuenta activa
            activo=True,
        )
        session.add(tenant)
        session.flush()

        usuario = Usuario(
            tenant_id=tenant.id,
            nombre=nombre_usuario,
            email=email,
            password_hash=hash_password(password),
            rol="admin",
        )
        session.add(usuario)
        session.commit()

        print(f"\n✓ Admin creado correctamente.")
        print(f"  Negocio : {nombre_negocio}")
        print(f"  Usuario : {nombre_usuario} ({email})")
        print(f"  Tenant ID: {tenant.id}\n")


if __name__ == "__main__":
    main()
