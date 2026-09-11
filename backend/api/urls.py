from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RoleViewSet, UserViewSet, CategoryViewSet,
    MediaViewSet, ProductViewSet, DepartmentViewSet, SupplierViewSet,
    VehicleSupplierViewSet,
    MaintenanceLogViewSet, BackupViewSet,
    FurnitureCategoryViewSet, FurnitureDepartmentViewSet, FurnitureSupplierViewSet,
    FurnitureProductViewSet, FurnitureMaintenanceLogViewSet,
    VehicleViewSet, VehicleTripViewSet,
    SystemSettingsViewSet, AdminDashboardStatsViewSet, ActivityLogViewSet,
    DriverProfileViewSet, VehicleRegistrationRecordViewSet, VehicleDashboardStatsView
)
from api.views.maintenance import VehicleMaintenanceViewSet, VehicleMaintenanceRecordViewSet
from api.views.vehicles import VehicleFuelLogViewSet, FuelBudgetViewSet, DriverVehicleHandoverViewSet
from api.views.learning import (
    StudentViewSet, GradeTemplateViewSet, LearningPhaseViewSet, PhaseActivityViewSet,
    StudentEvaluationViewSet, PracticalAttendanceViewSet, InstructorScheduleViewSet,
    WeeklyInstructorReportViewSet
)

router = DefaultRouter()
router.register(r'roles', RoleViewSet)
router.register(r'users', UserViewSet)
router.register(r'students', StudentViewSet, basename='students')
router.register(r'categories', CategoryViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'media', MediaViewSet)
router.register(r'products', ProductViewSet)
router.register(r'maintenances', MaintenanceLogViewSet)
router.register(r'backup', BackupViewSet, basename='backup')
router.register(r'system-settings', SystemSettingsViewSet, basename='system-settings')
router.register(r'admin-stats', AdminDashboardStatsViewSet, basename='admin-stats')
router.register(r'audit-logs', ActivityLogViewSet, basename='audit-logs')

# Furniture Routes
router.register(r'furniture/categories', FurnitureCategoryViewSet, basename='furniture-category')
router.register(r'furniture/departments', FurnitureDepartmentViewSet, basename='furniture-department')
router.register(r'furniture/suppliers', FurnitureSupplierViewSet, basename='furniture-supplier')
router.register(r'furniture/products', FurnitureProductViewSet, basename='furniture-product')
router.register(r'furniture/maintenances', FurnitureMaintenanceLogViewSet, basename='furniture-maintenance')

# Vehicles Routes
router.register(r'vehicles', VehicleViewSet, basename='vehicles')
router.register(r'vehicle-trips', VehicleTripViewSet, basename='vehicle-trips')
router.register(r'vehicle-maintenances', VehicleMaintenanceViewSet, basename='vehicle-maintenances')
router.register(r'vehicle-maintenance-records', VehicleMaintenanceRecordViewSet, basename='vehicle-maintenance-records')
router.register(r'driver-profiles', DriverProfileViewSet, basename='driver-profiles')
router.register(r'vehicle-suppliers', VehicleSupplierViewSet, basename='vehicle-suppliers')
router.register(r'vehicle-fuel-logs', VehicleFuelLogViewSet, basename='vehicle-fuel-logs')
router.register(r'vehicle-registrations', VehicleRegistrationRecordViewSet, basename='vehicle-registrations')
router.register(r'fuel-budgets', FuelBudgetViewSet, basename='fuel-budgets')
router.register(r'driver-handovers', DriverVehicleHandoverViewSet, basename='driver-handovers')

# Learning & Evaluation Routes
router.register(r'grade-templates', GradeTemplateViewSet, basename='grade-templates')
router.register(r'learning-phases', LearningPhaseViewSet, basename='learning-phases')
router.register(r'phase-activities', PhaseActivityViewSet, basename='phase-activities')
router.register(r'student-evaluations', StudentEvaluationViewSet, basename='student-evaluations')
router.register(r'practical-attendances', PracticalAttendanceViewSet, basename='practical-attendances')
router.register(r'instructor-schedules', InstructorScheduleViewSet, basename='instructor-schedules')
router.register(r'weekly-instructor-reports', WeeklyInstructorReportViewSet, basename='weekly-instructor-reports')



urlpatterns = [
    path('vehicle-dashboard-stats/', VehicleDashboardStatsView.as_view(), name='vehicle-dashboard-stats'),
    path('', include(router.urls)),
]
