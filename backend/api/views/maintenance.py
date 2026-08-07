from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from api.models.maintenance import MaintenanceLog, VehicleMaintenance, VehicleMaintenanceRecord
from api.serializers.maintenance import MaintenanceLogSerializer, VehicleMaintenanceSerializer, VehicleMaintenanceRecordSerializer

class MaintenanceLogViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceLog.objects.all()
    serializer_class = MaintenanceLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = MaintenanceLog.objects.select_related('product').all().order_by('-fecha', '-created_at')
        product_id = self.request.query_params.get('product', None)
        if product_id is not None:
            queryset = queryset.filter(product__public_id=product_id)
        return queryset

class VehicleMaintenanceViewSet(viewsets.ModelViewSet):
    queryset = VehicleMaintenance.objects.select_related('vehicle').all().order_by('-fecha_ultimo_cambio')
    serializer_class = VehicleMaintenanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        vehicle_id = self.request.query_params.get('vehicle', None)
        if vehicle_id is not None:
            queryset = queryset.filter(vehicle__public_id=vehicle_id)
        return queryset

class VehicleMaintenanceRecordViewSet(viewsets.ModelViewSet):
    queryset = VehicleMaintenanceRecord.objects.select_related('vehicle', 'maintenance_rule').all().order_by('-fecha', '-created_at')
    serializer_class = VehicleMaintenanceRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        vehicle_id = self.request.query_params.get('vehicle', None)
        if vehicle_id is not None:
            queryset = queryset.filter(vehicle__public_id=vehicle_id)
        return queryset

    def perform_create(self, serializer):
        # Al crear el registro, se guarda y se actualiza la regla de mantenimiento si existe
        record = serializer.save()
        rule = record.maintenance_rule
        if rule:
            vehicle = record.vehicle
            rule.km_ultimo_cambio = vehicle.odometro_actual
            rule.fecha_ultimo_cambio = record.fecha
            rule.save()
