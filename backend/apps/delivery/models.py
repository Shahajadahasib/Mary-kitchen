"""Delivery zones and fee configuration."""
from django.db import models
from core.mixins import BaseModel


class DeliveryZone(BaseModel):
    """Admin-defined delivery zones with configurable fees."""
    BEHAVIOUR_CHOICES = [
        ("allow", "Allow delivery with extra charge"),
        ("deny", "Deny delivery outside zone"),
        ("contact", "Contact customer for quote"),
    ]

    name = models.CharField(max_length=200, help_text="e.g. Darwin CBD, Palmerston")
    description = models.TextField(blank=True)
    min_distance_km = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    max_distance_km = models.DecimalField(max_digits=6, decimal_places=2, help_text="Max radius in km")
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2)
    free_delivery_threshold = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Order total above which delivery is free"
    )
    estimated_delivery_days = models.PositiveSmallIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    outside_zone_behaviour = models.CharField(
        max_length=10, choices=BEHAVIOUR_CHOICES, default="deny"
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "delivery_zones"
        ordering = ["sort_order", "min_distance_km"]

    def __str__(self):
        return f"{self.name} (0–{self.max_distance_km} km) – ${self.delivery_fee}"
