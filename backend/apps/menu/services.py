"""Modifier validation and pricing snapshot — shared by the cart and checkout."""
from decimal import Decimal

from rest_framework import serializers

from .models import MenuItem


def validate_and_snapshot_modifiers(menu_item: MenuItem, modifier_ids: list) -> tuple[list, Decimal]:
    """
    Validate the selected modifier ids against ``menu_item``'s modifier groups
    (required groups satisfied, min/max respected, no cross-item modifiers),
    and return a JSON-serialisable snapshot plus the total price delta.

    Snapshot shape (also what's persisted on CartItem/OrderItem):
        [{"modifier_id": "<uuid>", "group": "Size", "name": "Large", "price_delta": "2.00"}, ...]
    """
    modifier_ids = [str(i) for i in (modifier_ids or [])]
    groups = list(menu_item.modifier_groups.prefetch_related("options"))

    selected_by_group: dict = {}
    all_modifiers_by_id: dict = {}
    for group in groups:
        for opt in group.options.all():
            all_modifiers_by_id[str(opt.id)] = opt

    unknown_ids = [mid for mid in modifier_ids if mid not in all_modifiers_by_id]
    if unknown_ids:
        raise serializers.ValidationError(
            f"Invalid modifier selection for '{menu_item.name}'."
        )

    for mid in modifier_ids:
        opt = all_modifiers_by_id[mid]
        selected_by_group.setdefault(opt.group_id, []).append(opt)

    for group in groups:
        chosen = selected_by_group.get(group.id, [])
        count = len(chosen)
        if group.is_required and count < max(group.min_select, 1):
            raise serializers.ValidationError(
                f"'{group.name}' requires at least one selection for '{menu_item.name}'."
            )
        if count < group.min_select:
            raise serializers.ValidationError(
                f"'{group.name}' requires at least {group.min_select} selection(s)."
            )
        if group.max_select is not None and count > group.max_select:
            raise serializers.ValidationError(
                f"'{group.name}' allows at most {group.max_select} selection(s)."
            )
        if group.selection_type == "single" and count > 1:
            raise serializers.ValidationError(f"'{group.name}' only allows one selection.")

    snapshot = []
    total_delta = Decimal("0.00")
    # Preserve deterministic order (group sort_order, then modifier sort_order).
    for group in groups:
        for opt in sorted(selected_by_group.get(group.id, []), key=lambda o: (o.sort_order, o.name)):
            snapshot.append(
                {
                    "modifier_id": str(opt.id),
                    "group": group.name,
                    "name": opt.name,
                    "price_delta": str(opt.price_delta),
                }
            )
            total_delta += opt.price_delta

    return snapshot, total_delta


def modifiers_label(snapshot: list) -> str:
    """Human-readable summary of a modifier snapshot, e.g. 'Large, Extra cheese'."""
    return ", ".join(m["name"] for m in (snapshot or []))


def modifiers_total(snapshot: list) -> Decimal:
    total = Decimal("0.00")
    for m in snapshot or []:
        total += Decimal(str(m.get("price_delta", "0")))
    return total
