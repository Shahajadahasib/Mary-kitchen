"""Django-filter FilterSets for the restaurant menu."""
import django_filters

from .models import MenuItem


class MenuItemFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="base_price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="base_price", lookup_expr="lte")
    category = django_filters.CharFilter(field_name="category__slug")
    is_featured = django_filters.BooleanFilter(field_name="is_featured")
    dietary_tag = django_filters.CharFilter(method="filter_dietary_tag")

    class Meta:
        model = MenuItem
        fields = ["min_price", "max_price", "category", "is_featured", "dietary_tag"]

    def filter_dietary_tag(self, queryset, name, value):
        return queryset.filter(dietary_tags__contains=[value])
