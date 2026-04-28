"""Django-filter FilterSets for products."""
import django_filters
from django.db.models import Q

from .models import Category, Product


class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="base_price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="base_price", lookup_expr="lte")
    category = django_filters.CharFilter(method="filter_category")
    rating = django_filters.NumberFilter(field_name="average_rating", lookup_expr="gte")
    in_stock = django_filters.BooleanFilter(method="filter_in_stock")
    is_featured = django_filters.BooleanFilter(field_name="is_featured")
    tags = django_filters.CharFilter(method="filter_tags")

    class Meta:
        model = Product
        fields = ["min_price", "max_price", "category", "rating", "in_stock", "is_featured"]

    def filter_category(self, queryset, name, value):
        """Filter by category slug, including subcategories."""
        try:
            category = Category.objects.get(slug=value)
            subcategory_ids = list(category.subcategories.values_list("id", flat=True))
            ids = [category.id] + subcategory_ids
            return queryset.filter(category_id__in=ids)
        except Category.DoesNotExist:
            return queryset.none()

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(stock_quantity__gt=0)
        return queryset.filter(stock_quantity=0)

    def filter_tags(self, queryset, name, value):
        return queryset.filter(tags__contains=[value])
