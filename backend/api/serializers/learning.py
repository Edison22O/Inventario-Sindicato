from rest_framework import serializers
from django.contrib.auth import get_user_model
from api.models.learning import Student, LearningPhase, PhaseActivity, GradeTemplate, StudentEvaluation, PracticalAttendance, InstructorSchedule, WeeklyInstructorReport
from api.serializers.vehicles import VehicleSerializer

User = get_user_model()

class StudentSerializer(serializers.ModelSerializer):
    tipo_licencia_display = serializers.CharField(source='get_tipo_licencia_display', read_only=True)

    class Meta:
        model = Student
        fields = '__all__'

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
        return f"{obj.instructor.first_name} {obj.instructor.last_name}".strip() or obj.instructor.username

class WeeklyInstructorReportSerializer(serializers.ModelSerializer):
    instructor_name = serializers.SerializerMethodField()
    vehicle_placa = serializers.CharField(source='vehicle.placa', read_only=True)

    class Meta:
        model = WeeklyInstructorReport
        fields = '__all__'

    def get_instructor_name(self, obj):
        return f"{obj.instructor.first_name} {obj.instructor.last_name}".strip() or obj.instructor.username

