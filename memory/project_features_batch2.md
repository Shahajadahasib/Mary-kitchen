---
name: project-features-batch2
description: Restaurant expansion, phase 1+2 (backend foundation) — new apps.menu domain, unified order/cart pipeline across grocery and restaurant channels. Frontend (hub page, restaurant storefront, admin menu screens) is not built yet — see the "Not done yet" section.
metadata:
  type: project
---

Features shipped in this batch (branch: main, ~2026-08-24):

**Context**

Mary Kitchen is expanding to run a second storefront — "Mary Ben's Kitchen Restaurant" — alongside the
existing grocery shop, both reachable from one landing page at the root domain. Planning doc covered
topology options, the shared-vs-parallel order pipeline decision, data model, API surface, frontend route
map, phased rollout, and risks. Decisions locked in with the project owner: unified order/cart pipeline
(not a parallel one), restaurant shares the grocery store's existing `StoreProfile` (same physical
location), and v1 ordering is takeaway + delivery only (no dine-in/table numbers yet).

This batch covers **Phase 1 (menu domain) and Phase 2 (order pipeline changes)** — backend only. Phases 3–5
(hub page, restaurant storefront, admin menu screens) are separate follow-up work.

**Backend**

- New `apps/menu` — the restaurant catalogue, deliberately parallel to `apps/products` rather than reusing
  it (see `MenuConfig` docstring for why). Models: `MenuCategory`, `MenuItem` (no stock quantity — a
  same-day `is_available` on/off toggle instead, plus a permanent `is_active`), `MenuItemImage`,
  `ModifierGroup` (a choice group on a dish, e.g. "Choose your size" — `single`/`multiple` selection,
  required/min/max bounds), `Modifier` (one option within a group, with its own `price_delta`). Public
  endpoints under `/api/v1/menu/` mirror the shape of `/api/v1/products/`; admin CRUD (including nested
  images/modifier-groups/options routers) under `/api/v1/menu/admin/...`, gated by
  `ADMIN_API_PERMISSION_CLASSES` like every other admin surface.
- `apps.menu.services.validate_and_snapshot_modifiers(menu_item, modifier_ids)` — validates a modifier
  selection against a dish's groups (required groups satisfied, min/max respected) and returns a
  JSON-serialisable snapshot (`[{modifier_id, group, name, price_delta}, ...]`) plus the total price delta.
  Used by both the cart-add endpoint and checkout, so the rules can't drift between the two.
- **Unified order pipeline** — grocery and restaurant orders share one `Order`/`OrderItem`/`Payment` table
  set rather than a parallel restaurant-only copy, so refunds, Stripe checkout, status emails and the PDF
  slip needed no new implementation, only a couple of nullable fields:
  - `Order.channel` — `"grocery"` | `"restaurant"`, indexed. Everything else on `Order` (status flow,
    `VALID_TRANSITIONS`, `order_type` choices) is unchanged and shared across channels — v1 restaurant
    orders use the existing `delivery`/`pickup` types, no new status was needed.
  - `OrderItem.product` is now nullable; `OrderItem.menu_item` (nullable FK) and
    `OrderItem.selected_modifiers` (JSON snapshot) were added. **Exactly one of `product`/`menu_item` is
    set per row** — enforced in `orders.services.create_order_from_cart`, not a DB constraint (same pattern
    as the JSON delivery-address snapshot on `Order`).
  - Deliberately *not* added: a parallel `menu_item_name` field. `product_name` holds the dish name and
    `variant_name` holds a human-readable modifier summary (e.g. `"Large, Garlic Naan"`) for a menu-item
    line. Reusing these two existing snapshot fields means Stripe Checkout line items, the PDF order slip,
    and the admin top-products/refund-stats aggregations needed **zero changes** — they already work purely
    off `product_name`/`variant_name`/`unit_price`/`quantity`.
- `cart.Cart` — `user` changed from `OneToOneField` to `ForeignKey` with a new `channel` field and
  `unique_together(user, channel)`. A customer can now hold an active grocery cart and an active restaurant
  cart at the same time. `cart.CartItem` gained `menu_item` (nullable FK) and `selected_modifiers` (JSON),
  mirroring `OrderItem`; `product` is now nullable. The existing `unique_together(cart, product, variant)`
  constraint still holds for grocery lines — Postgres treats multiple `NULL`s in a unique constraint as
  distinct, so menu-item rows (where `product` is always `NULL`) never collide with it. Matching an
  identical menu-item + modifier combination to merge quantities (instead of creating a duplicate line) is
  handled in `AddToCartView._add_menu_item`, not the DB.
- `cart/views.py` — `get_or_create_cart(user, channel="grocery")` now takes a channel; `GET /cart/`,
  `GET /cart/validate/` and `DELETE /cart/clear/` accept `?channel=grocery|restaurant` (default `grocery`,
  so the existing frontend needs zero changes). `POST /cart/add/` now accepts either
  `{product_id, variant_id}` (grocery, unchanged) or `{menu_item_id, modifier_ids}` (restaurant, new) —
  exactly one must be supplied. `PATCH`/`DELETE` on a single cart item now resolve the cart from the item
  itself (`cart__user=request.user`) rather than requiring a channel param.
- `orders/services.py::create_order_from_cart` takes a new `channel` param and branches per cart line:
  grocery lines are unchanged (stock deduction, out-of-stock flagging); restaurant lines have no stock to
  deduct and are simply excluded from the order if the dish went off-menu (`is_active=False`) or was 86'd
  (`is_available=False`) between add-to-cart and checkout — mirroring how inactive products are already
  excluded. `rollback_checkout_order`'s stock-restore loop now skips menu-item lines (`product_id is None`)
  instead of crashing on them.
- `orders/serializers.py::CheckoutSerializer` gained `channel` (default `"grocery"`); `OrderSerializer` and
  `OrderItemSerializer` expose the new fields. `AdminOrderListView` filterset gained `channel` so the
  eventual admin orders screen can filter/tab by business.
- `payments/services.py::_clear_user_cart` now looks up the cart by `(user, channel)` since `Cart` is no
  longer one-per-user.
- Migrations: `menu/0001_initial`, `cart/0003_cart_channel_cartitem_menu_item_and_more`,
  `orders/0008_order_channel_orderitem_menu_item_and_more` — all purely additive (`AddField`/one
  `AlterField` relaxing `OneToOneField`→`ForeignKey` on `Cart.user`, one relaxing `product` to nullable on
  each of `CartItem`/`OrderItem`). No data migration needed: existing rows default to `channel="grocery"`.
  Generated and verified against a real (SQLite) database in a sandbox — `makemigrations --check` reports
  no drift, `migrate` applies cleanly, and an end-to-end smoke test (menu item with required + optional
  modifier groups → cart → checkout → order; a dish 86'd mid-cart → excluded, not crashed; grocery flow
  unchanged, stock still deducts correctly; a user holding both a grocery and a restaurant cart at once)
  passed both at the ORM layer and through the actual DRF endpoints before this was shipped.

**Not done yet (see the restaurant expansion plan artifact for the full phase list)**

- Phase 3 — hub landing page at `/` with the two cards; move the grocery homepage to `/shop`.
- Phase 4 — the restaurant storefront itself: menu browse, item detail with the modifier picker, cart,
  checkout, order tracking.
- Phase 5 — admin: menu management screens, a channel tab/filter on the existing orders queue.
- No dine-in/table-number support yet (deliberately deferred — v1 is takeaway + delivery only).
- No reviews for menu items yet (the `reviews` app still only targets `products.Product`).

**Why:** the owner wants a second storefront (restaurant) reachable from a shared landing page, without
losing the single-login, single-admin-console feel of the current app, or having to re-implement Stripe
refunds/webhooks/notifications a second time.

**How to apply:** when touching `orders/services.py` or `cart/views.py`, remember every `OrderItem`/
`CartItem` can now be *either* a grocery line or a restaurant line — check `item.menu_item_id` /
`item.product_id` rather than assuming `product` is always set. When adding a new admin-only endpoint under
`apps/menu`, use `ADMIN_API_PERMISSION_CLASSES` from `core.permissions`, same as every other app.

**Re-verified (2026-08-24, second pass):** rebuilt a clean virtualenv, installed `requirements.txt`
fresh, and re-ran the full check against a throwaway SQLite database from scratch (not reusing the
first pass's state): `makemigrations --check --dry-run` → "No changes detected"; `migrate` → applied
`menu/0001_initial`, `cart/0003_...`, `orders/0008_...` cleanly on top of the real prior migration
history; `manage.py check` → only the pre-existing, unrelated `staticfiles.W004` warning. Re-ran the
end-to-end smoke test (required-modifier-group validation, price snapshot totals, dual-channel carts
coexisting, checkout producing a correct menu-item `OrderItem`, an 86'd dish being excluded from
checkout rather than crashing) — all passed. All 26 new/changed Python files also pass a plain
`py_compile` syntax check.

**Outstanding manual step:** these migrations have been verified in a sandbox but, as of this note,
have **not yet been applied to the project owner's actual development database**. Run
`python manage.py migrate` from `backend/` before relying on any of the new endpoints, and before
starting the frontend work described in `memory/restaurant_expansion_roadmap.md`.
