"""Stripe payment service."""
import stripe
from decimal import Decimal
from django.conf import settings

from apps.orders.models import Order
from .models import Payment

stripe.api_key = settings.STRIPE_SECRET_KEY


def create_payment_intent(order: Order) -> dict:
    """Create a Stripe PaymentIntent for an order."""
    amount_cents = int(order.total_amount * 100)

    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency="aud",
        metadata={
            "order_number": order.order_number,
            "order_id": str(order.id),
            "user_email": order.user.email,
        },
        description=f"Mary Kitchen order #{order.order_number}",
    )

    payment = Payment.objects.create(
        order=order,
        user=order.user,
        amount=order.total_amount,
        currency="AUD",
        status="pending",
        stripe_payment_intent_id=intent.id,
        stripe_client_secret=intent.client_secret,
    )

    order.stripe_payment_intent_id = intent.id
    order.save(update_fields=["stripe_payment_intent_id"])

    return {
        "payment_intent_id": intent.id,
        "client_secret": intent.client_secret,
        "amount": order.total_amount,
        "currency": "AUD",
        "payment_id": str(payment.id),
    }


def handle_payment_success(payment_intent_id: str) -> Payment:
    """Mark payment and order as paid."""
    payment = Payment.objects.select_related("order").get(
        stripe_payment_intent_id=payment_intent_id
    )
    payment.status = "succeeded"
    payment.save(update_fields=["status"])

    order = payment.order
    order.payment_status = "paid"
    order.status = "confirmed"
    order.save(update_fields=["payment_status", "status"])

    from apps.orders.models import OrderStatusHistory
    OrderStatusHistory.objects.create(
        order=order,
        from_status="pending",
        to_status="confirmed",
        note="Payment received via Stripe",
    )

    from apps.notifications.tasks import send_order_confirmation_email
    send_order_confirmation_email.delay(str(order.id))

    return payment


def handle_payment_failure(payment_intent_id: str, failure_message: str = "") -> Payment:
    """Mark payment as failed."""
    try:
        payment = Payment.objects.get(stripe_payment_intent_id=payment_intent_id)
        payment.status = "failed"
        payment.failure_message = failure_message
        payment.save(update_fields=["status", "failure_message"])

        payment.order.payment_status = "failed"
        payment.order.save(update_fields=["payment_status"])
        return payment
    except Payment.DoesNotExist:
        pass


def refund_payment(order: Order, reason: str = "") -> dict:
    """Initiate a Stripe refund."""
    payment = order.payments.filter(status="succeeded").last()
    if not payment:
        raise ValueError("No successful payment found for this order.")

    refund = stripe.Refund.create(
        payment_intent=payment.stripe_payment_intent_id,
        reason="requested_by_customer",
        metadata={"order_number": order.order_number, "reason": reason},
    )

    payment.status = "refunded"
    payment.save(update_fields=["status"])

    order.payment_status = "refunded"
    order.save(update_fields=["payment_status"])

    return {"refund_id": refund.id, "status": refund.status}
