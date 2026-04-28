"""Persistent cart backed by the database."""
from decimal import Decimal

from django.db import models

from core.mixins import BaseModel


class Cart(BaseModel):
    """One active cart per user."""
    user = models.OneToOneField("users.User", on_delete=models.CASCADE, related_name="cart")

    class Meta:
        db_table = "carts"

    def __str__(self):
        return f"Cart of {self.user.email}"

    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())

    @property
    def subtotal(self):
        return sum(item.line_total for item in self.items.all())

    def clear(self):
        self.items.all().delete()


class CartItem(BaseModel):
    """A single product (with optional variant) in a cart."""
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("products.Product", on_delete=models.CASCADE)
    variant = models.ForeignKey(
        "products.ProductVariant", on_delete=models.SET_NULL, null=True, blank=True
    )
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "cart_items"
        unique_together = [("cart", "product", "variant")]

    def __str__(self):
        variant_label = f" ({self.variant.name})" if self.variant else ""
        return f"{self.product.name}{variant_label} × {self.quantity}"

    @property
    def unit_price(self):
        if self.variant:
            return self.variant.price
        return self.product.base_price

    @property
    def line_total(self):
        return self.unit_price * Decimal(self.quantity)
