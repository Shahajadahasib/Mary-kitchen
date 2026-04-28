from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import AdminDeliveryZoneViewSet, DeliveryFeeView, DeliveryZoneListView

router = DefaultRouter()
router.register("admin/zones", AdminDeliveryZoneViewSet, basename="admin-delivery-zone")

urlpatterns = [
    path("zones/", DeliveryZoneListView.as_view(), name="delivery-zones"),
    path("calculate-fee/", DeliveryFeeView.as_view(), name="delivery-fee"),
    path("", include(router.urls)),
]
