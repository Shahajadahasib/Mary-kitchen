"""Order creation and management service."""
import logging
from decimal import Decimal

import stripe
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from core.frontend_urls import order_path

from apps.cart.models import Cart
from apps.delivery.services import get_delivery_fee
from apps.products.models import Product, ProductVariant
from apps.users.models import Address

from .models import Order, OrderItem, OrderStatusHistory

logger = logging.getLogger(__name__)


def abandon_unpaid_pending_checkouts(user, channel: str = "grocery") -> None:
    """
    Remove stale unpaid checkout orders so the user can place a new one from the same cart
    without double stock deductions. Expires Stripe Checkout / cancels PaymentIntent when possible.

    Scoped to one ``channel``. A customer's account spans both storefronts, so
    an unscoped sweep would let a restaurant checkout expire the Stripe session
    of a grocery order the customer is still paying for (and silently restore
    its stock) — the two businesses must never abandon each other's drafts.
    """
    qs = Order.objects.filter(
        user=user,
        channel=channel,
        status="pending",
        payment_status__in=["unpaid", "failed"],
    )
    for order in qs:
        rollback_checkout_order(order)


def rollback_checkout_order(order: Order) -> None:
    """Expire Stripe Checkout if any, cancel PI, restore stock, delete the draft order."""
    stripe.api_key = settings.STRIPE_SECRET_KEY

    if order.stripe_checkout_session_id:
        try:
            stripe.checkout.Session.expire(order.stripe_checkout_session_id)
        except stripe.error.StripeError:
            pass

    if order.stripe_payment_intent_id:
        try:
            stripe.PaymentIntent.cancel(order.stripe_payment_intent_id)
        except stripe.error.StripeError:
            pass

    for item in order.items.select_related("product", "variant"):
        if item.was_out_of_stock or item.product_id is None:
            # Menu-item lines (restaurant channel) never deduct stock — nothing to restore.
            continue
        stock_obj: Product | ProductVariant = item.variant if item.variant_id else item.product
        stock_obj.stock_quantity += item.quantity
        stock_obj.save(update_fields=["stock_quantity"])
    order.delete()


@transaction.atomic
def create_order_from_cart(
    user, order_type: str, address_id=None, notes: str = "", session_id: str = "", channel: str = "grocery"
) -> Order:
    """
    Convert the user's (channel-scoped) cart into a confirmed Order.

    Grocery lines: reduce stock on in-stock items, flag out-of-stock items
    but still allow the order. Restaurant lines: no stock to deduct — a dish
    is simply excluded if it's gone off the menu (inactive) or 86'd today
    (unavailable) between add-to-cart and checkout.
    """
    cart = (
        Cart.objects.prefetch_related("items__product", "items__variant", "items__menu_item")
        .get(user=user, channel=channel)
    )

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

        if not (address.latitude and address.longitude):
            raise ValueError(
                "Delivery address must include a valid location. "
                "Please re-save your address using the address search so we can calculate your delivery fee."
            )

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
        channel=channel,
        order_type=order_type,
        delivery_address=delivery_address_snapshot,
        delivery_zone_name=zone_name,
        delivery_fee=delivery_fee,
        distance_km=distance_km,
        notes=notes,
        session_id=session_id or None,
        payment_status="unpaid",
        status="pending",
    )

    has_oos = False
    excluded_names = []

    for item in cart.items.select_related("product", "variant", "menu_item"):
        if item.menu_item_id:
            menu_item = item.menu_item

            # Skip dishes taken off the menu or 86'd since being added to the cart.
            if not menu_item.is_active or not menu_item.is_available:
                excluded_names.append(menu_item.name)
                continue

            from apps.menu.services import modifiers_label, modifiers_total

            unit_price = menu_item.base_price + modifiers_total(item.selected_modifiers)

            OrderItem.objects.create(
                order=order,
                menu_item=menu_item,
                selected_modifiers=item.selected_modifiers,
                product_name=menu_item.name,
                variant_name=modifiers_label(item.selected_modifiers),
                unit_price=unit_price,
                quantity=item.quantity,
                was_out_of_stock=False,
            )
            continue

        product = item.product
        variant = item.variant

        # Skip inactive or deleted products — never order unavailable items
        if not product.is_active or (variant and not variant.is_active):
            excluded_names.append(product.name)
            continue

        unit_price = variant.price if variant else product.base_price
        oos = False

        # Re-read the stock row under a row lock before checking it. The
        # prefetched copy above was loaded before this transaction began, so
        # two customers checking out the last unit at the same time would both
        # see it available and both decrement — overselling stock that a
        # grocery order cannot fulfil. SELECT ... FOR UPDATE makes the second
        # checkout wait here and then read the already-decremented value.
        if variant:
            stock_obj = ProductVariant.objects.select_for_update().get(pk=variant.pk)
        else:
            stock_obj = Product.objects.select_for_update().get(pk=product.pk)

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

    # If every item was excluded/inactive, abort and rollback
    if not order.items.exists():
        raise ValueError(
            "All items in your cart are currently unavailable. "
            "Please remove them and add available products."
        )

    order.has_out_of_stock_items = has_oos
    order.calculate_totals()

    note = "Order created"
    if excluded_names:
        note += f" ({len(excluded_names)} unavailable item(s) excluded: {', '.join(excluded_names)})"

    OrderStatusHistory.objects.create(
        order=order,
        from_status="",
        to_status="pending",
        note=note,
    )

    if has_oos:
        from apps.notifications.tasks import notify_admin_out_of_stock

        # Queued on commit, not here: this runs inside the checkout
        # transaction, so a worker that picks the task up first would look for
        # an order the database has not committed yet and fail with
        # DoesNotExist. Development never sees it (CELERY_TASK_ALWAYS_EAGER
        # runs the task inline); production has a real broker and does.
        order_id_str = str(order.id)
        transaction.on_commit(lambda: notify_admin_out_of_stock.delay(order_id_str))

    return order


TERMINAL_STATUSES = {"refunded", "cancelled"}

# Valid forward transitions per order type.
# "cancelled" is always reachable from any non-terminal status.
VALID_TRANSITIONS: dict[str, dict[str, list[str]]] = {
    "delivery": {
        "pending":          ["confirmed", "cancelled"],
        "confirmed":        ["processing", "cancelled"],
        "processing":       ["out_for_delivery", "cancelled"],
        "out_for_delivery": ["delivered", "cancelled"],
        "delivered":        [],
    },
    "pickup": {
        "pending":          ["confirmed", "cancelled"],
        "confirmed":        ["processing", "cancelled"],
        "processing":       ["ready_for_pickup", "cancelled"],
        "ready_for_pickup": ["delivered", "cancelled"],
        "delivered":        [],
    },
}


def allowed_next_statuses(order: Order) -> list[str]:
    """Return the statuses an order can legally move to from its current state."""
    if order.status in TERMINAL_STATUSES:
        return []
    transitions = VALID_TRANSITIONS.get(order.order_type, VALID_TRANSITIONS["delivery"])
    return transitions.get(order.status, [])


def update_order_status(order: Order, new_status: str, changed_by, note: str = "", force: bool = False) -> Order:
    """Update order status and record history.

    Set force=True to bypass the normal transition graph (admin override).
    Terminal statuses (refunded/cancelled) are always blocked regardless of force.
    """
    if order.status in TERMINAL_STATUSES:
        raise ValueError(
            f"Order is already '{order.status}' and cannot be updated further."
        )
    if not force:
        allowed = allowed_next_statuses(order)
        if new_status not in allowed:
            raise ValueError(
                f"Cannot move order from '{order.status}' to '{new_status}'. "
                f"Allowed next statuses: {', '.join(allowed) or 'none'}."
            )
    elif new_status == "refunded":
        raise ValueError("Status 'refunded' can only be set by the payment system.")

    old_status = order.status
    order.status = new_status

    if new_status == "delivered":
        order.delivered_at = timezone.now()
    elif new_status == "cancelled":
        order.cancelled_at = timezone.now()

    with transaction.atomic():
        order.save(update_fields=["status", "delivered_at", "cancelled_at"])
        OrderStatusHistory.objects.create(
            order=order,
            from_status=old_status,
            to_status=new_status,
            changed_by=changed_by,
            note=note,
        )

    from apps.notifications.models import Notification
    from apps.notifications.order_status_copy import (
        order_status_notification_message,
        order_status_notification_title,
    )

    try:
        Notification.objects.create(
            user=order.user,
            title=order_status_notification_title(new_status, order.order_type),
            message=order_status_notification_message(order.order_number, new_status, order.order_type),
            notification_type="order_update",
            action_url=order_path(order),
            metadata={"order_number": order.order_number, "status": new_status},
        )
    except Exception:
        logger.exception(
            "update_order_status: failed to create in-app notification for order %s",
            order.order_number,
        )

    try:
        from apps.notifications.tasks import send_order_status_update_email

        order_id_str = str(order.id)
        transaction.on_commit(
            lambda: send_order_status_update_email.delay(order_id_str, new_status)
        )
    except Exception:
        logger.exception(
            "update_order_status: failed to queue status email for order %s",
            order.order_number,
        )

    return order
