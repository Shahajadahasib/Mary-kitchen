"""Cart views."""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.products.models import Product, ProductVariant
from apps.menu.models import MenuItem
from apps.menu.services import validate_and_snapshot_modifiers

from .models import Cart, CartItem
from .serializers import AddToCartSerializer, CartSerializer, UpdateCartItemSerializer

VALID_CHANNELS = {"grocery", "restaurant"}


def _clean_channel(raw: str) -> str:
    channel = (raw or "grocery").strip().lower()
    return channel if channel in VALID_CHANNELS else "grocery"


def get_or_create_cart(user, channel: str = "grocery") -> Cart:
    cart, _ = Cart.objects.get_or_create(user=user, channel=_clean_channel(channel))
    return cart


def validate_cart_items(cart: Cart) -> dict:
    """
    Validate every item in the cart against current product/stock (grocery)
    or availability (restaurant) state.
    Returns {'valid_items': [...], 'invalid_items': [...], 'can_checkout': bool}.
    """
    valid_items = []
    invalid_items = []

    for item in cart.items.select_related("product", "variant", "menu_item"):
        reason = None

        if item.menu_item_id:
            menu_item = item.menu_item
            name = menu_item.name
            if not menu_item.is_active or not menu_item.is_available:
                reason = "This dish is currently unavailable"
            entry = {"id": str(item.id), "menu_item_id": str(menu_item.id), "product_name": name, "quantity": item.quantity}
        else:
            product = item.product
            variant = item.variant
            name = product.name

            if not product.is_active:
                reason = "Product is no longer available"
            elif variant and not variant.is_active:
                reason = "This variant is no longer available"
            else:
                stock_obj = variant if variant else product
                available = stock_obj.stock_quantity
                if available == 0:
                    reason = "Out of stock"
                elif available < item.quantity:
                    reason = f"Only {available} left in stock"

            entry = {"id": str(item.id), "product_id": str(product.id), "product_name": name, "quantity": item.quantity}

        if reason:
            invalid_items.append({**entry, "reason": reason})
        else:
            valid_items.append(entry)

    return {
        "valid_items": valid_items,
        "invalid_items": invalid_items,
        "can_checkout": len(valid_items) > 0,
    }


class CartView(APIView):
    """GET /api/v1/cart/?channel=grocery|restaurant – retrieve the current user's cart."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        channel = _clean_channel(request.query_params.get("channel"))
        cart = get_or_create_cart(request.user, channel)
        serializer = CartSerializer(cart, context={"request": request})
        return Response({"success": True, "data": serializer.data})


class CartValidateView(APIView):
    """GET /api/v1/cart/validate/?channel=grocery|restaurant"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        channel = _clean_channel(request.query_params.get("channel"))
        cart = get_or_create_cart(request.user, channel)
        result = validate_cart_items(cart)
        return Response({"success": True, **result})


class AddToCartView(APIView):
    """POST /api/v1/cart/add/ – add a grocery product or a restaurant menu item to its cart."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        if d.get("menu_item_id"):
            return self._add_menu_item(request, d)
        return self._add_product(request, d)

    def _add_product(self, request, d):
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

        cart = get_or_create_cart(request.user, "grocery")
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

    def _add_menu_item(self, request, d):
        try:
            menu_item = MenuItem.objects.get(id=d["menu_item_id"], is_active=True, is_available=True)
        except MenuItem.DoesNotExist:
            return Response(
                {"success": False, "message": "This dish is not available."}, status=status.HTTP_404_NOT_FOUND
            )

        try:
            snapshot, _ = validate_and_snapshot_modifiers(menu_item, d.get("modifier_ids") or [])
        except Exception as e:
            detail = getattr(e, "detail", str(e))
            message = detail[0] if isinstance(detail, list) else str(detail)
            return Response({"success": False, "message": str(message)}, status=status.HTTP_400_BAD_REQUEST)

        selected_ids = sorted(m["modifier_id"] for m in snapshot)

        cart = get_or_create_cart(request.user, "restaurant")
        existing = None
        for candidate in cart.items.filter(menu_item=menu_item):
            if sorted(m["modifier_id"] for m in candidate.selected_modifiers) == selected_ids:
                existing = candidate
                break

        if existing:
            existing.quantity += d["quantity"]
            existing.save(update_fields=["quantity"])
        else:
            CartItem.objects.create(
                cart=cart, menu_item=menu_item, selected_modifiers=snapshot, quantity=d["quantity"]
            )

        return Response(
            {"success": True, "message": "Item added to cart.", "data": CartSerializer(cart, context={"request": request}).data},
            status=status.HTTP_200_OK,
        )


class UpdateCartItemView(APIView):
    """PATCH /api/v1/cart/items/<item_id>/ – update item quantity."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, item_id):
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = CartItem.objects.select_related("cart").get(id=item_id, cart__user=request.user)
        except CartItem.DoesNotExist:
            return Response({"success": False, "message": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND)

        item.quantity = serializer.validated_data["quantity"]
        item.save(update_fields=["quantity"])
        return Response({"success": True, "data": CartSerializer(item.cart, context={"request": request}).data})


class RemoveCartItemView(APIView):
    """DELETE /api/v1/cart/items/<item_id>/remove/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, item_id):
        try:
            item = CartItem.objects.select_related("cart").get(id=item_id, cart__user=request.user)
        except CartItem.DoesNotExist:
            return Response({"success": False, "message": "Item not found."}, status=status.HTTP_404_NOT_FOUND)
        cart = item.cart
        item.delete()
        return Response({"success": True, "data": CartSerializer(cart, context={"request": request}).data})


class ClearCartView(APIView):
    """DELETE /api/v1/cart/clear/?channel=grocery|restaurant"""
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        channel = _clean_channel(request.query_params.get("channel"))
        cart = get_or_create_cart(request.user, channel)
        cart.clear()
        return Response({"success": True, "message": "Cart cleared."})
