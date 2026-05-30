"""Banner views – public read + admin CRUD."""
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import AllowAny

from core.permissions import ADMIN_API_PERMISSION_CLASSES

from .models import Banner
from .serializers import BannerSerializer


class BannerListView(generics.ListAPIView):
    """GET /api/v1/banners/ – active banners for the storefront."""
    serializer_class = BannerSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        now = timezone.now()
        qs = Banner.objects.filter(
            is_active=True,
        ).filter(
            Q(starts_at__isnull=True) | Q(starts_at__lte=now),
        ).filter(
            Q(ends_at__isnull=True) | Q(ends_at__gte=now),
        )
        location = self.request.query_params.get("location")
        if location:
            qs = qs.filter(location=location)
        return qs


class AdminBannerListCreateView(generics.ListCreateAPIView):
    """Admin: GET/POST /api/v1/banners/admin/"""
    serializer_class = BannerSerializer
    permission_classes = ADMIN_API_PERMISSION_CLASSES
    queryset = Banner.objects.all()


class AdminBannerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: GET/PATCH/DELETE /api/v1/banners/admin/<id>/"""
    serializer_class = BannerSerializer
    permission_classes = ADMIN_API_PERMISSION_CLASSES
    queryset = Banner.objects.all()
