"""Menu app views."""
from django.db.models.deletion import ProtectedError
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core.pagination import AdminResultsPagination
from core.permissions import ADMIN_API_PERMISSION_CLASSES
from core.validators import validate_image_file

from .filters import MenuItemFilter
from .models import MenuCategory, MenuItem, MenuItemImage, Modifier, ModifierGroup
from .serializers import (
    AdminMenuItemSerializer,
    AdminModifierGroupCreateSerializer,
    MenuCategorySerializer,
    MenuItemCreateUpdateSerializer,
    MenuItemDetailSerializer,
    MenuItemImageSerializer,
    MenuItemListSerializer,
    ModifierSerializer,
)


# ─── Public ─────────────────────────────────────────────────────────────────

class MenuCategoryListView(generics.ListAPIView):
    """GET /api/v1/menu/categories/"""
    serializer_class = MenuCategorySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return MenuCategory.objects.filter(is_active=True)


class MenuItemListView(generics.ListAPIView):
    """GET /api/v1/menu/ – paginated, filterable dish list."""
    serializer_class = MenuItemListSerializer
    permission_classes = [AllowAny]
    filterset_class = MenuItemFilter
    search_fields = ["name", "description"]
    ordering_fields = ["base_price", "created_at", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return (
            MenuItem.objects.filter(is_active=True, is_available=True)
            .select_related("category")
            .prefetch_related("images", "modifier_groups__options")
        )


class FeaturedMenuItemsView(generics.ListAPIView):
    """GET /api/v1/menu/featured/"""
    serializer_class = MenuItemListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            MenuItem.objects.filter(is_active=True, is_available=True, is_featured=True)
            .select_related("category")
            .prefetch_related("images")[:20]
        )


class MenuItemDetailView(generics.RetrieveAPIView):
    """GET /api/v1/menu/<slug>/"""
    serializer_class = MenuItemDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return (
            MenuItem.objects.filter(is_active=True)
            .select_related("category")
            .prefetch_related("images", "modifier_groups__options")
        )


# ─── Admin ──────────────────────────────────────────────────────────────────

class AdminMenuCategoryViewSet(ModelViewSet):
    """Admin CRUD for menu categories."""
    serializer_class = MenuCategorySerializer
    permission_classes = ADMIN_API_PERMISSION_CLASSES
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = MenuCategory.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.items.exists():
            return Response(
                {"detail": "This category cannot be deleted because it contains menu items."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "This category cannot be deleted because it contains menu items."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class AdminMenuItemViewSet(ModelViewSet):
    """Admin CRUD for menu items."""
    permission_classes = ADMIN_API_PERMISSION_CLASSES
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = AdminResultsPagination
    filterset_class = MenuItemFilter
    search_fields = ["name"]
    ordering_fields = ["name", "base_price", "created_at"]

    def get_queryset(self):
        return (
            MenuItem.objects.all()
            .select_related("category")
            .prefetch_related("images", "modifier_groups__options")
        )

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return MenuItemCreateUpdateSerializer
        return AdminMenuItemSerializer

    @action(detail=True, methods=["post"], url_path="images")
    def upload_image(self, request, pk=None):
        item = self.get_object()
        image = request.FILES.get("image")
        if not image:
            return Response({"error": "No image provided."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_image_file(image)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        raw_primary = request.data.get("is_primary", False)
        is_primary = raw_primary in (True, "true", "True", "1", 1, "yes")
        alt_text = request.data.get("alt_text", "")
        img = MenuItemImage.objects.create(
            menu_item=item, image=image, alt_text=alt_text, is_primary=is_primary
        )
        return Response({"id": str(img.id), "url": request.build_absolute_uri(img.image.url)})

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "This dish cannot be deleted because it has existing orders. Deactivate it instead."},
                status=status.HTTP_409_CONFLICT,
            )


class AdminMenuItemImageViewSet(ModelViewSet):
    """Admin CRUD for a menu item's images. Nested under /admin/items/<item_pk>/images/."""
    serializer_class = MenuItemImageSerializer
    permission_classes = ADMIN_API_PERMISSION_CLASSES
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "delete", "patch"]

    def get_queryset(self):
        return MenuItemImage.objects.filter(menu_item_id=self.kwargs["menu_item_pk"])

    def perform_create(self, serializer):
        item = MenuItem.objects.get(pk=self.kwargs["menu_item_pk"])
        serializer.save(menu_item=item)


class AdminModifierGroupViewSet(ModelViewSet):
    """Admin CRUD for a menu item's modifier groups. Nested under /admin/items/<item_pk>/modifier-groups/."""
    serializer_class = AdminModifierGroupCreateSerializer
    permission_classes = ADMIN_API_PERMISSION_CLASSES

    def get_queryset(self):
        return ModifierGroup.objects.filter(menu_item_id=self.kwargs["menu_item_pk"])

    def perform_create(self, serializer):
        serializer.save(menu_item_id=self.kwargs["menu_item_pk"])


class AdminModifierViewSet(ModelViewSet):
    """Admin CRUD for options within a modifier group. Nested under .../modifier-groups/<group_pk>/options/."""
    serializer_class = ModifierSerializer
    permission_classes = ADMIN_API_PERMISSION_CLASSES

    def get_queryset(self):
        return Modifier.objects.filter(group_id=self.kwargs["group_pk"])

    def perform_create(self, serializer):
        serializer.save(group_id=self.kwargs["group_pk"])
