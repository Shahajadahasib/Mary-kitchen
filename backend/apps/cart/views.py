"""Cart views."""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.products.models import Product, ProductVariant

from .models import Cart, CartItem
from .serializers import AddToCartSerializer, CartSerializer, UpdateCartItemSerializer


def get_or_create_cart(user) -> Cart:
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


class CartView(APIView):
    """GET /api/v1/cart/ – retrieve the current user's cart."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart = get_or_create_cart(request.user)
        serializer = CartSerializer(cart, context={"request": request})
        return Response({"success": True, "data": serializer.data})


class AddToCartView(APIView):
    """POST /api/v1/cart/add/ – add an item to the cart."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        try:
            product = Product.objects.get(id=d["product_id"], is_active=True)
        except Product.DoesNotExist:
            return Response({"success": False, "message": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

        variant = None
        if d.get("variant_id"):
            try:
                variant = ProductVariant.objects.get(id=d["variant_id"], product=product, is_active=True)
            except ProductVariant.DoesNotExist:
                return Response({"success": False, "message": "Variant not found."}, status=status.HTTP_404_NOT_FOUND)

        cart = get_or_create_cart(request.user)
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart, product=product, variant=variant,
            defaults={"quantity": d["quantity"]},
        )
        if not created:
            cart_item.quantity += d["quantity"]
            cart_item.save(update_fields=["quantity"])

        return Response(
            {"success": True, "message": "Item added to cart.", "data": CartSerializer(cart, context={"request": request}).data},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class UpdateCartItemView(APIView):
    """PATCH /api/v1/cart/items/<item_id>/ – update item quantity."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, item_id):
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            cart = get_or_create_cart(request.user)
            item = CartItem.objects.get(id=item_id, cart=cart)
        except CartItem.DoesNotExist:
            return Response({"success": False, "message": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND)

        item.quantity = serializer.validated_data["quantity"]
        item.save(update_fields=["quantity"])
        return Response({"success": True, "data": CartSerializer(cart, context={"request": request}).data})


class RemoveCartItemView(APIView):
    """DELETE /api/v1/cart/items/<item_id>/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, item_id):
        cart = get_or_create_cart(request.user)
        deleted, _ = CartItem.objects.filter(id=item_id, cart=cart).delete()
        if not deleted:
            return Response({"success": False, "message": "Item not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"success": True, "data": CartSerializer(cart, context={"request": request}).data})


class ClearCartView(APIView):
    """DELETE /api/v1/cart/clear/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        cart = get_or_create_cart(request.user)
        cart.clear()
        return Response({"success": True, "message": "Cart cleared."})
