"""Order creation and management service."""
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.cart.models import Cart
from apps.delivery.services import get_delivery_fee
from apps.users.models import Address

from .models import Order, OrderItem, OrderStatusHistory


@transaction.atomic
def create_order_from_cart(user, order_type: str, address_id=None, notes: str = "") -> Order:
    """
    Convert the user's cart into a confirmed Order.
    Reduces stock on in-stock items.
    Flags out-of-stock items but still allows order.
    """
    cart = Cart.objects.prefetch_related("items__product", "items__variant").get(user=user)

    if not cart.items.exists():
        raise ValueError("Cannot checkout with an empty cart.")

    delivery_fee = Decimal("0.00")
    delivery_address_snapshot = None
    zone_name = ""
    distance_km = None

    if order_type == "delivery":
        if not address_id:
            raise ValueError("Delivery address is required for delivery orders.")
        try:
            address = Address.objects.get(id=address_id, user=user)
        except Address.DoesNotExist:
            raise ValueError("Address not found.")

        delivery_address_snapshot = {
            "label": address.label,
            "full_name": address.full_name,
            "phone": address.phone,
            "address_line1": address.address_line1,
            "address_line2": address.address_line2,
            "suburb": address.suburb,
            "state": address.state,
            "postcode": address.postcode,
            "country": address.country,
        }

        if address.latitude and address.longitude:
            subtotal_estimate = cart.subtotal
            fee_result = get_delivery_fee(
                float(address.latitude), float(address.longitude), subtotal_estimate
            )
            if not fee_result.get("available", True):
                raise ValueError(fee_result.get("reason", "Delivery not available to this address."))
            delivery_fee = fee_result.get("fee", Decimal("0.00"))
            zone_name = fee_result.get("zone_name", "")
            distance_km = fee_result.get("distance_km")

    order = Order.objects.create(
        user=user,
        order_type=order_type,
        delivery_address=delivery_address_snapshot,
        delivery_zone_name=zone_name,
        delivery_fee=delivery_fee,
        distance_km=distance_km,
        notes=notes,
        payment_status="unpaid",
        status="pending",
    )

    has_oos = False
    for item in cart.items.select_related("product", "variant"):
        product = item.product
        variant = item.variant
        unit_price = variant.price if variant else product.base_price
        oos = False

        stock_obj = variant if variant else product
        if stock_obj.stock_quantity >= item.quantity:
            stock_obj.stock_quantity -= item.quantity
            stock_obj.save(update_fields=["stock_quantity"])
        else:
            oos = True
            has_oos = True

        OrderItem.objects.create(
            order=order,
            product=product,
            variant=variant,
            product_name=product.name,
            variant_name=variant.name if variant else "",
            unit_price=unit_price,
            quantity=item.quantity,
            was_out_of_stock=oos,
        )

    order.has_out_of_stock_items = has_oos
    order.calculate_totals()

    cart.clear()

    OrderStatusHistory.objects.create(
        order=order,
        from_status="",
        to_status="pending",
        note="Order created",
    )

    if has_oos:
        from apps.notifications.tasks import notify_admin_out_of_stock
        notify_admin_out_of_stock.delay(str(order.id))

    return order


def update_order_status(order: Order, new_status: str, changed_by, note: str = "") -> Order:
    """Update order status and record history."""
    old_status = order.status
    order.status = new_status

    if new_status == "delivered":
        order.delivered_at = timezone.now()
    elif new_status == "cancelled":
        order.cancelled_at = timezone.now()

    order.save(update_fields=["status", "delivered_at", "cancelled_at"])

    OrderStatusHistory.objects.create(
        order=order,
        from_status=old_status,
        to_status=new_status,
        changed_by=changed_by,
        note=note,
    )

    from apps.notifications.tasks import send_order_status_update_email
    send_order_status_update_email.delay(str(order.id), new_status)

    return order
