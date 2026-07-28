from django.db import models
from .core import User

class Vehicle(models.Model):
    ESTADO_CHOICES = [
        ('En Sindicato', 'En Sindicato'),
        ('Fuera del Sindicato', 'Fuera del Sindicato'),
    ]

    placa = models.CharField(max_length=20, unique=True)
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    año = models.IntegerField()
    color = models.CharField(max_length=50)
    estado_actual = models.CharField(max_length=50, choices=ESTADO_CHOICES, default='En Sindicato')
    foto_vehiculo = models.ImageField(upload_to='vehicles/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

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
    descripcion_salida = models.TextField()
    fecha_hora_salida = models.DateTimeField(auto_now_add=True)
    kilometraje_salida = models.IntegerField()
    gasolina_salida = models.IntegerField(help_text="Porcentaje de gasolina (0-100)")
    foto_evidencia_salida = models.ImageField(upload_to='vehicle_trips/salidas/')

    # Datos de Llegada
    fecha_hora_llegada = models.DateTimeField(null=True, blank=True)
    kilometraje_llegada = models.IntegerField(null=True, blank=True)
    gasolina_llegada = models.IntegerField(null=True, blank=True, help_text="Porcentaje de gasolina (0-100)")
    foto_evidencia_llegada = models.ImageField(upload_to='vehicle_trips/llegadas/', null=True, blank=True)
    descripcion_llegada = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Viaje {self.id} - {self.vehicle.placa} por {self.conductor.username}"
