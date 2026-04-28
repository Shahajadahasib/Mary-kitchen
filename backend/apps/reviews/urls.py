from django.urls import path
from .views import (
    AdminReviewListView,
    AdminReviewModerateView,
    CreateReviewView,
    MarkReviewHelpfulView,
    ProductReviewListView,
    UpdateDeleteReviewView,
)

urlpatterns = [
    path("", CreateReviewView.as_view(), name="review-create"),
    path("<uuid:pk>/", UpdateDeleteReviewView.as_view(), name="review-detail"),
    path("<uuid:pk>/helpful/", MarkReviewHelpfulView.as_view(), name="review-helpful"),
    path("products/<uuid:product_id>/", ProductReviewListView.as_view(), name="product-reviews"),
    # Admin
    path("admin/reviews/", AdminReviewListView.as_view(), name="admin-review-list"),
    path("admin/reviews/<uuid:pk>/moderate/", AdminReviewModerateView.as_view(), name="admin-review-moderate"),
]
