from rest_framework import serializers
from .models import DeliveryZone


class DeliveryZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryZone
        fields = [
            "id", "name", "description", "min_distance_km", "max_distance_km",
            "delivery_fee", "free_delivery_threshold", "estimated_delivery_days",
            "is_active", "outside_zone_behaviour", "sort_order",
        ]


class DeliveryFeeRequestSerializer(serializers.Serializer):
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    order_total = serializers.DecimalField(max_digits=10, decimal_places=2)
