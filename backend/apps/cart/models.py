"""Persistent cart backed by the database.

One cart per (user, channel) — a customer can hold an active grocery cart
and an active restaurant cart at the same time. ``channel`` was added
alongside the Mary Ben's Kitchen Restaurant expansion; existing carts were
backfilled to ``"grocery"`` (see migration 0003).
"""
from decimal import Decimal

from django.db import models

from core.mixins import BaseModel


class Cart(BaseModel):
    """One active cart per (user, channel)."""
    CHANNEL_CHOICES = [
        ("grocery", "Grocery"),
        ("restaurant", "Restaurant"),
    ]

    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="carts")
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default="grocery")

    class Meta:
        db_table = "carts"
        unique_together = [("user", "channel")]

    def __str__(self):
        return f"{self.get_channel_display()} cart of {self.user.email}"

    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())

    @property
    def subtotal(self):
        return sum(item.line_total for item in self.items.all())

    def clear(self):
        self.items.all().delete()


class CartItem(BaseModel):
    """A single line in a cart — either a grocery product/variant, or a
    restaurant menu item with a snapshot of its selected modifiers."""
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("products.Product", on_delete=models.CASCADE, null=True, blank=True)
    variant = models.ForeignKey(
        "products.ProductVariant", on_delete=models.SET_NULL, null=True, blank=True
    )
    menu_item = models.ForeignKey(
        "menu.MenuItem", on_delete=models.CASCADE, null=True, blank=True, related_name="cart_items"
    )
    selected_modifiers = models.JSONField(
        default=list, blank=True,
        help_text="Snapshot: [{modifier_id, group, name, price_delta}, ...] — menu items only",
    )
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "cart_items"
        unique_together = [("cart", "product", "variant")]

    def __str__(self):
        if self.menu_item_id:
            from apps.menu.services import modifiers_label
            extra = modifiers_label(self.selected_modifiers)
            suffix = f" ({extra})" if extra else ""
            return f"{self.menu_item.name}{suffix} × {self.quantity}"
        variant_label = f" ({self.variant.name})" if self.variant else ""
        return f"{self.product.name}{variant_label} × {self.quantity}"

    @property
    def unit_price(self):
        if self.menu_item_id:
            from apps.menu.services import modifiers_total
            return self.menu_item.base_price + modifiers_total(self.selected_modifiers)
        if self.variant:
            return self.variant.price
        return self.product.base_price

    @property
    def line_total(self):
        return self.unit_price * Decimal(self.quantity)
