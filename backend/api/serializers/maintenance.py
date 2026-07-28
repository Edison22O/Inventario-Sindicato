from rest_framework import serializers
from api.models.maintenance import MaintenanceLog

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
