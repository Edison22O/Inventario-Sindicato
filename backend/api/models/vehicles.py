import uuid
from django.db import models
from .core import User, SystemSettings

class Vehicle(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    ESTADO_CHOICES = [
        ('En Sindicato', 'En Sindicato'),
        ('Fuera del Sindicato', 'Fuera del Sindicato'),
    ]
    COMBUSTIBLE_CHOICES = [
        ('Gasolina Extra', 'Gasolina Extra'),
        ('Diesel', 'Diesel'),
    ]


    placa = models.CharField(max_length=20, unique=True)
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    año = models.IntegerField()
    color = models.CharField(max_length=50)
    
    # Nuevos campos del Excel
    chasis = models.CharField(max_length=100, blank=True, null=True)
    motor = models.CharField(max_length=100, blank=True, null=True)
    clase = models.CharField(max_length=50, blank=True, null=True) # Ej: AUTOMOVIL, CAMIONETA
    tipo = models.CharField(max_length=50, blank=True, null=True) # Ej: SEDAN, FURGONETA
    observacion = models.TextField(blank=True, null=True)

    estado_actual = models.CharField(max_length=50, choices=ESTADO_CHOICES, default='En Sindicato')
    foto_vehiculo = models.ImageField(upload_to='vehicles/', null=True, blank=True)
    
    # Matrícula
    mes_matricula = models.CharField(max_length=20, blank=True, null=True)
    fecha_vencimiento_matricula = models.DateField(blank=True, null=True)
    
    # Parámetros de Combustible y Rendimiento
    tipo_combustible = models.CharField(max_length=20, choices=COMBUSTIBLE_CHOICES, default='Gasolina Extra')
    capacidad_tanque_galones = models.DecimalField(max_digits=6, decimal_places=2, default=10.00)
    rendimiento_km_por_galon = models.DecimalField(max_digits=6, decimal_places=2, default=40.00)
    
    # Estado Dinámico
    odometro_actual = models.IntegerField(default=0)
    combustible_actual_galones = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    @property
    def dias_para_vencimiento_matricula(self):
        from datetime import date
        if self.fecha_vencimiento_matricula:
            delta = self.fecha_vencimiento_matricula - date.today()
            return delta.days
        return None
        
    @property
    def alerta_matricula(self):
        dias = self.dias_para_vencimiento_matricula
        if dias is None: return "NO REGISTRADA"
        if dias < 0: return "VENCIDA"
        if dias <= 30: return "PRÓXIMA A VENCER"
        return "VIGENTE"

    def save(self, *args, **kwargs):
        if self.tipo_combustible:
            tc_upper = str(self.tipo_combustible).upper()
            if 'DIESEL' in tc_upper or 'DIÉSEL' in tc_upper:
                self.tipo_combustible = 'Diesel'
            else:
                self.tipo_combustible = 'Gasolina Extra'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.placa} - {self.marca} {self.modelo}"

class VehicleTrip(models.Model):
    ESTADO_VIAJE_CHOICES = [
        ('En Curso', 'En Curso'),
        ('Finalizado', 'Finalizado'),
    ]

    MOTIVO_CHOICES = [
        ('Prácticas', 'Prácticas'),
        ('Comisión', 'Comisión'),
        ('Guincha', 'Guincha'),
        ('Otro', 'Otro'),
    ]

    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='trips')
    conductor = models.ForeignKey(User, on_delete=models.PROTECT, related_name='vehicle_trips')
    estado_viaje = models.CharField(max_length=20, choices=ESTADO_VIAJE_CHOICES, default='En Curso')

    # Datos de Salida
    tipo_motivo = models.CharField(max_length=50, choices=MOTIVO_CHOICES, default='Prácticas')
    ruta_practica = models.CharField(max_length=100, blank=True, null=True) # Ej: Ruta 1, Ruta 2, Ruta 3
    descripcion_salida = models.TextField(blank=True, null=True)
    fecha_hora_salida = models.DateTimeField(auto_now_add=True)
    kilometraje_salida = models.IntegerField() # Calculado automáticamente al salir
    foto_evidencia_salida = models.ImageField(upload_to='vehicle_trips/salidas/')

    # Datos de Llegada
    fecha_hora_llegada = models.DateTimeField(null=True, blank=True)
    kilometraje_llegada = models.IntegerField(null=True, blank=True) # Ingresado por el conductor al llegar
    foto_evidencia_llegada = models.ImageField(upload_to='vehicle_trips/llegadas/', null=True, blank=True)
    novedades_observaciones = models.TextField(null=True, blank=True)
    
    # Reportes de Combustible
    galones_recargados = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    km_recorridos = models.IntegerField(null=True, blank=True)
    costo_combustible_viaje = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def save(self, *args, **kwargs):
        # 1. Al crear (Salida), setear el kilometraje de salida automáticamente
        if not self.pk:
            self.kilometraje_salida = self.vehicle.odometro_actual
            self.estado_viaje = 'En Curso'
            self.vehicle.estado_actual = 'Fuera del Sindicato'
            self.vehicle.save(update_fields=['estado_actual'])
            
            if hasattr(self.conductor, 'driver_profile'):
                profile = self.conductor.driver_profile
                profile.estado = 'En Viaje'
                profile.save(update_fields=['estado'])
            
        # 2. Al actualizar (Llegada), calcular los deltas
        if self.pk and self.estado_viaje == 'Finalizado' and self.kilometraje_llegada is not None:
            # Calcular KM
            self.km_recorridos = self.kilometraje_llegada - self.kilometraje_salida
            
            # Obtener parametros del vehiculo
            rendimiento = self.vehicle.rendimiento_km_por_galon or 1 # Evitar division por cero
            
            # Calcular consumo
            import decimal
            consumo_galones = decimal.Decimal(self.km_recorridos) / rendimiento
            
            # Obtener precio global
            settings = SystemSettings.load()
            tipo_upper = (self.vehicle.tipo_combustible or '').upper()
            if 'DIESEL' in tipo_upper or 'DIÉSEL' in tipo_upper:
                precio_galon = settings.precio_diesel
            else:
                precio_galon = settings.precio_gasolina
            
            # Calcular costo del viaje
            self.costo_combustible_viaje = round(consumo_galones * precio_galon, 2)
            
            # Actualizar el Vehículo (Odómetro y Combustible actual)
            # Combustible actual = lo que tenía - lo que consumió + lo que recargó (si reporta recarga)
            self.galones_recargados = decimal.Decimal(str(self.galones_recargados or 0))
            nuevo_combustible = self.vehicle.combustible_actual_galones - consumo_galones + self.galones_recargados
            # Asegurar que no exceda la capacidad ni baje de 0
            if nuevo_combustible < 0: nuevo_combustible = decimal.Decimal('0.00')
            if nuevo_combustible > self.vehicle.capacidad_tanque_galones:
                nuevo_combustible = self.vehicle.capacidad_tanque_galones
                
            self.vehicle.combustible_actual_galones = nuevo_combustible
            self.vehicle.odometro_actual = self.kilometraje_llegada
            self.vehicle.estado_actual = 'En Sindicato'
            self.vehicle.save()

            if hasattr(self.conductor, 'driver_profile'):
                profile = self.conductor.driver_profile
                profile.estado = 'Activo'
                profile.save(update_fields=['estado'])

        super(VehicleTrip, self).save(*args, **kwargs)

    def __str__(self):
        return f"Viaje {self.id} - {self.vehicle.placa} por {self.conductor.username}"

class VehicleRegistrationRecord(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='registrations')
    fecha_pago = models.DateField()
    año_matriculado = models.IntegerField()
    costo = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    lugar_tramite = models.CharField(max_length=200, blank=True, null=True)
    nueva_fecha_vencimiento = models.DateField()
    observaciones_pendientes = models.TextField(blank=True, null=True)
    
    # Documentos PDF (hasta 3)
    documento_pdf_1 = models.FileField(upload_to='vehicles/matriculas/', null=True, blank=True)
    documento_pdf_2 = models.FileField(upload_to='vehicles/matriculas/', null=True, blank=True)
    documento_pdf_3 = models.FileField(upload_to='vehicles/matriculas/', null=True, blank=True)
    
    notas = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Actualizar automáticamente la fecha de vencimiento del vehículo
        self.vehicle.fecha_vencimiento_matricula = self.nueva_fecha_vencimiento
        self.vehicle.save(update_fields=['fecha_vencimiento_matricula'])
        super(VehicleRegistrationRecord, self).save(*args, **kwargs)

    def __str__(self):
        return f"Matrícula {self.año_matriculado} - {self.vehicle.placa}"

class FuelBudget(models.Model):
    base_gasolina = models.DecimalField(max_digits=12, decimal_places=2, default=300.00)
    base_diesel = models.DecimalField(max_digits=12, decimal_places=2, default=1200.00)
    saldo_total = models.DecimalField(max_digits=12, decimal_places=2, default=1500.00)
    saldo_gasolina = models.DecimalField(max_digits=12, decimal_places=2, default=300.00)
    saldo_diesel = models.DecimalField(max_digits=12, decimal_places=2, default=1200.00)
    limite_alerta = models.DecimalField(max_digits=12, decimal_places=2, default=40.00)
    updated_at = models.DateTimeField(auto_now=True)

    def recalculate(self):
        import decimal
        from django.db.models import Sum
        from api.models.vehicles import VehicleFuelLog
        extra_spent = VehicleFuelLog.objects.filter(tipo_combustible='EXTRA').aggregate(total=Sum('costo_total'))['total'] or decimal.Decimal('0.00')
        diesel_spent = VehicleFuelLog.objects.filter(tipo_combustible='DIESEL').aggregate(total=Sum('costo_total'))['total'] or decimal.Decimal('0.00')

        self.saldo_gasolina = (self.base_gasolina or decimal.Decimal('0.00')) - decimal.Decimal(str(extra_spent))
        self.saldo_diesel = (self.base_diesel or decimal.Decimal('0.00')) - decimal.Decimal(str(diesel_spent))
        self.saldo_total = self.saldo_gasolina + self.saldo_diesel
        super().save()

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(
            pk=1,
            defaults={
                'base_gasolina': 300.00,
                'base_diesel': 1200.00,
                'saldo_total': 1500.00,
                'saldo_gasolina': 300.00,
                'saldo_diesel': 1200.00,
                'limite_alerta': 40.00
            }
        )
        return obj

    def __str__(self):
        return f"Presupuesto Vales - Total: ${self.saldo_total} (Gasolina: ${self.saldo_gasolina}, Diésel: ${self.saldo_diesel})"

class VehicleFuelLog(models.Model):
    COMBUSTIBLE_CHOICES = [
        ('EXTRA', 'Gasolina Extra'),
        ('DIESEL', 'Diésel'),
    ]

    TRANSACCION_CHOICES = [
        ('EFECTIVO', 'Efectivo'),
        ('TARJETA', 'Tarjeta'),
        ('PREPAGO', 'Prepago'),
        ('CONSUMO INTERNO', 'Consumo Interno'),
        ('CALIBRACION', 'Calibración'),
        ('DECRETO', 'Decreto'),
        ('DINERO ELECTRONICO', 'Dinero Electrónico'),
        ('MIDENA', 'Midena'),
    ]

    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='fuel_logs')
    conductor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='fuel_logs')
    responsable = models.CharField(max_length=255, blank=True, null=True)
    supervisado_por = models.CharField(max_length=255, blank=True, null=True)
    
    fecha_vale = models.DateField()
    numero_vale = models.CharField(max_length=50)
    odometro_recarga = models.IntegerField()
    
    tipo_combustible = models.CharField(max_length=20, choices=COMBUSTIBLE_CHOICES, default='EXTRA')
    galones = models.DecimalField(max_digits=8, decimal_places=3)
    precio_por_galon = models.DecimalField(max_digits=8, decimal_places=4, default=0.0000, null=True, blank=True)
    costo_total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    tipo_transaccion = models.CharField(max_length=50, choices=TRANSACCION_CHOICES, default='EFECTIVO', blank=True, null=True)
    concepto = models.TextField(blank=True, null=True)
    foto_vale = models.ImageField(upload_to='vehicles/fuel_vouchers/', null=True, blank=True, verbose_name="Fotografía del Vale")
    
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        is_new = not self.pk
        if is_new:
            from .core import SystemSettings
            settings = SystemSettings.load()
            if not self.precio_por_galon or float(self.precio_por_galon or 0) == 0:
                tipo = (self.tipo_combustible or (self.vehicle.tipo_combustible if self.vehicle else '') or '').upper()
                if 'DIESEL' in tipo or 'DIÉSEL' in tipo:
                    self.precio_por_galon = settings.precio_diesel
                else:
                    self.precio_por_galon = settings.precio_gasolina
            
            if (not self.costo_total or float(self.costo_total or 0) == 0) and self.galones and self.precio_por_galon:
                import decimal
                self.costo_total = round(decimal.Decimal(str(self.galones)) * decimal.Decimal(str(self.precio_por_galon)), 2)

        if is_new and self.vehicle:
            import decimal
            galones_sumar = decimal.Decimal(str(self.galones or 0))
            current_fuel = self.vehicle.combustible_actual_galones or decimal.Decimal('0')
            nuevo_nivel = current_fuel + galones_sumar
            
            if self.vehicle.capacidad_tanque_galones and nuevo_nivel > self.vehicle.capacidad_tanque_galones:
                nuevo_nivel = self.vehicle.capacidad_tanque_galones
                
            self.vehicle.combustible_actual_galones = nuevo_nivel
            
            if self.odometro_recarga and self.odometro_recarga > (self.vehicle.odometro_actual or 0):
                self.vehicle.odometro_actual = self.odometro_recarga
                
            self.vehicle.save(update_fields=['combustible_actual_galones', 'odometro_actual'])

        super().save(*args, **kwargs)
        
        try:
            budget = FuelBudget.load()
            budget.recalculate()
        except Exception:
            pass

    def delete(self, *args, **kwargs):
        res = super().delete(*args, **kwargs)
        try:
            budget = FuelBudget.load()
            budget.recalculate()
        except Exception:
            pass
        return res

    def __str__(self):
        return f"Vale {self.numero_vale} - {self.vehicle.placa} ({self.fecha_vale})"

class DriverVehicleHandover(models.Model):
    TIPO_ACTA_CHOICES = [
        ('Entrega', 'Entrega'),
        ('Recepción', 'Recepción'),
    ]

    driver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='handover_records')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='handover_records')
    tipo_acta = models.CharField(max_length=20, choices=TIPO_ACTA_CHOICES, default='Entrega')
    fecha = models.DateField()
    kilometraje = models.IntegerField(default=0)
    observaciones = models.TextField(blank=True, null=True)
    documento_acta_firmada = models.FileField(upload_to='vehicles/handovers/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.tipo_acta and 'recep' in str(self.tipo_acta).lower():
            self.tipo_acta = 'Recepción'
        elif self.tipo_acta and 'entreg' in str(self.tipo_acta).lower():
            self.tipo_acta = 'Entrega'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Acta {self.tipo_acta} - {self.vehicle.placa} - {self.driver.username} ({self.fecha})"



