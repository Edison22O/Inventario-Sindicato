from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from api.models.furniture import FurnitureCategory, FurnitureDepartment, FurnitureSupplier, FurnitureProduct, FurnitureMaintenanceLog
from api.serializers.furniture import (
    FurnitureCategorySerializer, FurnitureDepartmentSerializer, FurnitureSupplierSerializer,
    FurnitureProductSerializer, FurnitureMaintenanceLogSerializer
)

class FurnitureCategoryViewSet(viewsets.ModelViewSet):
    queryset = FurnitureCategory.objects.all()
    serializer_class = FurnitureCategorySerializer
    permission_classes = [IsAuthenticated]

class FurnitureDepartmentViewSet(viewsets.ModelViewSet):
    queryset = FurnitureDepartment.objects.all()
    serializer_class = FurnitureDepartmentSerializer
    permission_classes = [IsAuthenticated]

class FurnitureSupplierViewSet(viewsets.ModelViewSet):
    queryset = FurnitureSupplier.objects.all()
    serializer_class = FurnitureSupplierSerializer
    permission_classes = [IsAuthenticated]

class FurnitureProductViewSet(viewsets.ModelViewSet):
    queryset = FurnitureProduct.objects.select_related('department', 'category', 'supplier', 'media').all()
    serializer_class = FurnitureProductSerializer
    permission_classes = [IsAuthenticated]

class FurnitureMaintenanceLogViewSet(viewsets.ModelViewSet):
    queryset = FurnitureMaintenanceLog.objects.all()
    serializer_class = FurnitureMaintenanceLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = FurnitureMaintenanceLog.objects.select_related('product').all().order_by('-fecha', '-created_at')
        product_id = self.request.query_params.get('product', None)
        if product_id is not None:
            queryset = queryset.filter(product_id=product_id)
        return queryset
