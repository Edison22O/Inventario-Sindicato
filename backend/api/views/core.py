from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.conf import settings
import subprocess
import os
from django.core.management import call_command
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from api.models.core import Role, User, Media, SystemSettings, ActivityLog, DriverProfile
from api.serializers.core import RoleSerializer, UserSerializer, MediaSerializer, CustomTokenObtainPairSerializer, SystemSettingsSerializer, ActivityLogSerializer, DriverProfileSerializer
from api.mixins import AuditLogMixin

class DriverProfileViewSet(viewsets.ModelViewSet):
    queryset = DriverProfile.objects.select_related('user').all()
    lookup_field = 'public_id'
    serializer_class = DriverProfileSerializer
    permission_classes = [IsAuthenticated]

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]

class UserViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    audit_module_name = 'Gestión de Usuarios'
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
        import tempfile
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)
            
        with tempfile.NamedTemporaryFile(delete=False, suffix='.sql') as destination:
            for chunk in file.chunks():
                destination.write(chunk)
            file_path = destination.name
                
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
            if os.path.exists(file_path):
                os.remove(file_path)
            return Response({'message': 'Database restored successfully'})
        except subprocess.CalledProcessError as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            return Response({'error': str(e), 'stderr': e.stderr.decode()}, status=500)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class SystemSettingsViewSet(viewsets.ModelViewSet):
    queryset = SystemSettings.objects.all()
    serializer_class = SystemSettingsSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def list(self, request, *args, **kwargs):
        settings = SystemSettings.load()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)

class AdminDashboardStatsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def summary(self, request):
        from api.models.core import User
        from api.models.inventory import Product
        from api.models.furniture import FurnitureProduct
        from api.models.vehicles import Vehicle
        
        users_count = User.objects.count()
        tech_count = Product.objects.count()
        furniture_count = FurnitureProduct.objects.count()
        vehicles_count = Vehicle.objects.count()
        
        return Response({
            'users': users_count,
            'tech_assets': tech_count,
            'furniture_assets': furniture_count,
            'vehicles': vehicles_count
        })

class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]
