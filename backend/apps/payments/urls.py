from django.urls import path
from .views import CreatePaymentIntentView, PaymentListView, PaymentWebhookView, RefundView

urlpatterns = [
    path("create-intent/", CreatePaymentIntentView.as_view(), name="payment-create-intent"),
    path("webhook/", PaymentWebhookView.as_view(), name="payment-webhook"),
    path("", PaymentListView.as_view(), name="payment-list"),
    path("refund/", RefundView.as_view(), name="payment-refund"),
]
