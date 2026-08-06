from django.db import models
from .inventory import Product
from .vehicles import Vehicle

class MaintenanceLog(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='maintenances')
    fecha = models.DateField()
    realizado_por = models.CharField(max_length=255)
    descripcion = models.TextField()
    costo = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    estado_resultante = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Mantenimiento - {self.product.codigo} - {self.fecha}"

class VehicleMaintenance(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='maintenances')
    actividad = models.CharField(max_length=200) # ej: Aceite de motor, Filtro, etc.
    fecha_ultimo_cambio = models.DateField()
    fecha_proximo_cambio = models.DateField(null=True, blank=True)
    km_ultimo_cambio = models.IntegerField()
    frecuencia_km = models.IntegerField() # Cada cuántos km se debe hacer
    
    # Historico o notas
    notas = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    @property
    def km_proximo_cambio(self):
        return self.km_ultimo_cambio + self.frecuencia_km
        
    @property
    def km_recorridos_desde_cambio(self):
        return self.vehicle.odometro_actual - self.km_ultimo_cambio
        
    @property
    def dias_transcurridos(self):
        from datetime import date
        if self.fecha_ultimo_cambio:
            return (date.today() - self.fecha_ultimo_cambio).days
        return 0

    @property
    def dias_restantes(self):
        from datetime import date
        if self.fecha_proximo_cambio:
            return (self.fecha_proximo_cambio - date.today()).days
        return None
        
    @property
    def km_restantes_para_proximo_cambio(self):
        return self.km_proximo_cambio - self.vehicle.odometro_actual

    @property
    def estado_alerta(self):
        # Mismo cálculo del Excel: Si km_restantes < 0 o dias_restantes < 0 -> CAMBIO URGENTE
        dias = self.dias_restantes
        km_restantes = self.km_restantes_para_proximo_cambio
        
        if km_restantes < 0 or (dias is not None and dias < 0):
            return "CAMBIO URGENTE"
        elif km_restantes <= 500 or (dias is not None and dias <= 15):
            return "PRÓXIMO"
        else:
            return "VIGENTE"

    def __str__(self):
        return f"{self.actividad} - {self.vehicle.placa}"

class VehicleMaintenanceRecord(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='maintenance_records')
    maintenance_rule = models.ForeignKey(VehicleMaintenance, on_delete=models.SET_NULL, null=True, blank=True, related_name='records')
    fecha = models.DateField()
    taller = models.CharField(max_length=255)
    costo = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    factura_foto = models.ImageField(upload_to='vehicles/maintenances/facturas/', null=True, blank=True)
    notas = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        actividad = self.maintenance_rule.actividad if self.maintenance_rule else "Servicio General"
        return f"{actividad} - {self.vehicle.placa} ({self.fecha})"
