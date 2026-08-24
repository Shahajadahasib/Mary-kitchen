"""Menu app serializers."""
from django.utils.text import slugify

from rest_framework import serializers

from core.validators import validate_image_file

from .models import MenuCategory, MenuItem, MenuItemImage, Modifier, ModifierGroup


def _unique_menu_category_slug(name: str, *, exclude_pk=None) -> str:
    base = slugify(name.strip()) or "menu-category"
    slug = base
    n = 1
    qs = MenuCategory.objects.all()
    if exclude_pk is not None:
        qs = qs.exclude(pk=exclude_pk)
    while qs.filter(slug=slug).exists():
        slug = f"{base}-{n}"
        n += 1
    return slug


class MenuCategorySerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = MenuCategory
        fields = [
            "id", "name", "slug", "description", "image", "image_url",
            "is_active", "sort_order", "item_count",
        ]
        read_only_fields = ["id", "slug", "image_url", "item_count"]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        url = obj.image.url
        return request.build_absolute_uri(url) if request else url

    def validate_image(self, value):
        return validate_image_file(value)

    def validate_name(self, value):
        name = (value or "").strip()
        if not name:
            raise serializers.ValidationError("Name is required.")
        qs = MenuCategory.objects.filter(name__iexact=name)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A menu category with this name already exists.")
        return name

    def create(self, validated_data):
        validated_data["name"] = validated_data["name"].strip()
        validated_data["slug"] = _unique_menu_category_slug(validated_data["name"])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "name" in validated_data:
            new_name = validated_data["name"].strip()
            validated_data["name"] = new_name
            if new_name != instance.name:
                validated_data["slug"] = _unique_menu_category_slug(new_name, exclude_pk=instance.pk)
        return super().update(instance, validated_data)

    def get_item_count(self, obj):
        return obj.items.filter(is_active=True).count()


class MenuItemImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItemImage
        fields = ["id", "image", "alt_text", "is_primary", "sort_order"]


class ModifierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Modifier
        fields = ["id", "name", "price_delta", "is_default", "sort_order"]


class ModifierGroupSerializer(serializers.ModelSerializer):
    options = ModifierSerializer(many=True, read_only=True)

    class Meta:
        model = ModifierGroup
        fields = [
            "id", "name", "selection_type", "is_required",
            "min_select", "max_select", "sort_order", "options",
        ]


class MenuItemListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for menu list/browse views and cart line-item detail."""
    primary_image = serializers.SerializerMethodField()
    category_name = serializers.ReadOnlyField(source="category.name")
    has_modifiers = serializers.SerializerMethodField()

    class Meta:
        model = MenuItem
        fields = [
            "id", "name", "slug", "category", "category_name", "base_price",
            "is_available", "is_featured", "dietary_tags", "prep_time_minutes",
            "primary_image", "has_modifiers",
        ]

    def get_primary_image(self, obj):
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if not img:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(img.image.url) if request else img.image.url

    def get_has_modifiers(self, obj):
        return obj.modifier_groups.exists()


class MenuItemDetailSerializer(serializers.ModelSerializer):
    images = MenuItemImageSerializer(many=True, read_only=True)
    modifier_groups = ModifierGroupSerializer(many=True, read_only=True)
    category = MenuCategorySerializer(read_only=True)

    class Meta:
        model = MenuItem
        fields = [
            "id", "name", "slug", "description", "category", "base_price",
            "is_active", "is_available", "is_featured", "dietary_tags",
            "prep_time_minutes", "images", "modifier_groups",
            "created_at", "updated_at",
        ]


class MenuItemCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = [
            "id", "category", "name", "description", "base_price",
            "is_active", "is_available", "is_featured",
            "dietary_tags", "prep_time_minutes",
        ]
        read_only_fields = ["id"]


class AdminMenuItemSerializer(MenuItemDetailSerializer):
    """Admin list/detail — same shape as the public detail serializer."""
    pass


class AdminModifierGroupCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModifierGroup
        fields = ["id", "name", "selection_type", "is_required", "min_select", "max_select", "sort_order"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        selection_type = attrs.get("selection_type", getattr(self.instance, "selection_type", "single"))
        if selection_type == "single":
            attrs["max_select"] = 1
        return attrs
