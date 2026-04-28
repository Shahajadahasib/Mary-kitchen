"""User app views."""
from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from core.permissions import IsAdminUser, IsOwnerOrAdmin

from .models import Address, User, Wishlist, WishlistItem
from .serializers import (
    AddressSerializer,
    AdminUserSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    OTPRequestSerializer,
    OTPVerifySerializer,
    PasswordResetConfirmSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
    WishlistItemSerializer,
    WishlistSerializer,
)
from .services import send_otp, verify_otp

UserModel = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/"""
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_otp(user.email, "email_verify")
        return Response(
            {"success": True, "data": serializer.data, "message": "Registration successful. Check your email for OTP."},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """POST /api/v1/auth/login/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "success": True,
                "data": {
                    "user": UserProfileSerializer(user).data,
                    "tokens": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    },
                },
            }
        )


class LogoutView(APIView):
    """POST /api/v1/auth/logout/ – blacklists the refresh token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"success": True, "message": "Logged out successfully."})
        except Exception:
            return Response({"success": False, "message": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)


class OTPRequestView(APIView):
    """POST /api/v1/auth/otp/request/ – request an OTP."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        send_otp(**serializer.validated_data)
        return Response({"success": True, "message": "OTP sent to your email."})


class OTPVerifyView(APIView):
    """POST /api/v1/auth/otp/verify/ – verify an OTP."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        success, message = verify_otp(d["email"], d["code"], d["purpose"])

        if not success:
            return Response({"success": False, "message": message}, status=status.HTTP_400_BAD_REQUEST)

        response_data = {"success": True, "message": message}

        if d["purpose"] == "email_verify":
            User.objects.filter(email=d["email"]).update(is_email_verified=True)
        elif d["purpose"] == "otp_login":
            try:
                user = User.objects.get(email=d["email"])
                refresh = RefreshToken.for_user(user)
                response_data["tokens"] = {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                }
                response_data["user"] = UserProfileSerializer(user).data
            except User.DoesNotExist:
                return Response({"success": False, "message": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(response_data)


class PasswordResetRequestView(APIView):
    """POST /api/v1/auth/password/reset/ – request password reset OTP."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"success": False, "message": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=email).exists():
            send_otp(email, "password_reset")
        return Response({"success": True, "message": "If this email exists, a reset code has been sent."})


class PasswordResetConfirmView(APIView):
    """POST /api/v1/auth/password/reset/confirm/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        success, message = verify_otp(d["email"], d["code"], "password_reset")
        if not success:
            return Response({"success": False, "message": message}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email=d["email"])
            user.set_password(d["new_password"])
            user.save(update_fields=["password"])
            return Response({"success": True, "message": "Password reset successful."})
        except User.DoesNotExist:
            return Response({"success": False, "message": "User not found."}, status=status.HTTP_404_NOT_FOUND)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """GET / PATCH /api/v1/users/profile/"""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """POST /api/v1/users/change-password/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"success": True, "message": "Password changed successfully."})


class AddressViewSet(ModelViewSet):
    """CRUD for user addresses."""
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"])
    def set_default(self, request, pk=None):
        address = self.get_object()
        Address.objects.filter(user=request.user, is_default=True).update(is_default=False)
        address.is_default = True
        address.save(update_fields=["is_default"])
        return Response({"success": True, "message": "Default address updated."})


class WishlistView(generics.RetrieveAPIView):
    """GET /api/v1/users/wishlist/"""
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        wishlist, _ = Wishlist.objects.get_or_create(user=self.request.user)
        return wishlist


class WishlistItemView(APIView):
    """POST /DELETE /api/v1/users/wishlist/items/<product_id>/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, product_id):
        wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
        item, created = WishlistItem.objects.get_or_create(wishlist=wishlist, product_id=product_id)
        if not created:
            return Response({"success": False, "message": "Product already in wishlist."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"success": True, "message": "Added to wishlist."}, status=status.HTTP_201_CREATED)

    def delete(self, request, product_id):
        wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
        WishlistItem.objects.filter(wishlist=wishlist, product_id=product_id).delete()
        return Response({"success": True, "message": "Removed from wishlist."})


# ─── Admin Views ──────────────────────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    """Admin: list all users."""
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]
    queryset = User.objects.all().order_by("-date_joined")
    search_fields = ["email", "first_name", "last_name", "phone_number"]
    filterset_fields = ["is_active", "is_staff", "is_email_verified"]


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """Admin: view/update user."""
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]
    queryset = User.objects.all()
