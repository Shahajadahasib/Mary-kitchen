"""Business logic for user operations."""
import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import OTPCode, User

logger = logging.getLogger(__name__)


def send_otp(email: str, purpose: str) -> OTPCode:
    """Generate, save and dispatch an OTP for the given email/purpose."""
    OTPCode.objects.filter(email=email, purpose=purpose, is_used=False).update(is_used=True)

    code = OTPCode.generate_code(length=settings.OTP_LENGTH)
    expiry = timezone.now() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    otp = OTPCode.objects.create(
        email=email,
        code=code,
        purpose=purpose,
        expires_at=expiry,
    )

    try:
        user = User.objects.get(email=email)
        otp.user = user
        otp.save(update_fields=["user"])
    except User.DoesNotExist:
        pass

    from apps.notifications.tasks import send_otp_email

    try:
        send_otp_email.delay(email=email, code=code, purpose=purpose)
    except Exception:
        otp.delete()
        logger.exception("send_otp: could not dispatch OTP email for %s purpose=%s", email, purpose)
        raise

    return otp


def verify_otp(email: str, code: str, purpose: str) -> tuple[bool, str]:
    """Verify an OTP code. Returns (success, message)."""
    try:
        otp = OTPCode.objects.get(email=email, purpose=purpose, is_used=False)
    except OTPCode.DoesNotExist:
        return False, "No active OTP found for this email."
    except OTPCode.MultipleObjectsReturned:
        otp = OTPCode.objects.filter(email=email, purpose=purpose, is_used=False).latest("created_at")

    otp.attempts += 1
    otp.save(update_fields=["attempts"])

    if otp.attempts > 5:
        return False, "Too many attempts. Please request a new OTP."

    if otp.is_expired:
        return False, "OTP has expired. Please request a new one."

    if otp.code != code:
        return False, "Invalid OTP code."

    otp.is_used = True
    otp.save(update_fields=["is_used"])
    return True, "OTP verified successfully."
