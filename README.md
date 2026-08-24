# Mary Kitchen 🛒🍽️

**Two storefronts, one business — a grocery shop and a restaurant serving Darwin, NT, Australia.**

Mary Kitchen is an online ordering platform for a Darwin food business that sells in two ways: a
**grocery shop** for fresh fish, meats, vegetables, grains and pantry goods, and **Mary Ben's Kitchen
Restaurant** for cooked dishes ordered for delivery or takeaway. Both run on the same site, share one
customer account and one admin console, and deliver from the same physical location using the same
delivery zones.

Visitors land on a hub page and pick a storefront:

| Where | What it is |
| --- | --- |
| `/` | Hub landing page — one card per storefront |
| `/shop` | The grocery storefront: catalogue, cart, checkout, order tracking |
| `/restaurant` | Mary Ben's Kitchen Restaurant: menu, dish detail, cart, checkout, order tracking |
| `/admin` | Staff dashboard for both businesses |

> **Status:** the platform is feature-complete for both storefronts and in active use. Remaining work
> is polish — channel-split admin analytics, and reviews for restaurant dishes.

---

## What customers can do

### Accounts, shared by both storefronts

- Register and sign in with an email address and password
- Sign in with a one-time code (OTP) instead of a password
- Verify their email address and reset a forgotten password by OTP
- Manage their profile and save multiple delivery addresses (Darwin NT focused)
- Keep one account and one order history across the grocery shop and the restaurant

### Grocery shopping (`/shop`)

- Browse a nested category tree and search the catalogue
- Filter by price, category, rating and availability, and see a dedicated deals page
- View products with multiple photos, discount badges and category-specific details — fish shows
  freshness and cut, oils show brand and volume, and so on
- Pick a size or pack variant (500 g, 1 kg, 2 kg …), each with its own price and stock
- Order items that are out of stock, which raises an alert for staff
- Save products to a wishlist
- Leave a star rating and review on products they have actually bought
- Read the shop's about, contact, delivery, terms and privacy pages

### Restaurant ordering (`/restaurant`)

- Browse the menu by category, with dietary tags (vegetarian, vegan, gluten-free and similar) as
  filters and featured dishes highlighted
- Open a dish for photos, description and preparation time
- Build the dish with modifier groups — choose a size, a spice level, add extras — where each group
  can be single- or multiple-choice, optional or required with minimum and maximum picks, and each
  option carries its own price adjustment
- See the price update live as modifiers are chosen
- Order dishes that are on the menu and available today; kitchen staff can "86" a dish for the day
  without removing it from the menu

### Checkout and orders, on both storefronts

- A persistent, database-backed cart that survives sign-out and follows the customer between devices
- Separate carts for groceries and for restaurant dishes, so one does not disturb the other
- Delivery or pickup, with the delivery fee calculated from the distance between the store and the
  delivery address
- Card payment through Stripe
- Order confirmation by email with a PDF receipt attached
- Live order tracking through the full status timeline: pending → confirmed → processing → out for
  delivery → delivered, plus cancellations and refunds
- Order history, filtered per storefront
- In-app and email notifications for order updates

---

## What staff can do

The admin dashboard is a purpose-built part of the site (separate from Django's own admin) and covers
both businesses from one login.

- **Orders** — one queue with All / Grocery / Restaurant tabs, order detail, and status updates that
  notify the customer
- **Grocery catalogue** — create and edit products, manage variants and stock, upload multiple
  images, set discounts, and define the dynamic attribute fields available per category
- **Categories** — manage the nested grocery category tree
- **Menu** — manage menu categories and dishes: photos, prices, dietary tags, modifier groups and
  options, plus separate "on the menu" and "available today" toggles
- **Users** — view and manage customer accounts
- **Delivery** — configure delivery zones and their distance-based fees
- **Analytics** — sales and order charts and totals
- **Banners and store settings** — promotional banners, store profile and opening hours
- **Alerts** — out-of-stock notifications from customer orders

---

## Under the hood

- **Discoverability** — per-page titles, descriptions and canonical URLs across the whole catalogue,
  storefront-specific structured data (a `GroceryStore` under `/shop`, a `Restaurant` with its menu
  under `/restaurant`), Open Graph images generated from the product or dish, and a sitemap built
  from the live catalogue
- **Security** — JWT authentication with refresh-token rotation, OTP flows, API rate limiting, and
  hardened cookie and header settings in production
- **Performance and reliability** — Redis caching, background jobs for email and notifications so
  checkout never waits on an inbox, and pagination on every list endpoint
- **Documented API** — the whole platform runs on a versioned REST API with generated Swagger and
  ReDoc documentation

### Built with

| Layer | Technology |
| ------- | ------------ |
| **Backend** | Python 3.12 · Django 4.2 · Django REST Framework |
| **Database** | PostgreSQL 16 |
| **Cache / Queue** | Redis + Celery |
| **Frontend** | Next.js 14 · TypeScript · Tailwind CSS |
| **Payments** | Stripe |
| **Auth** | JWT (SimpleJWT) + OTP |
| **Storage** | Local (dev) / AWS S3 (prod) |
| **Deployment** | Docker + Gunicorn, deployed by GitHub Actions |

---

## Running it yourself

Installation, configuration and local development instructions live in **[SETUP.md](SETUP.md)**.

---

## License

MIT – Built for Mary Kitchen, Darwin NT, Australia.
