import os
from datetime import datetime, timezone
from pathlib import Path

from weasyprint import HTML

PDF_DIR = Path(os.getenv("PDF_DIR", "/app/pdfs"))
PDF_DIR.mkdir(parents=True, exist_ok=True)


def _render_html(cotizacion: dict, items: list[dict], tenant_nombre: str) -> str:
    fecha = cotizacion["creado_en"]
    if isinstance(fecha, datetime):
        fecha_str = fecha.strftime("%d/%m/%Y")
    else:
        fecha_str = str(fecha)

    items_html = ""
    for item in items:
        items_html += f"""
        <tr>
            <td>{item['nombre_producto']}</td>
            <td class="center">{item['cantidad']:g}</td>
            <td class="right">${item['precio_unitario']:,.2f}</td>
            <td class="right">${item['subtotal']:,.2f}</td>
        </tr>
        """

    cliente = cotizacion.get("cliente_nombre") or "Cliente general"
    folio = cotizacion["id"]
    total = cotizacion["total"]
    notas = cotizacion.get("notas") or ""

    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
    <meta charset="UTF-8">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: Arial, sans-serif;
            font-size: 13px;
            color: #222;
            padding: 40px;
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 32px;
            border-bottom: 3px solid #d97706;
            padding-bottom: 16px;
        }}
        .empresa h1 {{
            font-size: 24px;
            color: #d97706;
            font-weight: bold;
        }}
        .empresa p {{ color: #555; font-size: 12px; }}
        .folio {{ text-align: right; }}
        .folio .num {{
            font-size: 20px;
            font-weight: bold;
            color: #333;
        }}
        .folio .fecha {{ color: #777; font-size: 12px; }}

        .cliente-box {{
            background: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 12px 16px;
            margin-bottom: 24px;
        }}
        .cliente-box strong {{ color: #444; }}

        table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }}
        thead tr {{
            background: #d97706;
            color: white;
        }}
        thead th {{
            padding: 10px 12px;
            text-align: left;
            font-weight: bold;
        }}
        tbody tr:nth-child(even) {{ background: #fafafa; }}
        tbody td {{
            padding: 9px 12px;
            border-bottom: 1px solid #eee;
        }}
        .center {{ text-align: center; }}
        .right {{ text-align: right; }}

        .totales {{
            display: flex;
            justify-content: flex-end;
            margin-bottom: 28px;
        }}
        .totales-box {{
            width: 260px;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
        }}
        .totales-row {{
            display: flex;
            justify-content: space-between;
            padding: 8px 14px;
            border-bottom: 1px solid #eee;
        }}
        .totales-row.total {{
            background: #d97706;
            color: white;
            font-weight: bold;
            font-size: 15px;
        }}

        .notas {{
            font-size: 12px;
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 12px;
        }}
        .pie {{
            margin-top: 40px;
            text-align: center;
            font-size: 11px;
            color: #aaa;
        }}
    </style>
    </head>
    <body>
        <div class="header">
            <div class="empresa">
                <h1>{tenant_nombre}</h1>
                <p>Cotización generada por FerreStock</p>
            </div>
            <div class="folio">
                <div class="num">Folio #{folio:04d}</div>
                <div class="fecha">{fecha_str}</div>
            </div>
        </div>

        <div class="cliente-box">
            <strong>Cliente:</strong> {cliente}
        </div>

        <table>
            <thead>
                <tr>
                    <th>Producto</th>
                    <th class="center">Cantidad</th>
                    <th class="right">Precio Unit.</th>
                    <th class="right">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
            </tbody>
        </table>

        <div class="totales">
            <div class="totales-box">
                <div class="totales-row total">
                    <span>Total</span>
                    <span>${total:,.2f}</span>
                </div>
            </div>
        </div>

        {'<div class="notas"><strong>Notas:</strong> ' + notas + '</div>' if notas else ''}

        <div class="pie">
            Generado con FerreStock — ferrestock.mx
        </div>
    </body>
    </html>
    """


def generar_pdf_cotizacion(
    cotizacion: dict,
    items: list[dict],
    tenant_nombre: str,
) -> str:
    """
    Genera el PDF de la cotización y lo guarda en disco.
    Retorna la ruta relativa del archivo generado.
    """
    html_content = _render_html(cotizacion, items, tenant_nombre)
    nombre_archivo = f"cotizacion_{cotizacion['tenant_id']}_{cotizacion['id']}.pdf"
    ruta_completa = PDF_DIR / nombre_archivo

    HTML(string=html_content).write_pdf(str(ruta_completa))

    return str(ruta_completa)
