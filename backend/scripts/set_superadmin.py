#!/usr/bin/env python3
"""
Asigna rol superadmin a un usuario existente.
Uso: make set-superadmin
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlmodel import Session, select
from app.core.database import engine
# Importar todos los modelos para que SQLAlchemy resuelva las FK
from app.models.tenant import Tenant       # noqa: F401
from app.models.usuario import Usuario
from app.models.producto import Producto   # noqa: F401
from app.models.cotizacion import Cotizacion, CotizacionItem  # noqa: F401


def main():
    print("\n── FerreStock: Asignar Superadmin ──────────────")
    email = input("Correo del usuario: ").strip().lower()

    with Session(engine) as session:
        usuario = session.exec(select(Usuario).where(Usuario.email == email)).first()
        if not usuario:
            print(f"❌ No se encontró ningún usuario con el correo {email}")
            sys.exit(1)

        usuario.rol = "superadmin"
        session.add(usuario)
        session.commit()

        print(f"\n✓ {usuario.nombre} ({email}) ahora es superadmin.\n")


if __name__ == "__main__":
    main()
