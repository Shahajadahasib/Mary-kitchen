"""Tests for the grocery catalogue's search.

The counterpart to ``apps.menu.tests.MenuSearchTests``. Both storefronts run
the same DRF ``?search=`` contract over their own catalogue, and both had the
same gap: a shopper who searched by aisle rather than by product name got
either nothing or a handful of incidental description matches.
"""
from rest_framework.test import APITestCase

from core.test_factories import make_category, make_product


class ProductSearchTests(APITestCase):
    def setUp(self):
        self.drinks = make_category(name="Beverage", slug="beverage-search")
        self.grains = make_category(name="Flour & Grains", slug="grains-search")

        self.cola = make_product(
            category=self.drinks, name="Cola Bottle 1L", slug="cola-bottle-search"
        )
        self.rice = make_product(
            category=self.grains,
            name="Long Grain Rice 5kg",
            slug="long-grain-rice-search",
            tags=["pantry", "staple"],
        )

    def _search(self, term):
        res = self.client.get("/api/v1/products/", {"search": term})
        self.assertEqual(res.status_code, 200)
        return {r["name"] for r in res.data["results"]}

    def test_search_by_category_name(self):
        self.assertEqual(self._search("beverage"), {"Cola Bottle 1L"})

    def test_search_by_partial_category_name(self):
        """"Flour & Grains" has to be reachable without typing the ampersand."""
        self.assertEqual(self._search("grains"), {"Long Grain Rice 5kg"})

    def test_search_by_tag(self):
        self.assertEqual(self._search("pantry"), {"Long Grain Rice 5kg"})

    def test_search_by_name_still_works(self):
        self.assertEqual(self._search("cola"), {"Cola Bottle 1L"})

    def test_unrelated_term_matches_nothing(self):
        self.assertEqual(self._search("zzqq"), set())

    def test_inactive_product_stays_out_of_results(self):
        self.cola.is_active = False
        self.cola.save(update_fields=["is_active"])
        self.assertEqual(self._search("beverage"), set())
