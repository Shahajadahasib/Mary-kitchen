"""User profile & management URL patterns."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.users.views import (
    AddressViewSet,
    AdminUserDetailView,
    AdminUserListView,
    ChangePasswordView,
    UserProfileView,
    WishlistItemView,
    WishlistView,
)

router = DefaultRouter()
router.register("addresses", AddressViewSet, basename="address")

urlpatterns = [
    path("profile/", UserProfileView.as_view(), name="user-profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("wishlist/", WishlistView.as_view(), name="wishlist"),
    path("wishlist/items/<uuid:product_id>/", WishlistItemView.as_view(), name="wishlist-item"),
    path("", include(router.urls)),
    # Admin
    path("admin/users/", AdminUserListView.as_view(), name="admin-user-list"),
    path("admin/users/<uuid:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
]
