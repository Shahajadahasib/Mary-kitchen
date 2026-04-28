from django.contrib import admin
from .models import DeliveryZone

@admin.register(DeliveryZone)
class DeliveryZoneAdmin(admin.ModelAdmin):
    list_display = ["name", "min_distance_km", "max_distance_km", "delivery_fee", "is_active"]
