from django.db import models
from .inventory import Product
from .vehicles import Vehicle
from .suppliers import Supplier, VehicleSupplier

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
    TIPO_CHOICES = [
        ('Preventivo', 'Preventivo'),
        ('Correctivo', 'Correctivo'),
    ]
    SUBTIPO_CORRECTIVO_CHOICES = [
        ('Urgente', 'Urgente'),
        ('Programado', 'Programado'),
    ]
    ESTADO_CORRECTIVO_CHOICES = [
        ('Pendiente', 'Pendiente'),
        ('Ejecutado', 'Ejecutado'),
    ]

    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='maintenances')
    tipo_mantenimiento = models.CharField(max_length=20, choices=TIPO_CHOICES, default='Preventivo')
    actividad = models.CharField(max_length=200) # ej: Aceite de motor, Filtro, Frenos, etc.
    fecha_ultimo_cambio = models.DateField()
    fecha_proximo_cambio = models.DateField(null=True, blank=True)
    km_ultimo_cambio = models.IntegerField(default=0)
    frecuencia_km = models.IntegerField(null=True, blank=True) # Opcional si es Correctivo
    
    # Detalle en mantenimientos correctivos
    kilometraje_falla = models.IntegerField(null=True, blank=True) # Odómetro al ocurrir la falla
    subtipo_correctivo = models.CharField(max_length=20, choices=SUBTIPO_CORRECTIVO_CHOICES, default='Programado', blank=True, null=True)
    estado_correctivo = models.CharField(max_length=20, choices=ESTADO_CORRECTIVO_CHOICES, default='Pendiente', blank=True, null=True)
    fallo_observado = models.TextField(blank=True, null=True) # ¿Qué falló?
    solucion_aplicada = models.TextField(blank=True, null=True) # ¿Qué se hizo para solucionarlo?
    numero_factura = models.CharField(max_length=100, blank=True, null=True)
    factura_foto = models.ImageField(upload_to='vehicles/maintenances/facturas/', null=True, blank=True)

    # Historico o notas
    notas = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    @property
    def km_proximo_cambio(self):
        if self.frecuencia_km is not None and self.km_ultimo_cambio is not None:
            return self.km_ultimo_cambio + self.frecuencia_km
        return self.km_ultimo_cambio
        
    @property
    def km_recorridos_desde_cambio(self):
        if self.km_ultimo_cambio is not None:
            return self.vehicle.odometro_actual - self.km_ultimo_cambio
        return 0
        
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
        if self.frecuencia_km is not None:
            return self.km_proximo_cambio - self.vehicle.odometro_actual
        return 999999

    @property
    def estado_alerta(self):
        if self.tipo_mantenimiento == 'Correctivo':
            if self.estado_correctivo == 'Ejecutado':
                return "EJECUTADO"
            elif self.subtipo_correctivo == 'Urgente':
                return "PENDIENTE URGENTE"
            else:
                return "PENDIENTE PROGRAMADO"
            
        dias = self.dias_restantes
        km_restantes = self.km_restantes_para_proximo_cambio
        
        if km_restantes <= -100 or (dias is not None and dias < 0):
            return "CAMBIO URGENTE"
        elif km_restantes <= 0:
            return "CAMBIO REQUERIDO"
        elif km_restantes <= 500 or (dias is not None and dias <= 15):
            return "REQUERIMIENTO"
        else:
            return "VIGENTE"

    def __str__(self):
        return f"[{self.tipo_mantenimiento}] {self.actividad} - {self.vehicle.placa}"

class VehicleMaintenanceRecord(models.Model):
    TIPO_CHOICES = [
        ('Preventivo', 'Preventivo'),
        ('Correctivo', 'Correctivo'),
    ]

    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='maintenance_records')
    maintenance_rule = models.ForeignKey(VehicleMaintenance, on_delete=models.SET_NULL, null=True, blank=True, related_name='records')
    supplier = models.ForeignKey(VehicleSupplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='vehicle_maintenance_records')
    tipo_mantenimiento = models.CharField(max_length=20, choices=TIPO_CHOICES, default='Preventivo')
    fecha = models.DateField()
    taller = models.CharField(max_length=255) # Nombre del taller o proveedor
    
    # Desglose de Factura
    subtotal_mano_obra = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) # Subtotal 1
    subtotal_materiales = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) # Subtotal 2
    costo = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) # Total (Subtotal 3)
    numero_factura = models.CharField(max_length=100, blank=True, null=True)
    factura_foto = models.ImageField(upload_to='vehicles/maintenances/facturas/', null=True, blank=True)
    
    # Detalle de lo que falló y solución
    fallo_observado = models.TextField(blank=True, null=True)
    solucion_aplicada = models.TextField(blank=True, null=True)
    
    notas = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Auto calcular costo total si los subtotales son ingresados
        if self.subtotal_mano_obra or self.subtotal_materiales:
            calc_total = (self.subtotal_mano_obra or 0) + (self.subtotal_materiales or 0)
            if self.costo == 0 or self.costo is None:
                self.costo = calc_total
        super().save(*args, **kwargs)

    def __str__(self):
        actividad = self.maintenance_rule.actividad if self.maintenance_rule else "Servicio General"
        return f"[{self.tipo_mantenimiento}] {actividad} - {self.vehicle.placa} ({self.fecha})"

