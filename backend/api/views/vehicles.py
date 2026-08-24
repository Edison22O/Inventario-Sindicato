from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum, Count
from api.models.vehicles import Vehicle, VehicleTrip, VehicleRegistrationRecord, VehicleFuelLog, FuelBudget, DriverVehicleHandover
from api.models.maintenance import VehicleMaintenance, VehicleMaintenanceRecord
from api.serializers.vehicles import VehicleSerializer, VehicleTripSerializer, VehicleRegistrationRecordSerializer, VehicleFuelLogSerializer, FuelBudgetSerializer, DriverVehicleHandoverSerializer
from api.mixins import AuditLogMixin
from api.signals import broadcast_inventory_update
from api.models.core import DriverProfile

class VehicleViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Vehicle.objects.all().order_by('-id')
    lookup_field = 'public_id'
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Catálogo de Vehículos'

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        val = self.kwargs.get('public_id') or self.kwargs.get('pk')
        if val is not None:
            if str(val).isdigit():
                obj = queryset.filter(pk=int(val)).first()
                if obj:
                    return obj
            obj = queryset.filter(public_id=val).first()
            if obj:
                return obj
        return super().get_object()

class VehicleTripViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = VehicleTrip.objects.select_related('vehicle', 'conductor').all().order_by('-fecha_hora_salida')
    serializer_class = VehicleTripSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Viajes'

    def get_queryset(self):
        queryset = super().get_queryset()
        vehicle_id = self.request.query_params.get('vehicle', None)
        conductor_id = self.request.query_params.get('conductor', None)
        if vehicle_id is not None:
            if str(vehicle_id).isdigit():
                queryset = queryset.filter(vehicle_id=int(vehicle_id))
            else:
                queryset = queryset.filter(vehicle__public_id=vehicle_id)
        if conductor_id is not None:
            queryset = queryset.filter(conductor_id=conductor_id)
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

        try:
            km_llegada = int(kilometraje_llegada)
            if km_llegada < 0:
                return Response({'detail': 'El kilometraje de llegada no puede ser negativo.'}, status=status.HTTP_400_BAD_REQUEST)
            if km_llegada < trip.kilometraje_salida:
                return Response({'detail': f'El kilometraje de llegada ({km_llegada} km) debe ser mayor o igual al de salida ({trip.kilometraje_salida} km).'}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'detail': 'El kilometraje ingresado no es válido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            galones = float(galones_recargados or 0)
            if galones < 0:
                return Response({'detail': 'Los galones recargados no pueden ser negativos.'}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'detail': 'La cantidad de galones ingresada no es válida.'}, status=status.HTTP_400_BAD_REQUEST)

        # Actualizar viaje
        trip.kilometraje_llegada = km_llegada
        trip.galones_recargados = galones
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
            if str(vehicle_id).isdigit():
                queryset = queryset.filter(vehicle_id=int(vehicle_id))
            else:
                queryset = queryset.filter(vehicle__public_id=vehicle_id)
        return queryset

class VehicleFuelLogViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = VehicleFuelLog.objects.select_related('vehicle', 'conductor').all().order_by('-fecha_vale', '-created_at')
    serializer_class = VehicleFuelLogSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Vales de Combustible'

    def get_queryset(self):
        queryset = super().get_queryset()
        vehicle_id = self.request.query_params.get('vehicle', None)
        conductor_id = self.request.query_params.get('conductor', None)
        if vehicle_id is not None:
            if str(vehicle_id).isdigit():
                queryset = queryset.filter(vehicle_id=int(vehicle_id))
            else:
                queryset = queryset.filter(vehicle__public_id=vehicle_id)
        if conductor_id is not None:
            queryset = queryset.filter(conductor_id=conductor_id)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("!!! VEHICLE FUEL LOG VALIDATION ERRORS !!!:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(conductor=self.request.user if not serializer.validated_data.get('conductor') else serializer.validated_data.get('conductor'))


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

        # Datasets para Gráficas Dinámicas
        
        # 1. Kilometraje por Vehículo
        odometer_data = [
            {
                'id': v.id,
                'placa': v.placa,
                'marca': v.marca,
                'modelo': v.modelo,
                'odometro': v.odometro_actual
            } for v in vehicles.order_by('-odometro_actual')
        ]

        # 2. Gastos de Combustible por Vehículo
        fuel_expenses = []
        for v in vehicles:
            trips_cost = VehicleTrip.objects.filter(vehicle=v).aggregate(total=Sum('costo_combustible_viaje'))['total'] or 0
            logs_cost = VehicleFuelLog.objects.filter(vehicle=v).aggregate(total=Sum('costo_total'))['total'] or 0
            total_spent = float(trips_cost) + float(logs_cost)
            if total_spent > 0 or v.odometro_actual > 0:
                fuel_expenses.append({
                    'id': v.id,
                    'placa': v.placa,
                    'marca': v.marca,
                    'modelo': v.modelo,
                    'costo_total': round(total_spent, 2),
                })
        fuel_expenses = sorted(fuel_expenses, key=lambda x: x['costo_total'], reverse=True)

        # 3. Desglose Mantenimientos Correctivos vs Preventivos por Conductor y Año (Ej: "En el año X, Edison tuvo X correctivos y Y preventivos")
        maint_records = VehicleMaintenanceRecord.objects.select_related('vehicle', 'maintenance_rule').all()
        
        # Agrupar mantenimientos por Año y Conductor (asociado a viajes o vehículo)
        driver_maint_stats = {}
        for record in maint_records:
            year = record.fecha.year if record.fecha else timezone.now().year
            # Obtener conductor principal asociado al vehículo o viaje reciente
            recent_trip = VehicleTrip.objects.filter(vehicle=record.vehicle).order_by('-fecha_hora_salida').first()
            driver_name = "Sin Conductor Asignado"
            if recent_trip and recent_trip.conductor:
                full = f"{recent_trip.conductor.first_name or ''} {recent_trip.conductor.last_name or ''}".strip()
                driver_name = full if full else recent_trip.conductor.username

            key = (year, driver_name)
            if key not in driver_maint_stats:
                driver_maint_stats[key] = {
                    'año': year,
                    'conductor': driver_name,
                    'correctivos': 0,
                    'preventivos': 0,
                    'costo_correctivos': 0.0,
                    'costo_preventivos': 0.0,
                }
            
            is_corrective = record.tipo_mantenimiento == 'Correctivo' or (record.maintenance_rule and record.maintenance_rule.tipo_mantenimiento == 'Correctivo')
            cost = float(record.costo or 0)
            if is_corrective:
                driver_maint_stats[key]['correctivos'] += 1
                driver_maint_stats[key]['costo_correctivos'] += cost
            else:
                driver_maint_stats[key]['preventivos'] += 1
                driver_maint_stats[key]['costo_preventivos'] += cost

        driver_stats_list = list(driver_maint_stats.values())
        driver_stats_list = sorted(driver_stats_list, key=lambda x: (x['año'], x['conductor']), reverse=True)

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

        # Totales financieros para gráficas del Dashboard
        total_fuel_cost = round(sum(item['costo_total'] for item in fuel_expenses), 2)
        total_maint_cost = round(sum(float(r.costo or 0) for r in maint_records), 2)
        total_preventive_cost = round(sum(st['costo_preventivos'] for st in driver_stats_list), 2)
        total_corrective_cost = round(sum(st['costo_correctivos'] for st in driver_stats_list), 2)

        # Consolidado de gastos por vehículo (Combustible + Mantenimiento)
        vehicle_consolidated = {}
        for v in vehicles:
            placa = v.placa
            vehicle_consolidated[placa] = {'placa': placa, 'combustible': 0.0, 'mantenimiento': 0.0, 'total': 0.0}
        
        for item in fuel_expenses:
            placa = item['placa']
            if placa in vehicle_consolidated:
                vehicle_consolidated[placa]['combustible'] += float(item['costo_total'])
                vehicle_consolidated[placa]['total'] += float(item['costo_total'])
            else:
                vehicle_consolidated[placa] = {'placa': placa, 'combustible': float(item['costo_total']), 'mantenimiento': 0.0, 'total': float(item['costo_total'])}

        for record in maint_records:
            placa = record.vehicle.placa if record.vehicle else 'Desconocido'
            cost = float(record.costo or 0)
            if placa in vehicle_consolidated:
                vehicle_consolidated[placa]['mantenimiento'] += cost
                vehicle_consolidated[placa]['total'] += cost
            else:
                vehicle_consolidated[placa] = {'placa': placa, 'combustible': 0.0, 'mantenimiento': cost, 'total': cost}

        consolidated_list = [item for item in vehicle_consolidated.values() if item['total'] > 0]
        consolidated_list = sorted(consolidated_list, key=lambda x: x['total'], reverse=True)

        return Response({
            'kpis': {
                'total': total_vehicles,
                'en_sindicato': en_sindicato,
                'en_ruta': en_ruta,
                'en_taller': en_taller,
                'matriculas_alertas': matriculas_alertas,
                'mantenimientos_alertas': mantenimientos_alertas,
                'total_conductores': total_conductores,
                'total_fuel_cost': total_fuel_cost,
                'total_maint_cost': total_maint_cost,
                'total_preventive_cost': total_preventive_cost,
                'total_corrective_cost': total_corrective_cost
            },
            'odometer_data': odometer_data,
            'fuel_expenses': fuel_expenses,
            'consolidated_expenses': consolidated_list,
            'driver_maint_stats': driver_stats_list,
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

class FuelBudgetViewSet(viewsets.ModelViewSet):
    queryset = FuelBudget.objects.all()
    serializer_class = FuelBudgetSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        budget = FuelBudget.load()
        serializer = self.get_serializer(budget)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='set-initial')
    def set_initial(self, request):
        budget = FuelBudget.load()
        saldo_gasolina = request.data.get('saldo_gasolina')
        saldo_diesel = request.data.get('saldo_diesel')
        
        import decimal
        if saldo_gasolina is not None:
            budget.base_gasolina = decimal.Decimal(str(saldo_gasolina))
        if saldo_diesel is not None:
            budget.base_diesel = decimal.Decimal(str(saldo_diesel))
            
        budget.recalculate()
        broadcast_inventory_update('FuelBudget', 'update')
        return Response(FuelBudgetSerializer(budget).data)

    @action(detail=False, methods=['post'], url_path='add-funds')
    def add_funds(self, request):
        budget = FuelBudget.load()
        monto_gasolina = request.data.get('monto_gasolina', 0)
        monto_diesel = request.data.get('monto_diesel', 0)
        
        import decimal
        if monto_gasolina:
            budget.base_gasolina += decimal.Decimal(str(monto_gasolina))
        if monto_diesel:
            budget.base_diesel += decimal.Decimal(str(monto_diesel))
            
        budget.recalculate()
        broadcast_inventory_update('FuelBudget', 'update')
        return Response(FuelBudgetSerializer(budget).data)

    @action(detail=False, methods=['post'], url_path='transfer')
    def transfer(self, request):
        budget = FuelBudget.load()
        origen = request.data.get('origen') # 'GASOLINA' o 'DIESEL'
        monto = request.data.get('monto', 0)
        
        import decimal
        val = decimal.Decimal(str(monto or 0))
        if val <= 0:
            return Response({'error': 'El monto a transferir debe ser mayor a 0.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if origen == 'GASOLINA':
            if budget.saldo_gasolina < val and budget.base_gasolina < val:
                return Response({'error': 'Saldo insuficiente en Gasolina.'}, status=status.HTTP_400_BAD_REQUEST)
            budget.base_gasolina -= val
            budget.base_diesel += val
        elif origen == 'DIESEL':
            if budget.saldo_diesel < val and budget.base_diesel < val:
                return Response({'error': 'Saldo insuficiente en Diésel.'}, status=status.HTTP_400_BAD_REQUEST)
            budget.base_diesel -= val
            budget.base_gasolina += val
        else:
            return Response({'error': 'Origen no válido.'}, status=status.HTTP_400_BAD_REQUEST)
            
        budget.recalculate()
        broadcast_inventory_update('FuelBudget', 'update')
        return Response(FuelBudgetSerializer(budget).data)

class DriverVehicleHandoverViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = DriverVehicleHandover.objects.select_related('driver', 'vehicle').all().order_by('-fecha', '-created_at')
    serializer_class = DriverVehicleHandoverSerializer
    permission_classes = [IsAuthenticated]
    audit_module_name = 'Actas de Entrega y Recepción'

    def get_queryset(self):
        queryset = super().get_queryset()
        driver_id = self.request.query_params.get('driver', None)
        vehicle_id = self.request.query_params.get('vehicle', None)
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        if vehicle_id:
            if str(vehicle_id).isdigit():
                queryset = queryset.filter(vehicle_id=int(vehicle_id))
            else:
                queryset = queryset.filter(vehicle__public_id=vehicle_id)
        return queryset

