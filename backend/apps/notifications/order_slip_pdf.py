"""PDF order slip generation."""
from decimal import Decimal
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _money(value) -> str:
    amount = value if isinstance(value, Decimal) else Decimal(str(value or "0"))
    return f"${amount:.2f}"


def _format_delivery_address(order) -> str:
    address = order.delivery_address or {}
    if order.order_type != "delivery" or not isinstance(address, dict):
        return "Pickup"

    parts = [
        address.get("full_name"),
        address.get("phone"),
        address.get("address_line1"),
        address.get("address_line2"),
        " ".join(filter(None, [address.get("suburb"), address.get("state"), address.get("postcode")])),
        address.get("country"),
    ]
    return "\n".join(str(part) for part in parts if part)


def build_order_slip_pdf(order) -> bytes:
    """Return a PDF receipt/slip for a paid order."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("Mary Kitchen", styles["Title"]))
    story.append(Paragraph("Order Slip", styles["Heading2"]))
    story.append(Spacer(1, 8))

    order_details = [
        ["Order number", f"#{order.order_number}"],
        ["Order date", order.created_at.strftime("%d %b %Y, %I:%M %p")],
        ["Customer", order.user.full_name or order.user.email],
        ["Email", order.user.email],
        ["Order type", order.get_order_type_display()],
        ["Payment status", order.get_payment_status_display()],
        ["Order status", order.get_status_display()],
    ]
    details_table = Table(order_details, colWidths=[40 * mm, 118 * mm])
    details_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(details_table)
    story.append(Spacer(1, 12))

    item_rows = [["Item", "Qty", "Unit", "Total"]]
    for item in order.items.all():
        name = item.product_name
        if item.variant_name:
            name = f"{name} ({item.variant_name})"
        item_rows.append([Paragraph(escape(name), styles["BodyText"]), str(item.quantity), _money(item.unit_price), _money(item.line_total)])

    items_table = Table(item_rows, colWidths=[88 * mm, 18 * mm, 26 * mm, 26 * mm], repeatRows=1)
    items_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#166534")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d1d5db")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(items_table)
    story.append(Spacer(1, 12))

    totals = [
        ["Subtotal", _money(order.subtotal)],
        ["Delivery fee", _money(order.delivery_fee)],
        ["Discount", f"-{_money(order.discount_amount)}"],
        ["Total paid", _money(order.total_amount)],
    ]
    totals_table = Table(totals, colWidths=[118 * mm, 40 * mm], hAlign="RIGHT")
    totals_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("LINEABOVE", (0, -1), (-1, -1), 0.5, colors.HexColor("#111827")),
                ("TOPPADDING", (0, -1), (-1, -1), 8),
            ]
        )
    )
    story.append(totals_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Delivery / Pickup", styles["Heading3"]))
    story.append(Paragraph(escape(_format_delivery_address(order)).replace("\n", "<br/>"), styles["BodyText"]))

    if order.notes:
        story.append(Spacer(1, 8))
        story.append(Paragraph("Customer notes", styles["Heading3"]))
        story.append(Paragraph(escape(order.notes), styles["BodyText"]))

    story.append(Spacer(1, 16))
    story.append(Paragraph("Thank you for shopping with Mary Kitchen.", styles["BodyText"]))

    doc.build(story)
    return buffer.getvalue()
