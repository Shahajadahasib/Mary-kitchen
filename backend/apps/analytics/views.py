import datetime

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order
from core.permissions import ADMIN_API_PERMISSION_CLASSES

from .models import Visit


class VisitCreateView(APIView):
    """POST /api/v1/analytics/visit/ – record a real storefront visit."""

    permission_classes = [AllowAny]

    def post(self, request):
        session_id = str(request.data.get("session_id", "")).strip()
        if not session_id:
            return Response({"session_id": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)

        Visit.objects.create(session_id=session_id)
        return Response({"success": True}, status=status.HTTP_201_CREATED)


class ConversionView(APIView):
    """GET /api/v1/analytics/conversion/?days=7 – paid orders divided by visits."""

    permission_classes = ADMIN_API_PERMISSION_CLASSES

    def get(self, request):
        try:
            days = max(1, min(int(request.query_params.get("days", 7)), 90))
        except (TypeError, ValueError):
            days = 7

        since = timezone.now().date() - datetime.timedelta(days=days - 1)
        visits = Visit.objects.filter(created_at__date__gte=since).values("session_id").distinct().count()
        orders = Order.objects.filter(
            created_at__date__gte=since,
            payment_status="paid",
            session_id__isnull=False,
        ).exclude(session_id="").values("session_id").distinct().count()
        conversion_rate = (orders / visits) * 100 if visits else 0.0

        return Response(
            {
                "visits": visits,
                "orders": orders,
                "conversion_rate": float(conversion_rate),
            }
        )
