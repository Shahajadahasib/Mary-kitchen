"""Shared customer-facing phrases for order status emails and in-app notifications."""


def order_status_body_fragment(new_status: str) -> str:
    """Phrase used after 'Your order #…' in messages."""
    phrases = {
        "pending": "is pending",
        "confirmed": "has been confirmed",
        "processing": "is being processed",
        "out_for_delivery": "is out for delivery",
        "delivered": "has been delivered",
        "cancelled": "has been cancelled",
        "refunded": "has been refunded",
    }
    return phrases.get(new_status, f"status updated to {new_status.replace('_', ' ')}")


def order_status_notification_title(new_status: str) -> str:
    return f"Order {new_status.replace('_', ' ').title()}"


def order_status_notification_message(order_number: str, new_status: str) -> str:
    frag = order_status_body_fragment(new_status)
    return f"Your order #{order_number} {frag}."
