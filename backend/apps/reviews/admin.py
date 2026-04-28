from django.contrib import admin
from .models import Review

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["user", "product", "rating", "is_approved", "is_flagged", "created_at"]
    list_filter = ["is_approved", "is_flagged", "rating"]
    search_fields = ["user__email", "product__name"]
    actions = ["approve_reviews", "flag_reviews"]

    def approve_reviews(self, request, queryset):
        queryset.update(is_approved=True, is_flagged=False)
    approve_reviews.short_description = "Approve selected reviews"

    def flag_reviews(self, request, queryset):
        queryset.update(is_flagged=True, is_approved=False)
    flag_reviews.short_description = "Flag selected reviews"
