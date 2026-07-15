from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.conf import settings
import subprocess
import os
from rest_framework.permissions import IsAuthenticated
from .models import Role, User, Category, Media, Product, Department, Supplier, MaintenanceLog
from .serializers import (
    RoleSerializer, UserSerializer, CategorySerializer, 
    MediaSerializer, ProductSerializer, DepartmentSerializer, SupplierSerializer,
    MaintenanceLogSerializer
)

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]

class MediaViewSet(viewsets.ModelViewSet):
    queryset = Media.objects.all()
    serializer_class = MediaSerializer
    permission_classes = [IsAuthenticated]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('department', 'category', 'supplier', 'media').all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

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
            return Response({'error': str(e), 'stderr': e.stderr.decode()}, status=500)

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
