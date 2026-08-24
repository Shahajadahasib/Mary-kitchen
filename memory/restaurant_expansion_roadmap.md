---
name: restaurant-expansion-roadmap
description: Execution plan for the restaurant expansion. Phases 1-5 have shipped (backend domain, unified pipeline, hub page + route move, restaurant storefront, admin menu screens). Only Phase 6 (polish, unscoped) remains — this file is the resume point.
metadata:
  type: project
---

# Restaurant expansion — roadmap (only Phase 6 remains)

**Read this first if you are resuming this work in a new session.** Phases 1-4 are done and on
`main`'s history via `feature/restaurant-hub-phase3`:

- **Phase 1** — the `apps.menu` backend domain.
- **Phase 2** — the unified `cart`/`orders` pipeline serving both channels.
  (See `memory/project_features_batch2.md` for the full backend writeup.)
- **Phase 3** — hub landing page at `/`, grocery shop moved from `/` to `/shop`, `?next=` auth
  redirects, channel-aware cart stores, legacy-path redirects in `next.config.js`.
- **Phase 4** — the restaurant storefront under `/restaurant`: menu browse with category and
  dietary-tag filters, dish detail with the modifier picker, cart, checkout, order history and
  tracking.
- **Phase 5** — admin menu management (`/admin/menu`: categories, dish list with inline
  on-menu/86 toggles, dish create, dish editor with photos and modifier groups) and All /
  Grocery / Restaurant tabs on the admin orders queue.

The migrations (`menu/0001_initial`, `cart/0003_...`, `orders/0008_...`) have been applied to the
development database. **Only Phase 6 below remains, and it is not scoped yet.**

## Things later phases must not undo

- Backend links into the site are built by `core/frontend_urls.py` from `Order.channel`. Never
  hardcode `/shop/...` or `/restaurant/...` in backend code — a grocery order and a restaurant
  order need different URLs, and getting this wrong once already sent paying customers to a 404.
- `next.config.js` carries permanent redirects from the pre-`/shop` paths. They cover emails
  already sent and `action_url` values already written to notification rows, so they cannot be
  removed just because the frontend no longer emits those paths.
- `store/cartStore.ts` exposes `useGroceryCart` and `useRestaurantCart` as separate instances.
  Keep the channel explicit at every call site; do not reintroduce an implicit "current cart".
- `GET /api/v1/orders/` takes an optional `?channel=`. Both storefronts' order screens pass it;
  omitting it returns every order across both businesses.

## Locked decisions (do not re-litigate these)

- **Unified pipeline**, not a parallel one: one `Order`/`Cart`/`Payment` table set serves both
  channels via a `channel` field (`"grocery"` | `"restaurant"`). Already implemented.
- **Restaurant name**: "Mary Ben's Kitchen Restaurant".
- **Location**: shares the grocery shop's existing `StoreProfile` — same physical address, same
  `delivery.DeliveryZone` records. No separate restaurant location/hours model.
- **v1 order types**: takeaway (pickup) + delivery only. No dine-in / table numbers / QR ordering.
  Do not add a `dine_in` order type or table field without a new decision from the project owner.
- **One login, one admin console**: a customer's account and cart history span both storefronts;
  there is no separate restaurant-only registration flow.

## Phases 3 and 4 — done

Both shipped. The route map they produced:

```
frontend/src/app/
  page.tsx                     — hub: one card per storefront
  shop/                        — grocery storefront (was the `(shop)` route group)
  restaurant/                  — restaurant storefront
    page.tsx                   — menu browse
    [slug]/page.tsx            — dish detail + ModifierPicker
    cart/, checkout/ (+ success/), orders/ (+ [orderNumber]/)
  (admin)/admin/               — untouched by Phases 3-4; Phase 5 extends it
  login/, register/, verify-email/, forgot-password/   — shared, honour `?next=`
frontend/src/components/menu/  — MenuItemCard, ModifierPicker
frontend/src/hooks/useDeliveryFee.ts  — shared by both checkouts
frontend/src/types/menu.ts     — menu domain types
```

Note for Phase 6: the root `layout.tsx` still carries grocery-specific metadata and `GroceryStore`
JSON-LD that now applies to the hub as well. The hub and the restaurant segment override title,
description and canonical, but the structured data has not been split per storefront yet.

## Phase 5 — done

Screens live under `frontend/src/app/(admin)/admin/menu/`: `categories/`, the dish list at the
segment root, `items/new/`, and `items/[id]/edit/`. `components/admin/MenuItemFields.tsx` holds the
dish fields shared by create and edit.

Two things to know before touching these:

- The image **collection** route (`/menu/admin/items/<id>/images/`) is a viewset action that only
  accepts POST; per-image PATCH/DELETE belong to a separate nested viewset. A GET list there
  returns 405, so the editor reads photos from the dish detail payload.
- `is_active` (permanently on the menu) and `is_available` (today's 86 list) are independent, and
  both are toggled inline from the dish list. Do not collapse them into one control.

## Phase 6 — polish / not yet scoped

Not decided in detail yet — revisit with the project owner once Phases 3-5 are live:

- SEO metadata per storefront (currently `sitemap.ts`/`robots.ts` only know about one site).
- Menu-item reviews (`apps.reviews` currently only targets `products.Product` — deliberately out
  of scope for v1, see `project_features_batch2.md`).
- Dine-in / table ordering (deliberately deferred, needs a fresh decision, not just an extension of
  the current model).
- Analytics split by channel in `apps.analytics`.

## Risks & mitigations (for the phases that remain)

- **Per-storefront SEO is unfinished, not merely absent.** The root `layout.tsx` still carries
  grocery-specific metadata and `GroceryStore` JSON-LD that now also applies to the hub. The hub
  and the restaurant segment override title/description/canonical, but the structured data has
  not been split. This is the most concrete item in Phase 6.
- **Deleting menu data is guarded server-side.** A category with dishes returns 400, and a dish on
  existing orders returns 409 (deactivate instead). The admin screens surface both messages —
  keep that if these screens are reworked.

## How to apply

Phase 6 is not scoped — agree the list with the project owner before starting. Whatever it
covers, re-read "Things later phases must not undo" above before changing anything in `cart`,
`orders`, the URL builders, or the cart stores.
