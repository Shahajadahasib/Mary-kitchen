"""Product reviews and ratings."""
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from core.mixins import BaseModel


class Review(BaseModel):
    """A user review for a purchased product."""
    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="reviews")
    product = models.ForeignKey("products.Product", on_delete=models.CASCADE, related_name="reviews")
    order = models.ForeignKey("orders.Order", on_delete=models.SET_NULL, null=True, blank=True)

    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    title = models.CharField(max_length=200, blank=True)
    body = models.TextField(blank=True)

    is_approved = models.BooleanField(default=False)
    is_flagged = models.BooleanField(default=False)
    admin_note = models.TextField(blank=True)

    helpful_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "reviews"
        unique_together = [("user", "product")]
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["product", "is_approved"])]

    def __str__(self):
        return f"{self.user.email} → {self.product.name} ({self.rating}★)"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.product.update_rating()
