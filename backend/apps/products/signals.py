"""Signals to clean up image files when model instances are deleted."""
import os
from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver
from .models import ProductImage, Category


def delete_file(file_field):
    """Delete a file from disk if it exists."""
    if file_field and file_field.name:
        if os.path.isfile(file_field.path):
            os.remove(file_field.path)


@receiver(post_delete, sender=ProductImage)
def delete_product_image_file(sender, instance, **kwargs):
    """Delete image file when ProductImage is deleted."""
    delete_file(instance.image)


@receiver(pre_save, sender=ProductImage)
def delete_old_product_image_on_update(sender, instance, **kwargs):
    """Delete old image file when ProductImage is updated with a new image."""
    if not instance.pk:
        return
    try:
        old = ProductImage.objects.get(pk=instance.pk)
    except ProductImage.DoesNotExist:
        return
    if old.image and old.image != instance.image:
        delete_file(old.image)


@receiver(post_delete, sender=Category)
def delete_category_image_file(sender, instance, **kwargs):
    """Delete image file when Category is deleted."""
    delete_file(instance.image)