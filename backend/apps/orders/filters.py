"""Django-filter FilterSets for orders."""
from datetime import datetime

import django_filters
from django.db.models import Q

from .models import Order

# Formats an admin might reasonably type or paste into the order search.
# "%d %b %Y" is first because it is what the orders table itself prints
# (`formatDate` renders en-AU short month, e.g. "26 Aug 2026"), so it is the
# form most likely to arrive by copy-paste.
_DATE_FORMATS = (
    "%d %b %Y",
    "%d %B %Y",
    "%b %d %Y",
    "%B %d %Y",
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%d/%m/%y",
)


def _parse_date(value):
    """Return a `date` if the whole term reads as one, else None."""
    cleaned = value.replace(",", " ").strip()
    cleaned = " ".join(cleaned.split())
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


class AdminOrderFilter(django_filters.FilterSet):
    """Filters for the staff order queue.

    ``search`` is deliberately a method filter rather than DRF's `SearchFilter`.
    Staff look orders up by whatever is in front of them — a pasted order
    number, a customer's name, "pending", "pickup", "paid", or the date shown
    in the table — and none of that fits a flat list of `search_fields`:

    * the table renders order numbers as "#MK-…", and that "#" is presentation,
      not data, so it has to come off before matching;
    * status, type and payment are stored underscored ("out_for_delivery") but
      displayed spaced ("Out for Delivery"), so the typed form has to be
      normalised to reach the stored one;
    * ``created_at`` is a datetime, which has no meaningful `icontains`. A term
      that parses as a whole date is matched against the calendar day instead,
      in the project timezone.
    """

    search = django_filters.CharFilter(method="filter_search")
    created_after = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_before = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = Order
        fields = [
            "status",
            "order_type",
            "payment_status",
            "has_out_of_stock_items",
            "channel",
        ]

    @staticmethod
    def _choice_values(term, choices):
        """Choice values a typed word could plausibly mean.

        Substring matching is wrong here: "paid" is a substring of "unpaid", so
        an icontains would hand back the exact orders the user was filtering
        out. Matching is instead anchored — against the stored value, or
        against any single word of the human label — so "paid" reaches Paid and
        not Unpaid, while "delivery" still reaches "Out for Delivery" and
        "refunded" still reaches "Partially Refunded".
        """
        word = term.lower()
        slug = word.replace(" ", "_")
        return [
            value
            for value, label in choices
            if value.startswith(slug)
            or any(w.lower().startswith(word) for w in label.split())
        ]

    @classmethod
    def _term_q(cls, term):
        """OR across every field one word of the query could plausibly mean."""
        term = term.lstrip("#")
        if not term:
            return Q()

        q = (
            Q(order_number__icontains=term)
            | Q(user__email__icontains=term)
            | Q(user__first_name__icontains=term)
            | Q(user__last_name__icontains=term)
            | Q(delivery_zone_name__icontains=term)
        )
        for field, choices in (
            ("status", Order.STATUS_CHOICES),
            ("order_type", Order.ORDER_TYPE_CHOICES),
            ("payment_status", Order.PAYMENT_STATUS_CHOICES),
            ("channel", Order.CHANNEL_CHOICES),
        ):
            values = cls._choice_values(term, choices)
            if values:
                q |= Q(**{f"{field}__in": values})
        return q

    def filter_search(self, queryset, name, value):
        value = (value or "").strip()
        if not value:
            return queryset

        # A date has to be read whole — "26 Aug 2026" split into words would
        # require "Aug" to match some text field, which it never will.
        parsed = _parse_date(value.lstrip("#"))
        if parsed is not None:
            return queryset.filter(created_at__date=parsed)

        # Otherwise every word must match something, so extra words narrow the
        # result rather than widening it: "md hasib" needs both names, and
        # "grace pending" finds Grace's pending orders only.
        for term in value.split():
            q = self._term_q(term)
            if q:
                queryset = queryset.filter(q)
        return queryset
