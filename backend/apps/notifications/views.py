"""Notification views."""
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import ADMIN_API_PERMISSION_CLASSES

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """GET /api/v1/notifications/ – user's notifications (shop; excludes staff order alerts)."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).exclude(notification_type="admin_order")


class MarkNotificationReadView(APIView):
    """POST /api/v1/notifications/<id>/read/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        updated = Notification.objects.filter(id=pk, user=request.user).update(is_read=True)
        if not updated:
            return Response({"success": False, "message": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"success": True})


class MarkAllNotificationsReadView(APIView):
    """POST /api/v1/notifications/mark-all-read/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).exclude(
            notification_type="admin_order"
        ).update(is_read=True)
        return Response({"success": True, "message": "All notifications marked as read."})


class UnreadCountView(APIView):
    """GET /api/v1/notifications/unread-count/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = (
            Notification.objects.filter(user=request.user, is_read=False)
            .exclude(notification_type="admin_order")
            .count()
        )
        return Response({"unread_count": count})


class AdminNotificationListView(generics.ListAPIView):
    """GET /api/v1/notifications/admin/ — staff new-order alerts only."""

    serializer_class = NotificationSerializer
    permission_classes = ADMIN_API_PERMISSION_CLASSES

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user, notification_type="admin_order")


class AdminNotificationUnreadCountView(APIView):
    """GET /api/v1/notifications/admin/unread-count/"""

    permission_classes = ADMIN_API_PERMISSION_CLASSES

    def get(self, request):
        count = Notification.objects.filter(
            user=request.user, notification_type="admin_order", is_read=False
        ).count()
        return Response({"unread_count": count})


class MarkAdminNotificationsReadView(APIView):
    """POST /api/v1/notifications/admin/mark-all-read/"""

    permission_classes = ADMIN_API_PERMISSION_CLASSES

    def post(self, request):
        Notification.objects.filter(
            user=request.user, notification_type="admin_order", is_read=False
        ).update(is_read=True)
        return Response({"success": True, "message": "All order alerts marked as read."})
