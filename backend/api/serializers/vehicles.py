from rest_framework import serializers
from api.models.vehicles import Vehicle, VehicleTrip

class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'

class VehicleTripSerializer(serializers.ModelSerializer):
    conductor_name = serializers.CharField(source='conductor.username', read_only=True)
    vehicle_placa = serializers.CharField(source='vehicle.placa', read_only=True)
    vehicle_marca = serializers.CharField(source='vehicle.marca', read_only=True)
    vehicle_modelo = serializers.CharField(source='vehicle.modelo', read_only=True)

    class Meta:
        model = VehicleTrip
        fields = '__all__'
        read_only_fields = ('fecha_hora_salida', 'fecha_hora_llegada', 'estado_viaje', 'conductor')
