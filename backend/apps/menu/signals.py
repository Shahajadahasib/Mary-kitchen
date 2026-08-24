"""Clean up image files when menu model instances are deleted — mirrors apps.products.signals."""
import os

from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver

from .models import MenuCategory, MenuItemImage


def delete_file(file_field):
    if file_field and file_field.name:
        if os.path.isfile(file_field.path):
            os.remove(file_field.path)


@receiver(post_delete, sender=MenuItemImage)
def delete_menu_item_image_file(sender, instance, **kwargs):
    delete_file(instance.image)


@receiver(pre_save, sender=MenuItemImage)
def delete_old_menu_item_image_on_update(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old = MenuItemImage.objects.get(pk=instance.pk)
    except MenuItemImage.DoesNotExist:
        return
    if old.image and old.image != instance.image:
        delete_file(old.image)


@receiver(post_delete, sender=MenuCategory)
def delete_menu_category_image_file(sender, instance, **kwargs):
    delete_file(instance.image)
