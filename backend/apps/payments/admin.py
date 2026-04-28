from django.contrib import admin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["order", "user", "amount", "currency", "status", "created_at"]
    list_filter = ["status", "currency"]
    search_fields = ["order__order_number", "stripe_payment_intent_id"]
    readonly_fields = ["stripe_payment_intent_id", "stripe_client_secret", "stripe_charge_id"]
