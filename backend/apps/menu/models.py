"""Restaurant menu domain: categories, dishes, and per-dish modifier groups.

Deliberately parallel to ``apps.products`` rather than reusing it — see
``MenuConfig`` docstring. Every model still inherits the shared ``BaseModel``
(UUID PK + timestamps), same convention as the rest of the codebase.
"""
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.text import slugify

from core.mixins import BaseModel


class MenuCategory(BaseModel):
    """A menu section, e.g. Starters, Mains, Drinks."""
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=220)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="menu/categories/", blank=True, null=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "menu_categories"
        verbose_name_plural = "Menu categories"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class MenuItem(BaseModel):
    """A single dish available on the restaurant menu."""
    category = models.ForeignKey(MenuCategory, on_delete=models.PROTECT, related_name="items")
    name = models.CharField(max_length=300, db_index=True)
    slug = models.SlugField(unique=True, max_length=340)
    description = models.TextField(blank=True)

    base_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])

    is_active = models.BooleanField(default=True, db_index=True, help_text="Permanently on/off the menu")
    is_available = models.BooleanField(
        default=True, db_index=True, help_text="Today's 86 list — off without removing the dish"
    )
    is_featured = models.BooleanField(default=False)

    dietary_tags = models.JSONField(
        default=list, blank=True,
        help_text="e.g. vegan, vegetarian, gluten_free, halal, contains_nuts, spicy",
    )
    prep_time_minutes = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        db_table = "menu_items"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["category", "is_active", "is_available"]),
            models.Index(fields=["is_featured", "is_active"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while MenuItem.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def is_orderable(self):
        return self.is_active and self.is_available


class MenuItemImage(BaseModel):
    """Multiple photos per dish — mirrors ``products.ProductImage``."""
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="menu/items/")
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "menu_item_images"
        ordering = ["-is_primary", "sort_order"]

    def save(self, *args, **kwargs):
        if self.is_primary:
            MenuItemImage.objects.filter(menu_item=self.menu_item, is_primary=True).exclude(
                pk=self.pk
            ).update(is_primary=False)
        super().save(*args, **kwargs)


class ModifierGroup(BaseModel):
    """A choice group on a dish, e.g. 'Choose your size' or 'Add extras'."""
    SELECTION_CHOICES = [
        ("single", "Single choice"),
        ("multiple", "Multiple choice"),
    ]

    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name="modifier_groups")
    name = models.CharField(max_length=150)
    selection_type = models.CharField(max_length=10, choices=SELECTION_CHOICES, default="single")
    is_required = models.BooleanField(default=False)
    min_select = models.PositiveSmallIntegerField(default=0)
    max_select = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text="Blank = unlimited (selection_type=multiple only)"
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "menu_modifier_groups"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return f"{self.menu_item.name} → {self.name}"

    def clean_selection_bounds(self):
        """Normalise single-choice bounds; called from serializer validation."""
        if self.selection_type == "single":
            self.max_select = 1
            if self.is_required:
                self.min_select = 1


class Modifier(BaseModel):
    """One selectable option within a ``ModifierGroup``, e.g. 'Large' (+$2.00)."""
    group = models.ForeignKey(ModifierGroup, on_delete=models.CASCADE, related_name="options")
    name = models.CharField(max_length=150)
    price_delta = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    is_default = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "menu_modifiers"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return f"{self.group.name}: {self.name}"
