from django.apps import AppConfig


class MenuConfig(AppConfig):
    """Restaurant menu domain — Mary Ben's Kitchen Restaurant.

    Parallel to ``apps.products`` (the grocery catalogue) rather than sharing
    it: menu items need a multi-group modifier system (size, spice level,
    add-ons) that grocery variants don't model, and don't carry stock
    quantities — availability is a same-day on/off toggle instead.
    """
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.menu"
    verbose_name = "Restaurant Menu"

    def ready(self):
        import apps.menu.signals  # noqa: F401
