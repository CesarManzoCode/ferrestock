from concurrent.futures import ThreadPoolExecutor
from rapidfuzz import fuzz, process
from sqlmodel import Session, select

from app.models.producto import Producto, CampoConfig


def _buscar_en_lista(query: str, nombres: list[str], score_minimo: float) -> list[tuple]:
    """Búsqueda fuzzy en una lista de strings. Retorna (texto, score, índice)."""
    return process.extract(
        query,
        nombres,
        scorer=fuzz.WRatio,
        limit=None,
        score_cutoff=score_minimo,
    )


def buscar_productos(
    query: str,
    tenant_id: int,
    session: Session,
    limite: int = 20,
    score_minimo: float = 40.0,
) -> list[dict]:
    if not query or not query.strip():
        return []

    # Traer productos activos del tenant
    productos = session.exec(
        select(Producto).where(
            Producto.tenant_id == tenant_id,
            Producto.activo == True,
        )
    ).all()

    if not productos:
        return []

    # Obtener campos con rol "codigo" para búsqueda adicional
    campos_codigo = session.exec(
        select(CampoConfig).where(
            CampoConfig.tenant_id == tenant_id,
            CampoConfig.rol == "codigo",
        )
    ).all()
    nombres_codigo = [c.nombre_campo for c in campos_codigo]

    # Construir índices
    nombres = [p.nombre for p in productos]
    producto_por_idx = {i: p for i, p in enumerate(productos)}

    # Función para buscar por códigos — extrae todos los valores de campos código
    def buscar_por_codigos():
        if not nombres_codigo:
            return []
        codigos = []
        idx_map = {}
        for i, p in enumerate(productos):
            if not p.campos_extra:
                continue
            for nc in nombres_codigo:
                val = p.campos_extra.get(nc)
                if val:
                    codigo_str = str(val).strip()
                    codigos.append(codigo_str)
                    idx_map[len(codigos) - 1] = i
        if not codigos:
            return []
        resultados = _buscar_en_lista(query, codigos, score_minimo)
        return [(idx_map[r[2]], r[1]) for r in resultados]  # (producto_idx, score)

    # Ejecutar búsqueda por nombre y por código en paralelo
    with ThreadPoolExecutor(max_workers=2) as executor:
        fut_nombres  = executor.submit(_buscar_en_lista, query, nombres, score_minimo)
        fut_codigos  = executor.submit(buscar_por_codigos)
        res_nombres  = fut_nombres.result()
        res_codigos  = fut_codigos.result()

    # Combinar resultados — usar el score más alto si un producto aparece en ambos
    scores: dict[int, float] = {}

    for nombre, score, idx in res_nombres:
        scores[idx] = max(scores.get(idx, 0), score)

    for prod_idx, score in res_codigos:
        scores[prod_idx] = max(scores.get(prod_idx, 0), score)

    if not scores:
        return []

    # Ordenar por score y limitar
    ordenados = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:limite]

    return [
        {
            "id": producto_por_idx[idx].id,
            "nombre": producto_por_idx[idx].nombre,
            "precio": producto_por_idx[idx].precio,
            "existencias": producto_por_idx[idx].existencias,
            "score": round(score, 1),
        }
        for idx, score in ordenados
    ]
