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
from api.throttling import LoginRateThrottle
from api.permissions import IsAdminRole, IsAdminOrReadOnly

class DriverProfileViewSet(viewsets.ModelViewSet):
    queryset = DriverProfile.objects.select_related('user').all()
    lookup_field = 'public_id'
    serializer_class = DriverProfileSerializer
    permission_classes = [IsAuthenticated]

    def _parse_licencias(self, raw_data):
        if hasattr(raw_data, 'items'):
            data = dict(raw_data.items())
        else:
            data = dict(raw_data)

        if 'licencias' in data:
            raw = data['licencias']
            if isinstance(raw, list) and len(raw) > 0 and isinstance(raw[0], str):
                raw = raw[0]
            if isinstance(raw, str):
                try:
                    import json
                    data['licencias'] = json.loads(raw)
                except Exception:
                    pass
        return data

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data = self._parse_licencias(data)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        data = self._parse_licencias(data)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        val = self.kwargs.get('public_id') or self.kwargs.get('pk')
        if val is not None:
            if str(val).lower() == 'me':
                obj = queryset.filter(user=self.request.user).first()
                if obj:
                    return obj
            if str(val).isdigit():
                obj = queryset.filter(pk=int(val)).first()
                if obj:
                    return obj
            try:
                obj = queryset.filter(public_id=val).first()
                if obj:
                    return obj
            except Exception:
                pass
        return super().get_object()

    @action(detail=False, methods=['get', 'post', 'put', 'patch'], url_path='me')
    def me(self, request):
        user = request.user
        profile = DriverProfile.objects.filter(user=user).first()
        
        if request.method == 'GET':
            if not profile:
                return Response({
                    'exists': False,
                    'user': user.id,
                    'username': user.username,
                    'licencia': '',
                    'tipo_licencia': 'Tipo C',
                    'estado': 'Activo',
                    'telefono': '',
                    'direccion': '',
                    'tipo_sangre': '',
                    'contacto_emergencia': '',
                    'fecha_emision_licencia': None,
                    'fecha_vencimiento_licencia': None,
                    'foto': None,
                    'licencias': []
                })
            serializer = self.get_serializer(profile)
            data = serializer.data
            data['exists'] = True
            return Response(data)
            
        data = request.data.copy()
        data = self._parse_licencias(data)
        data['user'] = user.id
        
        if profile:
            serializer = self.get_serializer(profile, data=data, partial=True)
        else:
            serializer = self.get_serializer(data=data)
            
        serializer.is_valid(raise_exception=True)
        serializer.save(user=user)
        result = serializer.data
        result['exists'] = True
        return Response(result)

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAdminRole]

class UserViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    audit_module_name = 'Gestión de Usuarios'
    permission_classes = [IsAdminRole]

class MediaViewSet(viewsets.ModelViewSet):
    queryset = Media.objects.all()
    serializer_class = MediaSerializer
    permission_classes = [IsAuthenticated]

class BackupViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminRole]

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

        if not file.name.lower().endswith('.sql'):
            return Response({'error': 'Solo se permiten archivos de respaldo con formato .sql'}, status=400)

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
    throttle_classes = [LoginRateThrottle]

class SystemSettingsViewSet(viewsets.ModelViewSet):
    queryset = SystemSettings.objects.all()
    serializer_class = SystemSettingsSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        settings = SystemSettings.load()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'patch', 'post'])
    def fuel_prices(self, request):
        settings = SystemSettings.load()
        if request.method in ['PATCH', 'POST', 'PUT']:
            precio_gasolina = request.data.get('precio_gasolina')
            precio_diesel = request.data.get('precio_diesel')
            if precio_gasolina is not None:
                settings.precio_gasolina = float(precio_gasolina)
            if precio_diesel is not None:
                settings.precio_diesel = float(precio_diesel)
            settings.save()
            return Response({
                'message': 'Precios de combustible actualizados exitosamente',
                'precio_gasolina': float(settings.precio_gasolina),
                'precio_diesel': float(settings.precio_diesel)
            })
        return Response({
            'precio_gasolina': float(settings.precio_gasolina),
            'precio_diesel': float(settings.precio_diesel)
        })

class AdminDashboardStatsViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminRole]

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
    permission_classes = [IsAdminRole]
