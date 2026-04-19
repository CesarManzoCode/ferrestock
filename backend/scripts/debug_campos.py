#!/usr/bin/env python3
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app.models.tenant import Tenant
from app.models.usuario import Usuario
from app.models.producto import Producto, CampoConfig
from app.models.cotizacion import Cotizacion, CotizacionItem
from sqlmodel import Session, text
from app.core.database import engine

with Session(engine) as session:
    # Ver el JSONB crudo directamente desde SQL
    print("\n=== JSONB CRUDO EN DB (primeros 10 productos con campos_extra) ===")
    rows = session.exec(text(
        "SELECT id, nombre, campos_extra FROM productos "
        "WHERE campos_extra IS NOT NULL AND campos_extra != 'null'::jsonb "
        "LIMIT 10"
    )).all()
    
    if not rows:
        print("  NINGÚN producto tiene campos_extra guardado correctamente")
    for row in rows:
        print(f"  id={row[0]} | nombre='{str(row[1])[:30]}' | campos_extra={row[2]}")

    print("\n=== PRODUCTO 420 ESPECÍFICO ===")
    rows2 = session.exec(text(
        "SELECT id, nombre, campos_extra FROM productos WHERE id = 420"
    )).all()
    for row in rows2:
        print(f"  id={row[0]} | campos_extra={row[2]}")
    
    print("\n=== CAMPOS CONFIG ===")
    rows3 = session.exec(text(
        "SELECT id, tenant_id, nombre_campo, etiqueta FROM campos_config"
    )).all()
    for row in rows3:
        print(f"  id={row[0]} tenant={row[1]} nombre_campo='{row[2]}' etiqueta='{row[3]}'")
