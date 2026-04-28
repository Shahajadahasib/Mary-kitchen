"""Product app views."""
from django.db.models import Prefetch
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from core.permissions import IsAdminOrReadOnly, IsAdminUser

from .filters import ProductFilter
from .models import AttributeDefinition, Category, Product, ProductImage, ProductVariant
from .serializers import (
    AdminProductSerializer,
    AttributeDefinitionSerializer,
    CategorySerializer,
    ProductCreateUpdateSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ProductVariantSerializer,
)


class CategoryListView(generics.ListAPIView):
    """GET /api/v1/products/categories/ – public list of root categories."""
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            Category.objects.filter(is_active=True, parent__isnull=True)
            .prefetch_related("subcategories")
        )


class CategoryDetailView(generics.RetrieveAPIView):
    """GET /api/v1/products/categories/<slug>/"""
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    queryset = Category.objects.filter(is_active=True)
    lookup_field = "slug"


class ProductListView(generics.ListAPIView):
    """GET /api/v1/products/ – paginated, filterable product list."""
    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]
    filterset_class = ProductFilter
    search_fields = ["name", "description", "tags", "sku"]
    ordering_fields = ["base_price", "average_rating", "created_at", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return (
            Product.objects.filter(is_active=True)
            .select_related("category")
            .prefetch_related(
                Prefetch("images", queryset=ProductImage.objects.filter(is_primary=True))
            )
        )


class ProductDetailView(generics.RetrieveAPIView):
    """GET /api/v1/products/<slug>/"""
    serializer_class = ProductDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return (
            Product.objects.filter(is_active=True)
            .select_related("category")
            .prefetch_related("images", "variants")
        )


class FeaturedProductsView(generics.ListAPIView):
    """GET /api/v1/products/featured/"""
    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            Product.objects.filter(is_active=True, is_featured=True)
            .select_related("category")
            .prefetch_related("images")[:20]
        )


# ─── Admin Product Views ──────────────────────────────────────────────────────

class AdminProductViewSet(ModelViewSet):
    """Admin CRUD for products."""
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    search_fields = ["name", "sku"]
    ordering_fields = ["name", "base_price", "stock_quantity", "created_at"]

    def get_queryset(self):
        return (
            Product.objects.all()
            .select_related("category")
            .prefetch_related("images", "variants")
        )

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return ProductCreateUpdateSerializer
        return AdminProductSerializer

    @action(detail=True, methods=["post"], url_path="images")
    def upload_image(self, request, pk=None):
        product = self.get_object()
        image = request.FILES.get("image")
        if not image:
            return Response({"error": "No image provided."}, status=status.HTTP_400_BAD_REQUEST)
        raw_primary = request.data.get("is_primary", False)
        is_primary = raw_primary in (True, "true", "True", "1", 1, "yes")
        alt_text = request.data.get("alt_text", "")
        img = ProductImage.objects.create(
            product=product, image=image, alt_text=alt_text, is_primary=is_primary
        )
        return Response({"id": str(img.id), "url": request.build_absolute_uri(img.image.url)})

    @action(detail=True, methods=["delete"], url_path="images/<uuid:image_id>")
    def delete_image(self, request, pk=None, image_id=None):
        ProductImage.objects.filter(product_id=pk, id=image_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminCategoryViewSet(ModelViewSet):
    """Admin CRUD for categories."""
    serializer_class = CategorySerializer
    permission_classes = [IsAdminUser]
    queryset = Category.objects.all()
    lookup_field = "slug"


class AdminVariantViewSet(ModelViewSet):
    """Admin CRUD for product variants."""
    serializer_class = ProductVariantSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return ProductVariant.objects.filter(product_id=self.kwargs["product_pk"])

    def perform_create(self, serializer):
        serializer.save(product_id=self.kwargs["product_pk"])


class AdminAttributeDefinitionViewSet(ModelViewSet):
    """Admin CRUD for category attribute definitions."""
    serializer_class = AttributeDefinitionSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return AttributeDefinition.objects.filter(category_id=self.kwargs["category_pk"])

    def perform_create(self, serializer):
        serializer.save(category_id=self.kwargs["category_pk"])
