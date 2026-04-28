"""Delivery zone resolution and fee calculation."""
from decimal import Decimal

from django.conf import settings
from geopy.distance import geodesic

from .models import DeliveryZone


def calculate_distance_km(lat: float, lng: float) -> float:
    """Calculate distance in km from store to given coordinates."""
    store = (settings.STORE_LATITUDE, settings.STORE_LONGITUDE)
    destination = (lat, lng)
    return geodesic(store, destination).km


def get_delivery_fee(lat: float, lng: float, order_total: Decimal) -> dict:
    """
    Determine the applicable delivery zone and fee.
    Returns a dict with zone, fee, and is_free.
    """
    distance = calculate_distance_km(lat, lng)

    zone = (
        DeliveryZone.objects.filter(
            is_active=True,
            min_distance_km__lte=distance,
            max_distance_km__gte=distance,
        )
        .order_by("min_distance_km")
        .first()
    )

    if not zone:
        outermost = DeliveryZone.objects.filter(is_active=True).order_by("-max_distance_km").first()
        if outermost and outermost.outside_zone_behaviour == "deny":
            return {
                "available": False,
                "reason": "We currently don't deliver to this location.",
                "distance_km": round(distance, 2),
            }
        return {
            "available": True,
            "zone": None,
            "fee": Decimal("0.00"),
            "is_free": False,
            "distance_km": round(distance, 2),
            "estimated_days": 3,
        }

    is_free = bool(
        zone.free_delivery_threshold and order_total >= zone.free_delivery_threshold
    )
    fee = Decimal("0.00") if is_free else zone.delivery_fee

    return {
        "available": True,
        "zone": zone,
        "zone_id": str(zone.id),
        "zone_name": zone.name,
        "fee": fee,
        "is_free": is_free,
        "distance_km": round(distance, 2),
        "estimated_days": zone.estimated_delivery_days,
    }
