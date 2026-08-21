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

class VehicleSupplierViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = VehicleSupplier.objects.all().order_by('-created_at')
    lookup_field = 'public_id'
    serializer_class = VehicleSupplierSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Gestión Vehicular (Proveedores/Talleres)'

