from django.urls import path

from .views import ConversionView, VisitCreateView


urlpatterns = [
    path("visit/", VisitCreateView.as_view(), name="analytics-visit"),
    path("conversion/", ConversionView.as_view(), name="analytics-conversion"),
]
