"""Tests for the unified order pipeline.

One ``Order``/``OrderItem`` pipeline serves both storefronts, distinguished by
``channel``. The cases below concentrate on the places where the two channels
behave differently -- stock, availability and pricing -- because that is where
a change made for one storefront most easily breaks the other.
"""
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase

from apps.cart.models import Cart, CartItem
from apps.orders.models import Order, OrderItem, OrderStatusHistory
from apps.orders.services import (
    allowed_next_statuses,
    create_order_from_cart,
    update_order_status,
)
from core.test_factories import (
    make_address,
    make_admin,
    make_delivery_zone,
    make_menu_item,
    make_modifier_group,
    make_product,
    make_user,
    make_variant,
)


class GroceryOrderCreationTests(TestCase):
    """create_order_from_cart on the grocery channel."""

    def setUp(self):
        self.user = make_user()
        self.cart = Cart.objects.create(user=self.user, channel="grocery")

    def _checkout(self, **kwargs):
        kwargs.setdefault("order_type", "pickup")
        kwargs.setdefault("channel", "grocery")
        return create_order_from_cart(self.user, **kwargs)

    def test_creates_order_and_deducts_stock(self):
        product = make_product(base_price=Decimal("12.50"), stock_quantity=10)
        CartItem.objects.create(cart=self.cart, product=product, quantity=3)

        order = self._checkout()

        self.assertEqual(order.channel, "grocery")
        self.assertEqual(order.status, "pending")

        item = order.items.get()
        self.assertEqual(item.unit_price, Decimal("12.50"))
        self.assertEqual(item.quantity, 3)
        self.assertEqual(order.subtotal, Decimal("37.50"))

        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 7)

    def test_variant_price_and_stock_are_used_over_the_parent_product(self):
        product = make_product(base_price=Decimal("10.00"), stock_quantity=100)
        variant = make_variant(product, price=Decimal("18.00"), stock_quantity=4)
        CartItem.objects.create(cart=self.cart, product=product, variant=variant, quantity=2)

        order = self._checkout()

        item = order.items.get()
        self.assertEqual(item.unit_price, Decimal("18.00"))
        self.assertEqual(item.variant_name, variant.name)

        variant.refresh_from_db()
        product.refresh_from_db()
        self.assertEqual(variant.stock_quantity, 2)
        # The parent's stock is untouched when a variant carries the stock.
        self.assertEqual(product.stock_quantity, 100)

    def test_insufficient_stock_flags_the_line_without_blocking_the_order(self):
        product = make_product(stock_quantity=1)
        CartItem.objects.create(cart=self.cart, product=product, quantity=5)

        with patch("apps.notifications.tasks.notify_admin_out_of_stock.delay") as notify:
            order = self._checkout()

        self.assertTrue(order.has_out_of_stock_items)
        self.assertTrue(order.items.get().was_out_of_stock)
        notify.assert_called_once_with(str(order.id))

        product.refresh_from_db()
        # Stock is left alone rather than driven negative.
        self.assertEqual(product.stock_quantity, 1)

    def test_inactive_product_is_excluded_and_noted_in_history(self):
        live = make_product(name="Live product")
        dead = make_product(name="Retired product", is_active=False)
        CartItem.objects.create(cart=self.cart, product=live, quantity=1)
        CartItem.objects.create(cart=self.cart, product=dead, quantity=1)

        order = self._checkout()

        self.assertEqual(order.items.count(), 1)
        self.assertEqual(order.items.get().product_name, "Live product")

        note = OrderStatusHistory.objects.get(order=order).note
        self.assertIn("Retired product", note)

    def test_checkout_with_only_unavailable_items_is_rejected(self):
        CartItem.objects.create(
            cart=self.cart, product=make_product(is_active=False), quantity=1
        )

        with self.assertRaises(ValueError):
            self._checkout()

        # The whole service is atomic -- the draft order must not survive.
        self.assertFalse(Order.objects.exists())

    def test_empty_cart_is_rejected(self):
        with self.assertRaises(ValueError):
            self._checkout()

    def test_delivery_order_requires_an_address(self):
        CartItem.objects.create(cart=self.cart, product=make_product(), quantity=1)

        with self.assertRaises(ValueError):
            self._checkout(order_type="delivery")

    def test_delivery_order_snapshots_the_address_and_charges_a_fee(self):
        make_delivery_zone(delivery_fee=Decimal("8.00"))
        address = make_address(self.user, suburb="Darwin City")
        CartItem.objects.create(
            cart=self.cart, product=make_product(base_price=Decimal("10.00")), quantity=2
        )

        order = self._checkout(order_type="delivery", address_id=address.id)

        self.assertEqual(order.delivery_fee, Decimal("8.00"))
        self.assertEqual(order.total_amount, Decimal("28.00"))
        # Stored as a JSON snapshot, not a foreign key -- editing the address
        # afterwards must not rewrite delivery history.
        self.assertEqual(order.delivery_address["suburb"], "Darwin City")
        address.suburb = "Parap"
        address.save()
        order.refresh_from_db()
        self.assertEqual(order.delivery_address["suburb"], "Darwin City")

    def test_order_numbers_are_unique_and_prefixed(self):
        CartItem.objects.create(cart=self.cart, product=make_product(), quantity=1)
        first = self._checkout()

        CartItem.objects.create(cart=self.cart, product=make_product(), quantity=1)
        second = self._checkout()

        self.assertTrue(first.order_number.startswith("MK-"))
        self.assertNotEqual(first.order_number, second.order_number)


class RestaurantOrderCreationTests(TestCase):
    """create_order_from_cart on the restaurant channel.

    Menu items have no stock quantity: a dish is either permanently on the menu
    (``is_active``), available today (``is_available``), or excluded entirely.
    """

    def setUp(self):
        self.user = make_user()
        self.cart = Cart.objects.create(user=self.user, channel="restaurant")

    def _checkout(self):
        return create_order_from_cart(self.user, order_type="pickup", channel="restaurant")

    def test_menu_item_order_carries_the_restaurant_channel(self):
        dish = make_menu_item(base_price=Decimal("22.00"))
        CartItem.objects.create(cart=self.cart, menu_item=dish, quantity=2)

        order = self._checkout()

        self.assertEqual(order.channel, "restaurant")
        item = order.items.get()
        self.assertEqual(item.menu_item_id, dish.id)
        self.assertIsNone(item.product_id)
        self.assertEqual(item.unit_price, Decimal("22.00"))
        self.assertEqual(order.subtotal, Decimal("44.00"))

    def test_modifier_deltas_are_added_to_the_unit_price(self):
        dish = make_menu_item(base_price=Decimal("18.00"))
        _, options = make_modifier_group(
            dish, name="Size", options=[("Regular", "0.00"), ("Large", "4.50")]
        )
        large = options[1]
        snapshot = [
            {
                "modifier_id": str(large.id),
                "group": "Size",
                "name": "Large",
                "price_delta": "4.50",
            }
        ]
        CartItem.objects.create(
            cart=self.cart, menu_item=dish, selected_modifiers=snapshot, quantity=1
        )

        order = self._checkout()

        item = order.items.get()
        self.assertEqual(item.unit_price, Decimal("22.50"))
        self.assertIn("Large", item.variant_name)
        # The snapshot is persisted so a later price change cannot rewrite it.
        self.assertEqual(item.selected_modifiers, snapshot)

    def test_dish_unavailable_today_is_excluded(self):
        available = make_menu_item(name="Barramundi")
        sold_out = make_menu_item(name="Laksa", is_available=False)
        CartItem.objects.create(cart=self.cart, menu_item=available, quantity=1)
        CartItem.objects.create(cart=self.cart, menu_item=sold_out, quantity=1)

        order = self._checkout()

        self.assertEqual(order.items.count(), 1)
        self.assertEqual(order.items.get().product_name, "Barramundi")
        self.assertIn("Laksa", OrderStatusHistory.objects.get(order=order).note)

    def test_dish_off_the_menu_is_excluded(self):
        keeper = make_menu_item()
        CartItem.objects.create(cart=self.cart, menu_item=keeper, quantity=1)
        CartItem.objects.create(
            cart=self.cart, menu_item=make_menu_item(is_active=False), quantity=1
        )

        order = self._checkout()

        self.assertEqual(order.items.count(), 1)

    def test_restaurant_lines_never_report_out_of_stock(self):
        CartItem.objects.create(cart=self.cart, menu_item=make_menu_item(), quantity=99)

        order = self._checkout()

        self.assertFalse(order.has_out_of_stock_items)
        self.assertFalse(order.items.get().was_out_of_stock)


class ChannelIsolationTests(TestCase):
    """Checkout must only ever drain the cart belonging to its own channel."""

    def test_checkout_reads_only_the_matching_channel_cart(self):
        user = make_user()
        grocery = Cart.objects.create(user=user, channel="grocery")
        restaurant = Cart.objects.create(user=user, channel="restaurant")

        CartItem.objects.create(cart=grocery, product=make_product(name="Milk"), quantity=1)
        CartItem.objects.create(
            cart=restaurant, menu_item=make_menu_item(name="Rendang"), quantity=1
        )

        order = create_order_from_cart(user, order_type="pickup", channel="restaurant")

        self.assertEqual(order.items.count(), 1)
        self.assertEqual(order.items.get().product_name, "Rendang")

    def test_every_order_item_is_one_kind_of_line_only(self):
        """Exactly one of product / menu_item is set per row -- the invariant
        OrderItem documents but deliberately does not enforce with a database
        constraint."""
        user = make_user()
        grocery = Cart.objects.create(user=user, channel="grocery")
        restaurant = Cart.objects.create(user=user, channel="restaurant")
        CartItem.objects.create(cart=grocery, product=make_product(), quantity=1)
        CartItem.objects.create(cart=restaurant, menu_item=make_menu_item(), quantity=1)

        create_order_from_cart(user, order_type="pickup", channel="grocery")
        create_order_from_cart(user, order_type="pickup", channel="restaurant")

        self.assertEqual(OrderItem.objects.count(), 2)
        for item in OrderItem.objects.all():
            self.assertNotEqual(
                item.product_id is None,
                item.menu_item_id is None,
                f"OrderItem {item.pk} sets both or neither of product/menu_item",
            )


class OrderStatusTransitionTests(TestCase):
    """The status graph guards the delivery and pickup flows separately."""

    def setUp(self):
        self.user = make_user()
        self.admin = make_admin()

    def _order(self, **kwargs):
        kwargs.setdefault("order_type", "delivery")
        return Order.objects.create(user=self.user, **kwargs)

    def test_delivery_flow_walks_through_out_for_delivery(self):
        order = self._order()
        for status in ["confirmed", "processing", "out_for_delivery", "delivered"]:
            self.assertIn(status, allowed_next_statuses(order))
            order = update_order_status(order, status, self.admin)
        self.assertEqual(order.status, "delivered")
        self.assertIsNotNone(order.delivered_at)

    def test_pickup_flow_uses_ready_for_pickup_instead(self):
        order = self._order(order_type="pickup", status="processing")
        self.assertIn("ready_for_pickup", allowed_next_statuses(order))
        self.assertNotIn("out_for_delivery", allowed_next_statuses(order))

    def test_skipping_a_step_is_rejected(self):
        order = self._order()
        with self.assertRaises(ValueError):
            update_order_status(order, "delivered", self.admin)
        order.refresh_from_db()
        self.assertEqual(order.status, "pending")

    def test_force_lets_an_admin_override_the_graph(self):
        order = self._order()
        order = update_order_status(order, "out_for_delivery", self.admin, force=True)
        self.assertEqual(order.status, "out_for_delivery")

    def test_force_still_cannot_mark_an_order_refunded(self):
        order = self._order()
        with self.assertRaises(ValueError):
            update_order_status(order, "refunded", self.admin, force=True)

    def test_terminal_statuses_are_final(self):
        for terminal in ["cancelled", "refunded"]:
            with self.subTest(status=terminal):
                order = self._order(status=terminal)
                self.assertEqual(allowed_next_statuses(order), [])
                with self.assertRaises(ValueError):
                    update_order_status(order, "confirmed", self.admin, force=True)

    def test_cancelling_records_history_and_a_timestamp(self):
        order = self._order()
        order = update_order_status(order, "cancelled", self.admin, note="Customer called")

        self.assertIsNotNone(order.cancelled_at)
        history = OrderStatusHistory.objects.get(order=order, to_status="cancelled")
        self.assertEqual(history.from_status, "pending")
        self.assertEqual(history.changed_by, self.admin)
        self.assertEqual(history.note, "Customer called")
