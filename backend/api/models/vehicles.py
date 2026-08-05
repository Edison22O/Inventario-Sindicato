from django.db import models
from .core import User, SystemSettings

class Vehicle(models.Model):
    ESTADO_CHOICES = [
        ('En Sindicato', 'En Sindicato'),
        ('Fuera del Sindicato', 'Fuera del Sindicato'),
    ]
    COMBUSTIBLE_CHOICES = [
        ('Gasolina', 'Gasolina'),
        ('Diesel', 'Diesel'),
    ]

    placa = models.CharField(max_length=20, unique=True)
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    año = models.IntegerField()
    color = models.CharField(max_length=50)
    estado_actual = models.CharField(max_length=50, choices=ESTADO_CHOICES, default='En Sindicato')
    foto_vehiculo = models.ImageField(upload_to='vehicles/', null=True, blank=True)
    
    # Matrícula
    mes_matricula = models.CharField(max_length=20, blank=True, null=True)
    fecha_vencimiento_matricula = models.DateField(blank=True, null=True)
    
    # Parámetros de Combustible y Rendimiento
    tipo_combustible = models.CharField(max_length=20, choices=COMBUSTIBLE_CHOICES, default='Gasolina')
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

    def __str__(self):
        return f"{self.placa} - {self.marca} {self.modelo}"

class VehicleTrip(models.Model):
    ESTADO_VIAJE_CHOICES = [
        ('En Curso', 'En Curso'),
        ('Finalizado', 'Finalizado'),
    ]

    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='trips')
    conductor = models.ForeignKey(User, on_delete=models.PROTECT, related_name='vehicle_trips')
    estado_viaje = models.CharField(max_length=20, choices=ESTADO_VIAJE_CHOICES, default='En Curso')

    # Datos de Salida
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
            precio_galon = settings.precio_gasolina if self.vehicle.tipo_combustible == 'Gasolina' else settings.precio_diesel
            
            # Calcular costo del viaje
            self.costo_combustible_viaje = consumo_galones * precio_galon
            
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

        super(VehicleTrip, self).save(*args, **kwargs)

    def __str__(self):
        return f"Viaje {self.id} - {self.vehicle.placa} por {self.conductor.username}"
