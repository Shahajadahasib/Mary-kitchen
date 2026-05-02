from django.urls import path
from .views import (
    AdminNotificationListView,
    AdminNotificationUnreadCountView,
    MarkAdminNotificationsReadView,
    MarkAllNotificationsReadView,
    MarkNotificationReadView,
    NotificationListView,
    UnreadCountView,
)

urlpatterns = [
    path("admin/unread-count/", AdminNotificationUnreadCountView.as_view(), name="admin-notification-unread-count"),
    path("admin/mark-all-read/", MarkAdminNotificationsReadView.as_view(), name="admin-notification-mark-all-read"),
    path("admin/", AdminNotificationListView.as_view(), name="admin-notification-list"),
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread-count/", UnreadCountView.as_view(), name="notification-unread-count"),
    path("mark-all-read/", MarkAllNotificationsReadView.as_view(), name="notification-mark-all-read"),
    path("<uuid:pk>/read/", MarkNotificationReadView.as_view(), name="notification-read"),
]
