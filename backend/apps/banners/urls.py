from django.urls import path

from .views import AdminBannerDetailView, AdminBannerListCreateView, BannerListView

urlpatterns = [
    path("", BannerListView.as_view(), name="banner-list"),
    path("admin/", AdminBannerListCreateView.as_view(), name="admin-banner-list"),
    path("admin/<uuid:pk>/", AdminBannerDetailView.as_view(), name="admin-banner-detail"),
]
