from rapidfuzz import fuzz, process
from sqlmodel import Session, select

from app.models.producto import Producto


def buscar_productos(
    query: str,
    tenant_id: int,
    session: Session,
    limite: int = 20,
    score_minimo: float = 40.0,
) -> list[dict]:
    """
    Búsqueda inteligente con RapidFuzz.
    Carga los productos del tenant en memoria (razonable para inventarios
    de ferretería típicos de 500-10,000 productos) y aplica fuzzy matching.
    Para inventarios masivos (50k+) esto se migra a pg_trgm en PostgreSQL.
    """
    if not query or not query.strip():
        return []

    # Traer solo productos activos del tenant
    productos = session.exec(
        select(Producto).where(
            Producto.tenant_id == tenant_id,
            Producto.activo == True,
        )
    ).all()

    if not productos:
        return []

    # Construir mapa nombre -> producto para recuperar después
    nombres = [p.nombre for p in productos]
    producto_map = {p.nombre: p for p in productos}

    # Usar WRatio: combina múltiples estrategias (partial, token_sort, token_set)
    # ideal para nombres de ferretería con palabras en distinto orden
    resultados = process.extract(
        query,
        nombres,
        scorer=fuzz.WRatio,
        limit=limite,
        score_cutoff=score_minimo,
    )

    salida = []
    for nombre, score, _ in resultados:
        p = producto_map[nombre]
        salida.append({
            "id": p.id,
            "nombre": p.nombre,
            "precio": p.precio,
            "existencias": p.existencias,
            "score": round(score, 1),
        })

    # Ordenar por score descendente
    salida.sort(key=lambda x: x["score"], reverse=True)
    return salida
