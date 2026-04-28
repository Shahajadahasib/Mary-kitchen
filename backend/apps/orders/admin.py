from django.contrib import admin
from .models import Order, OrderItem, OrderStatusHistory

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["line_total"]

class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ["created_at"]

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["order_number", "user", "status", "payment_status", "total_amount", "created_at"]
    list_filter = ["status", "payment_status", "order_type"]
    search_fields = ["order_number", "user__email"]
    readonly_fields = ["order_number", "subtotal", "total_amount", "stripe_payment_intent_id"]
    inlines = [OrderItemInline, OrderStatusHistoryInline]
