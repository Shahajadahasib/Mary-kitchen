"""
Builders for links that point back into the Next.js frontend.

The frontend serves two storefronts from one app: the grocery shop under
`/shop` and Mary Ben's Kitchen Restaurant under `/restaurant`, with the root
path reserved for the hub landing page. Anything that sends a customer back
into the site — order confirmation emails, in-app notification deep links,
Stripe return URLs — has to target the storefront the order actually belongs
to, otherwise a restaurant customer is dropped into the grocery shop (or, worse,
onto a 404).

Paths here are frontend routes, not DRF routes. Keep them in sync with
`frontend/src/app/` — `frontend/next.config.js` also carries redirects from the
pre-`/shop` URLs for links that were already sent out or stored in the database.
"""
from django.conf import settings

# Storefront root for each Order.channel value.
STOREFRONT_ROOTS = {
    "grocery": "/shop",
    "restaurant": "/restaurant",
}
DEFAULT_STOREFRONT_ROOT = STOREFRONT_ROOTS["grocery"]


def storefront_root(channel: str) -> str:
    """Frontend root path for a channel, falling back to the grocery shop."""
    return STOREFRONT_ROOTS.get((channel or "").strip().lower(), DEFAULT_STOREFRONT_ROOT)


def absolute(path: str) -> str:
    """Turn a site-relative path into an absolute URL on the frontend host."""
    return f"{settings.FRONTEND_URL.rstrip('/')}{path}"


def order_path(order) -> str:
    """Relative path to a customer's order-detail page, e.g. /shop/orders/MK-123."""
    return f"{storefront_root(order.channel)}/orders/{order.order_number}"


def order_url(order) -> str:
    """Absolute URL to a customer's order-detail page."""
    return absolute(order_path(order))


def checkout_success_url(order) -> str:
    """Stripe `success_url` for an order, with the session-id placeholder intact."""
    root = storefront_root(order.channel)
    return absolute(f"{root}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}")


def checkout_cancel_url(order) -> str:
    """Stripe `cancel_url` — back to the checkout page the order came from."""
    return absolute(f"{storefront_root(order.channel)}/checkout?canceled=1")


def admin_order_url(order) -> str:
    """Absolute URL to the staff-facing order row. Admin is channel-agnostic."""
    return absolute(f"/admin/orders?order={order.order_number}")
