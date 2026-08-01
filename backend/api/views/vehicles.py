from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from api.models.vehicles import Vehicle, VehicleTrip
from api.serializers.vehicles import VehicleSerializer, VehicleTripSerializer
from api.mixins import AuditLogMixin
from api.signals import broadcast_inventory_update

class VehicleViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Vehicle.objects.all().order_by('-id')
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Catálogo de Vehículos'

class VehicleTripViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = VehicleTrip.objects.select_related('vehicle', 'conductor').all().order_by('-fecha_hora_salida')
    serializer_class = VehicleTripSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Viajes'

    def perform_create(self, serializer):
        # Al crear la salida
        trip = serializer.save(conductor=self.request.user, estado_viaje='En Curso')
        
        # Actualizar el vehículo a "Fuera del Sindicato"
        vehicle = trip.vehicle
        vehicle.estado_actual = 'Fuera del Sindicato'
        vehicle.save()
        
        broadcast_inventory_update('Vehicle', 'update')
        broadcast_inventory_update('VehicleTrip', 'create')

    @action(detail=True, methods=['patch'])
    def register_arrival(self, request, pk=None):
        trip = self.get_object()
        
        if trip.estado_viaje == 'Finalizado':
            return Response({'detail': 'El viaje ya ha sido finalizado.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Extraer datos de llegada
        kilometraje_llegada = request.data.get('kilometraje_llegada')
        gasolina_llegada = request.data.get('gasolina_llegada')
        descripcion_llegada = request.data.get('descripcion_llegada', '')
        foto_evidencia_llegada = request.FILES.get('foto_evidencia_llegada')

        if not kilometraje_llegada or not gasolina_llegada or not foto_evidencia_llegada:
            return Response({'detail': 'Kilometraje, gasolina y foto de evidencia son obligatorios para la llegada.'}, status=status.HTTP_400_BAD_REQUEST)

        # Actualizar viaje
        trip.kilometraje_llegada = kilometraje_llegada
        trip.gasolina_llegada = gasolina_llegada
        trip.descripcion_llegada = descripcion_llegada
        trip.foto_evidencia_llegada = foto_evidencia_llegada
        trip.fecha_hora_llegada = timezone.now()
        trip.estado_viaje = 'Finalizado'
        trip.save()

        # Actualizar vehículo
        vehicle = trip.vehicle
        vehicle.estado_actual = 'En Sindicato'
        vehicle.save()

        broadcast_inventory_update('Vehicle', 'update')
        broadcast_inventory_update('VehicleTrip', 'update')

        return Response(VehicleTripSerializer(trip).data)
