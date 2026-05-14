"""Promotional banner model."""
from django.db import models

from core.mixins import BaseModel


class Banner(BaseModel):
    LOCATION_CHOICES = [
        ("hero", "Hero"),
        ("top", "Top Strip"),
        ("middle", "Middle Section"),
        ("bottom", "Bottom Section"),
    ]

    SIZE_CHOICES = [
        ("small", "Small"),
        ("medium", "Medium"),
        ("large", "Large"),
        ("extra_large", "Extra Large"),
    ]

    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=300, blank=True)
    image = models.ImageField(upload_to="banners/")
    link = models.CharField(max_length=500, blank=True, help_text="URL to navigate to when clicked")
    location = models.CharField(max_length=20, choices=LOCATION_CHOICES, default="hero", db_index=True)
    size = models.CharField(max_length=20, choices=SIZE_CHOICES, default="medium")
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "banners"
        ordering = ["location", "sort_order", "-created_at"]

    def __str__(self):
        return f"{self.title} ({self.location})"
