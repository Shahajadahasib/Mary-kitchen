"""ASGI config for mary_kitchen project."""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mary_kitchen.settings.production")

application = get_asgi_application()
