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
from api.models.core import DriverProfile, ActivityLog
from api.models.suppliers import VehicleSupplier

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
        # Al crear la salida, save() en el modelo VehicleTrip ya actualiza el vehículo a 'Fuera del Sindicato'
        # y emite las señales post_save correspondientes para WebSockets.
        trip = serializer.save(conductor=self.request.user, estado_viaje='En Curso')

        if self.request and hasattr(self.request, 'user') and self.request.user.is_authenticated:
            ActivityLog.objects.create(
                user=self.request.user,
                action='CREATE',
                module=self.audit_module_name,
                description=f"Registró salida del vehículo {trip.vehicle.placa}"
            )

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
        # El save() se encargará de toda la matemática, actualización del vehículo y emisión de señales
        trip.save()

        if request.user and request.user.is_authenticated:
            ActivityLog.objects.create(
                user=request.user,
                action='UPDATE',
                module=self.audit_module_name,
                description=f"Registró llegada del vehículo {trip.vehicle.placa}"
            )

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
        mantenimientos_vencidos = [m for m in mantenimientos if m.estado_alerta in ['CAMBIO URGENTE', 'CAMBIO REQUERIDO', 'PENDIENTE URGENTE']]
        mantenimientos_proximos = [m for m in mantenimientos if m.estado_alerta in ['REQUERIMIENTO', 'PENDIENTE PROGRAMADO']]
        mantenimientos_alertas = len(mantenimientos_vencidos) + len(mantenimientos_proximos)

        # Alertas de Licencias de Conductor
        from datetime import date
        today = date.today()
        licencias_alertas_data = []
        drivers = DriverProfile.objects.select_related('user').all()
        for d in drivers:
            driver_name = d.user.get_full_name() or d.user.username
            if d.fecha_vencimiento_licencia:
                delta = (d.fecha_vencimiento_licencia - today).days
                if delta < 0:
                    licencias_alertas_data.append({
                        'id': d.id,
                        'conductor': driver_name,
                        'tipo': d.tipo_licencia or 'Licencia',
                        'vencimiento': d.fecha_vencimiento_licencia.isoformat(),
                        'estado': 'LICENCIA VENCIDA',
                        'dias': delta
                    })
                elif delta <= 30:
                    licencias_alertas_data.append({
                        'id': d.id,
                        'conductor': driver_name,
                        'tipo': d.tipo_licencia or 'Licencia',
                        'vencimiento': d.fecha_vencimiento_licencia.isoformat(),
                        'estado': 'PRÓXIMA A VENCER',
                        'dias': delta
                    })

        disponibilidad_pct = round((en_sindicato / total_vehicles * 100), 1) if total_vehicles > 0 else 0.0

        # Suma de Galones de Combustible
        trips_gal = VehicleTrip.objects.aggregate(total=Sum('galones_recargados'))['total'] or 0
        logs_gal = VehicleFuelLog.objects.aggregate(total=Sum('galones'))['total'] or 0
        total_galones = round(float(trips_gal) + float(logs_gal), 2)

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

        # 3. Desglose Mantenimientos Correctivos vs Preventivos por Proveedor / Taller y Año
        suppliers_in_db = list(VehicleSupplier.objects.all())
        maint_records = VehicleMaintenanceRecord.objects.select_related('vehicle', 'maintenance_rule', 'supplier').all()
        current_year = timezone.now().year
        
        supplier_maint_stats = {}

        # Pre-poblar ÚNICAMENTE los proveedores registrados de la base de datos
        for s in suppliers_in_db:
            key = (current_year, s.name.strip())
            supplier_maint_stats[key] = {
                'year': current_year,
                'anio': current_year,
                'año': current_year,
                'proveedor': s.name.strip(),
                'supplier_id': s.id,
                'supplier_public_id': str(s.public_id),
                'es_registrado': True,
                'correctivos': 0,
                'preventivos': 0,
                'costo_correctivos': 0.0,
                'costo_preventivos': 0.0,
                'costo_total': 0.0,
                'total_servicios': 0,
            }

        # Asociar registros únicamente si corresponden a un proveedor registrado
        for record in maint_records:
            year = record.fecha.year if record.fecha else current_year
            sup_obj = record.supplier
            taller_text = record.taller.strip() if record.taller else ""

            matched_supplier = None

            if sup_obj:
                matched_supplier = sup_obj
            elif taller_text:
                for s in suppliers_in_db:
                    if s.name.lower() in taller_text.lower() or taller_text.lower() in s.name.lower():
                        matched_supplier = s
                        break

            if matched_supplier:
                key = (year, matched_supplier.name.strip())
                if key not in supplier_maint_stats:
                    supplier_maint_stats[key] = {
                        'year': year,
                        'anio': year,
                        'año': year,
                        'proveedor': matched_supplier.name.strip(),
                        'supplier_id': matched_supplier.id,
                        'supplier_public_id': str(matched_supplier.public_id),
                        'es_registrado': True,
                        'correctivos': 0,
                        'preventivos': 0,
                        'costo_correctivos': 0.0,
                        'costo_preventivos': 0.0,
                        'costo_total': 0.0,
                        'total_servicios': 0,
                    }
                
                is_corrective = record.tipo_mantenimiento == 'Correctivo' or (record.maintenance_rule and record.maintenance_rule.tipo_mantenimiento == 'Correctivo')
                cost = float(record.costo or 0)
                supplier_maint_stats[key]['total_servicios'] += 1
                supplier_maint_stats[key]['costo_total'] += cost
                if is_corrective:
                    supplier_maint_stats[key]['correctivos'] += 1
                    supplier_maint_stats[key]['costo_correctivos'] += cost
                else:
                    supplier_maint_stats[key]['preventivos'] += 1
                    supplier_maint_stats[key]['costo_preventivos'] += cost

        supplier_stats_list = list(supplier_maint_stats.values())
        supplier_stats_list = sorted(supplier_stats_list, key=lambda x: x['costo_total'], reverse=True)

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
        total_preventive_cost = round(sum(st['costo_preventivos'] for st in supplier_stats_list), 2)
        total_corrective_cost = round(sum(st['costo_correctivos'] for st in supplier_stats_list), 2)
        total_km_recorridos = sum(v.odometro_actual for v in vehicles)
        total_grand_cost = round(total_fuel_cost + total_maint_cost, 2)
        costo_promedio_km = round(total_grand_cost / total_km_recorridos, 2) if total_km_recorridos > 0 else 0.0

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

        total_alertas_unificadas = matriculas_alertas + mantenimientos_alertas + len(licencias_alertas_data)

        from api.models.core import SystemSettings
        sys_settings = SystemSettings.load()

        return Response({
            'kpis': {
                'total': total_vehicles,
                'en_sindicato': en_sindicato,
                'en_ruta': en_ruta,
                'en_taller': en_taller,
                'disponibilidad_pct': disponibilidad_pct,
                'matriculas_alertas': matriculas_alertas,
                'mantenimientos_alertas': mantenimientos_alertas,
                'licencias_alertas': len(licencias_alertas_data),
                'total_alertas_unificadas': total_alertas_unificadas,
                'total_conductores': total_conductores,
                'total_fuel_cost': total_fuel_cost,
                'total_maint_cost': total_maint_cost,
                'total_preventive_cost': total_preventive_cost,
                'total_corrective_cost': total_corrective_cost,
                'total_grand_cost': total_grand_cost,
                'total_galones': total_galones,
                'total_km_recorridos': total_km_recorridos,
                'costo_promedio_km': costo_promedio_km
            },
            'fuel_prices': {
                'precio_gasolina': float(sys_settings.precio_gasolina),
                'precio_diesel': float(sys_settings.precio_diesel)
            },
            'odometer_data': odometer_data,
            'fuel_expenses': fuel_expenses,
            'consolidated_expenses': consolidated_list,
            'supplier_maint_stats': supplier_stats_list,
            'driver_maint_stats': supplier_stats_list,
            'active_trips': active_trips_data,
            'alerts': {
                'mantenimientos': [
                    {'id': m.id, 'vehicle_id': m.vehicle.id, 'vehiculo': m.vehicle.placa, 'actividad': m.actividad, 'estado': m.estado_alerta, 'km_restantes': m.km_restantes_para_proximo_cambio, 'odometro_actual': m.vehicle.odometro_actual}
                    for m in mantenimientos_vencidos + mantenimientos_proximos
                ][:10],
                'matriculas': [
                    {'vehicle_id': v.id, 'vehiculo': v.placa, 'vencimiento': v.fecha_vencimiento_matricula, 'estado': v.alerta_matricula, 'dias': v.dias_para_vencimiento_matricula}
                    for v in matriculas_vencidas + matriculas_proximas
                ][:10],
                'licencias': licencias_alertas_data[:10]
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
        base_gas = request.data.get('base_gasolina') if request.data.get('base_gasolina') is not None else request.data.get('saldo_gasolina')
        base_die = request.data.get('base_diesel') if request.data.get('base_diesel') is not None else request.data.get('saldo_diesel')
        
        import decimal
        if base_gas is not None:
            budget.base_gasolina = decimal.Decimal(str(base_gas))
        if base_die is not None:
            budget.base_diesel = decimal.Decimal(str(base_die))
            
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

