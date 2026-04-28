from django.urls import path
from .views import (
    AdminOrderDetailView,
    AdminOrderListView,
    AdminOrderStatusUpdateView,
    CancelOrderView,
    CheckoutView,
    OrderDetailView,
    OrderListView,
)

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("", OrderListView.as_view(), name="order-list"),
    path("<str:order_number>/", OrderDetailView.as_view(), name="order-detail"),
    path("<str:order_number>/cancel/", CancelOrderView.as_view(), name="order-cancel"),
    # Admin
    path("admin/orders/", AdminOrderListView.as_view(), name="admin-order-list"),
    path("admin/orders/<str:order_number>/", AdminOrderDetailView.as_view(), name="admin-order-detail"),
    path("admin/orders/<str:order_number>/status/", AdminOrderStatusUpdateView.as_view(), name="admin-order-status"),
]
