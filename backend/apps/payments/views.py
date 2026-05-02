"""Payment views – Stripe integration."""
import stripe
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import ADMIN_API_PERMISSION_CLASSES
from apps.orders.models import Order

from .models import Payment
from .serializers import PaymentSerializer
from .services import (
    create_checkout_session,
    handle_checkout_session_paid,
    handle_payment_failure,
    handle_payment_success,
    refund_payment,
)


class CreatePaymentIntentView(APIView):
    """POST /api/v1/payments/create-intent/ — create a new Stripe Checkout Session for an unpaid order."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_number = request.data.get("order_number")
        if not order_number:
            return Response({"success": False, "message": "order_number is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(order_number=order_number, user=request.user)
        except Order.DoesNotExist:
            return Response({"success": False, "message": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        if order.payment_status == "paid":
            return Response({"success": False, "message": "Order is already paid."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = create_checkout_session(order)
            return Response({"success": True, "data": result})
        except stripe.error.StripeError as e:
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CheckoutSessionVerifyView(APIView):
    """GET /api/v1/payments/checkout-session/?session_id= — after Stripe-hosted Checkout redirect."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        session_id = request.query_params.get("session_id")
        if not session_id:
            return Response(
                {"success": False, "message": "session_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except stripe.error.StripeError as e:
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if session.get("payment_status") != "paid":
            return Response(
                {"success": False, "message": "Checkout session is not paid yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        meta = session.get("metadata") or {}
        order_id = meta.get("order_id")
        order_number = meta.get("order_number") or session.get("client_reference_id")
        if not order_id and not order_number:
            return Response(
                {"success": False, "message": "Session has no order metadata."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if order_id:
                order = Order.objects.get(id=order_id, user=request.user)
            else:
                order = Order.objects.get(order_number=order_number, user=request.user)
        except Order.DoesNotExist:
            return Response(
                {"success": False, "message": "Order not found for this session."},
                status=status.HTTP_404_NOT_FOUND,
            )

        handle_checkout_session_paid(session)
        order.refresh_from_db()

        return Response(
            {
                "success": True,
                "data": {
                    "order_number": order.order_number,
                    "payment_status": order.payment_status,
                    "stripe_payment_status": session.get("payment_status"),
                },
            }
        )


class PaymentWebhookView(APIView):
    """POST /api/v1/payments/webhook/ – Stripe webhook handler."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except (ValueError, stripe.error.SignatureVerificationError):
            return Response(status=status.HTTP_400_BAD_REQUEST)

        event_type = event["type"]
        obj = event["data"]["object"]

        if event_type == "checkout.session.completed":
            handle_checkout_session_paid(obj)
        elif event_type == "payment_intent.succeeded":
            pi_id = obj.get("id")
            if pi_id:
                handle_payment_success(pi_id)
        elif event_type in ("payment_intent.payment_failed", "payment_intent.canceled"):
            pi_id = obj.get("id")
            if pi_id:
                failure_msg = obj.get("last_payment_error", {}) or {}
                if isinstance(failure_msg, dict):
                    failure_msg = failure_msg.get("message", "")
                handle_payment_failure(pi_id, failure_msg or "")

        return Response({"received": True})


class PaymentListView(APIView):
    """GET /api/v1/payments/ – user's payment history."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = Payment.objects.filter(user=request.user).order_by("-created_at")
        serializer = PaymentSerializer(payments, many=True)
        return Response({"success": True, "data": serializer.data})


class RefundView(APIView):
    """POST /api/v1/payments/refund/ – admin-initiated refund."""
    permission_classes = ADMIN_API_PERMISSION_CLASSES

    def post(self, request):
        order_number = request.data.get("order_number")
        reason = request.data.get("reason", "")
        try:
            order = Order.objects.get(order_number=order_number)
            result = refund_payment(order, reason)
            return Response({"success": True, "data": result})
        except (Order.DoesNotExist, ValueError) as e:
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.StripeError as e:
            return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
