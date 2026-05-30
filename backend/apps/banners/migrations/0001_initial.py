import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Banner",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=200)),
                ("subtitle", models.CharField(blank=True, max_length=300)),
                ("image", models.ImageField(upload_to="banners/")),
                ("link", models.CharField(blank=True, help_text="URL to navigate to when clicked", max_length=500)),
                ("location", models.CharField(
                    choices=[
                        ("hero", "Hero"),
                        ("top", "Top Strip"),
                        ("middle", "Middle Section"),
                        ("bottom", "Bottom Section"),
                    ],
                    db_index=True,
                    default="hero",
                    max_length=20,
                )),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("starts_at", models.DateTimeField(blank=True, null=True)),
                ("ends_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={"db_table": "banners", "ordering": ["location", "sort_order", "-created_at"]},
        ),
    ]
