from rest_framework import serializers
from api.models.vehicles import Vehicle, VehicleTrip, VehicleRegistrationRecord, VehicleFuelLog

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
            
        preventivos = [m for m in maintenances if m.frecuencia_km]
        if preventivos:
            closest = min(preventivos, key=lambda m: m.frecuencia_km - m.km_recorridos_desde_cambio)
            return f"{closest.actividad} a los {closest.km_proximo_cambio} KM"
        return "Servicios preventivos al día"

class VehicleTripSerializer(serializers.ModelSerializer):
    conductor_name = serializers.SerializerMethodField()
    vehicle_placa = serializers.CharField(source='vehicle.placa', read_only=True)
    vehicle_marca = serializers.CharField(source='vehicle.marca', read_only=True)
    vehicle_modelo = serializers.CharField(source='vehicle.modelo', read_only=True)

    class Meta:
        model = VehicleTrip
        fields = '__all__'
        read_only_fields = ('fecha_hora_salida', 'fecha_hora_llegada', 'estado_viaje', 'conductor', 'kilometraje_salida', 'km_recorridos', 'costo_combustible_viaje')

    def get_conductor_name(self, obj):
        if not obj.conductor:
            return 'Desconocido'
        full = f"{obj.conductor.first_name or ''} {obj.conductor.last_name or ''}".strip()
        return full if full else obj.conductor.username

class VehicleRegistrationRecordSerializer(serializers.ModelSerializer):
    vehicle_placa = serializers.CharField(source='vehicle.placa', read_only=True)
    vehicle_marca = serializers.CharField(source='vehicle.marca', read_only=True)
    vehicle_modelo = serializers.CharField(source='vehicle.modelo', read_only=True)

    class Meta:
        model = VehicleRegistrationRecord
        fields = '__all__'

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        veh_val = data.get('vehicle')
        if veh_val:
            if str(veh_val).isdigit():
                v = Vehicle.objects.filter(pk=int(veh_val)).first()
            else:
                try:
                    v = Vehicle.objects.filter(public_id=veh_val).first()
                except Exception:
                    v = None
            if v:
                data['vehicle'] = v.pk
        return super().to_internal_value(data)

class VehicleFuelLogSerializer(serializers.ModelSerializer):
    vehicle_placa = serializers.CharField(source='vehicle.placa', read_only=True)
    vehicle_marca = serializers.CharField(source='vehicle.marca', read_only=True)
    vehicle_modelo = serializers.CharField(source='vehicle.modelo', read_only=True)
    conductor_name = serializers.SerializerMethodField()

    class Meta:
        model = VehicleFuelLog
        fields = '__all__'

    def get_conductor_name(self, obj):
        if not obj.conductor:
            return 'No especificado'
        full = f"{obj.conductor.first_name or ''} {obj.conductor.last_name or ''}".strip()
        return full if full else obj.conductor.username

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        veh_val = data.get('vehicle')
        if veh_val:
            if str(veh_val).isdigit():
                v = Vehicle.objects.filter(pk=int(veh_val)).first()
            else:
                try:
                    v = Vehicle.objects.filter(public_id=veh_val).first()
                except Exception:
                    v = None
            if v:
                data['vehicle'] = v.pk
        return super().to_internal_value(data)


