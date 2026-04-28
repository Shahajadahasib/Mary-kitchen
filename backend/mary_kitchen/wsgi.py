"""WSGI config for mary_kitchen project."""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mary_kitchen.settings.production")

application = get_wsgi_application()
