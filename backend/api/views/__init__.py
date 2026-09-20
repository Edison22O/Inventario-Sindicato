from .core import RoleViewSet, UserViewSet, MediaViewSet, BackupViewSet, SystemSettingsViewSet, AdminDashboardStatsViewSet, ActivityLogViewSet, DriverProfileViewSet
from .inventory import CategoryViewSet, DepartmentViewSet, ProductViewSet
from .maintenance import MaintenanceLogViewSet
from .suppliers import SupplierViewSet, VehicleSupplierViewSet
from .furniture import FurnitureCategoryViewSet, FurnitureDepartmentViewSet, FurnitureSupplierViewSet, FurnitureProductViewSet, FurnitureMaintenanceLogViewSet
from .vehicles import (
    VehicleViewSet, VehicleTripViewSet, VehicleRegistrationRecordViewSet,
    VehicleDashboardStatsView, VehicleFuelLogViewSet, FuelBudgetViewSet, DriverVehicleHandoverViewSet
)
from .learning import (
    StudentViewSet, GradeTemplateViewSet, LearningPhaseViewSet, PhaseActivityViewSet,
    StudentEvaluationViewSet, PracticalAttendanceViewSet, InstructorScheduleViewSet,
    WeeklyInstructorReportViewSet, InstructorViewSet
)

