from rest_framework import permissions

def is_admin_user(user):
    """
    Helper to check if a user has administrative privileges based on:
    - Superuser status
    - Staff status
    - Role name containing 'admin' or 'administrador'
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or user.is_staff:
        return True
    if user.role and user.role.name:
        role_name = user.role.name.lower()
        if 'admin' in role_name or 'administrador' in role_name:
            return True
    return False

class IsAdminRole(permissions.BasePermission):
    """
    Grants access only to authenticated administrative users.
    """
    def has_permission(self, request, view):
        return is_admin_user(request.user)

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Allows read-only (GET, HEAD, OPTIONS) access to any user (even unauthenticated),
    but restricts write operations (POST, PUT, PATCH, DELETE) to administrators.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return is_admin_user(request.user)
