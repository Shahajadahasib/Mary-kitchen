# Mary Kitchen 🛒
### Production-Ready Grocery & Food E-Commerce Platform

A full-stack grocery marketplace built for **Darwin, NT, Australia** — featuring fresh fish, meats, vegetables, grains and more.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.12 · Django 4.2 · Django REST Framework |
| **Database** | PostgreSQL 16 |
| **Cache / Queue** | Redis + Celery |
| **Frontend** | Next.js 14 · TypeScript · Tailwind CSS |
| **Payments** | Stripe |
| **Auth** | JWT (SimpleJWT) + OTP |
| **Storage** | Local (dev) / AWS S3 (prod) |
| **Deployment** | Docker + Gunicorn |

---

## Architecture

```
Mary Kitchen/
├── backend/                   # Django + DRF API
│   ├── mary_kitchen/          # Project config
│   │   └── settings/          # base / development / production
│   ├── apps/
│   │   ├── users/             # Custom user model, JWT, OTP, addresses, wishlist
│   │   ├── products/          # Products, variants, dynamic attributes, categories
│   │   ├── cart/              # Persistent DB-backed cart
│   │   ├── delivery/          # Delivery zones & fee calculation (Darwin-centric)
│   │   ├── orders/            # Orders, status flow, history
│   │   ├── payments/          # Stripe PaymentIntents & webhooks
│   │   ├── reviews/           # Star ratings + admin moderation
│   │   └── notifications/     # Email, SMS (Twilio placeholder), in-app
│   └── core/                  # Pagination, permissions, mixins, exceptions
├── frontend/                  # Next.js 14 App Router
│   └── src/
│       ├── app/
│       │   ├── (shop)/        # Public-facing shop pages
│       │   └── (admin)/       # Admin dashboard pages
│       ├── components/        # Reusable UI components
│       ├── store/             # Zustand global state (auth + cart)
│       └── lib/               # Axios API client, utilities
├── docker-compose.yml         # Full-stack Docker setup
└── setup.sh                   # One-command dev setup script
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Redis (optional for dev, required for notifications)

### Option A – Automated Setup Script
```bash
bash setup.sh
```

### Option B – Docker (recommended)
```bash
# Copy and configure .env
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

docker-compose up --build
```

### Option C – Manual Setup

**Backend**
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # Edit .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

**Frontend**
```bash
cd frontend
cp .env.local.example .env.local   # Edit .env.local
npm install
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)
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

## API Documentation

Once the backend is running:
- **Swagger UI**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/redoc/
- **Schema JSON**: http://localhost:8000/api/schema/

### Key Endpoints

| Endpoint | Description |
|---|---|
| `POST /api/v1/auth/register/` | User registration |
| `POST /api/v1/auth/login/` | Login with JWT |
| `POST /api/v1/auth/otp/request/` | Request OTP |
| `GET /api/v1/products/` | Product list (filterable) |
| `GET /api/v1/products/featured/` | Featured products |
| `GET /api/v1/products/categories/` | Category tree |
| `GET /api/v1/cart/` | View cart |
| `POST /api/v1/cart/add/` | Add to cart |
| `POST /api/v1/orders/checkout/` | Create order |
| `POST /api/v1/payments/create-intent/` | Stripe PaymentIntent |
| `POST /api/v1/payments/webhook/` | Stripe webhook |
| `GET /api/v1/orders/` | Order history |
| `POST /api/v1/delivery/calculate-fee/` | Calculate delivery fee |

---

## Database Schema (Key Models)

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

Cart → CartItem → Product / ProductVariant

Order → OrderItem
 └── OrderStatusHistory (full audit trail)
 └── delivery_address (JSON snapshot)

Payment (Stripe PaymentIntent tracking)
Review (purchased products only, admin moderation)
Notification (in-app, email via Celery)
DeliveryZone (distance-based, configurable fees)
```

---

## Features

### Customer Features
- ✅ Email/password registration & login
- ✅ OTP login & email verification
- ✅ Password reset via OTP
- ✅ Profile management
- ✅ Multiple saved addresses (Darwin NT focus)
- ✅ Persistent shopping cart (DB-backed)
- ✅ Wishlist
- ✅ Product search & filtering (price, category, rating, availability)
- ✅ Delivery & pickup order types
- ✅ Stripe card payment
- ✅ Order tracking with status timeline
- ✅ Order history
- ✅ Product reviews (purchased items only)
- ✅ In-app & email notifications

### Product System
- ✅ Flexible variant system (500g, 1kg, 2kg etc.)
- ✅ Dynamic per-category attributes (Fish → freshness/cut, Oil → brand/volume)
- ✅ Multiple product images
- ✅ Out-of-stock ordering (with admin alert)
- ✅ Discount pricing with percentage badges

### Admin Panel
- ✅ Custom Next.js admin dashboard (separate from Django admin)
- ✅ Sales & order analytics with charts
- ✅ Order management with status updates
- ✅ Product CRUD with variant management
- ✅ User management
- ✅ Delivery zone configuration
- ✅ Out-of-stock alerts

### Technical
- ✅ JWT authentication with refresh token rotation
- ✅ Celery async tasks (emails, SMS, notifications)
- ✅ Redis caching
- ✅ API rate limiting
- ✅ Pagination on all list endpoints
- ✅ DRF Spectacular API documentation
- ✅ Docker + Docker Compose
- ✅ Environment-based settings (dev/prod)

---

## Deployment Notes

1. Set `DEBUG=False` and configure `ALLOWED_HOSTS` in production
2. Configure AWS S3 for media storage (`USE_S3=True`)
3. Use a strong random `SECRET_KEY`
4. Set Stripe webhook endpoint to `https://yourdomain/api/v1/payments/webhook/`
5. Run `python manage.py collectstatic` before deployment
6. Use HTTPS – security headers are pre-configured for production

---

## License
MIT – Built for Mary Kitchen, Darwin NT, Australia.
