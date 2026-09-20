from rest_framework import serializers
from api.models.maintenance import MaintenanceLog, VehicleMaintenance, VehicleMaintenanceRecord

class MaintenanceLogSerializer(serializers.ModelSerializer):
    product_codigo = serializers.CharField(source='product.codigo', read_only=True)
    product_nombre = serializers.CharField(source='product.nombre', read_only=True)
    
    class Meta:
        model = MaintenanceLog
        fields = '__all__'

    def create(self, validated_data):
        maintenance_log = super().create(validated_data)
        product = maintenance_log.product
        product.estado = maintenance_log.estado_resultante
        product.fecha_ultimo_mantenimiento = maintenance_log.fecha
        product.save()
        return maintenance_log

    def update(self, instance, validated_data):
        maintenance_log = super().update(instance, validated_data)
        product = maintenance_log.product
        latest = product.maintenances.order_by('-fecha', '-created_at').first()
        if latest:
            product.estado = latest.estado_resultante
            product.fecha_ultimo_mantenimiento = latest.fecha
            product.save()
        return maintenance_log

class VehicleMaintenanceSerializer(serializers.ModelSerializer):
    vehicle_placa = serializers.CharField(source='vehicle.placa', read_only=True)
    vehicle_marca = serializers.CharField(source='vehicle.marca', read_only=True)
    vehicle_modelo = serializers.CharField(source='vehicle.modelo', read_only=True)
    km_proximo_cambio = serializers.ReadOnlyField()
    km_recorridos_desde_cambio = serializers.ReadOnlyField()
    dias_transcurridos = serializers.ReadOnlyField()
    dias_restantes = serializers.ReadOnlyField()
    km_restantes_para_proximo_cambio = serializers.ReadOnlyField()
    estado_alerta = serializers.ReadOnlyField()

    class Meta:
        model = VehicleMaintenance
        fields = '__all__'

class VehicleMaintenanceRecordSerializer(serializers.ModelSerializer):
    actividad_nombre = serializers.SerializerMethodField()
    vehicle_placa = serializers.CharField(source='vehicle.placa', read_only=True)
    vehicle_marca = serializers.CharField(source='vehicle.marca', read_only=True)
    vehicle_modelo = serializers.CharField(source='vehicle.modelo', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True, default=None)

    class Meta:
        model = VehicleMaintenanceRecord
        fields = '__all__'

    def get_actividad_nombre(self, obj):
        if obj.maintenance_rule and obj.maintenance_rule.actividad:
            return obj.maintenance_rule.actividad
        if obj.tipo_mantenimiento == 'Correctivo':
            return f"Correctivo: {obj.fallo_observado[:30] if obj.fallo_observado else 'Servicio General'}"
        return "Servicio General"

