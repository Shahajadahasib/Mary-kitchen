from django.contrib import admin
from .models import Cart, CartItem

class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ["user", "channel", "total_items", "subtotal"]
    list_filter = ["channel"]
    inlines = [CartItemInline]
