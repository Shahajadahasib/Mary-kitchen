from rest_framework import serializers

from .models import Banner


class BannerSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False)

    class Meta:
        model = Banner
        fields = [
            "id", "title", "subtitle", "image", "link",
            "location", "size", "is_active", "sort_order",
            "starts_at", "ends_at", "created_at",
        ]
