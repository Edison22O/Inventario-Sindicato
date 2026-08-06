from django.db import models
from django.contrib.auth.models import AbstractUser

class Role(models.Model):
    name = models.CharField(max_length=150)
    level = models.IntegerField(unique=True)
    status = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class User(AbstractUser):
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    image = models.ImageField(upload_to='users/', default='users/no_image.jpg')
    
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        related_name="custom_user_set",
        related_query_name="user",
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name="custom_user_set",
        related_query_name="user",
    )

class Media(models.Model):
    file = models.FileField(upload_to='media/')
    file_type = models.CharField(max_length=100)
    uploaded_at = models.DateTimeField(auto_now_add=True)

class SystemSettings(models.Model):
    organization_name = models.CharField(max_length=255, default='Sindicato de Choferes Profesionales del Cantón Espejo')
    logo = models.ImageField(upload_to='settings/', null=True, blank=True)
    primary_color = models.CharField(max_length=20, default='#148143')
    
    # Precios de Combustible (Globales)
    precio_gasolina = models.DecimalField(max_digits=5, decimal_places=2, default=2.40)
    precio_diesel = models.DecimalField(max_digits=5, decimal_places=2, default=1.75)
    
    def save(self, *args, **kwargs):
        # Enforce singleton
        self.pk = 1
        super(SystemSettings, self).save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

class ActivityLog(models.Model):
    ACTION_CHOICES = (
        ('CREATE', 'Creación'),
        ('UPDATE', 'Actualización'),
        ('DELETE', 'Eliminación'),
        ('LOGIN', 'Inicio de Sesión'),
        ('OTHER', 'Otro'),
    )
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='activity_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    module = models.CharField(max_length=100)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user} - {self.action} - {self.timestamp}"

class DriverProfile(models.Model):
    ESTADO_CONDUCTOR = [
        ('Activo', 'Activo'),
        ('En Viaje', 'En Viaje'),
        ('Inactivo', 'Inactivo'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='driver_profile')
    licencia = models.CharField(max_length=50)
    tipo_licencia = models.CharField(max_length=20)
    fecha_emision_licencia = models.DateField(null=True, blank=True)
    fecha_vencimiento_licencia = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CONDUCTOR, default='Activo')
    foto = models.ImageField(upload_to='conductores/', null=True, blank=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    tipo_sangre = models.CharField(max_length=10, blank=True, null=True)
    contacto_emergencia = models.CharField(max_length=100, blank=True, null=True)
    
    def __str__(self):
        return f"Conductor: {self.user.get_full_name() or self.user.username}"
