"""PDF invoice generation — clean professional design matching brand style."""
from decimal import Decimal
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

# ─── Brand colours ────────────────────────────────────────────────────────────
GREEN        = colors.HexColor("#166534")
GREEN_DARK   = colors.HexColor("#14532d")
GREEN_LIGHT  = colors.HexColor("#f0fdf4")
GOLD         = colors.HexColor("#ca8a04")
GOLD_LIGHT   = colors.HexColor("#fefce8")
GRAY_900     = colors.HexColor("#111827")
GRAY_700     = colors.HexColor("#374151")
GRAY_500     = colors.HexColor("#6b7280")
GRAY_300     = colors.HexColor("#d1d5db")
GRAY_100     = colors.HexColor("#f3f4f6")
WHITE        = colors.white
BLACK        = colors.HexColor("#000000")


def _money(value) -> str:
    amount = value if isinstance(value, Decimal) else Decimal(str(value or "0"))
    return f"${amount:.2f}"


def _s(name, **kw) -> ParagraphStyle:
    from reportlab.lib.styles import getSampleStyleSheet
    base = getSampleStyleSheet()["Normal"]
    return ParagraphStyle(name, parent=base, **kw)


def _format_delivery_address(order) -> str:
    addr = order.delivery_address or {}
    if order.order_type != "delivery" or not isinstance(addr, dict):
        return "Store Pickup\n8/63 Winnellie Rd\nWinnellie NT 0820"
    parts = [
        addr.get("full_name"),
        addr.get("address_line1"),
        addr.get("address_line2"),
        " ".join(filter(None, [addr.get("suburb"), addr.get("state"), addr.get("postcode")])),
    ]
    return "\n".join(str(p) for p in parts if p)


def build_order_slip_pdf(order) -> bytes:
    buffer = BytesIO()
    page_w, _ = A4
    margin = 18 * mm
    content_w = page_w - 2 * margin

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=margin, leftMargin=margin,
        topMargin=margin, bottomMargin=0,
    )

    story = []

    # ── 1. HEADER — Company name left, INVOICE right ──────────────────────────
    header = Table([[
        Table([
            [Paragraph("Mary ben's Kitchen", _s("BrandName",
                fontSize=18, fontName="Helvetica-Bold",
                textColor=GREEN_DARK))],
            [Spacer(1, 4 * mm)],
            [Paragraph("Fresh Groceries &amp; Food — Darwin, NT",
                _s("Tagline", fontSize=8, fontName="Helvetica",
                   textColor=GRAY_500))],
        ], colWidths=[content_w * 0.5]),
        Paragraph("INVOICE", _s("InvTitle",
            fontSize=30, fontName="Helvetica-Bold",
            textColor=GRAY_900, alignment=2)),
    ]], colWidths=[content_w * 0.55, content_w * 0.45])
    header.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header)
    story.append(Spacer(1, 5 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=GRAY_300, spaceAfter=5 * mm))

    # ── 2. INVOICE TO + INVOICE DETAILS ───────────────────────────────────────
    addr_lines = escape(_format_delivery_address(order)).replace("\n", "<br/>")

    left = Table([
        [Paragraph("Invoice to:", _s("InvToLabel",
            fontSize=9, fontName="Helvetica", textColor=GRAY_500))],
        [Paragraph(escape(order.user.full_name or order.user.email),
            _s("CustName", fontSize=12, fontName="Helvetica-Bold",
               textColor=GRAY_900, spaceAfter=3))],
        [Paragraph(escape(order.user.email),
            _s("CustEmail", fontSize=9, fontName="Helvetica",
               textColor=GRAY_700, spaceAfter=2))],
        [Paragraph(addr_lines,
            _s("CustAddr", fontSize=9, fontName="Helvetica",
               textColor=GRAY_700, leading=14))],
    ], colWidths=[content_w * 0.5])
    left.setStyle(TableStyle([
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))

    right = Table([
        [Paragraph("Invoice#", _s("MetaKey", fontSize=9, fontName="Helvetica",
            textColor=GRAY_700)),
         Paragraph(f"#{order.order_number}", _s("MetaVal", fontSize=9,
            fontName="Helvetica-Bold", textColor=GRAY_900, alignment=2))],
        [Paragraph("Date", _s("MetaKey2", fontSize=9, fontName="Helvetica",
            textColor=GRAY_700)),
         Paragraph(order.created_at.strftime("%d / %m / %Y"), _s("MetaVal2",
            fontSize=9, fontName="Helvetica-Bold", textColor=GRAY_900, alignment=2))],
        [Paragraph("Order Type", _s("MetaKey3", fontSize=9, fontName="Helvetica",
            textColor=GRAY_700)),
         Paragraph(order.get_order_type_display(), _s("MetaVal3", fontSize=9,
            fontName="Helvetica-Bold", textColor=GRAY_900, alignment=2))],
        [Paragraph("Payment", _s("MetaKey4", fontSize=9, fontName="Helvetica",
            textColor=GRAY_700)),
         Paragraph(order.get_payment_status_display(), _s("MetaVal4", fontSize=9,
            fontName="Helvetica-Bold", textColor=GREEN, alignment=2))],
    ], colWidths=[content_w * 0.22, content_w * 0.28])
    right.setStyle(TableStyle([
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW",     (0, 0), (-1, -2), 0.3, GRAY_300),
    ]))

    meta_table = Table([[left, Spacer(1, 1), right]],
        colWidths=[content_w * 0.5, content_w * 0.0, content_w * 0.5])
    meta_table.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8 * mm))

    # ── 3. ITEMS TABLE ────────────────────────────────────────────────────────
    col_w = [content_w * 0.50, content_w * 0.14, content_w * 0.18, content_w * 0.18]

    s_th  = _s("TH",  fontSize=9, fontName="Helvetica-Bold",  textColor=GRAY_700)
    s_th_r = _s("THR", fontSize=9, fontName="Helvetica-Bold", textColor=GRAY_700, alignment=2)
    s_td  = _s("TD",  fontSize=9, fontName="Helvetica",       textColor=GRAY_700, leading=13)
    s_td_r = _s("TDR", fontSize=9, fontName="Helvetica",      textColor=GRAY_700, alignment=2)
    s_td_rb = _s("TDRB", fontSize=9, fontName="Helvetica-Bold", textColor=GRAY_900, alignment=2)
    s_td_sub = _s("TDSub", fontSize=8, fontName="Helvetica",  textColor=GRAY_500, leading=11)

    rows = [[
        Paragraph("Item",        s_th),
        Paragraph("Quantity",    s_th),
        Paragraph("Unit Price",  s_th_r),
        Paragraph("Total",       s_th_r),
    ]]

    for item in order.items.all():
        name_cell = [Paragraph(escape(item.product_name), s_td)]
        if item.variant_name:
            name_cell.append(Paragraph(escape(item.variant_name), s_td_sub))
        rows.append([
            name_cell,
            Paragraph(str(item.quantity), _s("Qty", fontSize=9,
                fontName="Helvetica", textColor=GRAY_700, alignment=1)),
            Paragraph(_money(item.unit_price), s_td_r),
            Paragraph(_money(item.line_total), s_td_rb),
        ])

    items_table = Table(rows, colWidths=col_w, repeatRows=1)
    items_table.setStyle(TableStyle([
        # Header row
        ("LINEBELOW",     (0, 0), (-1, 0),   0.8, GRAY_900),
        ("TOPPADDING",    (0, 0), (-1, 0),   6),
        ("BOTTOMPADDING", (0, 0), (-1, 0),   6),
        # Data rows
        ("LINEBELOW",     (0, 1), (-1, -1),  0.3, GRAY_300),
        ("TOPPADDING",    (0, 1), (-1, -1),  8),
        ("BOTTOMPADDING", (0, 1), (-1, -1),  8),
        ("VALIGN",        (0, 0), (-1, -1),  "MIDDLE"),
        ("LEFTPADDING",   (0, 0), (-1, -1),  0),
        ("RIGHTPADDING",  (0, 0), (-1, -1),  0),
        ("BACKGROUND",    (0, 0), (-1, -1),  WHITE),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 6 * mm))

    # ── 4. TOTALS + ORDER DETAILS ─────────────────────────────────────────────
    discount = Decimal(str(order.discount_amount or "0"))
    delivery = Decimal(str(order.delivery_fee or "0"))

    totals_rows = [["Subtotal", _money(order.subtotal)]]
    if delivery > 0:
        totals_rows.append(["Delivery", _money(delivery)])
    if discount > 0:
        totals_rows.append(["Discount", f"-{_money(discount)}"])

    s_tot_key = _s("TotKey", fontSize=9, fontName="Helvetica", textColor=GRAY_700, alignment=2)
    s_tot_val = _s("TotVal", fontSize=9, fontName="Helvetica", textColor=GRAY_900, alignment=2)
    s_grand_key = _s("GrandKey", fontSize=12, fontName="Helvetica-Bold", textColor=GRAY_900)
    s_grand_val = _s("GrandVal", fontSize=14, fontName="Helvetica-Bold", textColor=GRAY_900, alignment=2)

    sub_rows = [[Paragraph(k, s_tot_key), Paragraph(v, s_tot_val)] for k, v in totals_rows]
    sub_t = Table(sub_rows, colWidths=[content_w * 0.2, content_w * 0.18])
    sub_t.setStyle(TableStyle([
        ("LINEBELOW",     (0, 0), (-1, -1),  0.3, GRAY_300),
        ("TOPPADDING",    (0, 0), (-1, -1),  4),
        ("BOTTOMPADDING", (0, 0), (-1, -1),  4),
        ("LEFTPADDING",   (0, 0), (-1, -1),  0),
        ("RIGHTPADDING",  (0, 0), (-1, -1),  0),
    ]))

    grand_t = Table([[
        Paragraph("Total", s_grand_key),
        Paragraph(_money(order.total_amount), s_grand_val),
    ]], colWidths=[content_w * 0.2, content_w * 0.18])
    grand_t.setStyle(TableStyle([
        ("TOPPADDING",    (0, 0), (-1, -1),  6),
        ("BOTTOMPADDING", (0, 0), (-1, -1),  6),
        ("LEFTPADDING",   (0, 0), (-1, -1),  0),
        ("RIGHTPADDING",  (0, 0), (-1, -1),  0),
    ]))

    # Order details (left side)
    s_od_title = _s("ODTitle", fontSize=9, fontName="Helvetica-Bold", textColor=GRAY_900)
    s_od_body  = _s("ODBody",  fontSize=9, fontName="Helvetica",       textColor=GRAY_700, leading=14)

    order_detail_text = (
        f"Order Status: {order.get_status_display()}<br/>"
        f"Order #: {order.order_number}<br/>"
        f"Date: {order.created_at.strftime('%d %B %Y')}"
    )
    if order.notes:
        order_detail_text += f"<br/>Notes: {escape(order.notes)}"

    left_detail = Table([
        [Paragraph("ORDER DETAILS", s_od_title)],
        [Spacer(1, 2 * mm)],
        [Paragraph(order_detail_text, s_od_body)],
    ], colWidths=[content_w * 0.55])
    left_detail.setStyle(TableStyle([
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))

    right_detail = Table([
        [sub_t],
        [grand_t],
    ], colWidths=[content_w * 0.38], hAlign="RIGHT")
    right_detail.setStyle(TableStyle([
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("ALIGN",         (0, 0), (-1, -1), "RIGHT"),
    ]))

    bottom_section = Table([[left_detail, right_detail]],
        colWidths=[content_w * 0.55, content_w * 0.45])
    bottom_section.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(bottom_section)
    story.append(Spacer(1, 10 * mm))

    # ── 5. THANK YOU + SIGNATURE ──────────────────────────────────────────────
    s_thanks    = _s("Thanks",  fontSize=12, fontName="Helvetica-Bold", textColor=GRAY_900)
    s_sig_line  = _s("SigLine", fontSize=8,  fontName="Helvetica",      textColor=GRAY_500, alignment=2)

    thanks_row = Table([[
        Paragraph("Thank you for your business!", s_thanks),
        Table([
            [HRFlowable(width=content_w * 0.3, thickness=0.5, color=GRAY_300)],
            [Paragraph("Authorised by Marybens Kitchen", s_sig_line)],
        ], colWidths=[content_w * 0.35]),
    ]], colWidths=[content_w * 0.55, content_w * 0.45])
    thanks_row.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "BOTTOM"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(thanks_row)
    story.append(Spacer(1, 10 * mm))

    # ── 6. FOOTER BAR ─────────────────────────────────────────────────────────
    s_footer_txt = _s("FooterTxt", fontSize=8, fontName="Helvetica",
        textColor=WHITE, alignment=1)

    footer_bar = Table([[
        Paragraph("📞 +61 415365680", s_footer_txt),
        Paragraph("📍 8/63 Winnellie Rd, Winnellie NT 0820", s_footer_txt),
        Paragraph("✉️ www.marybenskitchen.com", s_footer_txt),
    ]], colWidths=[content_w / 3] * 3)
    footer_bar.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), GREEN_DARK),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))

    # Extend footer to full page width
    footer_wrapper = Table([[footer_bar]],
        colWidths=[content_w])
    footer_wrapper.setStyle(TableStyle([
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(footer_wrapper)

    doc.build(story)
    return buffer.getvalue()