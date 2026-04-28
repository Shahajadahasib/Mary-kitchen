"""In-app notification model."""
from django.db import models
from core.mixins import BaseModel


class Notification(BaseModel):
    """In-app notification for a user."""
    TYPE_CHOICES = [
        ("order_update", "Order Update"),
        ("payment", "Payment"),
        ("promotion", "Promotion"),
        ("system", "System"),
        ("review", "Review"),
    ]

    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="system")
    is_read = models.BooleanField(default=False, db_index=True)
    action_url = models.CharField(max_length=500, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "is_read"])]

    def __str__(self):
        return f"{self.user.email} – {self.title}"
