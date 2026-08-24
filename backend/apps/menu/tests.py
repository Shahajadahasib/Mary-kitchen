"""Tests for restaurant menu modifiers.

``validate_and_snapshot_modifiers`` is the single gate between what a customer
clicks and what gets persisted on a cart or order line. It has to reject
selections that break a group's rules, and it has to produce a snapshot whose
stored price survives a later menu price change.
"""
from decimal import Decimal

from django.test import TestCase
from rest_framework import serializers

from apps.menu.services import (
    modifiers_label,
    modifiers_total,
    validate_and_snapshot_modifiers,
)
from core.test_factories import make_menu_item, make_modifier_group


class ModifierValidationTests(TestCase):
    def setUp(self):
        self.dish = make_menu_item(base_price=Decimal("20.00"))

    def test_valid_selection_returns_snapshot_and_delta(self):
        _, options = make_modifier_group(
            self.dish,
            name="Size",
            selection_type="single",
            options=[("Regular", "0.00"), ("Large", "5.00")],
        )

        snapshot, delta = validate_and_snapshot_modifiers(self.dish, [str(options[1].id)])

        self.assertEqual(delta, Decimal("5.00"))
        self.assertEqual(len(snapshot), 1)
        self.assertEqual(snapshot[0]["group"], "Size")
        self.assertEqual(snapshot[0]["name"], "Large")
        self.assertEqual(snapshot[0]["price_delta"], "5.00")

    def test_no_selection_on_an_optional_group_is_allowed(self):
        make_modifier_group(self.dish, name="Extras", options=[("Chilli", "1.00")])

        snapshot, delta = validate_and_snapshot_modifiers(self.dish, [])

        self.assertEqual(snapshot, [])
        self.assertEqual(delta, Decimal("0.00"))

    def test_required_group_must_be_satisfied(self):
        make_modifier_group(
            self.dish,
            name="Size",
            selection_type="single",
            is_required=True,
            options=[("Regular", "0.00"), ("Large", "5.00")],
        )

        with self.assertRaises(serializers.ValidationError):
            validate_and_snapshot_modifiers(self.dish, [])

    def test_single_select_group_rejects_two_choices(self):
        _, options = make_modifier_group(
            self.dish,
            name="Size",
            selection_type="single",
            options=[("Regular", "0.00"), ("Large", "5.00")],
        )

        with self.assertRaises(serializers.ValidationError):
            validate_and_snapshot_modifiers(
                self.dish, [str(options[0].id), str(options[1].id)]
            )

    def test_multi_select_group_honours_max_select(self):
        _, options = make_modifier_group(
            self.dish,
            name="Toppings",
            selection_type="multiple",
            max_select=2,
            options=[("Cheese", "1.00"), ("Bacon", "2.00"), ("Egg", "1.50")],
        )

        two = [str(options[0].id), str(options[1].id)]
        snapshot, delta = validate_and_snapshot_modifiers(self.dish, two)
        self.assertEqual(delta, Decimal("3.00"))
        self.assertEqual(len(snapshot), 2)

        with self.assertRaises(serializers.ValidationError):
            validate_and_snapshot_modifiers(self.dish, two + [str(options[2].id)])

    def test_modifier_belonging_to_another_dish_is_rejected(self):
        """Modifier ids are per-dish. Accepting a foreign one would let a
        customer price a cheap dish using another dish's discount option."""
        other_dish = make_menu_item()
        _, foreign = make_modifier_group(
            other_dish, name="Size", options=[("Large", "5.00")]
        )

        with self.assertRaises(serializers.ValidationError):
            validate_and_snapshot_modifiers(self.dish, [str(foreign[0].id)])

    def test_unknown_modifier_id_is_rejected(self):
        with self.assertRaises(serializers.ValidationError):
            validate_and_snapshot_modifiers(
                self.dish, ["00000000-0000-0000-0000-000000000000"]
            )

    def test_snapshot_order_follows_group_then_modifier_sort_order(self):
        make_modifier_group(
            self.dish,
            name="Size",
            sort_order=0,
            selection_type="single",
            options=[("Large", "5.00")],
        )
        _, extras = make_modifier_group(
            self.dish,
            name="Extras",
            sort_order=1,
            selection_type="multiple",
            options=[("Cheese", "1.00"), ("Bacon", "2.00")],
        )
        size = self.dish.modifier_groups.get(name="Size").options.get()

        # Deliberately pass them out of order.
        snapshot, _ = validate_and_snapshot_modifiers(
            self.dish, [str(extras[1].id), str(size.id), str(extras[0].id)]
        )

        self.assertEqual(
            [entry["name"] for entry in snapshot], ["Large", "Cheese", "Bacon"]
        )


class ModifierSnapshotHelperTests(TestCase):
    """The snapshot is read back by the cart, checkout, Stripe line items and
    the PDF slip, so these two helpers must tolerate an empty selection."""

    SNAPSHOT = [
        {"modifier_id": "a", "group": "Size", "name": "Large", "price_delta": "4.50"},
        {"modifier_id": "b", "group": "Extras", "name": "Cheese", "price_delta": "1.50"},
    ]

    def test_label_joins_names(self):
        self.assertEqual(modifiers_label(self.SNAPSHOT), "Large, Cheese")

    def test_total_sums_deltas(self):
        self.assertEqual(modifiers_total(self.SNAPSHOT), Decimal("6.00"))

    def test_helpers_accept_empty_and_none(self):
        for empty in ([], None):
            with self.subTest(value=empty):
                self.assertEqual(modifiers_label(empty), "")
                self.assertEqual(modifiers_total(empty), Decimal("0.00"))


class MenuItemAvailabilityTests(TestCase):
    """``is_active`` and ``is_available`` mean different things and are set by
    different people -- an owner curating the menu versus a cook 86-ing a dish
    for the night. Neither may quietly imply the other."""

    def test_flags_default_to_on_the_menu_and_available(self):
        dish = make_menu_item()
        self.assertTrue(dish.is_active)
        self.assertTrue(dish.is_available)

    def test_flags_are_independent(self):
        dish = make_menu_item(is_available=False)
        self.assertTrue(dish.is_active)

        dish.is_active = False
        dish.is_available = True
        dish.save()
        dish.refresh_from_db()
        self.assertFalse(dish.is_active)
        self.assertTrue(dish.is_available)


class ModifierGroupNormalisationTests(TestCase):
    """``clean_selection_bounds`` reconciles the bounds of a single-choice
    group, and is called from serializer validation rather than from ``save``
    -- so a group written straight to the database keeps whatever bounds it was
    given. ``validate_and_snapshot_modifiers`` therefore checks
    ``selection_type`` directly instead of trusting ``max_select``, and the
    tests above cover that path.
    """

    def test_single_select_group_is_capped_at_one(self):
        dish = make_menu_item()
        group, _ = make_modifier_group(
            dish, name="Size", selection_type="single", max_select=5
        )

        group.clean_selection_bounds()

        self.assertEqual(group.max_select, 1)

    def test_required_single_select_group_needs_exactly_one(self):
        dish = make_menu_item()
        group, _ = make_modifier_group(
            dish, name="Size", selection_type="single", is_required=True
        )

        group.clean_selection_bounds()

        self.assertEqual(group.min_select, 1)
        self.assertEqual(group.max_select, 1)

    def test_multi_select_bounds_are_left_alone(self):
        dish = make_menu_item()
        group, _ = make_modifier_group(
            dish, name="Toppings", selection_type="multiple", min_select=1, max_select=3
        )

        group.clean_selection_bounds()

        self.assertEqual(group.min_select, 1)
        self.assertEqual(group.max_select, 3)

    def test_single_select_is_enforced_even_when_bounds_were_never_normalised(self):
        """The guard that actually protects checkout: a group written directly
        to the database with max_select=5 must still reject two choices."""
        dish = make_menu_item()
        _, options = make_modifier_group(
            dish,
            name="Size",
            selection_type="single",
            max_select=5,
            options=[("Regular", "0.00"), ("Large", "5.00")],
        )

        with self.assertRaises(serializers.ValidationError):
            validate_and_snapshot_modifiers(
                dish, [str(options[0].id), str(options[1].id)]
            )
