from django.db import models
from .core import Media

class FurnitureCategory(models.Model):
    name = models.CharField(max_length=60, unique=True)

    def __str__(self):
        return self.name

class FurnitureDepartment(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name

class FurnitureSupplier(models.Model):
    name = models.CharField(max_length=255, unique=True)
    contact_name = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class FurnitureProduct(models.Model):
    codigo = models.CharField(max_length=100, unique=True)
    cantidad = models.IntegerField(default=0)
    nombre = models.CharField(max_length=255)
    color = models.CharField(max_length=100, blank=True, null=True)
    marca = models.CharField(max_length=100, blank=True, null=True)
    material = models.CharField(max_length=150, blank=True, null=True)
    dimensiones = models.CharField(max_length=150, blank=True, null=True)
    department = models.ForeignKey(FurnitureDepartment, on_delete=models.CASCADE, related_name='products')
    estado = models.CharField(max_length=50, blank=True, null=True)
    caracteristicas = models.TextField(blank=True, null=True)
    costo = models.DecimalField(max_digits=25, decimal_places=2, default=0.0)
    fecha_ingreso = models.DateField(auto_now_add=True)
    fecha_compra = models.DateField(blank=True, null=True)
    fecha_ultimo_mantenimiento = models.DateField(blank=True, null=True)
    
    category = models.ForeignKey(FurnitureCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    supplier = models.ForeignKey(FurnitureSupplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    image = models.ImageField(upload_to='furniture_products/', null=True, blank=True)
    media = models.ForeignKey(Media, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

class FurnitureMaintenanceLog(models.Model):
    product = models.ForeignKey(FurnitureProduct, on_delete=models.CASCADE, related_name='maintenances')
    fecha = models.DateField()
    realizado_por = models.CharField(max_length=255)
    descripcion = models.TextField()
    costo = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    estado_resultante = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Mantenimiento Mueble - {self.product.codigo} - {self.fecha}"
