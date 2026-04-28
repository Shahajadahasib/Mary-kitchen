"""Custom DRF permission classes."""
from rest_framework.permissions import BasePermission, IsAuthenticated, SAFE_METHODS


class IsAdminUser(BasePermission):
    """Allow access only to admin/staff users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsOwnerOrAdmin(BasePermission):
    """Allow owner of an object or admin to access it."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        owner = getattr(obj, "user", None) or getattr(obj, "owner", None)
        return owner == request.user


class IsOwnerOrReadOnly(BasePermission):
    """Allow owner write access; everyone else read-only."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        owner = getattr(obj, "user", None) or getattr(obj, "owner", None)
        return owner == request.user


class IsAdminOrReadOnly(BasePermission):
    """Admin can write; anyone can read."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)
