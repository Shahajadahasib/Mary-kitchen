---
name: phase6-plan
description: Step-by-step execution plan for Phase 6 of the restaurant expansion — shared storefront chrome (dynamic footer, reciprocal cross-links), a full SEO pass for Darwin discoverability, and channel-split admin analytics. Each step is independently shippable.
metadata:
  type: project
---

# Phase 6 — plan

Phases 1–5 are done (see `restaurant_expansion_roadmap.md`). Phase 6 was left unscoped; this file
scopes it and splits it into steps that can be completed and reviewed one at a time.

Steps are ordered so that each one is independently shippable and none blocks the next. **6.2 and
6.3 are bug fixes, not polish** — the site is currently emitting incorrect SEO signals.

---

## Findings that motivated this plan

Established by reading the code, not assumed:

1. **Every public page is a client component with no metadata.** Only 4 layouts export metadata
   (`root`, `restaurant`, `shop/products`, `shop/contact`, `shop/delivery`). The grocery home,
   product detail, restaurant menu and dish detail all inherit the root layout's single generic
   title, "Mary Ben's Kitchen | Fresh Groceries Delivered in Darwin NT". Every product page in the
   catalogue therefore shares one title and one description.
2. **Three canonicals point at URLs that now redirect.** `shop/products`, `shop/contact` and
   `shop/delivery` still declare canonicals of `/products`, `/contact`, `/delivery` — all of which
   308 to `/shop/...` since the Phase 3 route move. A canonical pointing at a redirect is an error.
3. **The root layout emits `GroceryStore` JSON-LD on every page**, restaurant pages included, plus a
   `DeliveryEvent` for "Grocery Delivery Darwin NT". Because it is raw `<script>` in the root
   `<head>`, a child layout cannot override it. The restaurant is invisible as a restaurant.
4. **`sitemap.ts` is entirely static** — 8 hardcoded URLs. Not one product or dish is listed, so no
   catalogue page is discoverable through it.
5. **Cross-linking is one-way.** `RestaurantShell` links to `/shop`, but the grocery `Header` and
   `Footer` have no link to `/restaurant`. Link equity and discovery only flow one direction.
6. **The grocery `Footer` is hardcoded to the grocery shop** and is not used by the restaurant at
   all, which has its own thin inline footer in `RestaurantShell`.
7. **Four admin stats endpoints blend both businesses.** `AdminTopProductsView` groups by
   `product_name`, and restaurant lines reuse that field for the dish name, so dishes and groceries
   are already ranked in one blended list.

---

## Step 6.1 — Shared, channel-aware storefront chrome

Goal: one footer component serving both storefronts, and reciprocal links between them.

- Rewrite `components/layout/Footer.tsx` to take a `channel` ("grocery" | "restaurant") and drive
  its link columns, accent colour and copy from a per-channel config rather than module-level
  constants hardcoded to the shop.
- Give the restaurant a real footer by using that component in `RestaurantShell`, replacing the
  thin inline one.
- Add a **"Visit the Restaurant"** entry to the grocery `Header` (desktop nav row and the mobile
  menu) and a cross-storefront block in the footer of both. This is the reciprocal half of the link
  `RestaurantShell` already has.
- Keep contact details coming from the shared `StoreProfile` — both businesses trade from the same
  address, so that must not be duplicated.

Ships on its own. No SEO dependency.

## Step 6.2 — Canonical and metadata correctness

Goal: every public URL declares its own correct title, description and canonical.

- Fix the three stale canonicals (finding 2).
- Add metadata for every public route that currently has none. The pages are client components, so
  **add a co-located `layout.tsx` per route rather than converting the pages** — a layout can export
  `metadata`, and for dynamic segments `generateMetadata({ params })` can fetch the product or dish
  server-side and build a real per-item title and description.
  - `shop/layout` (grocery home), `shop/products/[slug]/layout`, `shop/products/deals/layout`,
    `restaurant/[slug]/layout`, plus the static info pages.
  - Transactional routes (`cart`, `checkout`, `orders`, `profile`, `notifications`) get
    `robots: { index: false }` instead of descriptions — they should never rank.
- Give each storefront its own OG image rather than sharing the grocery `og-image.jpg`.

## Step 6.3 — Structured data split per storefront

Goal: each business describes itself correctly to search engines.

- Strip the two JSON-LD blocks out of the root `layout.tsx`. The root keeps only an `Organization`
  (and `WebSite` with `SearchAction`) — things true of both businesses.
- `shop/layout.tsx` carries the `GroceryStore` + delivery schema that used to be global.
- `restaurant/layout.tsx` carries a `Restaurant` schema: `servesCuisine`, `hasMenu` pointing at
  `/restaurant`, `priceRange`, `acceptsReservations: false` (v1 is takeaway + delivery only).
- Add `BreadcrumbList` on detail pages and `Product` / `MenuItem` offer schema on product and dish
  pages, driven by the same server fetch added in 6.2.
- Extract a small `components/seo/JsonLd.tsx` so these are declared as data, not repeated
  `dangerouslySetInnerHTML` blocks.

## Step 6.4 — Dynamic sitemap and robots

Goal: the whole catalogue is discoverable.

- Make `sitemap.ts` async and enumerate real products and dishes from the public API, with
  `lastModified` from each record's `updated_at`.
- Handle the API being unreachable at build time by falling back to the static route list — a failed
  fetch must not fail the build.
- Keep `robots.ts` disallow rules in step with the transactional routes marked `noindex` in 6.2.

## Step 6.5 — On-page SEO hygiene

Goal: fix the things crawlers read on the page itself.

- One `<h1>` per page, containing the page's real subject.
- Real `alt` text on catalogue imagery (several are empty or repeat the product name verbatim).
- Darwin-local copy on the storefront landing pages — the suburb keywords in the root metadata are
  not backed by any on-page text.
- Verify `next/image` `sizes` are right so Core Web Vitals are not dragged down by oversized images.

## Step 6.6 — Channel-split admin analytics

Goal: stop reporting both businesses as one.

- Accept `?channel=` on `AdminRevenueView`, `AdminDashboardStatsView`, `AdminTopProductsView` and
  `AdminRefundStatsView`, defaulting to "both" so existing callers are unaffected.
- Add a channel toggle to the admin dashboard that reuses the tab pattern already on the orders
  queue.
- No migration: `Order.channel` already exists and is indexed.

---

## Deliberately not in Phase 6

- **Menu-item reviews.** `reviews.Review.product` is a non-nullable FK to `products.Product`, with
  `unique_together(user, product)` and a `save()` that calls `self.product.update_rating()`.
  Supporting dishes needs a nullable FK, a reworked constraint, rating fields on `MenuItem` and a
  data migration on a live table. That is its own phase, not polish.
- **Dine-in / table ordering.** Locked out of v1; needs a fresh product decision.

## What cannot be verified here

SEO changes can be verified as *correct markup* — canonicals resolve without redirecting, JSON-LD
parses and validates against schema.org types, every route emits a unique title, the sitemap lists
real URLs that return 200. Actual search ranking and "availability in Darwin" cannot be tested from
the repo; that needs weeks of live data in Search Console. Do not claim ranking improvements.
