"""Menu app URL patterns."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers

from .views import (
    AdminMenuCategoryViewSet,
    AdminMenuItemImageViewSet,
    AdminMenuItemViewSet,
    AdminModifierGroupViewSet,
    AdminModifierViewSet,
    FeaturedMenuItemsView,
    MenuCategoryListView,
    MenuItemDetailView,
    MenuItemListView,
)

router = DefaultRouter()
router.register("admin/items", AdminMenuItemViewSet, basename="admin-menu-item")
router.register("admin/categories", AdminMenuCategoryViewSet, basename="admin-menu-category")

# Nested: /admin/items/<menu_item_pk>/images/  and  /admin/items/<menu_item_pk>/modifier-groups/
item_router = nested_routers.NestedDefaultRouter(router, "admin/items", lookup="menu_item")
item_router.register("images", AdminMenuItemImageViewSet, basename="menu-item-images")
item_router.register("modifier-groups", AdminModifierGroupViewSet, basename="menu-item-modifier-groups")

# Nested: /admin/items/<menu_item_pk>/modifier-groups/<group_pk>/options/
group_router = nested_routers.NestedDefaultRouter(item_router, "modifier-groups", lookup="group")
group_router.register("options", AdminModifierViewSet, basename="modifier-group-options")

urlpatterns = [
    # Public
    path("", MenuItemListView.as_view(), name="menu-item-list"),
    path("featured/", FeaturedMenuItemsView.as_view(), name="menu-item-featured"),
    path("categories/", MenuCategoryListView.as_view(), name="menu-category-list"),
    path("<slug:slug>/", MenuItemDetailView.as_view(), name="menu-item-detail"),
    # Admin
    path("", include(router.urls)),
    path("", include(item_router.urls)),
    path("", include(group_router.urls)),
]
