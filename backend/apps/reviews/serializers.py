from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source="user.full_name")
    user_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id", "user", "user_name", "user_avatar",
            "product", "rating", "title", "body",
            "is_approved", "helpful_count", "created_at",
        ]
        read_only_fields = ["id", "user", "is_approved", "helpful_count", "created_at"]

    def get_user_avatar(self, obj):
        if obj.user.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.user.avatar.url)
        return None

    def validate_product(self, value):
        user = self.context["request"].user
        from apps.orders.models import Order, OrderItem
        has_purchased = OrderItem.objects.filter(
            order__user=user, product=value, order__payment_status="paid"
        ).exists()
        if not has_purchased:
            raise serializers.ValidationError("You can only review products you have purchased.")
        return value


class AdminReviewSerializer(ReviewSerializer):
    class Meta(ReviewSerializer.Meta):
        fields = ReviewSerializer.Meta.fields + ["is_flagged", "admin_note"]
        read_only_fields = ["id", "user", "helpful_count", "created_at"]
