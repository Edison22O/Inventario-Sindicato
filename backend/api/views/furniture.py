from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from api.models.furniture import FurnitureCategory, FurnitureDepartment, FurnitureSupplier, FurnitureProduct, FurnitureMaintenanceLog
from api.serializers.furniture import (
    FurnitureCategorySerializer, FurnitureDepartmentSerializer, FurnitureSupplierSerializer,
    FurnitureProductSerializer, FurnitureMaintenanceLogSerializer
)
from api.mixins import AuditLogMixin

class FurnitureCategoryViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = FurnitureCategory.objects.all()
    lookup_field = 'public_id'
    serializer_class = FurnitureCategorySerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Muebles (Categorías)'

class FurnitureDepartmentViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = FurnitureDepartment.objects.all()
    serializer_class = FurnitureDepartmentSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Muebles (Departamentos)'

class FurnitureSupplierViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = FurnitureSupplier.objects.all()
    serializer_class = FurnitureSupplierSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Muebles (Proveedores)'

class FurnitureProductViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = FurnitureProduct.objects.select_related('department', 'category', 'supplier', 'media').all()
    serializer_class = FurnitureProductSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Inventario de Mobiliario'

class FurnitureMaintenanceLogViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = FurnitureMaintenanceLog.objects.all()
    serializer_class = FurnitureMaintenanceLogSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Muebles (Mantenimiento)'

    def get_queryset(self):
        queryset = FurnitureMaintenanceLog.objects.select_related('product').all().order_by('-fecha', '-created_at')
        product_id = self.request.query_params.get('product', None)
        if product_id is not None:
            queryset = queryset.filter(product__public_id=product_id)
        return queryset
