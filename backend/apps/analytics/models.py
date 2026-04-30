from django.db import models


class Visit(models.Model):
    session_id = models.CharField(max_length=100, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "analytics_visits"
        ordering = ["-created_at"]

    def __str__(self):
        return self.session_id
