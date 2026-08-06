from rest_framework import serializers
from api.models.vehicles import Vehicle, VehicleTrip, VehicleRegistrationRecord

class VehicleSerializer(serializers.ModelSerializer):
    dias_para_vencimiento_matricula = serializers.ReadOnlyField()
    alerta_matricula = serializers.ReadOnlyField()
    proximo_mantenimiento = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = '__all__'

    def get_proximo_mantenimiento(self, obj):
        maintenances = obj.maintenances.all()
        if not maintenances:
            return "Sin mantenimientos registrados"
        
        urgentes = [m for m in maintenances if m.estado_alerta == 'CAMBIO URGENTE']
        if urgentes:
            return f"Urgente: {urgentes[0].actividad}"
        
        proximos = [m for m in maintenances if m.estado_alerta == 'PRÓXIMO']
        if proximos:
            return f"Próximo: {proximos[0].actividad} a los {proximos[0].km_proximo_cambio} KM"
            
        closest = min(maintenances, key=lambda m: m.frecuencia_km - m.km_recorridos_desde_cambio)
        return f"{closest.actividad} a los {closest.km_proximo_cambio} KM"

class VehicleTripSerializer(serializers.ModelSerializer):
    conductor_name = serializers.CharField(source='conductor.username', read_only=True)
    vehicle_placa = serializers.CharField(source='vehicle.placa', read_only=True)
    vehicle_marca = serializers.CharField(source='vehicle.marca', read_only=True)
    vehicle_modelo = serializers.CharField(source='vehicle.modelo', read_only=True)

    class Meta:
        model = VehicleTrip
        fields = '__all__'
        read_only_fields = ('fecha_hora_salida', 'fecha_hora_llegada', 'estado_viaje', 'conductor', 'kilometraje_salida', 'km_recorridos', 'costo_combustible_viaje')

class VehicleRegistrationRecordSerializer(serializers.ModelSerializer):
    vehicle_placa = serializers.CharField(source='vehicle.placa', read_only=True)

    class Meta:
        model = VehicleRegistrationRecord
        fields = '__all__'
