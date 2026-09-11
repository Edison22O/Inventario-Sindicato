from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Avg, Sum, Count, Q
from django.contrib.auth import get_user_model
import datetime

from api.models.learning import (
    Student, LearningPhase, PhaseActivity, GradeTemplate, StudentEvaluation,
    PracticalAttendance, InstructorSchedule, WeeklyInstructorReport
)
from api.serializers.learning import (
    StudentSerializer, LearningPhaseSerializer, PhaseActivitySerializer, GradeTemplateSerializer,
    StudentEvaluationSerializer, PracticalAttendanceSerializer,
    InstructorScheduleSerializer, WeeklyInstructorReportSerializer
)

User = get_user_model()

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and (request.user.is_staff or getattr(request.user, 'role', None) in ['ADMIN', 'SUPERADMIN', 'INSPECTOR'])

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all().order_by('apellidos', 'nombres')
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        tipo_licencia = self.request.query_params.get('tipo_licencia')
        search = self.request.query_params.get('search')
        activo = self.request.query_params.get('activo')

        if tipo_licencia:
            qs = qs.filter(tipo_licencia=tipo_licencia)
        if activo is not None:
            qs = qs.filter(activo=activo.lower() == 'true')
        if search:
            qs = qs.filter(
                Q(nombres__icontains=search) |
                Q(apellidos__icontains=search) |
                Q(cedula__icontains=search)
            )
        return qs

class GradeTemplateViewSet(viewsets.ModelViewSet):
    queryset = GradeTemplate.objects.all().order_by('puntuacion')
    serializer_class = GradeTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

class LearningPhaseViewSet(viewsets.ModelViewSet):
    queryset = LearningPhase.objects.all().prefetch_related('activities').order_by('numero')
    serializer_class = LearningPhaseSerializer
    permission_classes = [IsAdminOrReadOnly]

class PhaseActivityViewSet(viewsets.ModelViewSet):
    queryset = PhaseActivity.objects.all().select_related('phase').order_by('phase__numero', 'numero')
    serializer_class = PhaseActivitySerializer
    permission_classes = [IsAdminOrReadOnly]

class StudentEvaluationViewSet(viewsets.ModelViewSet):
    queryset = StudentEvaluation.objects.all().select_related('student', 'instructor', 'activity', 'activity__phase').order_by('activity__phase__numero', 'activity__numero')
    serializer_class = StudentEvaluationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        student_id = self.request.query_params.get('student')
        phase_id = self.request.query_params.get('phase')
        instructor_id = self.request.query_params.get('instructor')
        vehiculo_rotacion = self.request.query_params.get('vehiculo_rotacion')
        
        if student_id:
            qs = qs.filter(student_id=student_id)
        if phase_id:
            qs = qs.filter(activity__phase_id=phase_id)
        if instructor_id:
            qs = qs.filter(instructor_id=instructor_id)
        if vehiculo_rotacion:
            qs = qs.filter(vehiculo_rotacion=vehiculo_rotacion)
        return qs

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        student_id = request.data.get('student')
        evaluations_data = request.data.get('evaluations', [])
        default_veh = request.data.get('vehiculo_rotacion', 'ESTANDAR')

        if not student_id or not isinstance(evaluations_data, list):
            return Response({'error': 'Parámetros inválidos (student y evaluations son requeridos)'}, status=status.HTTP_400_BAD_REQUEST)

        created_or_updated = []
        for item in evaluations_data:
            activity_id = item.get('activity')
            puntuacion = item.get('puntuacion')
            obs = item.get('observaciones')
            rec = item.get('recomendaciones')
            fecha = item.get('fecha', datetime.date.today().isoformat())
            vehiculo_rotacion = item.get('vehiculo_rotacion', default_veh)

            if activity_id is not None and puntuacion is not None:
                # Clean up legacy duplicate records if any exist
                dups = StudentEvaluation.objects.filter(
                    student_id=student_id,
                    activity_id=activity_id,
                    vehiculo_rotacion=vehiculo_rotacion
                )
                if dups.count() > 1:
                    first_id = dups.first().id
                    dups.exclude(id=first_id).delete()

                obj, created = StudentEvaluation.objects.update_or_create(
                    student_id=student_id,
                    activity_id=activity_id,
                    vehiculo_rotacion=vehiculo_rotacion,
                    defaults={
                        'instructor': request.user,
                        'puntuacion': int(puntuacion),
                        'observaciones': obs,
                        'recomendaciones': rec,
                        'fecha': fecha
                    }
                )
                created_or_updated.append(StudentEvaluationSerializer(obj).data)

        return Response({'success': True, 'count': len(created_or_updated), 'data': created_or_updated})

    @action(detail=False, methods=['get'], url_path='student-summary')
    def student_summary(self, request):
        student_id = request.query_params.get('student')
        if not student_id:
            return Response({'error': 'El parámetro student es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({'error': 'Estudiante no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        requested_veh = request.query_params.get('vehiculo_rotacion')
        is_tipo_e = student.tipo_licencia.startswith('E_')

        # Heavy vehicle rotation progression sequence
        rotation_vehicles = ['NPR', 'SINOTRUC_BLANCO', 'SINOTRUC_GRIS', 'TRAILER']
        
        # Calculate vehicle progression for Tipo E
        unlocked_vehicles = ['NPR'] if is_tipo_e else ['ESTANDAR']
        vehicle_status_map = {}

        all_evals = StudentEvaluation.objects.filter(student_id=student_id)
        total_activities_in_phase_system = PhaseActivity.objects.count()

        if is_tipo_e:
            for i, veh_code in enumerate(rotation_vehicles):
                veh_evals = all_evals.filter(vehiculo_rotacion=veh_code)
                evaluadas_cnt = veh_evals.count()
                puntuaciones = [e.puntuacion for e in veh_evals]
                promedio_veh = round(sum(puntuaciones) / evaluadas_cnt, 2) if evaluadas_cnt > 0 else 0.0

                # Vehicle is passed ONLY if ALL 5 phases (all 50 activities) are evaluated AND overall average >= 4.0
                is_passed = (total_activities_in_phase_system > 0 and 
                             evaluadas_cnt >= total_activities_in_phase_system and 
                             promedio_veh >= 4.0)
                
                vehicle_status_map[veh_code] = {
                    'evaluadas_cnt': evaluadas_cnt,
                    'total_actividades': total_activities_in_phase_system,
                    'promedio': promedio_veh,
                    'is_passed': is_passed,
                    'is_unlocked': veh_code in unlocked_vehicles
                }

                if is_passed and (i + 1) < len(rotation_vehicles):
                    next_veh = rotation_vehicles[i + 1]
                    if next_veh not in unlocked_vehicles:
                        unlocked_vehicles.append(next_veh)

        # Select which vehicle evaluations to display for current view
        if is_tipo_e:
            target_veh = requested_veh if (requested_veh and requested_veh in unlocked_vehicles) else unlocked_vehicles[-1]
        else:
            target_veh = 'ESTANDAR'

        target_evals = all_evals.filter(vehiculo_rotacion=target_veh)
        eval_map = {e.activity_id: e for e in target_evals}

        phases = LearningPhase.objects.all().prefetch_related('activities')
        phases_data = []
        total_puntos_global = 0
        total_actividades_evaluadas = 0

        for phase in phases:
            activities = phase.activities.all()
            total_actividades = len(activities)
            puntuaciones = [eval_map[a.id].puntuacion for a in activities if a.id in eval_map]
            
            suma_puntos = sum(puntuaciones)
            evaluadas_cnt = len(puntuaciones)
            promedio = round(suma_puntos / evaluadas_cnt, 2) if evaluadas_cnt > 0 else 0.0

            aprobada = evaluadas_cnt > 0 and (promedio >= float(phase.nota_minima_aprobacion) or suma_puntos >= 16)
            
            total_puntos_global += suma_puntos
            total_actividades_evaluadas += evaluadas_cnt

            phases_data.append({
                'phase_id': phase.id,
                'phase_numero': phase.numero,
                'phase_nombre': phase.nombre,
                'total_actividades': total_actividades,
                'evaluadas_cnt': evaluadas_cnt,
                'suma_puntos': suma_puntos,
                'promedio': promedio,
                'aprobada': aprobada,
                'estado_texto': 'Aprobada 🟩' if aprobada else ('En Progreso 🟨' if evaluadas_cnt > 0 else 'Pendiente ⬜')
            })

        promedio_global = round(total_puntos_global / total_actividades_evaluadas, 2) if total_actividades_evaluadas > 0 else 0.0
        if promedio_global >= 4.0:
            semaforo = 'VERDE'
            semaforo_color = 'bg-emerald-500 text-white'
        elif promedio_global >= 2.5 or total_actividades_evaluadas == 0:
            semaforo = 'AMARILLO'
            semaforo_color = 'bg-amber-500 text-white'
        else:
            semaforo = 'ROJO'
            semaforo_color = 'bg-red-500 text-white'

        return Response({
            'student_id': int(student_id),
            'student_name': f"{student.apellidos} {student.nombres}",
            'tipo_licencia': student.tipo_licencia,
            'is_tipo_e': is_tipo_e,
            'current_vehiculo_rotacion': target_veh,
            'unlocked_vehicles': unlocked_vehicles,
            'vehicle_status_map': vehicle_status_map,
            'promedio_global': promedio_global,
            'total_actividades_evaluadas': total_actividades_evaluadas,
            'semaforo': semaforo,
            'semaforo_color': semaforo_color,
            'phases': phases_data
        })

class PracticalAttendanceViewSet(viewsets.ModelViewSet):
    queryset = PracticalAttendance.objects.all().select_related('student', 'instructor').order_by('-fecha')
    serializer_class = PracticalAttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        student_id = self.request.query_params.get('student')
        instructor_id = self.request.query_params.get('instructor')
        fecha = self.request.query_params.get('fecha')
        
        if student_id:
            qs = qs.filter(student_id=student_id)
        if instructor_id:
            qs = qs.filter(instructor_id=instructor_id)
        if fecha:
            qs = qs.filter(fecha=fecha)
        return qs

    def create(self, request, *args, **kwargs):
        student_id = request.data.get('student')
        fecha = request.data.get('fecha', datetime.date.today().isoformat())
        estado = request.data.get('estado', 'PRESENTE')
        obs = request.data.get('observacion', '')

        if not student_id:
            return Response({'error': 'El campo student es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        obj, created = PracticalAttendance.objects.update_or_create(
            student_id=student_id,
            fecha=fecha,
            defaults={
                'instructor': request.user,
                'estado': estado,
                'observacion': obs
            }
        )
        return Response(PracticalAttendanceSerializer(obj).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

class InstructorScheduleViewSet(viewsets.ModelViewSet):
    queryset = InstructorSchedule.objects.all().select_related('instructor', 'student', 'vehicle').order_by('fecha', 'hora_inicio')
    serializer_class = InstructorScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        instructor_id = self.request.query_params.get('instructor')
        fecha = self.request.query_params.get('fecha')
        student_id = self.request.query_params.get('student')
        
        if instructor_id:
            qs = qs.filter(instructor_id=instructor_id)
        if fecha:
            qs = qs.filter(fecha=fecha)
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs

class WeeklyInstructorReportViewSet(viewsets.ModelViewSet):
    queryset = WeeklyInstructorReport.objects.all().select_related('instructor', 'vehicle').order_by('-fecha_inicio')
    serializer_class = WeeklyInstructorReportSerializer
    permission_classes = [permissions.IsAuthenticated]
