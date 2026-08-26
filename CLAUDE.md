# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mary Kitchen is a full-stack grocery e-commerce platform for Darwin, NT, Australia. It has a Django REST Framework backend and a Next.js 14 frontend, connected via a versioned REST API.

**In progress:** a second storefront, "Mary Ben's Kitchen Restaurant", is being added alongside the grocery
shop on the same backend/frontend — one login, one admin console, both reachable from a shared landing page
at the root domain. The backend foundation (new `apps.menu` domain + a unified order/cart pipeline that
serves both channels) shipped and has been verified twice (migrations apply cleanly, `makemigrations
--check` is clean, end-to-end smoke tests pass) — see `memory/project_features_batch2.md`. Every
`Order`/`Cart`/`OrderItem`/`CartItem` now carries a `channel` (`"grocery"` | `"restaurant"`) — read that
file before touching checkout, cart, or order code.

Phases 3 and 4 have since shipped too: the root path is a hub landing page, the grocery shop moved to
`/shop`, and the restaurant storefront (menu browse, dish detail with modifier picker, cart, checkout,
order tracking) is live under `/restaurant`. The migrations have been applied to the development database.

Phase 5 has shipped as well: `/admin/menu` manages menu categories and dishes (photos, modifier groups,
and separate on-menu / 86-for-today toggles), and the admin orders queue has All / Grocery / Restaurant
tabs.

Phase 6 has now shipped too — it was scoped in `memory/phase6_plan.md` and delivered in two passes:
channel-aware footer, reciprocal cross-links and the full SEO pass (steps 6.1–6.5), then channel-split
admin analytics (step 6.6: an optional `?channel=` on the four admin stats endpoints, and a
Both / Grocery / Restaurant tab row on the dashboard).

**Resuming this work in a new session:** the restaurant expansion is feature-complete for v1. Start at
`memory/restaurant_expansion_roadmap.md`, which has the locked product decisions, a "Things later
phases must not undo" section covering the invariants that were easy to get wrong, and the list of
work deliberately left out of v1 (menu-item reviews, dine-in ordering, per-channel visit tracking).

## Development Commands

### Backend
```bash
cd backend
source venv/bin/activate          # or: source ../venv/bin/activate
python manage.py runserver        # runs on http://localhost:8000
python manage.py migrate
python manage.py createsuperuser
python manage.py shell
python manage.py test              # whole suite
python manage.py test apps.orders  # one app
```

Tests live in each app's `tests.py`, with shared object builders in
`backend/core/test_factories.py` — use those rather than hand-rolling fixtures, since
most models need a unique slug or SKU and collide otherwise. The suite leans on the
places where the two storefronts share code and behave differently (stock vs. 86-list
availability, per-channel carts, channel-aware frontend links); add to it when you touch
that seam.

Settings module is selected via `DJANGO_SETTINGS_MODULE`. Default is `mary_kitchen.settings.development`. The `development` settings use `CELERY_TASK_ALWAYS_EAGER=True` (no Redis/worker needed) and `LocMemCache` (no Redis needed for sessions/cache).

### Frontend
```bash
cd frontend
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

### Docker (full stack)
```bash
cp backend/.env.example backend/.env   # then edit
docker-compose up --build
```

### API Docs (when backend is running)
- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/

## CI/CD

One workflow, `.github/workflows/ci.yml`, holds everything. It runs on pushes to `main`
and on pull requests targeting `main`.

Three check jobs run in parallel — `backend` (missing-migration check, a `check --deploy`
pass against production settings, then the test suite against Postgres), `frontend`
(lint, `tsc --noEmit`, build) and `docker` (builds both Dockerfiles, which is what
production actually runs). A fourth job, `deploy`, declares
`needs: [backend, frontend, docker]`, so a red check makes the deploy unreachable rather
than merely unadvisable. Keep it that way: moving the deploy back into its own workflow
re-creates the race it used to lose, where it shipped in parallel with the checks.

`deploy` SSHes to the VPS and runs `deploy/deploy.sh <sha>`, which checks out the exact
tested commit, builds images while the old stack still serves, migrates from a one-off
container before any new container takes traffic, then health-checks both services and
rolls back to the previous commit if either fails to answer. Edit that script rather than
inlining steps into the workflow, so the same sequence can be run by hand on the box.

Running it by hand is a supported path, not an emergency hack — the deploy job depends on
GitHub's runner reaching the VPS over SSH, which has failed before with
`dial tcp …:22: i/o timeout`, and the same commit can then be shipped from any machine that
can log in. SETUP.md, "Deploying by hand", has the commands and the post-deploy checks that
confirm which build is actually being served.

`render.yaml` is a second, unused deployment path kept from an earlier setup
(`autoDeploy: false`). The VPS is the live one.

## Architecture

### Backend (`backend/`)

**Settings**: Split into `mary_kitchen/settings/base.py`, `development.py`, `production.py`. Config values are loaded from `backend/.env` via `python-decouple` (`AutoConfig` always reads from `BASE_DIR`, regardless of where `manage.py` is invoked from).

**Apps** (`backend/apps/`):
- `users` — custom email-based `User` model (extends `AbstractBaseUser`), JWT auth via SimpleJWT, OTP system (email verification, login, password reset), addresses, wishlist
- `products` — `Category` (nested tree), `Product`, `ProductVariant`, `ProductImage`, dynamic per-category `AttributeDefinition` with `JSONField` attributes on products — the **grocery** catalogue
- `menu` — `MenuCategory`, `MenuItem` (`is_active` = permanently on the menu, `is_available` = today's 86 list; no stock quantity), `MenuItemImage`, `ModifierGroup`/`Modifier` (per-dish choice groups like size/spice/add-ons, each option with its own `price_delta`) — the **restaurant** catalogue. Deliberately not merged into `products`; see `apps/menu/apps.py::MenuConfig` docstring.
- `cart` — DB-backed persistent cart, one per `(user, channel)` — `channel` is `"grocery"` or `"restaurant"`. `CartItem` is either a grocery product/variant *or* a menu item + `selected_modifiers` JSON snapshot, never both.
- `orders` — `Order` with full status flow (`pending → confirmed → processing → out_for_delivery → delivered / cancelled / refunded`), `OrderItem`, `OrderStatusHistory` audit trail, delivery address stored as JSON snapshot. `Order.channel` and `OrderItem.menu_item`/`selected_modifiers` make this one pipeline serve both storefronts — see "Restaurant expansion" below.
- `payments` — Stripe `PaymentIntent` creation and webhook handling
- `reviews` — star ratings, only for purchased **grocery** products so far, admin moderation
- `notifications` — in-app and email notifications via Celery tasks; OTP emails, order confirmation with PDF attachment (`reportlab`), order status updates
- `delivery` — `DeliveryZone` model with distance-based fee calculation using `geopy`; store coordinates from env vars. Shared as-is by restaurant delivery orders — same store location, same zones.
- `analytics` — sales and order analytics endpoints

**Core** (`backend/core/`):
- `mixins.py` — `BaseModel` (UUID PK + timestamps), `TimeStampedModel`, `UUIDModel`, `SoftDeleteModel`
- `permissions.py` — `IsAdminUser`, `IsOwnerOrAdmin`, `IsOwnerOrReadOnly`, `IsAdminOrReadOnly`; use `ADMIN_API_PERMISSION_CLASSES` constant on all admin-only endpoints
- `pagination.py` — `StandardResultsPagination` (20/page), `AdminResultsPagination` (50/page), `LargeResultsPagination` (50/page, 200 max)
- `exceptions.py` — custom DRF exception handlers

**URL structure**: All REST endpoints are under `api/v1/`. Each app has its own `urls.py` (users has `urls/auth_urls.py` and `urls/user_urls.py`).

**Async tasks**: Celery tasks live in `apps/notifications/tasks.py` (and scattered in other apps). In development, tasks run synchronously (eager mode).

### Frontend (`frontend/src/`)

**Routing**: Next.js 14 App Router, one app serving two storefronts:
- `page.tsx` at the root — the hub landing page, one card per storefront
- `shop/` — the grocery storefront (products, cart, checkout, orders, profile, wishlist)
- `restaurant/` — the restaurant storefront (menu, dish detail, cart, checkout, orders)
- `(admin)/admin/` — protected admin dashboard (orders, products, menu, categories, users, delivery, analytics)
- Top-level routes: `login`, `register`, `verify-email`, `forgot-password` — shared by both storefronts

The grocery shop used to live at the root as a `(shop)` route group. `next.config.js` carries permanent
redirects from those old paths to `/shop/...`, for links already in sent emails, stored notification rows,
and customer bookmarks. Backend-generated links come from `core/frontend_urls.py`, which picks the
storefront from `Order.channel` — never hardcode `/shop` or `/restaurant` into a backend link.

**API client** (`lib/api.ts`): Axios instance with base URL from `NEXT_PUBLIC_API_URL`. Attaches JWT access token from cookies on every request. Automatically refreshes token on 401 using refresh token; redirects to `/login` on refresh failure. FormData requests automatically drop the `Content-Type` header to let the browser set the multipart boundary.

**State management**:
- `store/authStore.ts` — Zustand + `persist` middleware (localStorage). Tracks `user`, `isAuthenticated`, `hasHydrated`. Protected routes must wait for `hasHydrated` before checking `isAuthenticated`.
- `store/cartStore.ts` — one Zustand store instance per channel: `useGroceryCart` and `useRestaurantCart`. The backend keeps one cart per `(user, channel)`, so picking the hook picks the channel — never add a "current cart" that infers the channel from the route.

**Key libraries**: `@tanstack/react-query` for server state, `react-hook-form` + `zod` for forms, `recharts` for admin charts, `@stripe/react-stripe-js` for payment UI, `react-hot-toast` for notifications.

## Key Conventions

- All models extend `BaseModel` (UUID PK + `created_at`/`updated_at`). Never use integer PKs for new models.
- Admin-only REST views use `permission_classes = ADMIN_API_PERMISSION_CLASSES` from `core.permissions`.
- Paginated list responses have the shape: `{ count, total_pages, current_page, next, previous, results }`.
- The delivery address on `Order` is a JSON snapshot taken at checkout — it does not reference the `Address` model by FK.
- Product `attributes` is a `JSONField` keyed by `AttributeDefinition.key` values; valid keys/types are defined per category.
- Celery tasks use `bind=True, max_retries=3` and re-raise via `self.retry(exc=exc, countdown=60)`.
- Frontend image/file uploads must use `FormData`; the Axios client handles the `Content-Type` header automatically.
