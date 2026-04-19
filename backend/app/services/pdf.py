import os
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable
)
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER

PDF_DIR = Path(os.getenv("PDF_DIR", "/app/pdfs"))
PDF_DIR.mkdir(parents=True, exist_ok=True)

# Colores de marca
NARANJA = colors.HexColor("#E07B00")
AZUL    = colors.HexColor("#1A4F8A")
AZUL_LIGHT = colors.HexColor("#EEF3FA")
GRIS    = colors.HexColor("#6B6B6B")
GRIS_CLARO = colors.HexColor("#F4F1EC")
NEGRO   = colors.HexColor("#1A1A1A")
BLANCO  = colors.white


def generar_pdf_cotizacion(
    cotizacion: dict,
    items: list[dict],
    tenant_nombre: str,
) -> str:
    nombre_archivo = f"cotizacion_{cotizacion['tenant_id']}_{cotizacion['id']}.pdf"
    ruta = PDF_DIR / nombre_archivo

    doc = SimpleDocTemplate(
        str(ruta),
        pagesize=letter,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Encabezado ────────────────────────────────────────────────────────
    fecha = cotizacion.get("creado_en")
    if isinstance(fecha, datetime):
        fecha_str = fecha.strftime("%d/%m/%Y")
    else:
        fecha_str = str(fecha or "")

    folio = f"#{cotizacion['id']:04d}"

    header_data = [[
        Paragraph(f"<font color='#{AZUL.hexval()[2:]}' size='20'><b>{tenant_nombre}</b></font>", styles["Normal"]),
        Paragraph(
            f"<font color='#{NARANJA.hexval()[2:]}' size='18'><b>Cotización {folio}</b></font><br/>"
            f"<font color='#{GRIS.hexval()[2:]}' size='10'>{fecha_str}</font>",
            ParagraphStyle("right", parent=styles["Normal"], alignment=TA_RIGHT)
        ),
    ]]
    header_table = Table(header_data, colWidths=["55%", "45%"])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=3, color=NARANJA, spaceAfter=12))

    # ── Cliente ───────────────────────────────────────────────────────────
    cliente = cotizacion.get("cliente_nombre") or "Cliente general"
    cliente_data = [[
        Paragraph(f"<b>Cliente:</b> {cliente}", styles["Normal"]),
    ]]
    cliente_table = Table(cliente_data, colWidths=["100%"])
    cliente_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), AZUL_LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
        ("BOX", (0, 0), (-1, -1), 0.5, AZUL),
    ]))
    story.append(cliente_table)
    story.append(Spacer(1, 16))

    # ── Tabla de productos ────────────────────────────────────────────────
    col_headers = ["Producto", "Cantidad", "Precio Unit.", "Subtotal"]
    table_data = [col_headers]

    for item in items:
        table_data.append([
            item["nombre_producto"],
            f"{item['cantidad']:g}",
            f"${item['precio_unitario']:,.2f}",
            f"${item['subtotal']:,.2f}",
        ])

    col_widths = ["50%", "15%", "17.5%", "17.5%"]
    # Convertir porcentajes a puntos (ancho útil ~17cm)
    page_w = letter[0] - 4*cm
    widths = [page_w * float(w.rstrip("%")) / 100 for w in col_widths]

    items_table = Table(table_data, colWidths=widths, repeatRows=1)
    items_table.setStyle(TableStyle([
        # Encabezado
        ("BACKGROUND",   (0, 0), (-1, 0), AZUL),
        ("TEXTCOLOR",    (0, 0), (-1, 0), BLANCO),
        ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, 0), 9),
        ("TOPPADDING",   (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING",(0, 0), (-1, 0), 9),
        ("ALIGN",        (1, 0), (-1, 0), "CENTER"),
        # Filas de datos
        ("FONTNAME",     (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",     (0, 1), (-1, -1), 9),
        ("TOPPADDING",   (0, 1), (-1, -1), 7),
        ("BOTTOMPADDING",(0, 1), (-1, -1), 7),
        ("ALIGN",        (1, 1), (-1, -1), "CENTER"),
        ("ALIGN",        (2, 1), (-1, -1), "RIGHT"),
        ("ALIGN",        (3, 1), (-1, -1), "RIGHT"),
        # Filas alternas
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [BLANCO, GRIS_CLARO]),
        # Bordes
        ("LINEBELOW",    (0, 0), (-1, 0), 1, NARANJA),
        ("LINEBELOW",    (0, 1), (-1, -1), 0.3, colors.HexColor("#D9D9D9")),
        ("BOX",          (0, 0), (-1, -1), 0.5, colors.HexColor("#D9D9D9")),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 12))

    # ── Total ─────────────────────────────────────────────────────────────
    total = cotizacion.get("total", 0)
    total_data = [[
        Paragraph("<font color='white'><b>TOTAL</b></font>", styles["Normal"]),
        Paragraph(
            f"<font color='white' size='14'><b>${total:,.2f}</b></font>",
            ParagraphStyle("totalRight", parent=styles["Normal"], alignment=TA_RIGHT)
        ),
    ]]
    total_table = Table(total_data, colWidths=[page_w * 0.7, page_w * 0.3])
    total_table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), AZUL),
        ("LEFTPADDING",  (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING",   (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 10),
        ("LINEABOVE",    (0, 0), (-1, 0), 3, NARANJA),
    ]))
    story.append(total_table)

    # ── Notas ─────────────────────────────────────────────────────────────
    notas = cotizacion.get("notas")
    if notas:
        story.append(Spacer(1, 16))
        story.append(Paragraph(f"<b>Notas:</b> {notas}", styles["Normal"]))

    # ── Pie de página ─────────────────────────────────────────────────────
    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRIS, spaceAfter=6))
    story.append(Paragraph(
        "<font color='#6B6B6B' size='8'>Generado con FerreStock — ferrestock.mx</font>",
        ParagraphStyle("footer", parent=styles["Normal"], alignment=TA_CENTER)
    ))

    doc.build(story)
    return str(ruta)
