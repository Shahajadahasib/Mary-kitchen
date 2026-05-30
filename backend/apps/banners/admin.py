from django.contrib import admin

from .models import Banner


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ["title", "location", "is_active", "sort_order", "starts_at", "ends_at"]
    list_filter = ["location", "is_active"]
    list_editable = ["is_active", "sort_order"]
    ordering = ["location", "sort_order"]
