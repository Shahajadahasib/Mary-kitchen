"""Product app serializers."""
from rest_framework import serializers

from .models import AttributeDefinition, Category, Product, ProductImage, ProductVariant


class CategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id", "name", "slug", "description", "image", "parent",
            "is_active", "sort_order", "subcategories", "product_count",
        ]

    def get_subcategories(self, obj):
        children = obj.subcategories.filter(is_active=True)
        return CategorySerializer(children, many=True, context=self.context).data

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()


class AttributeDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttributeDefinition
        fields = ["id", "name", "key", "field_type", "options", "is_required", "sort_order"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt_text", "is_primary", "sort_order"]


class ProductVariantSerializer(serializers.ModelSerializer):
    discount_percentage = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            "id", "name", "sku", "price", "compare_price",
            "stock_quantity", "is_active", "sort_order", "attributes",
            "discount_percentage", "is_in_stock",
        ]

    def get_discount_percentage(self, obj):
        if obj.compare_price and obj.compare_price > obj.price:
            return round(((obj.compare_price - obj.price) / obj.compare_price) * 100)
        return 0


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    primary_image = serializers.SerializerMethodField()
    category_name = serializers.ReadOnlyField(source="category.name")
    has_variants = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "category", "category_name",
            "base_price", "compare_price", "discount_percentage",
            "stock_quantity", "is_in_stock", "is_featured",
            "average_rating", "review_count", "unit",
            "primary_image", "has_variants", "tags",
        ]

    def get_primary_image(self, obj):
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if img:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(img.image.url)
        return None

    def get_has_variants(self, obj):
        return obj.variants.filter(is_active=True).exists()


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full serializer for product detail view."""
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    attribute_definitions = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "description", "category",
            "base_price", "compare_price", "discount_percentage",
            "stock_quantity", "allow_out_of_stock_orders", "is_in_stock",
            "is_active", "is_featured", "average_rating", "review_count",
            "weight", "unit", "attributes", "sku", "tags",
            "images", "variants", "attribute_definitions",
            "created_at", "updated_at",
        ]

    def get_attribute_definitions(self, obj):
        defs = AttributeDefinition.objects.filter(category=obj.category)
        return AttributeDefinitionSerializer(defs, many=True).data


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """For admin product create/update."""
    class Meta:
        model = Product
        fields = [
            "name", "description", "category",
            "base_price", "compare_price",
            "stock_quantity", "allow_out_of_stock_orders",
            "is_active", "is_featured",
            "weight", "unit", "attributes", "sku", "tags",
        ]

    def validate_sku(self, value):
        qs = Product.objects.filter(sku=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("SKU must be unique.")
        return value


class AdminProductSerializer(ProductDetailSerializer):
    """Admin view adds stock management fields."""
    class Meta(ProductDetailSerializer.Meta):
        fields = ProductDetailSerializer.Meta.fields + ["allow_out_of_stock_orders"]
