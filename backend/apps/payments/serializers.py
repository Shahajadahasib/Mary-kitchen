from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    order_number = serializers.ReadOnlyField(source="order.order_number")

    class Meta:
        model = Payment
        fields = [
            "id", "order", "order_number", "amount", "currency",
            "status", "stripe_payment_intent_id", "failure_message",
            "created_at",
        ]
        read_only_fields = ["id", "stripe_payment_intent_id", "created_at"]
