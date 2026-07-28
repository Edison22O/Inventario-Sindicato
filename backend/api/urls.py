from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RoleViewSet, UserViewSet, CategoryViewSet,
    MediaViewSet, ProductViewSet, DepartmentViewSet, SupplierViewSet,
    MaintenanceLogViewSet, BackupViewSet,
    FurnitureCategoryViewSet, FurnitureDepartmentViewSet, FurnitureSupplierViewSet,
    FurnitureProductViewSet, FurnitureMaintenanceLogViewSet,
    VehicleViewSet, VehicleTripViewSet
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

# Furniture Routes
router.register(r'furniture/categories', FurnitureCategoryViewSet, basename='furniture-category')
router.register(r'furniture/departments', FurnitureDepartmentViewSet, basename='furniture-department')
router.register(r'furniture/suppliers', FurnitureSupplierViewSet, basename='furniture-supplier')
router.register(r'furniture/products', FurnitureProductViewSet, basename='furniture-product')
router.register(r'furniture/maintenances', FurnitureMaintenanceLogViewSet, basename='furniture-maintenance')

# Vehicles Routes
router.register(r'vehicles', VehicleViewSet, basename='vehicles')
router.register(r'vehicle-trips', VehicleTripViewSet, basename='vehicle-trips')

urlpatterns = [
    path('', include(router.urls)),
]
