from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from api.models.maintenance import MaintenanceLog, VehicleMaintenance, VehicleMaintenanceRecord
from api.serializers.maintenance import MaintenanceLogSerializer, VehicleMaintenanceSerializer, VehicleMaintenanceRecordSerializer
from api.mixins import AuditLogMixin

class MaintenanceLogViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = MaintenanceLog.objects.all()
    serializer_class = MaintenanceLogSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Mantenimiento Tecnológico'

    def get_queryset(self):
        queryset = MaintenanceLog.objects.select_related('product').all().order_by('-fecha', '-created_at')
        product_id = self.request.query_params.get('product', None)
        if product_id is not None:
            queryset = queryset.filter(product__public_id=product_id)
        return queryset

    def perform_destroy(self, instance):
        product = instance.product
        super().perform_destroy(instance)
        latest = product.maintenances.order_by('-fecha', '-created_at').first()
        if latest:
            product.estado = latest.estado_resultante
            product.fecha_ultimo_mantenimiento = latest.fecha
        else:
            product.fecha_ultimo_mantenimiento = None
        product.save()

class VehicleMaintenanceViewSet(viewsets.ModelViewSet):
    queryset = VehicleMaintenance.objects.select_related('vehicle').all().order_by('-fecha_ultimo_cambio')
    lookup_field = 'public_id'
    serializer_class = VehicleMaintenanceSerializer
    permission_classes = [IsAuthenticated]

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

    def get_queryset(self):
        queryset = super().get_queryset()
        vehicle_id = self.request.query_params.get('vehicle', None)
        tipo = self.request.query_params.get('tipo', None)
        if vehicle_id is not None:
            if str(vehicle_id).isdigit():
                queryset = queryset.filter(vehicle_id=int(vehicle_id))
            else:
                queryset = queryset.filter(vehicle__public_id=vehicle_id)
        if tipo is not None:
            queryset = queryset.filter(tipo_mantenimiento__iexact=tipo)
        return queryset

class VehicleMaintenanceRecordViewSet(viewsets.ModelViewSet):
    queryset = VehicleMaintenanceRecord.objects.select_related('vehicle', 'maintenance_rule', 'supplier').all().order_by('-fecha', '-created_at')
    serializer_class = VehicleMaintenanceRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        vehicle_id = self.request.query_params.get('vehicle', None)
        supplier_id = self.request.query_params.get('supplier', None)
        tipo = self.request.query_params.get('tipo', None)

        if vehicle_id is not None:
            if str(vehicle_id).isdigit():
                queryset = queryset.filter(vehicle_id=int(vehicle_id))
            else:
                queryset = queryset.filter(vehicle__public_id=vehicle_id)

        if supplier_id is not None:
            if str(supplier_id).isdigit():
                queryset = queryset.filter(supplier_id=int(supplier_id))
            else:
                queryset = queryset.filter(supplier__public_id=supplier_id)

        if tipo is not None:
            queryset = queryset.filter(tipo_mantenimiento__iexact=tipo)

        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("!!! VEHICLE MAINTENANCE RECORD VALIDATION ERRORS !!!:", serializer.errors)
            from rest_framework.response import Response
            from rest_framework import status
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        from rest_framework.response import Response
        from rest_framework import status
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        # Al crear el registro, se guarda y se actualiza la regla de mantenimiento si existe
        record = serializer.save()
        rule = record.maintenance_rule
        if rule:
            vehicle = record.vehicle
            rule.km_ultimo_cambio = vehicle.odometro_actual
            rule.fecha_ultimo_cambio = record.fecha
            rule.save()


