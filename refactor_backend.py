import os

base_dir = r"c:\Users\godoy\Downloads\Inventario-Sindicato\backend\api"

# Ensure directories exist
os.makedirs(os.path.join(base_dir, 'models'), exist_ok=True)
os.makedirs(os.path.join(base_dir, 'serializers'), exist_ok=True)
os.makedirs(os.path.join(base_dir, 'views'), exist_ok=True)

# ----------------- MODELS -----------------
core_models = """from django.db import models
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
"""

suppliers_models = """from django.db import models

class Supplier(models.Model):
    name = models.CharField(max_length=255, unique=True)
    contact_name = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name
"""

inventory_models = """from django.db import models
from .core import Media
from .suppliers import Supplier

class Category(models.Model):
    name = models.CharField(max_length=60, unique=True)

    def __str__(self):
        return self.name

class Department(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name

class Product(models.Model):
    codigo = models.CharField(max_length=100, unique=True)
    cantidad = models.IntegerField(default=0)
    nombre = models.CharField(max_length=255)
    color = models.CharField(max_length=100, blank=True, null=True)
    marca = models.CharField(max_length=100, blank=True, null=True)
    modelo = models.CharField(max_length=100, blank=True, null=True)
    serie = models.CharField(max_length=100, blank=True, null=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='products')
    estado = models.CharField(max_length=50, blank=True, null=True)
    caracteristicas = models.TextField(blank=True, null=True)
    costo = models.DecimalField(max_digits=25, decimal_places=2, default=0.0)
    fecha_ingreso = models.DateField(auto_now_add=True)
    fecha_compra = models.DateField(blank=True, null=True)
    fecha_ultimo_mantenimiento = models.DateField(blank=True, null=True)
    
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    media = models.ForeignKey(Media, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"
"""

maintenance_models = """from django.db import models
from .inventory import Product

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
"""

with open(os.path.join(base_dir, 'models', 'core.py'), 'w') as f: f.write(core_models)
with open(os.path.join(base_dir, 'models', 'suppliers.py'), 'w') as f: f.write(suppliers_models)
with open(os.path.join(base_dir, 'models', 'inventory.py'), 'w') as f: f.write(inventory_models)
with open(os.path.join(base_dir, 'models', 'maintenance.py'), 'w') as f: f.write(maintenance_models)

with open(os.path.join(base_dir, 'models', '__init__.py'), 'w') as f:
    f.write("from .core import Role, User, Media\n")
    f.write("from .suppliers import Supplier\n")
    f.write("from .inventory import Category, Department, Product\n")
    f.write("from .maintenance import MaintenanceLog\n")


# ----------------- SERIALIZERS -----------------
core_serializers = """from rest_framework import serializers
from api.models.core import Role, User, Media

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'image', 'is_active', 'last_login']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

class MediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Media
        fields = '__all__'
"""

suppliers_serializers = """from rest_framework import serializers
from api.models.suppliers import Supplier

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'
"""

inventory_serializers = """from rest_framework import serializers
from api.models.inventory import Category, Department, Product

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    media_url = serializers.CharField(source='media.file.url', read_only=True)

    class Meta:
        model = Product
        fields = '__all__'
"""

maintenance_serializers = """from rest_framework import serializers
from api.models.maintenance import MaintenanceLog

class MaintenanceLogSerializer(serializers.ModelSerializer):
    product_codigo = serializers.CharField(source='product.codigo', read_only=True)
    product_nombre = serializers.CharField(source='product.nombre', read_only=True)
    
    class Meta:
        model = MaintenanceLog
        fields = '__all__'

    def create(self, validated_data):
        maintenance_log = super().create(validated_data)
        product = maintenance_log.product
        product.estado = maintenance_log.estado_resultante
        product.fecha_ultimo_mantenimiento = maintenance_log.fecha
        product.save()
        return maintenance_log
"""

with open(os.path.join(base_dir, 'serializers', 'core.py'), 'w') as f: f.write(core_serializers)
with open(os.path.join(base_dir, 'serializers', 'suppliers.py'), 'w') as f: f.write(suppliers_serializers)
with open(os.path.join(base_dir, 'serializers', 'inventory.py'), 'w') as f: f.write(inventory_serializers)
with open(os.path.join(base_dir, 'serializers', 'maintenance.py'), 'w') as f: f.write(maintenance_serializers)

with open(os.path.join(base_dir, 'serializers', '__init__.py'), 'w') as f:
    f.write("from .core import RoleSerializer, UserSerializer, MediaSerializer\n")
    f.write("from .suppliers import SupplierSerializer\n")
    f.write("from .inventory import CategorySerializer, DepartmentSerializer, ProductSerializer\n")
    f.write("from .maintenance import MaintenanceLogSerializer\n")

# ----------------- VIEWS -----------------
core_views = """from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.conf import settings
import subprocess
import os
from rest_framework.permissions import IsAuthenticated
from api.models.core import Role, User, Media
from api.serializers.core import RoleSerializer, UserSerializer, MediaSerializer

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

class MediaViewSet(viewsets.ModelViewSet):
    queryset = Media.objects.all()
    serializer_class = MediaSerializer
    permission_classes = [IsAuthenticated]

class BackupViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def export(self, request):
        db_settings = settings.DATABASES['default']
        env = os.environ.copy()
        env['PGPASSWORD'] = db_settings['PASSWORD']
        
        cmd = [
            'pg_dump',
            '-h', db_settings['HOST'],
            '-p', str(db_settings['PORT']),
            '-U', db_settings['USER'],
            '-d', db_settings['NAME'],
            '--clean', '--if-exists'
        ]
        
        try:
            result = subprocess.run(cmd, env=env, check=True, capture_output=True)
            response = HttpResponse(result.stdout, content_type='application/sql')
            response['Content-Disposition'] = 'attachment; filename="backup_inventario.sql"'
            return response
        except subprocess.CalledProcessError as e:
            import sys
            print(f"PG_DUMP ERROR: {e.stderr.decode()}", file=sys.stderr, flush=True)
            return Response({'error': str(e), 'stderr': e.stderr.decode()}, status=500)
        except Exception as e:
            import sys
            print(f"GENERAL ERROR: {str(e)}", file=sys.stderr, flush=True)
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['post'], url_path='import')
    def import_db(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)
            
        file_path = '/tmp/backup.sql'
        with open(file_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)
                
        db_settings = settings.DATABASES['default']
        env = os.environ.copy()
        env['PGPASSWORD'] = db_settings['PASSWORD']
        
        cmd = [
            'psql',
            '-h', db_settings['HOST'],
            '-p', str(db_settings['PORT']),
            '-U', db_settings['USER'],
            '-d', db_settings['NAME'],
            '-f', file_path
        ]
        
        try:
            result = subprocess.run(cmd, env=env, check=True, capture_output=True)
            os.remove(file_path)
            return Response({'message': 'Database restored successfully'})
        except subprocess.CalledProcessError as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            return Response({'error': str(e), 'stderr': e.stderr.decode()}, status=500)
"""

suppliers_views = """from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from api.models.suppliers import Supplier
from api.serializers.suppliers import SupplierSerializer

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
"""

inventory_views = """from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from api.models.inventory import Category, Department, Product
from api.serializers.inventory import CategorySerializer, DepartmentSerializer, ProductSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('department', 'category', 'supplier', 'media').all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
"""

maintenance_views = """from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from api.models.maintenance import MaintenanceLog
from api.serializers.maintenance import MaintenanceLogSerializer

class MaintenanceLogViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceLog.objects.all()
    serializer_class = MaintenanceLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = MaintenanceLog.objects.select_related('product').all().order_by('-fecha', '-created_at')
        product_id = self.request.query_params.get('product', None)
        if product_id is not None:
            queryset = queryset.filter(product_id=product_id)
        return queryset
"""

with open(os.path.join(base_dir, 'views', 'core.py'), 'w') as f: f.write(core_views)
with open(os.path.join(base_dir, 'views', 'suppliers.py'), 'w') as f: f.write(suppliers_views)
with open(os.path.join(base_dir, 'views', 'inventory.py'), 'w') as f: f.write(inventory_views)
with open(os.path.join(base_dir, 'views', 'maintenance.py'), 'w') as f: f.write(maintenance_views)

with open(os.path.join(base_dir, 'views', '__init__.py'), 'w') as f:
    f.write("from .core import RoleViewSet, UserViewSet, MediaViewSet, BackupViewSet\n")
    f.write("from .suppliers import SupplierViewSet\n")
    f.write("from .inventory import CategoryViewSet, DepartmentViewSet, ProductViewSet\n")
    f.write("from .maintenance import MaintenanceLogViewSet\n")


# Delete old files
try: os.remove(os.path.join(base_dir, 'models.py'))
except: pass
try: os.remove(os.path.join(base_dir, 'serializers.py'))
except: pass
try: os.remove(os.path.join(base_dir, 'views.py'))
except: pass

print("Backend refactored successfully.")
