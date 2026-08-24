"""Tests for registration, login and the admin boundary.

Both storefronts share one login, so a regression here locks customers out of
the grocery shop and the restaurant at the same time. The privilege-escalation
cases matter most: ``is_staff`` is what gates every admin API endpoint, and
registration is an unauthenticated, public endpoint.
"""
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import User
from core.test_factories import make_admin, make_user

# django-axes counts failed logins per IP and would leak lockout state between
# test methods, turning an unrelated later assertion red.
DISABLE_LOCKOUTS = override_settings(AXES_ENABLED=False)


class UserModelTests(TestCase):
    def test_email_is_normalised_and_password_is_hashed(self):
        user = User.objects.create_user(
            email="Person@Example.COM",
            first_name="Test",
            last_name="Person",
            password="test-pass-12345",
        )

        # normalize_email lowercases the domain only.
        self.assertEqual(user.email, "Person@example.com")
        self.assertNotEqual(user.password, "test-pass-12345")
        self.assertTrue(user.check_password("test-pass-12345"))

    def test_creating_a_user_without_an_email_is_refused(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="test-pass-12345")

    def test_new_users_are_not_staff_and_not_verified(self):
        user = make_user()
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.is_email_verified)

    def test_superuser_gets_both_flags(self):
        admin = User.objects.create_superuser(
            email="owner@example.com",
            first_name="Mary",
            last_name="Ben",
            password="test-pass-12345",
        )
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_full_name_joins_the_parts(self):
        self.assertEqual(make_user(first_name="Mary", last_name="Ben").full_name, "Mary Ben")


@DISABLE_LOCKOUTS
class RegistrationTests(APITestCase):
    url = "/api/v1/auth/register/"

    def _payload(self, **overrides):
        payload = {
            "email": "new@example.com",
            "first_name": "New",
            "last_name": "Customer",
            "password": "test-pass-12345",
            "password_confirm": "test-pass-12345",
        }
        payload.update(overrides)
        return payload

    def test_registration_creates_a_user_and_returns_tokens(self):
        response = self.client.post(self.url, self._payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data["data"]["tokens"])
        self.assertTrue(User.objects.filter(email="new@example.com").exists())

    def test_mismatched_password_confirmation_is_rejected(self):
        response = self.client.post(
            self.url, self._payload(password_confirm="something-else"), format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="new@example.com").exists())

    def test_duplicate_email_is_rejected(self):
        make_user(email="new@example.com")

        response = self.client.post(self.url, self._payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.filter(email="new@example.com").count(), 1)

    def test_registering_cannot_grant_staff_access(self):
        """The public registration endpoint is the one place an attacker can
        post arbitrary fields, and is_staff gates every admin API."""
        for field in ["is_staff", "is_superuser"]:
            with self.subTest(field=field):
                response = self.client.post(
                    self.url,
                    self._payload(email=f"{field}@example.com", **{field: True}),
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertFalse(User.objects.filter(email=f"{field}@example.com").exists())


@DISABLE_LOCKOUTS
class LoginTests(APITestCase):
    url = "/api/v1/auth/login/"

    def setUp(self):
        self.password = "test-pass-12345"
        self.user = make_user(email="customer@example.com", password=self.password)

    def test_correct_credentials_return_tokens(self):
        response = self.client.post(
            self.url,
            {"email": self.user.email, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data["data"]["tokens"])

    def test_wrong_password_is_rejected(self):
        response = self.client.post(
            self.url, {"email": self.user.email, "password": "wrong"}, format="json"
        )

        self.assertIn(
            response.status_code,
            [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED],
        )

    def test_unknown_email_is_rejected(self):
        response = self.client.post(
            self.url,
            {"email": "nobody@example.com", "password": self.password},
            format="json",
        )

        self.assertIn(
            response.status_code,
            [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED],
        )

    def test_deactivated_account_cannot_log_in(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.client.post(
            self.url,
            {"email": self.user.email, "password": self.password},
            format="json",
        )

        self.assertNotEqual(response.status_code, status.HTTP_200_OK)


@DISABLE_LOCKOUTS
class ProfileAccessTests(APITestCase):
    url = "/api/v1/users/profile/"

    def test_profile_requires_authentication(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_sees_their_own_profile(self):
        user = make_user(email="customer@example.com")
        self.client.force_authenticate(user=user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("customer@example.com", str(response.data))


@DISABLE_LOCKOUTS
class AdminBoundaryTests(APITestCase):
    """Admin endpoints are shared by both storefronts, so the staff check has
    to hold regardless of which channel a user has ever ordered from."""

    url = "/api/v1/users/admin/users/"

    def test_anonymous_access_is_refused(self):
        self.assertEqual(
            self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED
        )

    def test_ordinary_customer_is_refused(self):
        self.client.force_authenticate(user=make_user())
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_user_is_allowed(self):
        self.client.force_authenticate(user=make_admin())
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_200_OK)
