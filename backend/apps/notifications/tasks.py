"""Celery tasks for sending notifications."""
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


@shared_task(bind=True, max_retries=3)
def send_otp_email(self, email: str, code: str, purpose: str):
    """Send OTP code to email."""
    purpose_labels = {
        "email_verify": "Email Verification",
        "password_reset": "Password Reset",
        "otp_login": "Login",
        "phone_verify": "Phone Verification",
    }
    label = purpose_labels.get(purpose, "Verification")
    try:
        send_mail(
            subject=f"Mary Kitchen – Your {label} Code",
            message=f"Your {label} code is: {code}\n\nThis code expires in {settings.OTP_EXPIRY_MINUTES} minutes.\n\nDo not share this code with anyone.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def send_order_confirmation_email(self, order_id: str):
    """Send order confirmation to customer."""
    try:
        from apps.orders.models import Order
        from apps.notifications.models import Notification
        order = Order.objects.select_related("user").get(id=order_id)
        user = order.user

        send_mail(
            subject=f"Mary Kitchen – Order #{order.order_number} Confirmed!",
            message=(
                f"Hi {user.first_name},\n\n"
                f"Your order #{order.order_number} has been confirmed and is being processed.\n\n"
                f"Order Total: ${order.total_amount}\n"
                f"Order Type: {order.get_order_type_display()}\n\n"
                f"You can track your order at: {settings.FRONTEND_URL}/orders/{order.order_number}\n\n"
                f"Thank you for shopping with Mary Kitchen!\n"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        Notification.objects.create(
            user=user,
            title="Order Confirmed",
            message=f"Your order #{order.order_number} has been confirmed!",
            notification_type="order_update",
            action_url=f"/orders/{order.order_number}",
            metadata={"order_number": order.order_number},
        )
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def send_order_status_update_email(self, order_id: str, new_status: str):
    """Notify customer of order status change."""
    try:
        from apps.orders.models import Order
        from apps.notifications.models import Notification

        order = Order.objects.select_related("user").get(id=order_id)
        user = order.user

        status_messages = {
            "processing": "is being processed",
            "out_for_delivery": "is out for delivery",
            "delivered": "has been delivered",
            "cancelled": "has been cancelled",
        }
        msg = status_messages.get(new_status, f"status updated to {new_status}")

        send_mail(
            subject=f"Mary Kitchen – Order #{order.order_number} Update",
            message=(
                f"Hi {user.first_name},\n\n"
                f"Your order #{order.order_number} {msg}.\n\n"
                f"Track your order: {settings.FRONTEND_URL}/orders/{order.order_number}\n\n"
                f"Thank you,\nMary Kitchen Team\n"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        Notification.objects.create(
            user=user,
            title=f"Order {new_status.replace('_', ' ').title()}",
            message=f"Your order #{order.order_number} {msg}.",
            notification_type="order_update",
            action_url=f"/orders/{order.order_number}",
            metadata={"order_number": order.order_number, "status": new_status},
        )
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def notify_admin_out_of_stock(self, order_id: str):
    """Alert admin when an order contains out-of-stock items."""
    try:
        from apps.orders.models import Order
        from django.contrib.auth import get_user_model
        User = get_user_model()

        order = Order.objects.select_related("user").prefetch_related("items").get(id=order_id)
        oos_items = order.items.filter(was_out_of_stock=True)

        items_text = "\n".join([f"  - {item.product_name} × {item.quantity}" for item in oos_items])

        admin_emails = list(User.objects.filter(is_staff=True).values_list("email", flat=True))
        if not admin_emails:
            return

        send_mail(
            subject=f"⚠️ Out-of-Stock Order Alert – #{order.order_number}",
            message=(
                f"Order #{order.order_number} by {order.user.email} contains out-of-stock items:\n\n"
                f"{items_text}\n\n"
                f"Please review the order in the admin panel.\n"
                f"Order total: ${order.total_amount}\n"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=admin_emails,
            fail_silently=False,
        )

        order.admin_notified_out_of_stock = True
        order.save(update_fields=["admin_notified_out_of_stock"])
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@shared_task
def send_sms_placeholder(phone_number: str, message: str):
    """
    SMS sending placeholder.
    Replace with actual Twilio implementation when credentials are set.
    """
    from django.conf import settings
    if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_FROM_NUMBER]):
        print(f"[SMS PLACEHOLDER] To: {phone_number} | Message: {message}")
        return

    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=message,
            from_=settings.TWILIO_FROM_NUMBER,
            to=phone_number,
        )
    except Exception as e:
        print(f"[SMS ERROR] {e}")
