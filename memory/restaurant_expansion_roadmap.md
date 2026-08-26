---
name: restaurant-expansion-roadmap
description: Execution plan for the restaurant expansion. All six phases have shipped (backend domain, unified pipeline, hub page + route move, restaurant storefront, admin menu screens, SEO/chrome polish and channel-split analytics). This file is the resume point and records the invariants and the work deliberately left out of v1.
metadata:
  type: project
---

# Restaurant expansion — roadmap (all phases shipped)

**Read this first if you are resuming this work in a new session.** All six phases are done, on
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

- **Phase 6** — shared channel-aware storefront chrome, the SEO pass, and channel-split admin
  analytics. Scoped in `memory/phase6_plan.md`; steps 6.1–6.5 shipped together, step 6.6 shipped
  afterwards as part of a full-project audit.

The migrations (`menu/0001_initial`, `cart/0003_...`, `orders/0008_...`) have been applied to the
development database. **The expansion is feature-complete for v1**; what remains is listed under
"Deliberately out of v1" below.

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
  omitting it returns every order across both businesses. The grocery screen was found missing it
  during the audit and now passes `channel=grocery`.
- `orders.services.abandon_unpaid_pending_checkouts(user, channel)` **must** stay channel-scoped.
  Unscoped, a restaurant checkout deletes the grocery draft order the same customer is still paying
  for on Stripe — expiring the session and restoring the stock underneath them.
- The four admin stats endpoints (`revenue`, `stats`, `top-products`, `refund-stats`) take an
  optional `?channel=` that defaults to *both*. Keep the default: existing callers rely on the
  combined figures.
- Both `ShopShell` and `RestaurantShell` mount `VisitTracker`. The conversion metric divides paid
  orders from both channels by that visit count, so dropping it from one storefront silently
  inflates the rate.

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

Phase 6 has since split the structured data: the root `layout.tsx` now emits only `Organization`
and `WebSite`, `shop/layout.tsx` carries the `GroceryStore` schema that used to be global, and
`restaurant/layout.tsx` carries its own `Restaurant` schema. They are declared through
`components/seo/JsonLd.tsx` rather than raw `dangerouslySetInnerHTML` blocks — keep it that way,
and never put a business-specific schema back in the root layout, where a child segment cannot
override it.

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

## Phase 6 — done

Scoped in `memory/phase6_plan.md`. Steps 6.1–6.5 (channel-aware `Footer`, reciprocal cross-links,
per-route metadata and canonicals, per-storefront JSON-LD, dynamic sitemap, on-page hygiene) shipped
first. Step 6.6 (channel-split admin analytics) shipped afterwards.

## Deliberately out of v1

Each of these needs a fresh product decision, not just an extension of what exists:

- **Menu-item reviews.** `reviews.Review.product` is a non-nullable FK to `products.Product`, with
  `unique_together(user, product)` and a `save()` that calls `self.product.update_rating()`.
  Supporting dishes needs a nullable FK, a reworked constraint, rating fields on `MenuItem` and a
  data migration on a live table.
- **Dine-in / table ordering.** Locked out of v1 (see "Locked decisions").
- **Per-channel conversion rate.** `analytics.Visit` has no `channel` column, so the dashboard's
  conversion tile is whole-site only and says so on the card. Splitting it means a migration on
  `Visit` and passing the channel from each storefront's `VisitTracker`.
- **A restaurant-side account surface.** The restaurant nav has no notifications bell and its footer
  links "My Profile" at `/shop/profile`, so a restaurant-only customer is sent into grocery chrome to
  manage their account. Either build `/restaurant/profile` + `/restaurant/notifications`, or move
  account pages to a neutral top-level route both storefronts link to.

## Risks & mitigations

- **Deleting menu data is guarded server-side.** A category with dishes returns 400, and a dish on
  existing orders returns 409 (deactivate instead). The admin screens surface both messages —
  keep that if these screens are reworked.

## How to apply

Agree any further work with the project owner before starting — the items under "Deliberately out
of v1" are decisions, not backlog. Whatever the work covers, re-read "Things later phases must not
undo" above before changing anything in `cart`, `orders`, the URL builders, or the cart stores.
