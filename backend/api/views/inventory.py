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

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        val = self.kwargs.get('public_id') or self.kwargs.get('pk')
        if val is not None:
            if str(val).isdigit():
                obj = queryset.filter(pk=int(val)).first()
                if obj:
                    return obj
            try:
                obj = queryset.filter(public_id=val).first()
                if obj:
                    return obj
            except Exception:
                pass
        return super().get_object()

class DepartmentViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Department.objects.all()
    lookup_field = 'public_id'
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Inventario (Departamentos)'

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        val = self.kwargs.get('public_id') or self.kwargs.get('pk')
        if val is not None:
            if str(val).isdigit():
                obj = queryset.filter(pk=int(val)).first()
                if obj:
                    return obj
            try:
                obj = queryset.filter(public_id=val).first()
                if obj:
                    return obj
            except Exception:
                pass
        return super().get_object()

class ProductViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Product.objects.select_related('department', 'category', 'supplier', 'media').all()
    lookup_field = 'public_id'
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Inventario Tecnológico'

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        val = self.kwargs.get('public_id') or self.kwargs.get('pk')
        if val is not None:
            if str(val).isdigit():
                obj = queryset.filter(pk=int(val)).first()
                if obj:
                    return obj
            try:
                obj = queryset.filter(public_id=val).first()
                if obj:
                    return obj
            except Exception:
                pass
        return super().get_object()
