"""Shared customer-facing phrases for order status emails and in-app notifications."""


def order_status_body_fragment(new_status: str, order_type: str = "delivery") -> str:
    """Phrase used after 'Your order #…' in messages."""
    is_pickup = order_type == "pickup"
    phrases = {
        "pending": "is pending",
        "confirmed": "has been confirmed",
        "processing": "is being processed",
        "out_for_delivery": "is out for delivery",
        "ready_for_pickup": "is ready for pickup — please come collect it",
        "delivered": "has been picked up" if is_pickup else "has been delivered",
        "cancelled": "has been cancelled",
        "refunded": "has been refunded",
    }
    return phrases.get(new_status, f"status updated to {new_status.replace('_', ' ')}")


def order_status_notification_title(new_status: str, order_type: str = "delivery") -> str:
    if new_status == "ready_for_pickup":
        return "Order Ready for Pickup"
    if new_status == "delivered" and order_type == "pickup":
        return "Order Picked Up"
    return f"Order {new_status.replace('_', ' ').title()}"


def order_status_notification_message(order_number: str, new_status: str, order_type: str = "delivery") -> str:
    frag = order_status_body_fragment(new_status, order_type)
    return f"Your order #{order_number} {frag}."
