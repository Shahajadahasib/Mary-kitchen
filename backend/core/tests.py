"""Tests for backend-generated links back into the frontend.

Every customer-facing link the backend emits -- order confirmation emails,
in-app notification deep links, Stripe return URLs -- has to land on the
storefront the order actually belongs to. Hardcoding ``/shop`` anywhere drops
restaurant customers into the grocery shop, and the failure is invisible until
a real customer clicks a real email, so it is pinned here instead.
"""
from django.test import TestCase, override_settings

from core.frontend_urls import (
    admin_order_url,
    checkout_cancel_url,
    checkout_success_url,
    order_path,
    order_url,
    storefront_root,
)


class StorefrontRootTests(TestCase):
    def test_each_channel_maps_to_its_own_root(self):
        self.assertEqual(storefront_root("grocery"), "/shop")
        self.assertEqual(storefront_root("restaurant"), "/restaurant")

    def test_lookup_is_case_and_whitespace_tolerant(self):
        self.assertEqual(storefront_root("  Restaurant "), "/restaurant")

    def test_unknown_or_missing_channel_falls_back_to_the_grocery_shop(self):
        for value in ["", None, "wholesale"]:
            with self.subTest(channel=value):
                self.assertEqual(storefront_root(value), "/shop")

    def test_no_channel_resolves_to_the_bare_root(self):
        """The root path is the hub landing page, so no channel may resolve to
        it -- a customer sent there has to pick a storefront by hand."""
        for value in ["grocery", "restaurant", "", None, "nonsense"]:
            with self.subTest(channel=value):
                self.assertNotEqual(storefront_root(value), "/")


class _FakeOrder:
    """Only the two attributes the link builders read.

    Deliberately not a real Order: these builders must work from any object
    carrying a channel and an order number, including one being constructed
    inside a transaction that has not been saved yet.
    """

    def __init__(self, channel, order_number="MK-202608-ABCD1234"):
        self.channel = channel
        self.order_number = order_number


@override_settings(FRONTEND_URL="https://marykitchen.example/")
class OrderLinkTests(TestCase):
    def test_order_path_targets_the_matching_storefront(self):
        self.assertEqual(
            order_path(_FakeOrder("grocery")), "/shop/orders/MK-202608-ABCD1234"
        )
        self.assertEqual(
            order_path(_FakeOrder("restaurant")),
            "/restaurant/orders/MK-202608-ABCD1234",
        )

    def test_absolute_url_does_not_double_the_slash(self):
        """FRONTEND_URL is operator-supplied and may or may not end in a slash."""
        self.assertEqual(
            order_url(_FakeOrder("restaurant")),
            "https://marykitchen.example/restaurant/orders/MK-202608-ABCD1234",
        )

    @override_settings(FRONTEND_URL="https://marykitchen.example")
    def test_absolute_url_works_without_a_trailing_slash_too(self):
        self.assertEqual(
            order_url(_FakeOrder("grocery")),
            "https://marykitchen.example/shop/orders/MK-202608-ABCD1234",
        )

    def test_stripe_success_url_keeps_the_session_placeholder(self):
        """Stripe substitutes this token itself, so it must survive verbatim."""
        url = checkout_success_url(_FakeOrder("restaurant"))
        self.assertIn("/restaurant/checkout/success", url)
        self.assertIn("session_id={CHECKOUT_SESSION_ID}", url)

    def test_stripe_cancel_url_returns_to_the_originating_checkout(self):
        self.assertEqual(
            checkout_cancel_url(_FakeOrder("restaurant")),
            "https://marykitchen.example/restaurant/checkout?canceled=1",
        )
        self.assertEqual(
            checkout_cancel_url(_FakeOrder("grocery")),
            "https://marykitchen.example/shop/checkout?canceled=1",
        )

    def test_admin_link_is_the_same_for_both_channels(self):
        """Staff work one queue across both storefronts."""
        grocery = admin_order_url(_FakeOrder("grocery"))
        restaurant = admin_order_url(_FakeOrder("restaurant"))

        self.assertEqual(grocery, restaurant)
        self.assertIn("/admin/orders?order=MK-202608-ABCD1234", grocery)
