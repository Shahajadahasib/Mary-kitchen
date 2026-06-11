"""Celery tasks for sending notifications."""
import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMessage, EmailMultiAlternatives, send_mail

from apps.notifications.order_status_copy import order_status_body_fragment
from apps.notifications.order_slip_pdf import build_order_slip_pdf

logger = logging.getLogger(__name__)


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
    expiry = settings.OTP_EXPIRY_MINUTES

    plain_text = (
        f"Your Mary Kitchen {label} code is: {code}\n\n"
        f"This code expires in {expiry} minutes.\n"
        "Do not share this code with anyone.\n\n"
        "If you did not request this, you can safely ignore this email."
    )

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px;">
      <h2 style="color:#1a5276;margin:0 0 8px;">Mary Kitchen</h2>
      <p style="color:#555;margin:0 0 24px;font-size:15px;">Your {label} code</p>
      <div style="background:#fff;border-radius:10px;padding:24px;text-align:center;border:1px solid #e5e7eb;">
        <p style="margin:0 0 8px;color:#555;font-size:14px;">Use this code to continue:</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#1a5276;padding:12px 0;">{code}</div>
        <p style="margin:12px 0 0;color:#999;font-size:12px;">Expires in {expiry} minutes &nbsp;·&nbsp; Do not share this code</p>
      </div>
      <p style="color:#aaa;font-size:12px;margin:20px 0 0;text-align:center;">
        If you did not request this code, you can safely ignore this email.
      </p>
    </div>
    """

    try:
        msg = EmailMultiAlternatives(
            subject=f"Mary Kitchen – Your {label} Code",
            body=plain_text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )
        msg.attach_alternative(html, "text/html")
        msg.send(fail_silently=False)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def send_order_confirmation_email(self, order_id: str):
    """Send order confirmation email with PDF slip to customer."""
    try:
        from apps.orders.models import Order
        from apps.notifications.models import Notification

        order = Order.objects.select_related("user").prefetch_related("items").get(id=order_id)
        user = order.user

        Notification.objects.get_or_create(
            user=user,
            notification_type="order_update",
            action_url=f"/orders/{order.order_number}",
            defaults=dict(
                title="Order placed successfully",
                message=f"Your order #{order.order_number} was placed and payment received.",
                metadata={"order_number": order.order_number},
            ),
        )

        message = (
            f"Hi {user.first_name},\n\n"
            f"Your order #{order.order_number} has been confirmed and is being processed.\n\n"
            f"Order Total: ${order.total_amount}\n"
            f"Order Type: {order.get_order_type_display()}\n\n"
            "Your order slip is attached as a PDF.\n\n"
            f"You can track your order at: {settings.FRONTEND_URL}/orders/{order.order_number}\n\n"
            "Thank you for shopping with Mary Kitchen!\n"
        )
        email = EmailMessage(
            subject=f"Mary Kitchen – Order #{order.order_number} Confirmed!",
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        email.attach(
            filename=f"order-{order.order_number}.pdf",
            content=build_order_slip_pdf(order),
            mimetype="application/pdf",
        )
        email.send(fail_silently=False)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@shared_task
def send_order_status_update_email(order_id: str, new_status: str):
    """Send email for order status change (in-app notification is created in update_order_status).

    Best-effort only: must not raise into the request path when CELERY_TASK_ALWAYS_EAGER /
    CELERY_TASK_EAGER_PROPAGATES is enabled (would return 500 after the order row is already saved).
    """
    try:
        from apps.orders.models import Order

        order = Order.objects.select_related("user").get(id=order_id)
        user = order.user
        msg = order_status_body_fragment(new_status, order.order_type)

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
    except Exception:
        logger.exception(
            "send_order_status_update_email failed order_id=%s new_status=%s",
            order_id,
            new_status,
        )


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

@shared_task(bind=True, max_retries=3)
def notify_admin_new_order(self, order_id: str):
    """Send email notification to all admin/staff when a new order is placed."""
    try:
        from apps.orders.models import Order
        from django.contrib.auth import get_user_model
        User = get_user_model()

        order = Order.objects.select_related("user").prefetch_related("items").get(id=order_id)

        admin_emails = list(User.objects.filter(
            is_staff=True, is_active=True
        ).values_list("email", flat=True))

        if not admin_emails:
            logger.warning("notify_admin_new_order: no admin emails found")
            return

        items_text = "\n".join([
            f"  - {item.product_name} × {item.quantity}  (${item.line_total})"
            for item in order.items.all()
        ])

        order_url = f"{settings.FRONTEND_URL}/admin/orders?order={order.order_number}"

        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px;">
          <h2 style="color:#1a5276;margin:0 0 4px;">🛒 New Order Received</h2>
          <p style="color:#555;margin:0 0 24px;font-size:14px;">A customer just placed an order on Mary Kitchen.</p>

          <div style="background:#fff;border-radius:10px;padding:20px;border:1px solid #e5e7eb;margin-bottom:16px;">
            <table style="width:100%;font-size:14px;color:#444;">
              <tr><td style="padding:4px 0;color:#888;width:140px;">Order Number</td><td style="font-weight:bold;color:#1a5276;">#{order.order_number}</td></tr>
              <tr><td style="padding:4px 0;color:#888;">Customer</td><td>{order.user.full_name} ({order.user.email})</td></tr>
              <tr><td style="padding:4px 0;color:#888;">Order Type</td><td style="text-transform:capitalize;">{order.order_type}</td></tr>
              <tr><td style="padding:4px 0;color:#888;">Payment</td><td>{order.payment_status}</td></tr>
              <tr><td style="padding:4px 0;color:#888;">Order Total</td><td style="font-weight:bold;font-size:16px;color:#16a34a;">${order.total_amount}</td></tr>
            </table>
          </div>

          <div style="background:#fff;border-radius:10px;padding:20px;border:1px solid #e5e7eb;margin-bottom:20px;">
            <p style="font-weight:bold;margin:0 0 10px;color:#333;">Items Ordered:</p>
            <pre style="margin:0;font-size:13px;color:#555;white-space:pre-wrap;">{items_text}</pre>
          </div>

          <a href="{order_url}" style="display:inline-block;background:#1a5276;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">
            View Order in Admin Panel →
          </a>

          <p style="color:#aaa;font-size:12px;margin:20px 0 0;">
            This is an automated notification from Mary Kitchen.
          </p>
        </div>
        """

        plain = (
            f"New Order Received – #{order.order_number}\n\n"
            f"Customer: {order.user.full_name} ({order.user.email})\n"
            f"Type: {order.order_type}\n"
            f"Total: ${order.total_amount}\n"
            f"Payment: {order.payment_status}\n\n"
            f"Items:\n{items_text}\n\n"
            f"View order: {order_url}\n"
        )

        msg = EmailMultiAlternatives(
            subject=f"🛒 New Order #{order.order_number} – ${order.total_amount}",
            body=plain,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=admin_emails,
        )
        msg.attach_alternative(html, "text/html")
        msg.send(fail_silently=False)

        logger.info("notify_admin_new_order: sent to %s for order %s", admin_emails, order.order_number)

    except Exception as exc:
        logger.exception("notify_admin_new_order failed for order_id=%s", order_id)
        raise self.retry(exc=exc, countdown=60)