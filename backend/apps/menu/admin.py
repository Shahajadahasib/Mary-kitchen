from django.contrib import admin

from .models import MenuCategory, MenuItem, MenuItemImage, Modifier, ModifierGroup


class MenuItemImageInline(admin.TabularInline):
    model = MenuItemImage
    extra = 1


class ModifierInline(admin.TabularInline):
    model = Modifier
    extra = 1


class ModifierGroupInline(admin.StackedInline):
    model = ModifierGroup
    extra = 0


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "base_price", "is_active", "is_available", "is_featured"]
    list_filter = ["is_active", "is_available", "is_featured", "category"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [MenuItemImageInline, ModifierGroupInline]


@admin.register(MenuCategory)
class MenuCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "is_active", "sort_order"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(ModifierGroup)
class ModifierGroupAdmin(admin.ModelAdmin):
    list_display = ["menu_item", "name", "selection_type", "is_required"]
    inlines = [ModifierInline]
