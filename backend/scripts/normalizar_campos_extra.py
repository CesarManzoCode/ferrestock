#!/usr/bin/env python3
"""
Normaliza las claves de campos_extra para que coincidan con nombre_campo del config.
Uso: make normalizar-campos
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from rapidfuzz import fuzz
from sqlmodel import Session, select
from sqlalchemy import text
from app.core.database import engine
from app.models.tenant import Tenant
from app.models.usuario import Usuario
from app.models.producto import Producto, CampoConfig
from app.models.cotizacion import Cotizacion, CotizacionItem


def normalizar_str(s: str) -> str:
    return s.lower().strip().replace('_', ' ').replace('+', '').replace('  ', ' ').strip()


def clave_coincide(clave: str, nombre_campo: str, etiqueta: str) -> bool:
    cn = normalizar_str(clave)
    nn = normalizar_str(nombre_campo)
    en = normalizar_str(etiqueta)
    if cn == nn or cn == en:
        return True
    if fuzz.ratio(cn, en) >= 80 or fuzz.ratio(cn, nn) >= 80:
        return True
    if fuzz.token_sort_ratio(cn, en) >= 80:
        return True
    return False


with Session(engine) as session:
    campos_por_tenant: dict[int, list] = {}
    for c in session.exec(select(CampoConfig)).all():
        campos_por_tenant.setdefault(c.tenant_id, []).append(c)

    print(f"\nCampos config: {sum(len(v) for v in campos_por_tenant.values())}")
    for tid, campos in campos_por_tenant.items():
        for c in campos:
            print(f"  tenant={tid} '{c.nombre_campo}' (etiqueta='{c.etiqueta}')")

    rows = session.exec(text(
        "SELECT id, tenant_id, campos_extra FROM productos "
        "WHERE campos_extra IS NOT NULL AND campos_extra != 'null'::jsonb"
    )).all()

    print(f"\nProductos con campos_extra: {len(rows)}")

    # Diagnóstico: mostrar tenants de productos sin campo config
    tenants_sin_config = set()
    for prod_id, tenant_id, campos_extra in rows:
        if campos_extra and tenant_id not in campos_por_tenant:
            tenants_sin_config.add(tenant_id)

    if tenants_sin_config:
        print(f"\n⚠ Tenants con productos con campos_extra pero SIN campo config: {tenants_sin_config}")
        print("  Estos productos no pueden normalizarse automáticamente.")
        print("  El ferretero de esos tenants debe crear sus campos en 'Campos personalizados'.")

    actualizados = 0
    sin_config = 0
    ejemplos = []

    conn = session.connection().connection
    cursor = conn.cursor()

    for prod_id, tenant_id, campos_extra in rows:
        if not campos_extra or not isinstance(campos_extra, dict):
            continue
        campos_tenant = campos_por_tenant.get(tenant_id, [])
        if not campos_tenant:
            sin_config += 1
            continue

        nuevo_extra = {}
        cambio = False

        for clave, valor in campos_extra.items():
            match = next(
                (cc for cc in campos_tenant
                 if clave_coincide(clave, cc.nombre_campo, cc.etiqueta)),
                None
            )
            if match and clave != match.nombre_campo:
                if len(ejemplos) < 5:
                    ejemplos.append(f"  prod={prod_id} tenant={tenant_id} '{clave}' → '{match.nombre_campo}'")
                nuevo_extra[match.nombre_campo] = valor
                cambio = True
            else:
                nuevo_extra[clave] = valor

        if cambio:
            cursor.execute(
                "UPDATE productos SET campos_extra = %s::jsonb WHERE id = %s",
                (json.dumps(nuevo_extra), prod_id)
            )
            actualizados += 1

    conn.commit()

    if ejemplos:
        print("\nEjemplos migrados:")
        for e in ejemplos:
            print(e)

    print(f"\n✓ Actualizados: {actualizados}")
    print(f"  Sin campo config (no migrados): {sin_config}")
    print(f"  Sin cambio necesario: {len(rows) - actualizados - sin_config}")

    cursor.close()
