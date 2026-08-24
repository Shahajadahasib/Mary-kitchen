"""Object builders shared by the app test suites.

Every model here extends ``BaseModel`` (UUID PK), and most carry unique slugs
or SKUs, so tests that build several of the same kind of object collide unless
the identifiers vary. Each factory therefore takes a counter-backed default —
callers only pass the fields the assertion actually cares about.
"""
from decimal import Decimal
from itertools import count

from apps.delivery.models import DeliveryZone
from apps.menu.models import MenuCategory, MenuItem, Modifier, ModifierGroup
from apps.products.models import Category, Product, ProductVariant
from apps.users.models import Address, User

_seq = count(1)


def make_user(**kwargs):
    n = next(_seq)
    kwargs.setdefault("email", f"user{n}@example.com")
    kwargs.setdefault("first_name", "Test")
    kwargs.setdefault("last_name", f"User{n}")
    password = kwargs.pop("password", "test-pass-12345")
    return User.objects.create_user(password=password, **kwargs)


def make_admin(**kwargs):
    kwargs.setdefault("is_staff", True)
    return make_user(**kwargs)


def make_address(user, **kwargs):
    n = next(_seq)
    kwargs.setdefault("full_name", user.full_name)
    kwargs.setdefault("address_line1", f"{n} Mitchell Street")
    kwargs.setdefault("suburb", "Darwin City")
    kwargs.setdefault("state", "NT")
    kwargs.setdefault("postcode", "0800")
    # Darwin CBD — a few hundred metres from the store coordinates in settings,
    # so this address lands inside the innermost delivery zone.
    kwargs.setdefault("latitude", Decimal("-12.4634"))
    kwargs.setdefault("longitude", Decimal("130.8456"))
    return Address.objects.create(user=user, **kwargs)


# ─── Grocery catalogue ───────────────────────────────────────────────────────

def make_category(**kwargs):
    n = next(_seq)
    kwargs.setdefault("name", f"Category {n}")
    kwargs.setdefault("slug", f"category-{n}")
    return Category.objects.create(**kwargs)


def make_product(category=None, **kwargs):
    n = next(_seq)
    kwargs.setdefault("name", f"Product {n}")
    kwargs.setdefault("slug", f"product-{n}")
    kwargs.setdefault("base_price", Decimal("10.00"))
    kwargs.setdefault("stock_quantity", 100)
    kwargs.setdefault("sku", f"SKU-{n}")
    return Product.objects.create(category=category or make_category(), **kwargs)


def make_variant(product, **kwargs):
    n = next(_seq)
    kwargs.setdefault("name", f"Variant {n}")
    kwargs.setdefault("sku", f"VAR-{n}")
    kwargs.setdefault("price", Decimal("15.00"))
    kwargs.setdefault("stock_quantity", 50)
    return ProductVariant.objects.create(product=product, **kwargs)


# ─── Restaurant catalogue ────────────────────────────────────────────────────

def make_menu_category(**kwargs):
    n = next(_seq)
    kwargs.setdefault("name", f"Menu Category {n}")
    kwargs.setdefault("slug", f"menu-category-{n}")
    return MenuCategory.objects.create(**kwargs)


def make_menu_item(category=None, **kwargs):
    n = next(_seq)
    kwargs.setdefault("name", f"Dish {n}")
    kwargs.setdefault("slug", f"dish-{n}")
    kwargs.setdefault("base_price", Decimal("20.00"))
    return MenuItem.objects.create(category=category or make_menu_category(), **kwargs)


def make_modifier_group(menu_item, options=None, **kwargs):
    """Create a group plus its options.

    ``options`` is a list of ``(name, price_delta)`` pairs; the returned tuple
    is ``(group, [modifier, ...])`` in the order given.
    """
    n = next(_seq)
    kwargs.setdefault("name", f"Group {n}")
    group = ModifierGroup.objects.create(menu_item=menu_item, **kwargs)
    modifiers = [
        Modifier.objects.create(
            group=group, name=name, price_delta=Decimal(delta), sort_order=i
        )
        for i, (name, delta) in enumerate(options or [])
    ]
    return group, modifiers


# ─── Delivery ────────────────────────────────────────────────────────────────

def make_delivery_zone(**kwargs):
    n = next(_seq)
    kwargs.setdefault("name", f"Zone {n}")
    kwargs.setdefault("min_distance_km", Decimal("0"))
    kwargs.setdefault("max_distance_km", Decimal("25"))
    kwargs.setdefault("delivery_fee", Decimal("8.00"))
    return DeliveryZone.objects.create(**kwargs)
