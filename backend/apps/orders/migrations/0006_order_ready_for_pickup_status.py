from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0005_add_confirmation_email_sent'),
    ]

    operations = [
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('confirmed', 'Confirmed'),
                    ('processing', 'Processing'),
                    ('out_for_delivery', 'Out for Delivery'),
                    ('ready_for_pickup', 'Ready for Pickup'),
                    ('delivered', 'Delivered'),
                    ('cancelled', 'Cancelled'),
                    ('refunded', 'Refunded'),
                ],
                db_index=True,
                default='pending',
                max_length=20,
            ),
        ),
    ]
