"""Production settings."""
from decouple import config, Csv

from .base import *  # noqa: F401, F403

DEBUG = False

ALLOWED_HOSTS = config("ALLOWED_HOSTS", cast=Csv())

# Loopback names are always allowed, on top of whatever the environment sets.
#
# Both health probes reach the API over loopback — deploy/deploy.sh curls
# http://localhost:8000/api/v1/products/ from the host, and the backend
# service's healthcheck in docker-compose.yml opens http://127.0.0.1:8000/...
# from inside the container. Django resolves the Host header before routing, so
# without these entries it answers DisallowedHost/400 and the deploy concludes
# the backend is dead. That is not hypothetical: it rolled back a release whose
# containers had all started correctly and whose migrations had already applied.
#
# Accepting them costs nothing. Real traffic arrives through Nginx, which sets
# Host to the public domain, and nothing here builds outbound links from
# request.get_host() — core/frontend_urls.py uses FRONTEND_URL — so a spoofed
# Host cannot poison an email link or a redirect.
for _loopback in ("localhost", "127.0.0.1", "[::1]"):
    if _loopback not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_loopback)

# HTTPS / Security
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
# SECURE_SSL_REDIRECT = True
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=False, cast=bool)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

X_FRAME_OPTIONS = "DENY"

# ─── Reverse proxy: real client IP (Axes + django-ratelimit) ─────────────────
# Nginx / Cloudflare typically set X-Forwarded-For; fall back to REMOTE_ADDR.
AXES_META_PRECEDENCE_ORDER = [
    "HTTP_X_FORWARDED_FOR",
    "REMOTE_ADDR",
]
AXES_VERBOSE = True

RATELIMIT_IP_META_KEY = "HTTP_X_FORWARDED_FOR"

# S3 Storage
USE_S3 = config("USE_S3", default=False, cast=bool)
if USE_S3:
    AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME")
    AWS_S3_REGION_NAME = config("AWS_S3_REGION_NAME", default="ap-southeast-2")
    AWS_S3_CUSTOM_DOMAIN = f"{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com"
    AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}
    AWS_DEFAULT_ACL = "public-read"

    DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
    MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/media/"

CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", default="", cast=Csv())
CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", default="", cast=Csv())

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "WARNING", "propagate": True},
    },
}
