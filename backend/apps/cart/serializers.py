from rest_framework import serializers

from apps.products.serializers import ProductListSerializer, ProductVariantSerializer
from apps.menu.serializers import MenuItemListSerializer
from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product_detail = ProductListSerializer(source="product", read_only=True)
    variant_detail = ProductVariantSerializer(source="variant", read_only=True)
    menu_item_detail = MenuItemListSerializer(source="menu_item", read_only=True)
    unit_price = serializers.ReadOnlyField()
    line_total = serializers.ReadOnlyField()

    class Meta:
        model = CartItem
        fields = [
            "id", "product", "variant", "menu_item",
            "product_detail", "variant_detail", "menu_item_detail",
            "selected_modifiers",
            "quantity", "unit_price", "line_total",
        ]

    def validate(self, attrs):
        product = attrs.get("product")
        variant = attrs.get("variant")
        if variant and product and variant.product != product:
            raise serializers.ValidationError("Variant does not belong to this product.")
        return attrs


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.ReadOnlyField()
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = ["id", "channel", "items", "total_items", "subtotal"]


class AddToCartSerializer(serializers.Serializer):
    product_id = serializers.UUIDField(required=False, allow_null=True)
    variant_id = serializers.UUIDField(required=False, allow_null=True)
    menu_item_id = serializers.UUIDField(required=False, allow_null=True)
    modifier_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list
    )
    quantity = serializers.IntegerField(min_value=1, default=1)

    def validate(self, attrs):
        has_product = bool(attrs.get("product_id"))
        has_menu_item = bool(attrs.get("menu_item_id"))
        if has_product == has_menu_item:
            raise serializers.ValidationError(
                "Provide exactly one of product_id (grocery) or menu_item_id (restaurant)."
            )
        return attrs


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)
