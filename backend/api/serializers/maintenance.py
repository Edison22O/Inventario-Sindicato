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

class VehicleMaintenanceSerializer(serializers.ModelSerializer):
    vehicle_placa = serializers.CharField(source='vehicle.placa', read_only=True)
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

    class Meta:
        model = VehicleMaintenanceRecord
        fields = '__all__'

    def get_actividad_nombre(self, obj):
        return obj.maintenance_rule.actividad if obj.maintenance_rule else "Servicio General"
