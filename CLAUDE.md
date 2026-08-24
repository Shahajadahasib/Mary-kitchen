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

**Resuming this work in a new session:** the frontend (hub page, restaurant storefront, admin menu screens
— Phases 3-6) has not been built yet. Start at `memory/restaurant_expansion_roadmap.md` — it has the
locked product decisions, the exact current frontend route structure, and a concrete step-by-step plan for
each remaining phase. One manual prerequisite before starting: the two new migrations
(`cart/0003_...`, `orders/0008_...`, plus `menu/0001_initial`) need to be applied with
`python manage.py migrate` — as of 2026-08-24 this has been verified in a sandbox but not yet run against
the real development database.

## Development Commands

### Backend
```bash
cd backend
source venv/bin/activate          # or: source ../venv/bin/activate
python manage.py runserver        # runs on http://localhost:8000
python manage.py migrate
python manage.py createsuperuser
python manage.py shell
```

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

**Routing**: Next.js 14 App Router with two route groups:
- `(shop)/` — public-facing shop (products, cart, checkout, orders, profile, wishlist)
- `(admin)/admin/` — protected admin dashboard (orders, products, categories, users, delivery, analytics)
- Top-level routes: `login`, `register`, `verify-email`, `forgot-password`

**API client** (`lib/api.ts`): Axios instance with base URL from `NEXT_PUBLIC_API_URL`. Attaches JWT access token from cookies on every request. Automatically refreshes token on 401 using refresh token; redirects to `/login` on refresh failure. FormData requests automatically drop the `Content-Type` header to let the browser set the multipart boundary.

**State management**:
- `store/authStore.ts` — Zustand + `persist` middleware (localStorage). Tracks `user`, `isAuthenticated`, `hasHydrated`. Protected routes must wait for `hasHydrated` before checking `isAuthenticated`.
- `store/cartStore.ts` — Zustand cart state

**Key libraries**: `@tanstack/react-query` for server state, `react-hook-form` + `zod` for forms, `recharts` for admin charts, `@stripe/react-stripe-js` for payment UI, `react-hot-toast` for notifications.

## Key Conventions

- All models extend `BaseModel` (UUID PK + `created_at`/`updated_at`). Never use integer PKs for new models.
- Admin-only REST views use `permission_classes = ADMIN_API_PERMISSION_CLASSES` from `core.permissions`.
- Paginated list responses have the shape: `{ count, total_pages, current_page, next, previous, results }`.
- The delivery address on `Order` is a JSON snapshot taken at checkout — it does not reference the `Address` model by FK.
- Product `attributes` is a `JSONField` keyed by `AttributeDefinition.key` values; valid keys/types are defined per category.
- Celery tasks use `bind=True, max_retries=3` and re-raise via `self.retry(exc=exc, countdown=60)`.
- Frontend image/file uploads must use `FormData`; the Axios client handles the `Content-Type` header automatically.
