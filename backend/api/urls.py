from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RoleViewSet, UserViewSet, CategoryViewSet,
    MediaViewSet, ProductViewSet, DepartmentViewSet, SupplierViewSet,
    MaintenanceLogViewSet, BackupViewSet
)

router = DefaultRouter()
router.register(r'roles', RoleViewSet)
router.register(r'users', UserViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'media', MediaViewSet)
router.register(r'products', ProductViewSet)
router.register(r'maintenances', MaintenanceLogViewSet)
router.register(r'backup', BackupViewSet, basename='backup')

urlpatterns = [
    path('', include(router.urls)),
]
