from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Avg, Sum, Count, Q
from django.contrib.auth import get_user_model
from collections import defaultdict
import datetime

from api.models.learning import (
    Student, LearningPhase, PhaseActivity, GradeTemplate, StudentEvaluation,
    PracticalAttendance, InstructorSchedule, WeeklyInstructorReport, InstructorProfile,
    AcademicEvaluation, ClassSessionLog
)
from api.serializers.learning import (
    StudentSerializer, LearningPhaseSerializer, PhaseActivitySerializer, GradeTemplateSerializer,
    StudentEvaluationSerializer, PracticalAttendanceSerializer,
    InstructorScheduleSerializer, WeeklyInstructorReportSerializer, InstructorSerializer,
    AcademicEvaluationSerializer, ClassSessionLogSerializer
)

User = get_user_model()

def is_admin_user(user):
    return (
        user.is_staff or 
        user.is_superuser or 
        (getattr(user, 'role', None) and user.role.name in ['Administrador', 'Administrador de Flota Vehicular', 'INSPECTOR', 'SUPERADMIN', 'Encargado de Tecnología'])
    )

def resolve_student(val):
    if not val:
        return None
    if isinstance(val, Student):
        return val
    if str(val).isdigit():
        return Student.objects.filter(pk=int(val)).first()
    try:
        return Student.objects.filter(public_id=val).first()
    except Exception:
        return None

def can_access_student(user, student):
    if not user or not user.is_authenticated:
        return False
    if is_admin_user(user):
        return True
    return student.instructor_id == user.id

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and (request.user.is_staff or getattr(request.user, 'role', None) in ['ADMIN', 'SUPERADMIN', 'INSPECTOR'])

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all().select_related('instructor', 'instructor__instructor_profile').order_by('apellidos', 'nombres')
    serializer_class = StudentSerializer
    lookup_field = 'public_id'
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        val = self.kwargs.get('public_id') or self.kwargs.get('pk')
        if val is not None:
            if str(val).isdigit():
                obj = queryset.filter(pk=int(val)).first()
                if obj:
                    return obj
            obj = queryset.filter(public_id=val).first()
            if obj:
                return obj
        return super().get_object()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        tipo_licencia = self.request.query_params.get('tipo_licencia')
        search = self.request.query_params.get('search')
        activo = self.request.query_params.get('activo')
        instructor_id = self.request.query_params.get('instructor')
        for_instructor_id = self.request.query_params.get('for_instructor')
        unassigned = self.request.query_params.get('unassigned')

        if not is_admin_user(user):
            eval_st_ids = StudentEvaluation.objects.filter(instructor=user).values_list('student_id', flat=True)
            sched_st_ids = InstructorSchedule.objects.filter(instructor=user).values_list('student_id', flat=True)
            qs = qs.filter(
                Q(instructor=user) |
                Q(id__in=eval_st_ids) |
                Q(id__in=sched_st_ids)
            ).distinct()
        else:
            if instructor_id:
                eval_st_ids = StudentEvaluation.objects.filter(instructor_id=instructor_id).values_list('student_id', flat=True)
                sched_st_ids = InstructorSchedule.objects.filter(instructor_id=instructor_id).values_list('student_id', flat=True)
                qs = qs.filter(
                    Q(instructor_id=instructor_id) |
                    Q(id__in=eval_st_ids) |
                    Q(id__in=sched_st_ids)
                ).distinct()

        if tipo_licencia:
            qs = qs.filter(tipo_licencia=tipo_licencia)
        if activo is not None:
            qs = qs.filter(activo=activo.lower() == 'true')
        if unassigned and unassigned.lower() == 'true':
            qs = qs.filter(instructor__isnull=True)
            # Filtrar por licencias habilitadas del instructor si se pasa for_instructor
            target_inst = for_instructor_id or instructor_id
            if target_inst:
                try:
                    inst_user = User.objects.get(id=target_inst)
                    prof = getattr(inst_user, 'instructor_profile', None)
                    if prof and prof.licencias_habilitadas:
                        qs = qs.filter(tipo_licencia__in=prof.licencias_habilitadas)
                except Exception:
                    pass

        if search:
            qs = qs.filter(
                Q(nombres__icontains=search) |
                Q(apellidos__icontains=search) |
                Q(cedula__icontains=search)
            )
        return qs

    @action(detail=False, methods=['post'], url_path='assign-instructor')
    def assign_instructor(self, request):
        instructor_id = request.data.get('instructor_id')
        student_ids = request.data.get('student_ids', [])

        if not isinstance(student_ids, list):
            return Response({'error': 'student_ids debe ser una lista de IDs'}, status=status.HTTP_400_BAD_REQUEST)

        instructor = None
        if instructor_id is not None:
            try:
                instructor = User.objects.get(id=instructor_id)
            except User.DoesNotExist:
                return Response({'error': 'Instructor no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        updated_count = Student.objects.filter(id__in=student_ids).update(instructor=instructor)
        return Response({
            'success': True,
            'updated_count': updated_count,
            'instructor_id': instructor_id,
            'message': f'{updated_count} estudiantes {"asignados" if instructor_id else "liberados"} exitosamente.'
        })

    @action(detail=True, methods=['post'], url_path='transfer-vehicle-instructor')
    def transfer_vehicle_instructor(self, request, public_id=None, pk=None):
        student = self.get_object()
        target_instructor_id = request.data.get('target_instructor_id')
        current_veh = request.data.get('current_vehicle', 'NPR')
        target_veh = request.data.get('target_vehicle', 'SINOTRUC_BLANCO')

        if not target_instructor_id:
            return Response({'error': 'Debe seleccionar un instructor de destino.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_instructor = User.objects.get(id=target_instructor_id)
        except User.DoesNotExist:
            return Response({'error': 'Instructor de destino no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        # Verificar notas de aprobación del ciclo vehicular actual
        evals = StudentEvaluation.objects.filter(student=student, vehiculo_rotacion=current_veh)
        total_activities = PhaseActivity.objects.count()
        evaluadas_cnt = evals.count()
        puntuaciones = [e.puntuacion for e in evals]
        promedio = round(sum(puntuaciones) / evaluadas_cnt, 2) if evaluadas_cnt > 0 else 0.0

        # Para aprobar requiere haber evaluado todas las actividades y nota promedio >= 4.0
        is_passed = (total_activities > 0 and evaluadas_cnt >= total_activities and promedio >= 4.0)

        if not is_passed:
            veh_name_display = current_veh.replace('_', ' ')
            return Response({
                'error': f'🔒 Bloqueado: El estudiante {student.apellidos} {student.nombres} aún no ha aprobado el ciclo de {veh_name_display} con notas suficientes (Promedio actual: {promedio:.2f}/5.0 en {evaluadas_cnt}/{total_activities} actividades). Requiere promedio >= 4.0 para transferir.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Reasignar al estudiante al nuevo instructor
        student.instructor = target_instructor
        student.save()

        return Response({
            'success': True,
            'message': f'¡Aprobado! Estudiante {student.apellidos} {student.nombres} ha completado {current_veh} y fue asignado al Instructor {target_instructor.get_full_name() or target_instructor.username} para {target_veh}.',
            'student_id': student.id,
            'new_instructor_id': target_instructor.id,
            'new_instructor_name': target_instructor.get_full_name() or target_instructor.username
        })

    @action(detail=False, methods=['get'], url_path='pending-transfers')
    def pending_transfers(self, request):
        students_e = list(Student.objects.filter(tipo_licencia__startswith='E_', activo=True).select_related('instructor', 'instructor__instructor_profile').prefetch_related('instructor__instructor_profile__assigned_vehicles'))
        all_phases = list(LearningPhase.objects.all().prefetch_related('activities').order_by('numero'))
        
        all_evals_qs = StudentEvaluation.objects.filter(student__in=students_e).select_related('activity', 'activity__phase')
        evals_by_student = defaultdict(list)
        for e in all_evals_qs:
            evals_by_student[e.student_id].append(e)

        pending_list = []
        for student in students_e:
            item = compute_student_progress_item(student, all_phases, None, evals_by_student.get(student.id, []))
            if item.get('needs_transfer'):
                comp = item.get('completed_vehicles', [])
                last_completed = comp[-1] if comp else 'NPR'
                next_v = 'SINOTRUC_BLANCO' if last_completed == 'NPR' else ('SINOTRUC_GRIS' if last_completed == 'SINOTRUC_BLANCO' else 'TRAILER')
                item['current_vehicle'] = last_completed
                item['target_vehicle'] = next_v
                pending_list.append(item)

        return Response({
            'count': len(pending_list),
            'pending_transfers': pending_list
        })

    @action(detail=False, methods=['post'], url_path='import_excel')
    def import_excel(self, request):
        file_obj = request.FILES.get('file') or request.FILES.get('excel_file')
        if not file_obj:
            return Response({'error': 'No se proporcionó ningún archivo Excel o CSV.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            filename = file_obj.name.lower()
            if filename.endswith('.csv'):
                import io, csv
                decoded_file = file_obj.read().decode('utf-8-sig', errors='ignore')
                io_string = io.StringIO(decoded_file)
                reader = csv.DictReader(io_string)
                rows = list(reader)
            else:
                import pandas as pd
                df = pd.read_excel(file_obj)
                df = df.where(pd.notnull(df), None)
                rows = df.to_dict(orient='records')
        except Exception as e:
            return Response({'error': f'Error al leer el archivo: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        created_count = 0
        updated_count = 0
        errors = []

        def normalize_licencia(val):
            if not val:
                return 'C'
            s = str(val).strip().upper()
            if 'C' in s and 'CONVALIDADA' not in s and 'D' not in s and 'E' not in s:
                return 'C'
            if 'D' in s:
                return 'D_CONVALIDADA' if ('CONV' in s or 'CONVALIDADA' in s) else 'D_REGULAR'
            if 'E' in s:
                return 'E_CONVALIDADA' if ('CONV' in s or 'CONVALIDADA' in s) else 'E_REGULAR'
            if 'N' in s and 'CONV' in s:
                return 'D_CONVALIDADA'
            return 'C'

        for idx, row in enumerate(rows, start=2):
            try:
                normalized_row = {str(k).strip().lower(): v for k, v in row.items() if k is not None}
                
                cedula = normalized_row.get('cedula') or normalized_row.get('cédula') or normalized_row.get('identificacion') or normalized_row.get('identificación')
                if not cedula:
                    errors.append(f'Fila {idx}: Cédula requerida.')
                    continue
                cedula = str(cedula).strip().split('.')[0]

                nombres = str(normalized_row.get('nombres') or normalized_row.get('nombre') or '').strip()
                apellidos = str(normalized_row.get('apellidos') or normalized_row.get('apellido') or '').strip()
                if not nombres or not apellidos:
                    nombre_completo = nombres or apellidos
                    if nombre_completo:
                        parts = nombre_completo.split(' ', 1)
                        nombres = parts[0]
                        apellidos = parts[1] if len(parts) > 1 else ''

                raw_lic = normalized_row.get('tipo_licencia') or normalized_row.get('licencia') or normalized_row.get('tipo de licencia')
                tipo_licencia = normalize_licencia(raw_lic)

                email = normalized_row.get('email') or normalized_row.get('correo') or normalized_row.get('correo electronico') or normalized_row.get('correo electrónico')
                telefono = normalized_row.get('telefono') or normalized_row.get('teléfono') or normalized_row.get('contacto') or normalized_row.get('celular')
                
                if email:
                    email = str(email).strip()
                if telefono:
                    telefono = str(telefono).strip().split('.')[0]

                student, created = Student.objects.update_or_create(
                    cedula=cedula,
                    defaults={
                        'nombres': nombres or 'Sin Nombre',
                        'apellidos': apellidos or 'Sin Apellido',
                        'tipo_licencia': tipo_licencia,
                        'email': email,
                        'telefono': telefono,
                        'activo': True
                    }
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1
            except Exception as row_err:
                errors.append(f'Fila {idx}: {str(row_err)}')

        return Response({
            'success': True,
            'message': f'Importación completada. {created_count} nuevos estudiantes creados, {updated_count} actualizados.',
            'created_count': created_count,
            'updated_count': updated_count,
            'errors': errors
        })



def instructor_can_teach_vehicle(instructor_user, veh_code):
    if not instructor_user:
        return False
    prof = getattr(instructor_user, 'instructor_profile', None)
    if not prof:
        return False

    assigned_vehs = list(prof.assigned_vehicles.all())
    if not assigned_vehs:
        return False

    for v in assigned_vehs:
        v_text = f"{v.tipo or ''} {v.modelo or ''} {v.observacion or ''} {v.placa or ''}".upper()
        if veh_code == 'NPR' and ('NPR' in v_text or 'CAMION' in v_text or 'PBF-5510' in v_text or 'ABC-321' in v_text):
            return True
        if veh_code == 'SINOTRUC_BLANCO' and ('SINOTRUC' in v_text or 'BLANCO' in v_text or 'UÑETA' in v_text or 'PBA-1024' in v_text or 'FTR' in v_text):
            return True
        if veh_code == 'SINOTRUC_GRIS' and ('SINOTRUC' in v_text or 'GRIS' in v_text or 'PALANCA' in v_text or 'PBB-3058' in v_text or 'D-MAX' in v_text):
            return True
        if veh_code == 'TRAILER' and ('TRAILER' in v_text or 'BUS' in v_text or 'TBA-4192' in v_text or 'GH 1726' in v_text):
            return True
    return False


def is_matching_vehicle(eval_veh, target_veh):
    if not target_veh or target_veh == 'ALL':
        return True
    if target_veh == 'ESTANDAR':
        return not eval_veh or eval_veh in ['ESTANDAR', 'ALL', '']
    return eval_veh == target_veh

def compute_student_progress_item(student, all_phases, req_veh=None, precomputed_evals=None):
    is_tipo_e = student.tipo_licencia.startswith('E_')
    if precomputed_evals is not None:
        all_evals = precomputed_evals
    else:
        all_evals = list(StudentEvaluation.objects.filter(student=student).select_related('activity', 'activity__phase').order_by('-fecha', '-id'))

    def calc_for_vehicle(target_veh):
        fases_list = []
        notas_fases = []
        for phase in all_phases:
            activities = list(phase.activities.all())
            total_actividades = len(activities)

            phase_eval_map = {}
            for e in all_evals:
                if not is_matching_vehicle(e.vehiculo_rotacion, target_veh):
                    continue
                if e.activity and (e.activity.phase_id == phase.id or (getattr(e.activity, 'phase', None) and e.activity.phase.numero == phase.numero)) and e.activity_id not in phase_eval_map:
                    phase_eval_map[e.activity_id] = e.puntuacion

            evaluadas_cnt = len(phase_eval_map)
            suma_puntos = sum(phase_eval_map.values())

            if evaluadas_cnt > 0:
                avg_pts = suma_puntos / evaluadas_cnt
                calc_nota = (avg_pts / 5.0) * 20.0
                nota_20 = round(min(20.0, calc_nota), 2)
            else:
                nota_20 = 0.0

            is_passed = (evaluadas_cnt > 0) and (nota_20 >= 16.0)
            estado_texto = "Fase Aprobada" if is_passed else ("En Progreso" if evaluadas_cnt > 0 else "Fase Pendiente")

            notas_fases.append(nota_20)
            fases_list.append({
                'phase_id': phase.id,
                'phase_numero': phase.numero,
                'phase_nombre': phase.nombre,
                'nota': nota_20,
                'nota_20': nota_20,
                'is_passed': is_passed,
                'estado_texto': estado_texto,
                'evaluadas_cnt': evaluadas_cnt,
                'total_actividades': total_actividades
            })

        nonzero_notas = [n for n in notas_fases if n > 0]
        promedio = round(sum(nonzero_notas) / len(nonzero_notas), 2) if len(nonzero_notas) > 0 else 0.0
        return fases_list, promedio

    # Calculate default phases
    default_fases, default_promedio = calc_for_vehicle(req_veh)

    by_vehicle = {}
    completed_vehicles = []
    if is_tipo_e:
        for v_code in ['NPR', 'SINOTRUC_BLANCO', 'SINOTRUC_GRIS', 'TRAILER']:
            v_fases, v_prom = calc_for_vehicle(v_code)
            by_vehicle[v_code] = {
                'fases': v_fases,
                'promedio': v_prom
            }
            if len(v_fases) == 5 and all(f['is_passed'] for f in v_fases):
                completed_vehicles.append(v_code)
    else:
        v_fases, v_prom = calc_for_vehicle('ESTANDAR')
        by_vehicle['ESTANDAR'] = {
            'fases': v_fases,
            'promedio': v_prom
        }
        if len(v_fases) == 5 and all(f['is_passed'] for f in v_fases):
            completed_vehicles.append('ESTANDAR')

    is_fully_completed = False
    needs_transfer = False
    can_current_inst_teach_next = False

    if is_tipo_e:
        is_fully_completed = set(['NPR', 'SINOTRUC_BLANCO', 'SINOTRUC_GRIS', 'TRAILER']).issubset(set(completed_vehicles))
        if not is_fully_completed:
            for v_code in ['NPR', 'SINOTRUC_BLANCO', 'SINOTRUC_GRIS']:
                if v_code in completed_vehicles:
                    next_v = 'SINOTRUC_BLANCO' if v_code == 'NPR' else ('SINOTRUC_GRIS' if v_code == 'SINOTRUC_BLANCO' else 'TRAILER')
                    next_v_data = by_vehicle.get(next_v, {})
                    next_v_evals_cnt = sum(f.get('evaluadas_cnt', 0) for f in next_v_data.get('fases', []))
                    if next_v_evals_cnt == 0:
                        if instructor_can_teach_vehicle(student.instructor, next_v):
                            can_current_inst_teach_next = True
                            needs_transfer = False
                        else:
                            can_current_inst_teach_next = False
                            needs_transfer = True
                        break
    else:
        is_fully_completed = ('ESTANDAR' in completed_vehicles)

    return {
        'student_id': student.id,
        'student_public_id': str(student.public_id) if student.public_id else None,
        'student_name': f"{student.apellidos} {student.nombres}",
        'cedula': student.cedula,
        'tipo_licencia': student.tipo_licencia,
        'current_instructor_id': student.instructor_id,
        'current_instructor_name': (student.instructor.get_full_name() or student.instructor.username) if student.instructor else 'Sin Instructor',
        'is_tipo_e': is_tipo_e,
        'completed_vehicles': completed_vehicles,
        'is_fully_completed': is_fully_completed,
        'needs_transfer': needs_transfer,
        'can_current_inst_teach_next': can_current_inst_teach_next,
        'fases': default_fases,
        'promedio': default_promedio,
        'promedio_general': default_promedio,
        'by_vehicle': by_vehicle
    }

class InstructorViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InstructorSerializer

    def get_queryset(self):
        qs = User.objects.filter(is_active=True).exclude(is_superuser=True).filter(
            Q(role__name__icontains='conductor') | 
            Q(role__name__icontains='instructor')
        ).select_related('role', 'instructor_profile').prefetch_related('instructor_profile__assigned_vehicles').annotate(
            active_students_count=Count('assigned_students', filter=Q(assigned_students__activo=True), distinct=True)
        ).distinct().order_by('first_name', 'username')
        
        activo_param = self.request.query_params.get('activo')

        if activo_param is not None:
            is_act = activo_param.lower() == 'true'
            if is_act:
                qs = qs.filter(Q(instructor_profile__isnull=True) | Q(instructor_profile__activo=True))
            else:
                qs = qs.filter(instructor_profile__activo=False)
        return qs

    @action(detail=True, methods=['patch', 'put', 'post'], url_path='update-configuration')
    def update_configuration(self, request, pk=None):
        user = self.get_object()
        profile, _ = InstructorProfile.objects.get_or_create(user=user)

        if 'assigned_vehicle_ids' in request.data:
            veh_ids = request.data.get('assigned_vehicle_ids', [])
            profile.assigned_vehicles.set(veh_ids)

        if 'licencias_habilitadas' in request.data:
            lics = request.data.get('licencias_habilitadas', [])
            profile.licencias_habilitadas = lics

        profile.save()
        serializer = self.get_serializer(user)
        return Response({
            'success': True,
            'message': f'Configuración de vehículos y licencias de {user.get_full_name() or user.username} actualizada correctamente.',
            'instructor': serializer.data
        })

    @action(detail=True, methods=['patch', 'post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        profile, _ = InstructorProfile.objects.get_or_create(user=user)
        
        if 'activo' in request.data:
            profile.activo = bool(request.data['activo'])
        else:
            profile.activo = not profile.activo
        profile.save()

        return Response({
            'success': True,
            'id': user.id,
            'activo': profile.activo,
            'message': f'Instructor {user.get_full_name() or user.username} ahora está {"Activo" if profile.activo else "Inactivo"}.'
        })

    @action(detail=True, methods=['get'], url_path='students')
    def students(self, request, pk=None):
        user = self.get_object()
        students = Student.objects.filter(instructor=user, activo=True)
        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='students-progress')
    def students_progress(self, request, pk=None):
        instructor = self.get_object()
        instructor_id = instructor.id
        req_veh = request.query_params.get('vehiculo_rotacion')

        student_ids_from_evals = StudentEvaluation.objects.filter(instructor_id=instructor_id).values_list('student_id', flat=True)
        student_ids_from_scheds = InstructorSchedule.objects.filter(instructor_id=instructor_id).values_list('student_id', flat=True)

        students_qs = Student.objects.filter(
            Q(instructor_id=instructor_id) |
            Q(id__in=student_ids_from_evals) |
            Q(id__in=student_ids_from_scheds)
        ).select_related('instructor', 'instructor__instructor_profile').prefetch_related('instructor__instructor_profile__assigned_vehicles').distinct()

        all_phases = list(LearningPhase.objects.all().prefetch_related('activities').order_by('numero'))
        students_list = list(students_qs)
        student_ids = [s.id for s in students_list]

        all_evals_qs = StudentEvaluation.objects.filter(student_id__in=student_ids).select_related('activity', 'activity__phase').order_by('-fecha', '-id')
        evals_by_student = defaultdict(list)
        for e in all_evals_qs:
            evals_by_student[e.student_id].append(e)

        students_progress_data = [
            compute_student_progress_item(student, all_phases, req_veh, evals_by_student.get(student.id, []))
            for student in students_list
        ]

        return Response({
            'instructor_id': instructor_id,
            'count': len(students_progress_data),
            'students_progress': students_progress_data
        })

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
            student = resolve_student(student_id)
            if not student or not can_access_student(self.request.user, student):
                return qs.none()
            qs = qs.filter(student=student)

        if instructor_id:
            qs = qs.filter(Q(instructor_id=instructor_id) | Q(student__instructor_id=instructor_id))
        elif not is_admin_user(self.request.user) and not student_id:
            qs = qs.filter(Q(instructor=self.request.user) | Q(student__instructor=self.request.user))

        if phase_id:
            qs = qs.filter(activity__phase_id=phase_id)
        if vehiculo_rotacion:
            if vehiculo_rotacion == 'ESTANDAR':
                qs = qs.filter(Q(vehiculo_rotacion='ESTANDAR') | Q(vehiculo_rotacion__isnull=True) | Q(vehiculo_rotacion=''))
            else:
                qs = qs.filter(vehiculo_rotacion=vehiculo_rotacion)
        return qs

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        student_raw = request.data.get('student')
        evaluations_data = request.data.get('evaluations', [])
        default_veh = request.data.get('vehiculo_rotacion', 'ESTANDAR')

        if not student_raw or not isinstance(evaluations_data, list):
            return Response({'error': 'Parámetros inválidos (student y evaluations son requeridos)'}, status=status.HTTP_400_BAD_REQUEST)

        student = resolve_student(student_raw)
        if not student:
            return Response({'error': 'Estudiante no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if not can_access_student(request.user, student):
            return Response({'error': 'No tiene permisos para calificar a este estudiante'}, status=status.HTTP_403_FORBIDDEN)

        created_or_updated = []
        for item in evaluations_data:
            activity_id = item.get('activity')
            puntuacion = item.get('puntuacion')
            obs = item.get('observaciones')
            rec = item.get('recomendaciones')
            fecha = item.get('fecha', datetime.date.today().isoformat())
            vehiculo_rotacion = item.get('vehiculo_rotacion', default_veh)

            if activity_id is not None and puntuacion is not None:
                if vehiculo_rotacion == 'ESTANDAR':
                    existing = StudentEvaluation.objects.filter(
                        student=student,
                        activity_id=activity_id
                    ).filter(Q(vehiculo_rotacion='ESTANDAR') | Q(vehiculo_rotacion__isnull=True) | Q(vehiculo_rotacion='')).first()
                else:
                    existing = StudentEvaluation.objects.filter(
                        student=student,
                        activity_id=activity_id,
                        vehiculo_rotacion=vehiculo_rotacion
                    ).first()

                if existing:
                    existing.instructor = request.user
                    existing.puntuacion = int(puntuacion)
                    existing.observaciones = obs
                    existing.recomendaciones = rec
                    existing.fecha = fecha
                    existing.vehiculo_rotacion = vehiculo_rotacion
                    existing.save()
                    obj = existing
                else:
                    obj = StudentEvaluation.objects.create(
                        student=student,
                        activity_id=activity_id,
                        vehiculo_rotacion=vehiculo_rotacion,
                        instructor=request.user,
                        puntuacion=int(puntuacion),
                        observaciones=obs,
                        recomendaciones=rec,
                        fecha=fecha
                    )
                created_or_updated.append(StudentEvaluationSerializer(obj).data)

        try:
            sync_student_academic_evaluations(student)
        except Exception as err:
            import traceback
            print(f"Error en sync_student_academic_evaluations durante bulk_save: {err}")
            traceback.print_exc()

        return Response({'success': True, 'count': len(created_or_updated), 'data': created_or_updated})

    @action(detail=False, methods=['get'], url_path='student-summary')
    def student_summary(self, request):
        student_raw = request.query_params.get('student')
        if not student_raw:
            return Response({'error': 'El parámetro student es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        student = resolve_student(student_raw)
        if not student:
            return Response({'error': 'Estudiante no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if not can_access_student(request.user, student):
            return Response({'error': 'No tiene permisos para ver la información de este estudiante'}, status=status.HTTP_403_FORBIDDEN)

        requested_veh = request.query_params.get('vehiculo_rotacion')
        is_tipo_e = student.tipo_licencia.startswith('E_')

        # Heavy vehicle rotation progression sequence
        rotation_vehicles = ['NPR', 'SINOTRUC_BLANCO', 'SINOTRUC_GRIS', 'TRAILER']
        
        # Calculate vehicle progression for Tipo E
        unlocked_vehicles = ['NPR'] if is_tipo_e else ['ESTANDAR']
        vehicle_status_map = {}

        all_evals = StudentEvaluation.objects.filter(student=student)
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

        target_evals = [e for e in all_evals if is_matching_vehicle(e.vehiculo_rotacion, target_veh)]
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
            'student_id': student.id,
            'student_public_id': str(student.public_id) if student.public_id else None,
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

    @action(detail=False, methods=['get'], url_path='instructor-students-progress')
    def instructor_students_progress(self, request):
        try:
            instructor_id_raw = request.query_params.get('instructor')
            if not instructor_id_raw or instructor_id_raw == 'ALL':
                students_qs = Student.objects.filter(activo=True).select_related('instructor', 'instructor__instructor_profile').prefetch_related('instructor__instructor_profile__assigned_vehicles')
                instructor_id = 'ALL'
            else:
                try:
                    instructor_id = int(instructor_id_raw)
                except (ValueError, TypeError):
                    instructor_id = request.user.id

                student_ids_from_evals = StudentEvaluation.objects.filter(instructor_id=instructor_id).values_list('student_id', flat=True)
                student_ids_from_scheds = InstructorSchedule.objects.filter(instructor_id=instructor_id).values_list('student_id', flat=True)

                students_qs = Student.objects.filter(
                    Q(instructor_id=instructor_id) |
                    Q(id__in=student_ids_from_evals) |
                    Q(id__in=student_ids_from_scheds)
                ).select_related('instructor', 'instructor__instructor_profile').prefetch_related('instructor__instructor_profile__assigned_vehicles').distinct()

            req_veh = request.query_params.get('vehiculo_rotacion')
            all_phases = list(LearningPhase.objects.all().prefetch_related('activities').order_by('numero'))
            students_list = list(students_qs)

            student_ids = [s.id for s in students_list]

            all_evals_qs = StudentEvaluation.objects.filter(student_id__in=student_ids).select_related('activity', 'activity__phase').order_by('-fecha', '-id')
            evals_by_student = defaultdict(list)
            for e in all_evals_qs:
                evals_by_student[e.student_id].append(e)

            students_progress_data = [
                compute_student_progress_item(student, all_phases, req_veh, evals_by_student.get(student.id, []))
                for student in students_list
            ]

            return Response({
                'instructor_id': instructor_id,
                'count': len(students_progress_data),
                'students_progress': students_progress_data
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
            student = resolve_student(student_id)
            if not student or not can_access_student(self.request.user, student):
                return qs.none()
            qs = qs.filter(student=student)
        elif not is_admin_user(self.request.user):
            qs = qs.filter(student__instructor=self.request.user)

        if instructor_id:
            qs = qs.filter(instructor_id=instructor_id)
        if fecha:
            qs = qs.filter(fecha=fecha)
        return qs

    def create(self, request, *args, **kwargs):
        student_raw = request.data.get('student')
        fecha = request.data.get('fecha', datetime.date.today().isoformat())
        estado = request.data.get('estado', 'PRESENTE')
        obs = request.data.get('observacion', '')

        if not student_raw:
            return Response({'error': 'El campo student es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        student = resolve_student(student_raw)
        if not student:
            return Response({'error': 'Estudiante no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if not can_access_student(request.user, student):
            return Response({'error': 'No tiene permisos para este estudiante'}, status=status.HTTP_403_FORBIDDEN)

        obj, created = PracticalAttendance.objects.update_or_create(
            student=student,
            fecha=fecha,
            defaults={
                'instructor': request.user,
                'estado': estado,
                'observacion': obs
            }
        )
        return Response(PracticalAttendanceSerializer(obj).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

def check_schedule_collision(fecha, hora_inicio, hora_fin, instructor_id, student_id, vehicle_id, exclude_id=None):
    if isinstance(hora_inicio, str):
        try:
            h_in_parts = hora_inicio.split(':')
            t_inicio = datetime.time(int(h_in_parts[0]), int(h_in_parts[1]))
        except Exception:
            t_inicio = hora_inicio
    else:
        t_inicio = hora_inicio

    if isinstance(hora_fin, str):
        try:
            h_fi_parts = hora_fin.split(':')
            t_fin = datetime.time(int(h_fi_parts[0]), int(h_fi_parts[1]))
        except Exception:
            t_fin = hora_fin
    else:
        t_fin = hora_fin

    qs = InstructorSchedule.objects.filter(
        fecha=fecha,
        hora_inicio__lt=t_fin,
        hora_fin__gt=t_inicio
    )
    if exclude_id:
        qs = qs.exclude(id=exclude_id)

    # Check instructor collision
    inst_collision = qs.filter(instructor_id=instructor_id).first()
    if inst_collision:
        inst_name = inst_collision.instructor.get_full_name() or inst_collision.instructor.username
        stud_name = f"{inst_collision.student.apellidos} {inst_collision.student.nombres}".strip()
        h_in = str(inst_collision.hora_inicio)[:5]
        h_fi = str(inst_collision.hora_fin)[:5]
        return f"⚠️ Choque de horario: El instructor {inst_name} ya tiene una clase asignada de {h_in} a {h_fi} con {stud_name}."

    # Check student collision
    stud_collision = qs.filter(student_id=student_id).first()
    if stud_collision:
        stud_name = f"{stud_collision.student.apellidos} {stud_collision.student.nombres}".strip()
        h_in = str(stud_collision.hora_inicio)[:5]
        h_fi = str(stud_collision.hora_fin)[:5]
        return f"⚠️ Choque de horario: El estudiante {stud_name} ya tiene una clase asignada de {h_in} a {h_fi}."

    # Check vehicle collision
    veh_collision = qs.filter(vehicle_id=vehicle_id).first()
    if veh_collision:
        v_placa = veh_collision.vehicle.placa
        h_in = str(veh_collision.hora_inicio)[:5]
        h_fi = str(veh_collision.hora_fin)[:5]
        return f"⚠️ Choque de horario: El vehículo {v_placa} ya se encuentra ocupado de {h_in} a {h_fi}."

    return None

class InstructorScheduleViewSet(viewsets.ModelViewSet):
    queryset = InstructorSchedule.objects.all().select_related('instructor', 'student', 'vehicle').order_by('fecha', 'hora_inicio')
    serializer_class = InstructorScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        instructor_id = self.request.query_params.get('instructor')
        fecha = self.request.query_params.get('fecha')
        student_id = self.request.query_params.get('student')

        if not is_admin_user(user):
            qs = qs.filter(instructor=user)
        else:
            if instructor_id:
                qs = qs.filter(instructor_id=instructor_id)

        if fecha:
            qs = qs.filter(fecha=fecha)
        if student_id:
            student = resolve_student(student_id)
            if student:
                qs = qs.filter(student=student)
            else:
                qs = qs.none()
        return qs

    def create(self, request, *args, **kwargs):
        instructor_id = request.data.get('instructor')
        student_raw = request.data.get('student')
        vehicle_id = request.data.get('vehicle')
        fecha = request.data.get('fecha')
        hora_inicio = request.data.get('hora_inicio')
        hora_fin = request.data.get('hora_fin')

        if not all([instructor_id, student_raw, vehicle_id, fecha, hora_inicio, hora_fin]):
            return Response({'error': 'Todos los campos (instructor, estudiante, vehículo, fecha, hora inicio, hora fin) son requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

        student = resolve_student(student_raw)
        if not student:
            return Response({'error': 'Estudiante no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        collision_msg = check_schedule_collision(
            fecha=fecha,
            hora_inicio=hora_inicio,
            hora_fin=hora_fin,
            instructor_id=instructor_id,
            student_id=student.id,
            vehicle_id=vehicle_id
        )
        if collision_msg:
            return Response({'error': collision_msg}, status=status.HTTP_400_BAD_REQUEST)

        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        instructor_id = request.data.get('instructor', instance.instructor_id)
        student_raw = request.data.get('student', instance.student_id)
        vehicle_id = request.data.get('vehicle', instance.vehicle_id)
        fecha = request.data.get('fecha', instance.fecha)
        hora_inicio = request.data.get('hora_inicio', instance.hora_inicio)
        hora_fin = request.data.get('hora_fin', instance.hora_fin)

        student = resolve_student(student_raw) if student_raw else instance.student

        collision_msg = check_schedule_collision(
            fecha=fecha,
            hora_inicio=hora_inicio,
            hora_fin=hora_fin,
            instructor_id=instructor_id,
            student_id=student.id if student else instance.student_id,
            vehicle_id=vehicle_id,
            exclude_id=instance.id
        )
        if collision_msg:
            return Response({'error': collision_msg}, status=status.HTTP_400_BAD_REQUEST)

        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='mark-attendance')
    def mark_attendance(self, request, pk=None):
        schedule = self.get_object()
        estado = request.data.get('estado', 'PRESENTE') # PRESENTE, AUSENTE, RETRASO
        observacion = request.data.get('observacion', '')

        attendance, _ = PracticalAttendance.objects.update_or_create(
            student=schedule.student,
            fecha=schedule.fecha,
            defaults={
                'instructor': schedule.instructor,
                'estado': estado,
                'observacion': observacion
            }
        )
        return Response({
            'success': True,
            'message': f'Asistencia registrada como {estado}.',
            'attendance': PracticalAttendanceSerializer(attendance).data
        })

    @action(detail=True, methods=['post'], url_path='class-given')
    def class_given(self, request, pk=None):
        schedule = self.get_object()
        tema_actividad = request.data.get('tema_actividad', 'Clase Práctica Impartida')
        observaciones = request.data.get('observaciones', '')

        log = ClassSessionLog.objects.create(
            schedule=schedule,
            instructor=schedule.instructor,
            student=schedule.student,
            fecha=schedule.fecha,
            tema_actividad=tema_actividad,
            observaciones=observaciones
        )
        schedule.completado = True
        schedule.save()

        return Response({
            'success': True,
            'message': 'Clase registrada como impartida. El reporte del instructor se ha actualizado correctamente.',
            'log': ClassSessionLogSerializer(log).data
        })

class ClassSessionLogViewSet(viewsets.ModelViewSet):
    queryset = ClassSessionLog.objects.all().select_related('instructor', 'student', 'schedule').order_by('-fecha', '-created_at')
    serializer_class = ClassSessionLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        instructor_id = self.request.query_params.get('instructor')
        student_id = self.request.query_params.get('student')
        if not is_admin_user(user):
            qs = qs.filter(instructor=user)
        elif instructor_id:
            qs = qs.filter(instructor_id=instructor_id)
        if student_id:
            st = resolve_student(student_id)
            if st:
                qs = qs.filter(student=st)
        return qs

def sync_student_academic_evaluations(student):
    """
    Sincroniza automáticamente las notas evaluadas en 'Calificación por Fases' (StudentEvaluation)
    hacia la 'Matriz Académica y Reporte de Notas' (AcademicEvaluation).
    Mapeo para Licencias Estándar (C, D, etc.):
      - Fase 1 -> DEBERES
      - Fase 2 -> TRABAJO_GRUPO
      - Fase 3 -> TRABAJOS_INDIVIDUALES
      - Fase 4 -> PRUEBA
      - Fase 5 -> EXAMEN
    Mapeo para Licencia Tipo E (Carga Pesada):
      - NPR -> DEBERES
      - SINOTRUC_BLANCO -> TRABAJO_GRUPO
      - SINOTRUC_GRIS -> PRUEBA
      - TRAILER -> EXAMEN
    """
    if not student:
        return

    try:
        all_phases = list(LearningPhase.objects.all().prefetch_related('activities').order_by('numero'))
        all_evals = list(StudentEvaluation.objects.filter(student=student).select_related('activity', 'activity__phase'))

        if not all_evals:
            AcademicEvaluation.objects.filter(student=student).delete()
            return

        is_tipo_e = student.tipo_licencia and student.tipo_licencia.startswith('E_')
        today = datetime.date.today()

        def calc_phase_score(target_veh, phase):
            activities = list(phase.activities.all())
            total_actividades = len(activities)
            if total_actividades == 0:
                return 0.0

            phase_eval_map = {}
            for e in all_evals:
                if not is_matching_vehicle(e.vehiculo_rotacion, target_veh):
                    continue
                if e.activity and (e.activity.phase_id == phase.id or (getattr(e.activity, 'phase', None) and e.activity.phase.numero == phase.numero)) and e.activity_id not in phase_eval_map:
                    phase_eval_map[e.activity_id] = e.puntuacion

            evaluadas_cnt = len(phase_eval_map)
            if evaluadas_cnt == 0:
                return 0.0

            suma_puntos = sum(phase_eval_map.values())
            avg_pts = suma_puntos / evaluadas_cnt
            calc_nota = (avg_pts / 5.0) * 20.0
            return round(min(20.0, calc_nota), 2)

        def calc_vehicle_average(target_veh):
            scores = [calc_phase_score(target_veh, phase) for phase in all_phases]
            nonzero_scores = [s for s in scores if s > 0]
            if not nonzero_scores:
                return 0.0
            return round(sum(nonzero_scores) / len(nonzero_scores), 2)

        if is_tipo_e:
            veh_map = [
                ('NPR', 'DEBERES'),
                ('SINOTRUC_BLANCO', 'TRABAJO_GRUPO'),
                ('SINOTRUC_GRIS', 'PRUEBA'),
                ('TRAILER', 'EXAMEN'),
            ]
            for veh_code, cat in veh_map:
                score = calc_vehicle_average(veh_code)
                if score > 0:
                    existing_evals = list(AcademicEvaluation.objects.filter(student=student, categoria=cat, vehiculo_rotacion=veh_code))
                    if existing_evals:
                        first_eval = existing_evals[0]
                        first_eval.nota = score
                        first_eval.fecha = today
                        first_eval.save()
                        for extra in existing_evals[1:]:
                            extra.delete()
                    else:
                        AcademicEvaluation.objects.create(
                            student=student, categoria=cat, vehiculo_rotacion=veh_code, nota=score, fecha=today
                        )
                else:
                    AcademicEvaluation.objects.filter(student=student, categoria=cat, vehiculo_rotacion=veh_code).delete()
        else:
            phase_cat_map = {
                1: 'DEBERES',
                2: 'TRABAJO_GRUPO',
                3: 'TRABAJOS_INDIVIDUALES',
                4: 'PRUEBA',
                5: 'EXAMEN'
            }
            for phase in all_phases:
                num = phase.numero
                if num in phase_cat_map:
                    cat = phase_cat_map[num]
                    score = calc_phase_score('ESTANDAR', phase)
                    if score == 0.0:
                        score = calc_phase_score(None, phase)
                    
                    if score > 0:
                        existing_evals = list(AcademicEvaluation.objects.filter(student=student, categoria=cat))
                        if existing_evals:
                            first_eval = existing_evals[0]
                            first_eval.nota = score
                            first_eval.fecha = today
                            first_eval.save()
                            for extra in existing_evals[1:]:
                                extra.delete()
                        else:
                            AcademicEvaluation.objects.create(
                                student=student, categoria=cat, nota=score, fecha=today
                            )
                    else:
                        AcademicEvaluation.objects.filter(student=student, categoria=cat).delete()
    except Exception as e:
        import traceback
        traceback.print_exc()

class AcademicEvaluationViewSet(viewsets.ModelViewSet):
    queryset = AcademicEvaluation.objects.all().select_related('student').order_by('student', 'categoria', 'fecha')
    serializer_class = AcademicEvaluationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        tipo_licencia = self.request.query_params.get('tipo_licencia')
        student_id = self.request.query_params.get('student')
        instructor_id = self.request.query_params.get('instructor')

        # Auto-sync phase evaluations to academic evaluations for matching students
        students_qs = Student.objects.filter(activo=True)
        if tipo_licencia:
            students_qs = students_qs.filter(tipo_licencia=tipo_licencia)
        if student_id:
            st = resolve_student(student_id)
            if st:
                students_qs = students_qs.filter(id=st.id)
        if instructor_id:
            eval_st_ids = StudentEvaluation.objects.filter(instructor_id=instructor_id).values_list('student_id', flat=True)
            sched_st_ids = InstructorSchedule.objects.filter(instructor_id=instructor_id).values_list('student_id', flat=True)
            students_qs = students_qs.filter(
                Q(instructor_id=instructor_id) |
                Q(id__in=eval_st_ids) |
                Q(id__in=sched_st_ids)
            ).distinct()

        if tipo_licencia:
            qs = qs.filter(student__tipo_licencia=tipo_licencia)
        if student_id:
            st = resolve_student(student_id)
            if st:
                qs = qs.filter(student=st)
        if instructor_id:
            eval_st_ids = StudentEvaluation.objects.filter(instructor_id=instructor_id).values_list('student_id', flat=True)
            sched_st_ids = InstructorSchedule.objects.filter(instructor_id=instructor_id).values_list('student_id', flat=True)
            qs = qs.filter(
                Q(student__instructor_id=instructor_id) |
                Q(student_id__in=eval_st_ids) |
                Q(student_id__in=sched_st_ids)
            ).distinct()

        return qs

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        student_id = request.data.get('student_id')
        evaluations_data = request.data.get('evaluations', [])
        
        student = resolve_student(student_id)
        if not student:
            return Response({'error': 'Estudiante no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        saved_records = []
        for item in evaluations_data:
            cat = item.get('categoria')
            if not cat:
                continue
            nota_val = item.get('nota', 0.00)
            obs = item.get('observaciones', '')
            veh_rot = item.get('vehiculo_rotacion', '')
            fecha_val = item.get('fecha') or datetime.date.today()

            obj, _ = AcademicEvaluation.objects.update_or_create(
                student=student,
                categoria=cat,
                vehiculo_rotacion=veh_rot,
                defaults={
                    'nota': nota_val,
                    'observaciones': obs,
                    'fecha': fecha_val
                }
            )
            saved_records.append(obj)

        return Response({
            'success': True,
            'message': f'Notas de {student.apellidos} {student.nombres} guardadas correctamente.',
            'evaluations': AcademicEvaluationSerializer(saved_records, many=True).data
        })

class WeeklyInstructorReportViewSet(viewsets.ModelViewSet):
    queryset = WeeklyInstructorReport.objects.all().select_related('instructor', 'vehicle').order_by('-fecha_inicio')
    serializer_class = WeeklyInstructorReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        instructor_id = self.request.query_params.get('instructor')

        if not is_admin_user(user):
            qs = qs.filter(instructor=user)
        elif instructor_id:
            qs = qs.filter(instructor_id=instructor_id)

        return qs

    def create(self, request, *args, **kwargs):
        user = request.user
        instructor_id = request.data.get('instructor')

        if not is_admin_user(user):
            request.data['instructor'] = user.id
        elif not instructor_id:
            request.data['instructor'] = user.id

        return super().create(request, *args, **kwargs)

