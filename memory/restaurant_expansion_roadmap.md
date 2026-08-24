---
name: restaurant-expansion-roadmap
description: Execution plan for Phases 3-6 of the restaurant expansion (frontend hub page, restaurant storefront, admin menu screens). Phase 1+2 (backend) already shipped — see project_features_batch2.md. This file is the resume point for continuing the work in a new session.
metadata:
  type: project
---

# Restaurant expansion — roadmap (Phases 3-6)

**Read this first if you are resuming this work in a new session.** Phase 1 (the `apps.menu`
backend domain) and Phase 2 (the unified `cart`/`orders` pipeline that serves both channels) are
already built, migrated, and verified — see `memory/project_features_batch2.md` for the full
backend writeup. Nothing below should require backend model or migration changes; Phases 3-6 are
frontend + admin-UI work against the API surface that already exists.

## Before touching any frontend code

The two new migrations must be applied to the real database before the API can be exercised:

```bash
cd backend
python manage.py migrate
```

This has been verified against a clean SQLite database in a sandbox (`makemigrations --check`
reports no drift, `migrate` applies cleanly, end-to-end smoke tests pass) but **has not yet been
run against the project owner's actual development database** as of 2026-08-24. If you are picking
this up fresh, confirm with the project owner that this has been run — or run it yourself and
confirm it applied without error — before starting Phase 3, and definitely before trying to test
any of the new endpoints by hand.

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

## Current frontend structure (as of 2026-08-24, before Phase 3)

```
frontend/src/app/
  layout.tsx                 — root layout: fonts, QueryClientProvider, toast, etc.
  page.tsx                   — DOES NOT EXIST YET (Phase 3 creates this: the hub)
  login/, register/, forgot-password/, verify-email/   — shared auth, top-level, unaffected
  (shop)/                    — ROUTE GROUP (no URL segment) — this is the whole grocery site today
    layout.tsx               — shop nav/header/footer
    page.tsx                 — grocery homepage, currently serves "/"
    about/, contact/, delivery/, privacy/, terms/
    products/  (+ [slug]/, deals/)
    cart/
    checkout/  (+ success/)
    orders/  (+ [orderNumber]/)
    notifications/
    profile/
  (admin)/admin/             — ROUTE GROUP, admin dashboard at "/admin" — unaffected by this work
    banners/, categories/, delivery/, orders/, products/ (+ [id]/edit/, new/), settings/, users/
frontend/src/store/
  authStore.ts                — Zustand + persist, shared across both storefronts, no change needed
  cartStore.ts                — single cart model today; needs to become channel-aware (Phase 3)
frontend/src/lib/
  api.ts                       — axios client, JWT attach/refresh; add channel-aware cart calls (Phase 3)
frontend/src/components/
  admin/, analytics/, layout/, product/, ui/
```

Because `(shop)` is a *route group* (parentheses), it currently contributes no URL segment — its
`page.tsx` serves `/` directly. Phase 3 turns it into a real segment so the grocery site moves to
`/shop/...`, freeing up `/` for the hub.

## Phase 3 — hub landing page + route restructuring

**Goal:** `/` shows a hub page with two cards ("Grocery Shop" and "Mary Ben's Kitchen Restaurant");
the existing grocery site moves to `/shop`; a new (initially stub) `/restaurant` segment is created
for Phase 4 to fill in.

1. **Rename `frontend/src/app/(shop)/` → `frontend/src/app/shop/`** (drop the parentheses — this
   is the one structural change everything else depends on). Every existing route shifts:
   - `/` (shop home) → `/shop`
   - `/products`, `/products/[slug]`, `/products/deals` → `/shop/products/...`
   - `/cart` → `/shop/cart`
   - `/checkout`, `/checkout/success` → `/shop/checkout`, `/shop/checkout/success`
   - `/orders`, `/orders/[orderNumber]` → `/shop/orders/...`
   - `/profile`, `/notifications`, `/about`, `/contact`, `/delivery`, `/privacy`, `/terms` →
     `/shop/...`
   - `shop/layout.tsx` keeps applying to all of the above automatically.

2. **Create `frontend/src/app/page.tsx`** — the hub. Two cards linking to `/shop` and
   `/restaurant`. Keep it lightweight (server component, no auth required, no data fetching beyond
   maybe `StoreProfile` for shared hours/address if the design wants it on the hub itself).

3. **Create `frontend/src/app/restaurant/`** mirroring the shape `shop/` had before Phase 4 fills
   it in: `layout.tsx` (nav/header branded "Mary Ben's Kitchen Restaurant", reuse the same shared
   `StoreProfile` data the grocery nav already fetches) and a stub `page.tsx`. Full menu
   browse/detail/cart/checkout is Phase 4 — Phase 3 just needs the segment to exist and route
   correctly so the hub's second card has somewhere real to go.

4. **Fix every internal link inside the old `(shop)` tree.** Search for hardcoded paths like
   `href="/cart"`, `href="/checkout"`, `href="/products"`, `router.push("/orders/...")` etc.
   throughout what is now `shop/` (and any shared `components/` used by it) and prefix them with
   `/shop`. This is the highest-risk mechanical step — do a full-tree grep before and after, and
   run `npm run build` to catch broken links/404s that `next build` will surface as type errors on
   `Link`/generated routes where possible, then manually click through the rest.

5. **Decide the post-login/register redirect.** Auth stays shared and top-level (one login for
   both storefronts), but today it presumably redirects to `/` (or `/profile`) unconditionally.
   With two storefronts, redirecting a restaurant customer back into the grocery shop after login
   is a bad UX. Simplest v1 fix: capture the referring path (or a `?next=` query param) when
   redirecting to `/login` from either storefront, and honor it after successful auth; fall back to
   the hub (`/`) if there isn't one.

6. **`frontend/src/store/cartStore.ts` becomes channel-aware.** The backend now has one cart per
   `(user, channel)`. Pick one of:
   - two independent store instances/hooks (`useGroceryCart`, `useRestaurantCart`), or
   - one store keyed by channel internally, with every public method taking a `channel` argument.
   Either is fine; what matters is that "the current cart" is never implicit — every call site must
   say which channel it means. Do this scaffolding in Phase 3 even though the restaurant cart UI
   itself is Phase 4, since the grocery cart's calls need to keep working unchanged (the backend
   defaults `channel` to `"grocery"` everywhere, so as long as the grocery store keeps passing no
   channel / `"grocery"` explicitly, no regression risk).

7. **`frontend/src/lib/api.ts`** — add channel support to the cart helpers: `GET /cart/?channel=`,
   `DELETE /cart/clear/?channel=`, `GET /cart/validate/?channel=`, and `POST /cart/add/` accepting
   either `{product_id, variant_id}` or `{menu_item_id, modifier_ids}` per
   `memory/project_features_batch2.md`. `PATCH`/`DELETE` on a single cart item need no channel
   param (the backend resolves the cart from the item itself).

8. **Update `frontend/src/app/robots.ts` and `sitemap.ts`** for the new `/shop/...` URLs and the
   new `/restaurant` tree.

9. Admin (`(admin)/admin/...`) is untouched by this phase.

## Phase 4 — restaurant storefront

Build out `frontend/src/app/restaurant/`:

- **`page.tsx`** — menu browse: category filter, dietary-tag filter, grid of dish cards. Mirrors
  `shop/products/page.tsx`'s patterns. Hits `GET /api/v1/menu/`, `GET /api/v1/menu/categories/`,
  `GET /api/v1/menu/featured/`.
- **`[slug]/page.tsx`** — item detail with the modifier picker. For each `ModifierGroup`: radio
  buttons if `selection_type === "single"`, checkboxes if `"multiple"`, enforce `min_select`/
  `max_select`/`is_required` client-side (the backend re-validates via
  `apps.menu.services.validate_and_snapshot_modifiers` regardless — client-side is just UX).
  Live-compute displayed price as `base_price + sum(selected modifiers' price_delta)`. "Add to
  cart" → `POST /api/v1/cart/add/` with `{menu_item_id, modifier_ids, quantity}`.
- **`cart/page.tsx`** — same shape as the grocery cart page, reading `menu_item_detail` and
  `selected_modifiers` off `CartItemSerializer` instead of `product`/`variant`.
- **`checkout/page.tsx`** — reuse the grocery checkout page's address/delivery-zone/Stripe logic
  (it is the same `Order`/`Payment` pipeline underneath) but send `channel: "restaurant"` in the
  `POST /api/v1/orders/checkout/` payload, and restrict `order_type` to `delivery`/`pickup` per the
  locked no-dine-in decision.
- **`orders/page.tsx`, `orders/[orderNumber]/page.tsx`** — order history/tracking. Can likely reuse
  most of the grocery order-detail rendering since `OrderSerializer`/`OrderItemSerializer` already
  expose `channel`/`menu_item`/`selected_modifiers` — mainly a rendering branch (show the modifier
  list instead of a variant name for menu-item lines).

## Phase 5 — admin

- **New `(admin)/admin/menu/`** — categories CRUD, menu item CRUD (image upload via the existing
  `FormData` convention — see `CLAUDE.md`'s "Frontend image/file uploads must use `FormData`"
  rule), modifier groups/options CRUD nested under an item. Mirrors
  `(admin)/admin/products/` and `(admin)/admin/categories/` closely, against the
  `/api/v1/menu/admin/...` endpoints that already exist (see `apps/menu/urls.py`,
  `apps/menu/views.py`).
- **Channel tab/filter on `(admin)/admin/orders/page.tsx`** — the server side is already done
  (`AdminOrderListView.filterset_fields` includes `"channel"`); this phase is purely the UI filter.

## Phase 6 — polish / not yet scoped

Not decided in detail yet — revisit with the project owner once Phases 3-5 are live:

- SEO metadata per storefront (currently `sitemap.ts`/`robots.ts` only know about one site).
- Menu-item reviews (`apps.reviews` currently only targets `products.Product` — deliberately out
  of scope for v1, see `project_features_batch2.md`).
- Dine-in / table ordering (deliberately deferred, needs a fresh decision, not just an extension of
  the current model).
- Analytics split by channel in `apps.analytics`.

## Risks & mitigations

- **The `(shop)` → `shop` rename breaks every hardcoded internal link.** Mitigate with a full-tree
  grep for `href="/`, `router.push("/`, `redirect("/` before and after the rename, plus `npm run
  build` and a manual click-through of cart → checkout → order confirmation before calling Phase 3
  done.
- **Two independent cart contexts risk state bleed** (e.g. accidentally rendering the restaurant
  cart's item count in the grocery nav). Mitigate by keeping "current channel" explicit at every
  call site — never infer it from the current route inside shared state code.
- **Admin's orders queue mixing both channels** could confuse staff fulfilling grocery deliveries
  vs. restaurant takeaway. The channel filter (Phase 5) is not optional polish — treat it as
  required before Phase 5 is considered done.
- **Post-login redirect UX** (Phase 3, point 5) is an easy thing to skip and ship broken — a
  restaurant customer bounced into the grocery homepage after logging in is a real regression, not
  a nice-to-have.

## How to apply

When starting Phase 3, do the route rename and link-fixing pass as one self-contained unit of work
before starting on the hub page's visual design — a half-renamed route tree makes everything after
it harder to test. Confirm the migration (see "Before touching any frontend code" above) is applied
before manually testing any restaurant-channel flow end-to-end, since `POST /cart/add/` with
`menu_item_id` will 500 against a database that hasn't run `cart/0003_...`/`orders/0008_...`.
