from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from api.models.inventory import Category, Department, Product
from api.serializers.inventory import CategorySerializer, DepartmentSerializer, ProductSerializer
from api.mixins import AuditLogMixin

class CategoryViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Category.objects.all()
    lookup_field = 'public_id'
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Inventario (Categorías)'

class DepartmentViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Inventario (Departamentos)'

class ProductViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Product.objects.select_related('department', 'category', 'supplier', 'media').all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Inventario Tecnológico'
