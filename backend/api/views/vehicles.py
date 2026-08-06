from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum
from api.models.vehicles import Vehicle, VehicleTrip, VehicleRegistrationRecord
from api.models.maintenance import VehicleMaintenance
from api.serializers.vehicles import VehicleSerializer, VehicleTripSerializer, VehicleRegistrationRecordSerializer
from api.mixins import AuditLogMixin
from api.signals import broadcast_inventory_update
from api.models.core import DriverProfile

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

    def get_queryset(self):
        queryset = super().get_queryset()
        vehicle_id = self.request.query_params.get('vehicle', None)
        if vehicle_id is not None:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        return queryset

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
        galones_recargados = request.data.get('galones_recargados', 0)
        novedades_observaciones = request.data.get('novedades_observaciones', '')
        foto_evidencia_llegada = request.FILES.get('foto_evidencia_llegada')

        if not kilometraje_llegada or not foto_evidencia_llegada:
            return Response({'detail': 'Kilometraje y foto de evidencia son obligatorios para la llegada.'}, status=status.HTTP_400_BAD_REQUEST)

        # Actualizar viaje
        trip.kilometraje_llegada = int(kilometraje_llegada)
        trip.galones_recargados = galones_recargados
        trip.novedades_observaciones = novedades_observaciones
        trip.foto_evidencia_llegada = foto_evidencia_llegada
        trip.fecha_hora_llegada = timezone.now()
        trip.estado_viaje = 'Finalizado'
        # El save() se encargará de toda la matemática y actualización del vehículo
        trip.save()

        broadcast_inventory_update('Vehicle', 'update')
        broadcast_inventory_update('VehicleTrip', 'update')

        return Response(VehicleTripSerializer(trip).data)

class VehicleRegistrationRecordViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = VehicleRegistrationRecord.objects.select_related('vehicle').all().order_by('-fecha_pago')
    serializer_class = VehicleRegistrationRecordSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Historial de Matrículas'

    def get_queryset(self):
        queryset = super().get_queryset()
        vehicle_id = self.request.query_params.get('vehicle', None)
        if vehicle_id is not None:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        return queryset

class VehicleDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vehicles = Vehicle.objects.all()
        total_vehicles = vehicles.count()
        en_sindicato = vehicles.filter(estado_actual='En Sindicato').count()
        en_ruta = vehicles.filter(estado_actual='Fuera del Sindicato').count()
        en_taller = vehicles.filter(estado_actual='En Taller').count()
        total_conductores = DriverProfile.objects.count()

        # Alertas de Matriculas
        matriculas_vencidas = [v for v in vehicles if v.alerta_matricula == 'MATRÍCULA VENCIDA']
        matriculas_proximas = [v for v in vehicles if v.alerta_matricula == 'PRÓXIMA A VENCER']
        matriculas_alertas = len(matriculas_vencidas) + len(matriculas_proximas)

        # Alertas Mantenimientos
        mantenimientos = VehicleMaintenance.objects.all()
        mantenimientos_vencidos = [m for m in mantenimientos if m.estado_alerta == 'CAMBIO URGENTE']
        mantenimientos_proximos = [m for m in mantenimientos if m.estado_alerta == 'PRÓXIMO']
        mantenimientos_alertas = len(mantenimientos_vencidos) + len(mantenimientos_proximos)

        # Gastos de Combustible
        fuel_expenses = []
        for v in vehicles:
            trips = VehicleTrip.objects.filter(vehicle=v)
            total_spent = trips.aggregate(total=Sum('costo_combustible_viaje'))['total'] or 0
            if total_spent > 0:
                fuel_expenses.append({
                    'placa': v.placa,
                    'marca': v.marca,
                    'costo_total': total_spent,
                })
        fuel_expenses = sorted(fuel_expenses, key=lambda x: x['costo_total'], reverse=True)[:5]

        # Viajes Activos
        active_trips = VehicleTrip.objects.filter(estado_viaje='En Curso').select_related('vehicle', 'conductor')
        active_trips_data = [
            {
                'id': t.id,
                'vehiculo': t.vehicle.placa,
                'conductor': t.conductor.get_full_name() or t.conductor.username,
                'destino': t.descripcion_salida,
                'salida': t.fecha_hora_salida.isoformat() if t.fecha_hora_salida else None
            } for t in active_trips
        ]

        return Response({
            'kpis': {
                'total': total_vehicles,
                'en_sindicato': en_sindicato,
                'en_ruta': en_ruta,
                'en_taller': en_taller,
                'matriculas_alertas': matriculas_alertas,
                'mantenimientos_alertas': mantenimientos_alertas,
                'total_conductores': total_conductores
            },
            'fuel_expenses': fuel_expenses,
            'active_trips': active_trips_data,
            'alerts': {
                'mantenimientos': [
                    {'id': m.id, 'vehicle_id': m.vehicle.id, 'vehiculo': m.vehicle.placa, 'actividad': m.actividad, 'estado': m.estado_alerta, 'km_restantes': m.km_restantes_para_proximo_cambio, 'odometro_actual': m.vehicle.odometro_actual}
                    for m in mantenimientos_vencidos + mantenimientos_proximos
                ][:10],
                'matriculas': [
                    {'vehicle_id': v.id, 'vehiculo': v.placa, 'vencimiento': v.fecha_vencimiento_matricula, 'estado': v.alerta_matricula, 'dias': v.dias_para_vencimiento_matricula}
                    for v in matriculas_vencidas + matriculas_proximas
                ][:10]
            }
        })
