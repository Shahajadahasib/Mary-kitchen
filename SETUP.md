# Setup & Development Guide

How to configure Mary Kitchen and run it on a local machine. For what the platform *is* and what it
does, see [README.md](README.md).

There are two ways to run it locally:

- **[With Docker](#running-locally-with-docker-recommended)** — recommended. Nothing but Docker
  Desktop needs to be installed.
- **[Without Docker](#running-locally-without-docker)** — run Django and Next.js on the host, useful
  when you are iterating heavily on one of them.

---

## Repository layout

```
Mary Kitchen/
├── backend/                   # Django + DRF API
│   ├── mary_kitchen/          # Project config
│   │   └── settings/          # base / development / production
│   ├── apps/
│   │   ├── users/             # Custom user model, JWT, OTP, addresses, wishlist
│   │   ├── products/          # Products, variants, dynamic attributes, categories (grocery catalogue)
│   │   ├── menu/              # Menu categories, dishes, modifier groups (restaurant catalogue)
│   │   ├── cart/              # Persistent DB-backed cart, one per (user, channel)
│   │   ├── delivery/          # Delivery zones & fee calculation (Darwin-centric), shared by both channels
│   │   ├── orders/            # Orders, status flow, history — channel field serves both storefronts
│   │   ├── payments/          # Stripe PaymentIntents & webhooks
│   │   ├── reviews/           # Star ratings + admin moderation (grocery products so far)
│   │   ├── notifications/     # Email, SMS (Twilio placeholder), in-app
│   │   ├── analytics/         # Sales & order analytics endpoints
│   │   ├── banners/           # Promotional banners
│   │   └── store/             # Store profile & opening hours
│   └── core/                  # Pagination, permissions, mixins, exceptions
├── frontend/                  # Next.js 14 App Router
│   └── src/
│       ├── app/
│       │   ├── page.tsx       # Hub landing page — one card per storefront
│       │   ├── shop/          # Grocery storefront
│       │   ├── restaurant/    # Restaurant storefront
│       │   ├── (admin)/       # Admin dashboard pages
│       │   └── login, register, verify-email, forgot-password  # shared by both
│       ├── components/        # Reusable UI components
│       ├── store/             # Zustand global state (auth + cart, one per channel)
│       └── lib/               # Axios API client, utilities
├── deploy/                    # VPS deploy script and nginx config
├── docker-compose.yml         # Full-stack Docker setup — serves both local dev and the VPS
├── .env.example               # Compose-level overrides that switch that file to local mode
└── setup.sh                   # One-command non-Docker dev setup script
```

---

`scripts/` holds developer utilities that are not part of the deployed app —
currently `pull-prod-data.sh`, which seeds a local database from the VPS (see step 6 below).

## Running locally with Docker (recommended)

Docker is the shortest path to a working local copy: you do not need Python, Node, PostgreSQL or
Redis installed on your machine — only Docker Desktop.

### 1. Install Docker Desktop

**Windows** (PowerShell):
```powershell
winget install --id Docker.DockerDesktop --exact
```

**macOS**:
```bash
brew install --cask docker
```

Or download the installer from <https://www.docker.com/products/docker-desktop/>.

On Windows the installer needs to elevate (approve the UAC prompt) and requires **WSL 2** with
hardware virtualization enabled in the BIOS. Docker Desktop ships its own WSL distributions, so you
do **not** need to install Ubuntu or any other distro yourself. A reboot is usually required to
finish setup.

Then **launch Docker Desktop once** from the Start menu, accept the service agreement, and wait for
the whale icon in the system tray to report *Engine running*. Signing in to a Docker account is not
required. Verify from a **new** terminal (the installer adds Docker to `PATH`):

```bash
docker --version
docker compose version
```

### 2. Create the two env files

There are two, and they do different jobs:

```bash
cp .env.example .env                   # read by Docker Compose itself
cp backend/.env.example backend/.env   # read by Django, inside the container
```

```powershell
# PowerShell equivalent
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
```

The root **`.env`** flips `docker-compose.yml` into local mode — development settings, a named
volume for media, and a browser-reachable API URL. Copy it as-is; no editing needed. It is
gitignored, which is exactly why the production defaults are baked into `docker-compose.yml` (see
[below](#one-compose-file-two-environments)).

In **`backend/.env`**, set `SECRET_KEY` to any random string. Everything else already has working
local defaults — the database and Redis values match the compose services, and email prints to the
backend container log rather than actually being sent. You only need real credentials if you want to
exercise Stripe payments or genuine email delivery.

### 3. Start the stack

```bash
docker compose up --build
```

The first build pulls the Postgres/Redis/Python/Node images and installs both dependency trees, so
expect roughly 5–10 minutes. Subsequent starts (`docker compose up -d`) take seconds.

### 4. Run migrations

A fresh database has no schema, so the API will error until you run this once (the deploy job runs
the same step against the VPS):

```bash
docker compose exec -T backend python manage.py migrate --no-input
```

`celery_beat` restart-loops until this finishes — it needs the `django_celery_beat` tables — and
settles on its own afterwards.

Once that is done, both storefronts are live:

| URL | What you get |
|---|---|
| <http://localhost:3000/> | Hub landing page — choose a storefront |
| <http://localhost:3000/shop> | Grocery storefront |
| <http://localhost:3000/restaurant> | Mary Ben's Kitchen Restaurant storefront |
| <http://localhost:3000/admin> | Custom Next.js admin dashboard (staff login required) |
| <http://localhost:8000/api/docs/> | Swagger UI |
| <http://localhost:8000/admin/> | Django admin |

### 5. Create an admin user

```bash
docker compose exec backend python manage.py createsuperuser
```

Log in with that account at <http://localhost:3000/login> to reach the admin dashboard, or at
<http://localhost:8000/admin/> for Django admin. A fresh database has no products or menu items —
add a few through the admin so the storefronts have something to show.

### 6. Optional — seed from production instead

A fresh database is empty. Rather than hand-entering test content, you can copy the live
catalogue, orders and users down from the VPS:

```bash
# One-off
VPS_HOST=user@your-vps bash scripts/pull-prod-data.sh --with-media

# Or save the target once (scripts/.env.local is gitignored)
echo 'VPS_HOST=user@your-vps' > scripts/.env.local
bash scripts/pull-prod-data.sh --with-media
```

Run it from Git Bash on Windows — it is a bash script. Requirements: the local stack already
running (`docker compose up -d`) and SSH access to the VPS. It asks you to type `yes` before
doing anything, because it drops your local database.

Drop `--with-media` if you only want rows; product and dish images will then 404 locally.

**What it does, and does not, touch.** Production is only ever read: the script runs `pg_dump`
and `tar` over SSH, and deletes nothing on the server except the two temporary files it creates
in `/tmp`. The `DROP DATABASE` runs inside the *local* `mary-kitchen-db-1` container. The dump is
downloaded and confirmed before anything local is dropped, so a failed connection leaves your
local database untouched.

Nothing flows the other way either. Deploys ship code, not rows — `deploy/deploy.sh`'s only
database command is `migrate`. Changes you make locally never reach the VPS.

Three things to know afterwards:

- **Your local admin accounts are gone.** Sign in with production credentials instead; password
  hashes come across in the dump.
- **The dump contains real customer data** — names, addresses, phone numbers, order history. It is
  kept at `.local-data/` (gitignored). Delete it when you are done.
- **Leave `EMAIL_BACKEND` on the console backend** while real customer rows are loaded, or a
  status-change test will email an actual customer.

The copy is a snapshot, not a mirror. It goes stale as soon as someone orders on the live site.

### Everyday commands

```bash
# Stop (containers removed, database and uploaded media kept)
docker compose down

# Follow logs for one service
docker compose logs -f backend

# Django shell / management commands
docker compose exec backend python manage.py shell
docker compose exec backend python manage.py makemigrations

# psql against the local database
docker compose exec db psql -U postgres -d mary_kitchen_db

# Wipe everything including the database volume and start clean
docker compose down -v
```

Code is baked into the images rather than mounted, so after editing `backend/` or `frontend/`
rebuild the service you changed:

```bash
docker compose up -d --build backend     # or: frontend
```

If you are iterating heavily, it is faster to run that one service on the host (`python manage.py
runserver` / `npm run dev`) and leave the rest in Docker.

<a id="one-compose-file-two-environments"></a>

### One compose file, two environments

There is a single `docker-compose.yml`, used both here and by the deploy job in
`.github/workflows/ci.yml` on the VPS. A handful of values are `${VAR:-default}` substitutions whose
**defaults are the production values**, so the server needs no configuration at all —
`docker compose up -d --build` there behaves exactly as it always has. Your root `.env` supplies the
local values, and since it is gitignored it can never leak onto the server.

| Variable | Production default | Local `.env` value |
|---|---|---|
| `DJANGO_SETTINGS_MODULE` | `mary_kitchen.settings.production` | `mary_kitchen.settings.development` |
| `MEDIA_VOLUME` | `/var/www/Mary-kitchen/media` (VPS bind mount) | `media_data` (named volume) |
| `NEXT_PUBLIC_API_URL` | `http://backend:8000/api/v1` | `http://localhost:8000/api/v1` |

Switching to the development settings is what makes the stack usable over plain `http://localhost`:
production sets `DEBUG=False` (so Django stops serving `/media/`, and uploaded images 404) and forces
`SESSION_COOKIE_SECURE`/`CSRF_COOKIE_SECURE` (so Django admin login cannot complete without HTTPS).
It also runs Celery tasks eagerly, so the `celery_worker` and `celery_beat` containers idle
harmlessly.

The API URL row matters most: `NEXT_PUBLIC_*` values are inlined into the browser bundle **at build
time** (see the `env` block in `next.config.js`), and it is the browser — not the container — that
calls the API, so the value has to be a URL your browser can resolve. `docker-compose.yml` therefore
passes it as a Docker **build arg**, not just a container env var.

### Troubleshooting

| Symptom | Fix |
|---|---|
| `docker: command not found` | Open a new terminal after installing, or launch Docker Desktop once. |
| `error during connect ... docker_engine` | Docker Desktop is not running. Start it and wait for *Engine running*. |
| `env file ./backend/.env not found` | You skipped step 2 — both `.env` files are gitignored and must be created locally. |
| Backend 500s / `relation does not exist` | Migrations have not been run — see step 4. |
| `celery_beat` keeps restarting | Same cause; it settles once migrations have run. |
| `Bind for 0.0.0.0:5432 failed: port is already allocated` | A local PostgreSQL/Redis is already using the port. Stop it, or drop the `ports` mapping for `db`/`redis` in `docker-compose.yml` (nothing outside Docker needs them). |
| Frontend loads but every API call fails | The frontend was built against a different API URL. Check the root `.env`, then `docker compose build --no-cache frontend`. |
| Django admin login bounces back to the form | You are running the production settings over plain http — confirm the root `.env` exists and sets `DJANGO_SETTINGS_MODULE`. |
| WSL / virtualization errors on Windows | Run `wsl --update`, and enable virtualization (Intel VT-x / AMD-V) in the BIOS. |

---

## Running locally without Docker

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Redis (optional for dev, required for notifications)

### Option A – automated setup script
```bash
bash setup.sh
```

### Option B – manual setup

**Backend**
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then edit .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver  # http://localhost:8000
```

The settings module is selected with `DJANGO_SETTINGS_MODULE`; the default is
`mary_kitchen.settings.development`, which uses `CELERY_TASK_ALWAYS_EAGER=True` (no Redis or worker
process needed) and `LocMemCache` (no Redis needed for sessions or cache).

**Frontend**
```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

Create `frontend/.env.local` with:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

---

## Environment variables

### Backend (`backend/.env`)

Loaded via `python-decouple`; `AutoConfig` always reads from `BASE_DIR`, regardless of where
`manage.py` is invoked from.

| Variable | Description |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` for development |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | PostgreSQL connection |
| `REDIS_URL` | Redis URL (cache + sessions) |
| `CELERY_BROKER_URL` | Celery broker (Redis) |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `EMAIL_HOST` / `EMAIL_HOST_USER` | SMTP settings |
| `TWILIO_*` | SMS credentials (optional) |
| `STORE_LATITUDE` / `STORE_LONGITUDE` | Store location for delivery radius |

### Frontend (`frontend/.env.local`)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Django API base URL |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

---

## API documentation

Once the backend is running:
- **Swagger UI**: <http://localhost:8000/api/docs/>
- **ReDoc**: <http://localhost:8000/api/redoc/>
- **Schema JSON**: <http://localhost:8000/api/schema/>

All REST endpoints live under `api/v1/`. Paginated list responses have the shape
`{ count, total_pages, current_page, next, previous, results }`.

### Key endpoints

| Endpoint | Description |
|---|---|
| `POST /api/v1/auth/register/` | User registration |
| `POST /api/v1/auth/login/` | Login with JWT |
| `POST /api/v1/auth/otp/request/` | Request OTP |
| `GET /api/v1/products/` | Product list (filterable) |
| `GET /api/v1/products/featured/` | Featured products |
| `GET /api/v1/products/categories/` | Category tree |
| `GET /api/v1/menu/` | Restaurant menu items (filterable) |
| `GET /api/v1/menu/categories/` | Menu category list |
| `GET /api/v1/cart/?channel=grocery\|restaurant` | View cart for a channel (defaults to grocery) |
| `POST /api/v1/cart/add/` | Add to cart — `{product_id, variant_id}` or `{menu_item_id, modifier_ids}` |
| `POST /api/v1/orders/checkout/` | Create order — pass `channel: "restaurant"` for a menu order |
| `GET /api/v1/orders/?channel=grocery\|restaurant` | Order history (omit `channel` and you get both storefronts) |
| `POST /api/v1/payments/create-intent/` | Stripe PaymentIntent |
| `POST /api/v1/payments/webhook/` | Stripe webhook |
| `POST /api/v1/delivery/calculate-fee/` | Calculate delivery fee |

---

## Database schema (key models)

```
User (email-based auth, OTP, profile)
 └── Address (multiple per user, default flag)
 └── Wishlist → WishlistItem → Product

Category (parent/child tree)
 └── AttributeDefinition (dynamic per-category fields)

Product
 └── ProductImage (multiple, primary flag)
 └── ProductVariant (SKU, price, stock)
 └── attributes (JSONField for dynamic attrs)

MenuCategory
MenuItem (is_active + daily is_available toggle, no stock quantity)
 └── MenuItemImage (multiple, primary flag)
 └── ModifierGroup (e.g. "Choose your size" — single/multiple, required/min/max)
     └── Modifier (one option, own price_delta)

Cart (one per user+channel) → CartItem → Product/ProductVariant OR MenuItem + selected_modifiers

Order (channel: grocery | restaurant) → OrderItem (product OR menu_item + selected_modifiers)
 └── OrderStatusHistory (full audit trail)
 └── delivery_address (JSON snapshot)

Payment (Stripe PaymentIntent tracking)
Review (purchased products only, admin moderation)
Notification (in-app, email via Celery)
DeliveryZone (distance-based, configurable fees)
```

---

## Conventions to follow when contributing

- All models extend `BaseModel` (UUID PK + `created_at`/`updated_at`). Never use integer PKs for new
  models.
- Admin-only REST views use `permission_classes = ADMIN_API_PERMISSION_CLASSES` from
  `core.permissions`.
- The delivery address on `Order` is a JSON snapshot taken at checkout — it does not reference the
  `Address` model by FK.
- Product `attributes` is a `JSONField` keyed by `AttributeDefinition.key` values; the valid keys and
  types are defined per category.
- Celery tasks use `bind=True, max_retries=3` and re-raise via `self.retry(exc=exc, countdown=60)`.
- Frontend image and file uploads must use `FormData`; the Axios client drops the `Content-Type`
  header automatically so the browser can set the multipart boundary.
- Backend links into the site are built by `core/frontend_urls.py` from `Order.channel` — never
  hardcode `/shop/...` or `/restaurant/...` in backend code.
- `store/cartStore.ts` exposes `useGroceryCart` and `useRestaurantCart` as separate instances. Keep
  the channel explicit at every call site.

---

## Deployment notes

CI lives in `.github/workflows/ci.yml`: backend tests, frontend typecheck and build, and a Docker
image build all have to pass before the deploy job runs `deploy/deploy.sh` over SSH on the VPS. That
script checks out the exact tested commit, builds the new images while the old stack still serves
traffic, migrates from a one-off container on the new image, restarts, and rolls back to the previous
commit if the stack does not answer.

For a fresh production environment:

1. Set `DEBUG=False` and configure `ALLOWED_HOSTS`.
2. Configure AWS S3 for media storage (`USE_S3=True`).
3. Use a strong random `SECRET_KEY`.
4. Point the Stripe webhook endpoint at `https://yourdomain/api/v1/payments/webhook/`.
5. Run `python manage.py collectstatic` before deployment.
6. Serve over HTTPS — the security headers are pre-configured in the production settings.

### Published ports

Every port in `docker-compose.yml` is published to `${BIND_HOST:-127.0.0.1}`, never `0.0.0.0`.
This matters more than it looks. Docker installs its own DNAT rules ahead of ufw's `INPUT` chain,
so a `"5432:5432"` mapping is reachable from the internet even on a box whose firewall denies
5432 — which is exactly how a container Postgres ends up publicly listening with default
credentials. Nothing outside the host needs these ports: containers reach each other by service
name over the compose network, and Nginx proxies to `127.0.0.1`.

If you ever need to reach the stack from another machine on your LAN, set `BIND_HOST=0.0.0.0` in
the root `.env` on that development machine only. Never on the VPS.

After deploying this change, confirm from somewhere off the box that the ports really are closed:

```bash
nc -zv your-vps-host 5432   # expect: refused / timed out
nc -zv your-vps-host 6379   # expect: refused / timed out
nc -zv your-vps-host 8000   # expect: refused / timed out
curl -I https://marybenskitchen.com   # expect: 200, still served through Nginx
```

If Postgres was previously reachable, treat its credentials as compromised: rotate `DB_PASSWORD`
(`ALTER USER postgres WITH PASSWORD '…'` — changing `POSTGRES_PASSWORD` alone does nothing to an
existing data volume), update `backend/.env`, and restart the stack.

### Database snapshots and rolling back

`deploy/deploy.sh` writes a gzipped `pg_dump` to `/var/backups/mary-kitchen/` immediately before
each migrate step, keeps the last ten, and aborts the deploy if the snapshot cannot be taken.

This exists because **a rollback restores code, not schema.** When a health check fails, the script
puts the previous commit back and rebuilds — but the migrations it already applied stay applied. If
the migration was additive (a new nullable column, a new table) the old code is unaffected and the
rollback is clean. If it dropped or renamed something, the old code is now talking to a schema it
does not understand, and you have to restore the snapshot; the rollback output prints the exact
command.

The way to avoid needing it: split destructive schema changes across two releases. Ship the additive
half first (add the new column, backfill it, write to both), let it bake, and only drop the old
column in a later deploy once nothing reads it. Then any single deploy is always rollback-safe.

### Downtime during a deploy

`docker compose up -d` recreates the `backend` and `frontend` containers, so there is a window —
usually a few seconds, up to ~30 for a cold Next.js start — where Nginx has nothing to proxy to and
returns 502. The build and the migration both happen *before* that, while the old stack is still
serving, so the window is a container restart rather than a full release.

Two ways to shorten or remove it, in increasing order of effort:

- **Make Nginx wait instead of failing.** Add `proxy_connect_timeout 2s;` plus
  `proxy_next_upstream error timeout http_502;` and a short retry to the upstream block. Visitors
  see a slow request instead of an error page. This is a config change on the box, no
  rearchitecting.
- **Run two replicas behind Nginx and restart them one at a time.** Give `backend` and `frontend`
  two instances on distinct ports, list both in the Nginx `upstream`, and have the deploy recreate
  one, wait for it to answer, then recreate the other. That is genuinely zero-downtime, at the cost
  of a more complicated compose file and roughly double the memory.

Whichever you choose, deploy at a quiet hour for Darwin (NT is UTC+9:30 and does not observe
daylight saving), and watch `docker compose logs -f backend` until the health checks pass.
