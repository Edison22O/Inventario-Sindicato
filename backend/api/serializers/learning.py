from rest_framework import serializers
from django.contrib.auth import get_user_model
from api.models.learning import (
    Student, LearningPhase, PhaseActivity, GradeTemplate, StudentEvaluation,
    PracticalAttendance, InstructorSchedule, WeeklyInstructorReport, InstructorProfile,
    ClassSessionLog, AcademicEvaluation
)
from api.serializers.vehicles import VehicleSerializer

User = get_user_model()

class StudentSerializer(serializers.ModelSerializer):
    tipo_licencia_display = serializers.CharField(source='get_tipo_licencia_display', read_only=True)
    instructor_name = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = '__all__'

    def get_instructor_name(self, obj):
        if obj.instructor:
            name = f"{obj.instructor.first_name} {obj.instructor.last_name}".strip()
            return name if name else obj.instructor.username
        return None

class InstructorSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    role_name = serializers.CharField(source='role.name', read_only=True, default='')
    activo = serializers.SerializerMethodField()
    assigned_students_count = serializers.SerializerMethodField()
    assigned_vehicles = serializers.SerializerMethodField()
    assigned_vehicle_ids = serializers.SerializerMethodField()
    licencias_habilitadas = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'full_name', 'email', 
            'role_name', 'activo', 'assigned_students_count', 
            'assigned_vehicles', 'assigned_vehicle_ids', 'licencias_habilitadas'
        ]

    def get_full_name(self, obj):
        name = f"{obj.first_name or ''} {obj.last_name or ''}".strip()
        return name if name else obj.username

    def get_activo(self, obj):
        profile = getattr(obj, 'instructor_profile', None)
        return profile.activo if profile else True

    def get_assigned_students_count(self, obj):
        if hasattr(obj, 'active_students_count'):
            return obj.active_students_count
        return obj.assigned_students.filter(activo=True).count()

    def get_assigned_vehicles(self, obj):
        profile = getattr(obj, 'instructor_profile', None)
        if profile:
            vehs = list(profile.assigned_vehicles.all())
            if vehs:
                return VehicleSerializer(vehs, many=True).data
        return []

    def get_assigned_vehicle_ids(self, obj):
        profile = getattr(obj, 'instructor_profile', None)
        if profile:
            vehs = list(profile.assigned_vehicles.all())
            return [v.id for v in vehs]
        return []

    def get_licencias_habilitadas(self, obj):
        profile = getattr(obj, 'instructor_profile', None)
        if profile and profile.licencias_habilitadas:
            return profile.licencias_habilitadas
        return ['C', 'D_REGULAR', 'D_CONVALIDADA', 'E_REGULAR', 'E_CONVALIDADA'] # Por defecto todas habilitadas si no tiene restricción


class GradeTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradeTemplate
        fields = '__all__'

class PhaseActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = PhaseActivity
        fields = '__all__'

class LearningPhaseSerializer(serializers.ModelSerializer):
    activities = PhaseActivitySerializer(many=True, read_only=True)

    class Meta:
        model = LearningPhase
        fields = '__all__'

class StudentEvaluationSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_cedula = serializers.CharField(source='student.cedula', read_only=True)
    student_tipo_licencia = serializers.CharField(source='student.tipo_licencia', read_only=True)
    instructor_name = serializers.SerializerMethodField()
    activity_nombre = serializers.CharField(source='activity.nombre', read_only=True)
    activity_numero = serializers.IntegerField(source='activity.numero', read_only=True)
    phase_numero = serializers.IntegerField(source='activity.phase.numero', read_only=True)
    phase_nombre = serializers.CharField(source='activity.phase.nombre', read_only=True)

    class Meta:
        model = StudentEvaluation
        fields = '__all__'

    def get_student_name(self, obj):
        return f"{obj.student.apellidos} {obj.student.nombres}".strip()

    def get_instructor_name(self, obj):
        return f"{obj.instructor.first_name} {obj.instructor.last_name}".strip() or obj.instructor.username

class BulkStudentEvaluationSerializer(serializers.Serializer):
    student = serializers.IntegerField()
    evaluations = serializers.ListField(
        child=serializers.DictField()
    )

class PracticalAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_public_id = serializers.CharField(source='student.public_id', read_only=True)
    instructor_name = serializers.SerializerMethodField()

    class Meta:
        model = PracticalAttendance
        fields = '__all__'
        read_only_fields = ['instructor']

    def get_student_name(self, obj):
        return f"{obj.student.apellidos} {obj.student.nombres}".strip()

    def get_instructor_name(self, obj):
        return f"{obj.instructor.first_name} {obj.instructor.last_name}".strip() or obj.instructor.username

class InstructorScheduleSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_public_id = serializers.CharField(source='student.public_id', read_only=True)
    student_cedula = serializers.CharField(source='student.cedula', read_only=True)
    student_tipo_licencia = serializers.CharField(source='student.tipo_licencia', read_only=True)
    instructor_name = serializers.SerializerMethodField()
    vehicle_placa = serializers.CharField(source='vehicle.placa', read_only=True)
    vehicle_modelo = serializers.CharField(source='vehicle.modelo', read_only=True)

    class Meta:
        model = InstructorSchedule
        fields = '__all__'

    def get_student_name(self, obj):
        return f"{obj.student.apellidos} {obj.student.nombres}".strip()

    def get_instructor_name(self, obj):
        name = f"{obj.instructor.first_name} {obj.instructor.last_name}".strip()
        return name if name else obj.instructor.username

class WeeklyInstructorReportSerializer(serializers.ModelSerializer):
    instructor_name = serializers.SerializerMethodField()
    vehicle_placa = serializers.CharField(source='vehicle.placa', read_only=True)

    class Meta:
        model = WeeklyInstructorReport
        fields = '__all__'

    def get_instructor_name(self, obj):
        return f"{obj.instructor.first_name} {obj.instructor.last_name}".strip() or obj.instructor.username

class ClassSessionLogSerializer(serializers.ModelSerializer):
    instructor_name = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = ClassSessionLog
        fields = '__all__'

    def get_instructor_name(self, obj):
        return f"{obj.instructor.first_name} {obj.instructor.last_name}".strip() or obj.instructor.username

    def get_student_name(self, obj):
        return f"{obj.student.apellidos} {obj.student.nombres}".strip()

class AcademicEvaluationSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_cedula = serializers.CharField(source='student.cedula', read_only=True)
    student_tipo_licencia = serializers.CharField(source='student.tipo_licencia', read_only=True)

    class Meta:
        model = AcademicEvaluation
        fields = '__all__'

    def get_student_name(self, obj):
        return f"{obj.student.apellidos} {obj.student.nombres}".strip()


