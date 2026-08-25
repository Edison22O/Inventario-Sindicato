from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from api.models.suppliers import Supplier, VehicleSupplier
from api.serializers.suppliers import SupplierSerializer, VehicleSupplierSerializer
from api.mixins import AuditLogMixin

class SupplierViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    lookup_field = 'public_id'
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Inventario Tecnológico (Proveedores)'

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        val = self.kwargs.get('public_id') or self.kwargs.get('pk')
        if val is not None:
            if str(val).isdigit():
                obj = queryset.filter(id=int(val)).first()
                if obj:
                    self.check_object_permissions(self.request, obj)
                    return obj
            else:
                obj = queryset.filter(public_id=val).first()
                if obj:
                    self.check_object_permissions(self.request, obj)
                    return obj
        return super().get_object()

class VehicleSupplierViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = VehicleSupplier.objects.all().order_by('-created_at')
    lookup_field = 'public_id'
    serializer_class = VehicleSupplierSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Gestión Vehicular (Proveedores/Talleres)'

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        val = self.kwargs.get('public_id') or self.kwargs.get('pk')
        if val is not None:
            if str(val).isdigit():
                obj = queryset.filter(id=int(val)).first()
                if obj:
                    self.check_object_permissions(self.request, obj)
                    return obj
            else:
                obj = queryset.filter(public_id=val).first()
                if obj:
                    self.check_object_permissions(self.request, obj)
                    return obj
        return super().get_object()

