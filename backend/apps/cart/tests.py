"""Tests for the two-channel cart.

The backend keeps exactly one cart per ``(user, channel)``, and the frontend
picks a channel by picking a store hook rather than by inspecting the route.
These tests pin that down from the database side: the two carts must stay
completely independent, and a line must price itself from whichever kind of
item it holds.
"""
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.cart.models import Cart, CartItem
from core.test_factories import (
    make_menu_item,
    make_modifier_group,
    make_product,
    make_user,
    make_variant,
)


class CartChannelTests(TestCase):
    def setUp(self):
        self.user = make_user()

    def test_a_user_can_hold_one_cart_per_channel(self):
        grocery = Cart.objects.create(user=self.user, channel="grocery")
        restaurant = Cart.objects.create(user=self.user, channel="restaurant")

        self.assertNotEqual(grocery.pk, restaurant.pk)
        self.assertEqual(self.user.carts.count(), 2)

    def test_a_second_cart_on_the_same_channel_is_refused(self):
        Cart.objects.create(user=self.user, channel="grocery")

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Cart.objects.create(user=self.user, channel="grocery")

    def test_clearing_one_channel_leaves_the_other_untouched(self):
        grocery = Cart.objects.create(user=self.user, channel="grocery")
        restaurant = Cart.objects.create(user=self.user, channel="restaurant")
        CartItem.objects.create(cart=grocery, product=make_product(), quantity=1)
        CartItem.objects.create(cart=restaurant, menu_item=make_menu_item(), quantity=1)

        grocery.clear()

        self.assertEqual(grocery.items.count(), 0)
        self.assertEqual(restaurant.items.count(), 1)

    def test_totals_are_scoped_to_one_cart(self):
        grocery = Cart.objects.create(user=self.user, channel="grocery")
        restaurant = Cart.objects.create(user=self.user, channel="restaurant")
        CartItem.objects.create(
            cart=grocery, product=make_product(base_price=Decimal("5.00")), quantity=2
        )
        CartItem.objects.create(
            cart=restaurant, menu_item=make_menu_item(base_price=Decimal("30.00")), quantity=1
        )

        self.assertEqual(grocery.subtotal, Decimal("10.00"))
        self.assertEqual(grocery.total_items, 2)
        self.assertEqual(restaurant.subtotal, Decimal("30.00"))
        self.assertEqual(restaurant.total_items, 1)


class CartItemPricingTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.grocery = Cart.objects.create(user=self.user, channel="grocery")
        self.restaurant = Cart.objects.create(user=self.user, channel="restaurant")

    def test_product_line_prices_from_the_product(self):
        product = make_product(base_price=Decimal("7.25"))
        item = CartItem.objects.create(cart=self.grocery, product=product, quantity=4)

        self.assertEqual(item.unit_price, Decimal("7.25"))
        self.assertEqual(item.line_total, Decimal("29.00"))

    def test_variant_line_prices_from_the_variant(self):
        product = make_product(base_price=Decimal("7.25"))
        variant = make_variant(product, price=Decimal("11.00"))
        item = CartItem.objects.create(
            cart=self.grocery, product=product, variant=variant, quantity=2
        )

        self.assertEqual(item.unit_price, Decimal("11.00"))
        self.assertEqual(item.line_total, Decimal("22.00"))

    def test_menu_line_prices_from_the_dish_plus_its_modifiers(self):
        dish = make_menu_item(base_price=Decimal("19.00"))
        _, options = make_modifier_group(
            dish, name="Size", options=[("Large", "3.50")]
        )
        item = CartItem.objects.create(
            cart=self.restaurant,
            menu_item=dish,
            selected_modifiers=[
                {
                    "modifier_id": str(options[0].id),
                    "group": "Size",
                    "name": "Large",
                    "price_delta": "3.50",
                }
            ],
            quantity=2,
        )

        self.assertEqual(item.unit_price, Decimal("22.50"))
        self.assertEqual(item.line_total, Decimal("45.00"))

    def test_menu_line_with_no_modifiers_prices_at_base(self):
        dish = make_menu_item(base_price=Decimal("16.00"))
        item = CartItem.objects.create(cart=self.restaurant, menu_item=dish, quantity=1)

        self.assertEqual(item.unit_price, Decimal("16.00"))

    def test_two_lines_of_the_same_dish_differ_by_their_modifiers(self):
        """Modifier choices are part of a line's identity: 'Large Laksa' and
        'Regular Laksa' are separate lines, not a quantity of two."""
        dish = make_menu_item(base_price=Decimal("18.00"))
        _, options = make_modifier_group(
            dish, name="Size", options=[("Regular", "0.00"), ("Large", "4.00")]
        )

        plain = CartItem.objects.create(cart=self.restaurant, menu_item=dish, quantity=1)
        large = CartItem.objects.create(
            cart=self.restaurant,
            menu_item=dish,
            selected_modifiers=[
                {
                    "modifier_id": str(options[1].id),
                    "group": "Size",
                    "name": "Large",
                    "price_delta": "4.00",
                }
            ],
            quantity=1,
        )

        self.assertEqual(self.restaurant.items.count(), 2)
        self.assertEqual(plain.unit_price, Decimal("18.00"))
        self.assertEqual(large.unit_price, Decimal("22.00"))
        self.assertEqual(self.restaurant.subtotal, Decimal("40.00"))
