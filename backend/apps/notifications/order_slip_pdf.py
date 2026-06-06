"""PDF order slip generation — modern professional design."""
from decimal import Decimal
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

# ─── Brand colours ────────────────────────────────────────────────────────────
GREEN_DARK   = colors.HexColor("#14532d")
GREEN_MID    = colors.HexColor("#166534")
GREEN_LIGHT  = colors.HexColor("#dcfce7")
GREEN_ACCENT = colors.HexColor("#16a34a")
GRAY_900     = colors.HexColor("#111827")
GRAY_600     = colors.HexColor("#4b5563")
GRAY_400     = colors.HexColor("#9ca3af")
GRAY_100     = colors.HexColor("#f3f4f6")
GRAY_50      = colors.HexColor("#f9fafb")
WHITE        = colors.white


def _money(value) -> str:
    amount = value if isinstance(value, Decimal) else Decimal(str(value or "0"))
    return f"${amount:.2f}"


def _format_delivery_address(order) -> str:
    address = order.delivery_address or {}
    if order.order_type != "delivery" or not isinstance(address, dict):
        return "Store Pickup"
    parts = [
        address.get("full_name"),
        address.get("phone"),
        address.get("address_line1"),
        address.get("address_line2"),
        " ".join(filter(None, [
            address.get("suburb"),
            address.get("state"),
            address.get("postcode"),
        ])),
    ]
    return "\n".join(str(p) for p in parts if p)


def build_order_slip_pdf(order) -> bytes:
    buffer = BytesIO()
    page_w, page_h = A4

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
    )

    content_w = page_w - 36 * mm

    # ── Styles ────────────────────────────────────────────────────────────────
    def style(name, **kw) -> ParagraphStyle:
        base = getSampleStyleSheet()["Normal"]
        return ParagraphStyle(name, parent=base, **kw)

    s_store_name   = style("StoreName",  fontSize=22, fontName="Helvetica-Bold",  textColor=GREEN_DARK,  spaceAfter=1)
    s_tagline      = style("Tagline",    fontSize=9,  fontName="Helvetica",       textColor=GRAY_400,    spaceAfter=0)
    s_invoice_lbl  = style("InvLabel",  fontSize=9,  fontName="Helvetica",       textColor=GRAY_400)
    s_invoice_num  = style("InvNum",    fontSize=14, fontName="Helvetica-Bold",  textColor=GRAY_900)
    s_section      = style("Section",   fontSize=8,  fontName="Helvetica-Bold",  textColor=GREEN_MID,   spaceBefore=10, spaceAfter=4, leading=10)
    s_body         = style("Body",      fontSize=9,  fontName="Helvetica",       textColor=GRAY_600,    leading=13)
    s_body_bold    = style("BodyBold",  fontSize=9,  fontName="Helvetica-Bold",  textColor=GRAY_900,    leading=13)
    s_item         = style("Item",      fontSize=9,  fontName="Helvetica",       textColor=GRAY_900,    leading=12)
    s_item_sub     = style("ItemSub",   fontSize=8,  fontName="Helvetica",       textColor=GRAY_400,    leading=11)
    s_th           = style("TH",        fontSize=8,  fontName="Helvetica-Bold",  textColor=WHITE,       alignment=1)
    s_total_lbl    = style("TotLbl",    fontSize=10, fontName="Helvetica-Bold",  textColor=WHITE)
    s_total_val    = style("TotVal",    fontSize=12, fontName="Helvetica-Bold",  textColor=WHITE)
    s_footer       = style("Footer",    fontSize=8,  fontName="Helvetica",       textColor=GRAY_400,    alignment=1)

    story = []

    # ── Header bar ────────────────────────────────────────────────────────────
    header_data = [[
        Table([[
            [Paragraph("Mary Kitchen", s_store_name)],
            [Paragraph("Fresh groceries &amp; food — Darwin, NT", s_tagline)],
        ]], colWidths=[content_w * 0.6]),
        Table([[
            [Paragraph("TAX INVOICE", s_invoice_lbl)],
            [Paragraph(f"#{order.order_number}", s_invoice_num)],
        ]], colWidths=[content_w * 0.4], hAlign="RIGHT"),
    ]]
    header_table = Table(header_data, colWidths=[content_w * 0.6, content_w * 0.4])
    header_table.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN",         (1, 0), (1, -1),  "RIGHT"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 3 * mm))
    story.append(HRFlowable(width="100%", thickness=2, color=GREEN_MID, spaceAfter=5 * mm))

    # ── Order info + customer info ─────────────────────────────────────────────
    left_rows = [
        [Paragraph("ORDER DATE", s_section)],
        [Paragraph(order.created_at.strftime("%d %B %Y, %I:%M %p"), s_body)],
        [Spacer(1, 3 * mm)],
        [Paragraph("ORDER TYPE", s_section)],
        [Paragraph(order.get_order_type_display(), s_body)],
        [Spacer(1, 3 * mm)],
        [Paragraph("PAYMENT STATUS", s_section)],
        [Paragraph(order.get_payment_status_display(), s_body)],
    ]
    right_rows = [
        [Paragraph("BILL TO", s_section)],
        [Paragraph(escape(order.user.full_name or order.user.email), s_body_bold)],
        [Paragraph(escape(order.user.email), s_body)],
        [Spacer(1, 3 * mm)],
        [Paragraph("DELIVER TO / PICKUP", s_section)],
        [Paragraph(escape(_format_delivery_address(order)).replace("\n", "<br/>"), s_body)],
    ]

    left_table  = Table(left_rows,  colWidths=[content_w * 0.45])
    right_table = Table(right_rows, colWidths=[content_w * 0.45])
    for t in (left_table, right_table):
        t.setStyle(TableStyle([
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
            ("TOPPADDING",    (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))

    info_table = Table(
        [[left_table, Spacer(content_w * 0.1, 1), right_table]],
        colWidths=[content_w * 0.45, content_w * 0.1, content_w * 0.45],
    )
    info_table.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 6 * mm))

    # ── Items table ───────────────────────────────────────────────────────────
    col_w = [content_w * 0.50, content_w * 0.12, content_w * 0.19, content_w * 0.19]

    item_rows = [[
        Paragraph("DESCRIPTION", s_th),
        Paragraph("QTY",  s_th),
        Paragraph("UNIT PRICE", s_th),
        Paragraph("TOTAL", s_th),
    ]]

    for i, item in enumerate(order.items.all()):
        name = escape(item.product_name)
        cell = [Paragraph(name, s_item)]
        if item.variant_name:
            cell.append(Paragraph(escape(item.variant_name), s_item_sub))
        item_rows.append([
            cell,
            Paragraph(str(item.quantity), style("Ctr", fontSize=9, fontName="Helvetica", textColor=GRAY_900, alignment=1)),
            Paragraph(_money(item.unit_price), style("R", fontSize=9, fontName="Helvetica", textColor=GRAY_900, alignment=2)),
            Paragraph(_money(item.line_total), style("RB", fontSize=9, fontName="Helvetica-Bold", textColor=GRAY_900, alignment=2)),
        ])

    items_table = Table(item_rows, colWidths=col_w, repeatRows=1)
    row_count = len(item_rows)
    items_table.setStyle(TableStyle([
        # Header
        ("BACKGROUND",    (0, 0), (-1, 0),  GREEN_MID),
        ("TOPPADDING",    (0, 0), (-1, 0),  6),
        ("BOTTOMPADDING", (0, 0), (-1, 0),  6),
        ("LEFTPADDING",   (0, 0), (-1, 0),  8),
        ("RIGHTPADDING",  (0, 0), (-1, 0),  8),
        # Rows
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY_50]),
        ("TOPPADDING",    (0, 1), (-1, -1),  7),
        ("BOTTOMPADDING", (0, 1), (-1, -1),  7),
        ("LEFTPADDING",   (0, 1), (-1, -1),  8),
        ("RIGHTPADDING",  (0, 1), (-1, -1),  8),
        ("VALIGN",        (0, 0), (-1, -1),  "MIDDLE"),
        # Border
        ("LINEBELOW",     (0, 0), (-1, -1),  0.3, colors.HexColor("#e5e7eb")),
        ("BOX",           (0, 0), (-1, -1),  0.5, colors.HexColor("#d1d5db")),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 4 * mm))

    # ── Totals ────────────────────────────────────────────────────────────────
    discount = Decimal(str(order.discount_amount or "0"))
    delivery = Decimal(str(order.delivery_fee or "0"))

    totals_rows = [
        ["Subtotal",    _money(order.subtotal)],
    ]
    if delivery > 0:
        totals_rows.append(["Delivery fee", _money(delivery)])
    if discount > 0:
        totals_rows.append(["Discount",     f"-{_money(discount)}"])

    sub_style = TableStyle([
        ("ALIGN",         (1, 0), (1, -1), "RIGHT"),
        ("FONTNAME",      (0, 0), (0, -1), "Helvetica"),
        ("FONTNAME",      (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("TEXTCOLOR",     (0, 0), (-1, -1), GRAY_600),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
    ])
    sub_table = Table(totals_rows, colWidths=[content_w * 0.78, content_w * 0.22])
    sub_table.setStyle(sub_style)

    # Grand total bar
    total_bar = Table(
        [[Paragraph("TOTAL PAID", s_total_lbl), Paragraph(_money(order.total_amount), s_total_val)]],
        colWidths=[content_w * 0.78, content_w * 0.22],
    )
    total_bar.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), GREEN_DARK),
        ("ALIGN",         (1, 0), (1, -1),  "RIGHT"),
        ("VALIGN",        (0, 0), (-1, -1),  "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1),  10),
        ("BOTTOMPADDING", (0, 0), (-1, -1),  10),
        ("LEFTPADDING",   (0, 0), (-1, -1),  12),
        ("RIGHTPADDING",  (0, 0), (-1, -1),  12),
        ("ROUNDEDCORNERS", [4]),
    ]))

    totals_wrapper = Table(
        [[sub_table], [Spacer(1, 3 * mm)], [total_bar]],
        colWidths=[content_w],
        hAlign="RIGHT",
    )
    totals_wrapper.setStyle(TableStyle([
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("ALIGN",         (0, 0), (-1, -1), "RIGHT"),
    ]))
    story.append(totals_wrapper)

    # ── Notes ─────────────────────────────────────────────────────────────────
    if order.notes:
        story.append(Spacer(1, 5 * mm))
        story.append(Paragraph("ORDER NOTES", s_section))
        story.append(Paragraph(escape(order.notes), s_body))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 10 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRAY_100, spaceAfter=4 * mm))
    story.append(Paragraph(
        "Thank you for shopping with Marybens Kitchen! &nbsp;·&nbsp; "
        "8/63 Winnellie Rd, Winnellie NT 0820 &nbsp;·&nbsp; "
        "darwindsfood@gmail.com &nbsp;·&nbsp; "
        "marybenskitchen.com",
        s_footer,
    ))

    doc.build(story)
    return buffer.getvalue()