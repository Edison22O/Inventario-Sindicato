import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class LearningPhase(models.Model):
    numero = models.IntegerField(unique=True)
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    duracion_semanas = models.CharField(max_length=100, blank=True, null=True)
    nota_minima_aprobacion = models.DecimalField(max_digits=4, decimal_places=2, default=4.00)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['numero']

    def __str__(self):
        return f"Fase {self.numero}: {self.nombre}"

class PhaseActivity(models.Model):
    phase = models.ForeignKey(LearningPhase, on_delete=models.CASCADE, related_name='activities')
    numero = models.IntegerField()
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    ejemplo_practico = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['phase__numero', 'numero']
        unique_together = ['phase', 'numero']

    def __str__(self):
        return f"Fase {self.phase.numero} - Actividad {self.numero}: {self.nombre}"

class GradeTemplate(models.Model):
    puntuacion = models.IntegerField(primary_key=True) # 0, 1, 2, 3, 4, 5
    observacion_predeterminada = models.TextField()
    recomendacion_predeterminada = models.TextField()

    def __str__(self):
        return f"Puntuación {self.puntuacion}"

class InstructorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='instructor_profile')
    activo = models.BooleanField(default=True)
    assigned_vehicles = models.ManyToManyField('api.Vehicle', blank=True, related_name='responsible_instructors')
    licencias_habilitadas = models.JSONField(default=list, blank=True) # ej: ['C', 'D_REGULAR', 'D_CONVALIDADA', 'E_REGULAR', 'E_CONVALIDADA']
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        name = f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username
        return f"Instructor: {name} ({'Activo' if self.activo else 'Inactivo'})"


class Student(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    TIPO_LICENCIA_CHOICES = [
        ('C', 'Licencia Tipo C'),
        ('D_REGULAR', 'Licencia Tipo D (Regular)'),
        ('D_CONVALIDADA', 'Licencia Tipo D (Convalidada)'),
        ('E_REGULAR', 'Licencia Tipo E (Regular)'),
        ('E_CONVALIDADA', 'Licencia Tipo E (Convalidada)'),
    ]

    cedula = models.CharField(max_length=20, unique=True)
    nombres = models.CharField(max_length=150)
    apellidos = models.CharField(max_length=150)
    tipo_licencia = models.CharField(max_length=50, choices=TIPO_LICENCIA_CHOICES, default='C')
    telefono = models.CharField(max_length=30, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    instructor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_students')
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['apellidos', 'nombres']

    def __str__(self):
        return f"{self.apellidos} {self.nombres} ({self.cedula})"

class StudentEvaluation(models.Model):
    VEHICULO_ROTACION_CHOICES = [
        ('ESTANDAR', 'Estándar'),
        ('NPR', 'Camión NPR'),
        ('SINOTRUC_BLANCO', 'Sinotruc Blanco (Uñeta)'),
        ('SINOTRUC_GRIS', 'Sinotruc Gris (Palanca)'),
        ('TRAILER', 'Tráiler / Bus'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='evaluations')
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='evaluations_as_instructor')
    activity = models.ForeignKey(PhaseActivity, on_delete=models.CASCADE, related_name='evaluations')
    vehiculo_rotacion = models.CharField(max_length=50, choices=VEHICULO_ROTACION_CHOICES, default='ESTANDAR')
    puntuacion = models.IntegerField(choices=[(i, str(i)) for i in range(6)])
    observaciones = models.TextField(blank=True, null=True)
    recomendaciones = models.TextField(blank=True, null=True)
    fecha = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['student', 'activity', 'vehiculo_rotacion']
        ordering = ['activity__phase__numero', 'activity__numero']

    def save(self, *args, **kwargs):
        # Auto-fill defaults from GradeTemplate if observations/recommendations are empty
        if not self.observaciones or not self.recomendaciones:
            try:
                tpl = GradeTemplate.objects.get(puntuacion=self.puntuacion)
                if not self.observaciones:
                    self.observaciones = tpl.observacion_predeterminada
                if not self.recomendaciones:
                    self.recomendaciones = tpl.recomendacion_predeterminada
            except GradeTemplate.DoesNotExist:
                pass
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Evaluación {self.student} - {self.activity.nombre}: {self.puntuacion}/5"

class PracticalAttendance(models.Model):
    ESTADO_CHOICES = [
        ('PRESENTE', 'Presente 🟩'),
        ('RETRASO', 'Retraso 🟨'),
        ('AUSENTE', 'Ausente 🟥'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendances')
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conducted_attendances')
    fecha = models.DateField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PRESENTE')
    observacion = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['student', 'fecha']
        ordering = ['-fecha']

    def __str__(self):
        return f"Asistencia {self.student} ({self.fecha}): {self.estado}"

class InstructorSchedule(models.Model):
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='schedules_as_instructor')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='schedules')
    vehicle = models.ForeignKey('api.Vehicle', on_delete=models.CASCADE, related_name='schedules')
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    tipo_licencia = models.CharField(max_length=50, default='C') # 'C', 'E', etc.
    circuito_ruta = models.CharField(max_length=255, blank=True, null=True)
    completado = models.BooleanField(default=False)

    class Meta:
        ordering = ['fecha', 'hora_inicio']

    def __str__(self):
        return f"Horario {self.fecha} [{self.hora_inicio}-{self.hora_fin}] - {self.student} con {self.instructor}"

class WeeklyInstructorReport(models.Model):
    ESTADO_CHOICES = [
        ('BORRADOR', 'Borrador'),
        ('ENVIADO', 'Enviado'),
        ('REVISADO', 'Revisado por Inspector'),
        ('APROBADO', 'Aprobado por Dirección'),
    ]

    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weekly_reports')
    vehicle = models.ForeignKey('api.Vehicle', on_delete=models.SET_NULL, null=True, blank=True)
    semana_numero = models.IntegerField()
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    periodo_academico = models.CharField(max_length=100, default='2025-2026')
    estado = models.CharField(max_length=30, choices=ESTADO_CHOICES, default='BORRADOR')
    elaborado_por_nombre = models.CharField(max_length=255)
    revisado_por_nombre = models.CharField(max_length=255, default='Javier Godoy - INSPECTOR GENERAL')
    aprobado_por_nombre = models.CharField(max_length=255, default='Germania Paguay - DIRECTOR PEDAGÓGICO')
    observaciones_generales = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_inicio']

    def __str__(self):
        return f"Reporte Semanal #{self.semana_numero} - {self.instructor} ({self.fecha_inicio} a {self.fecha_fin})"

class ClassSessionLog(models.Model):
    schedule = models.ForeignKey(InstructorSchedule, on_delete=models.SET_NULL, null=True, blank=True, related_name='class_logs')
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conducted_classes')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='class_logs')
    fecha = models.DateField()
    tema_actividad = models.CharField(max_length=255)
    observaciones = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha', '-created_at']

    def __str__(self):
        return f"Clase Dada ({self.fecha}) - {self.student} por {self.instructor}: {self.tema_actividad}"

class AcademicEvaluation(models.Model):
    CATEGORIA_CHOICES = [
        ('DEBERES', 'Deberes (Fase 1)'),
        ('TRABAJO_GRUPO', 'Trabajo en Grupo (Fase 2)'),
        ('TRABAJOS_INDIVIDUALES', 'Trabajos Individuales (Fase 3)'),
        ('PRUEBA', 'Pruebas (Fase 4)'),
        ('EXAMEN', 'Examen (Fase 5)'),
        ('ROTACION_VEHICULO', 'Rotación Vehicular'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='academic_evaluations')
    categoria = models.CharField(max_length=50, choices=CATEGORIA_CHOICES)
    nombre_evaluacion = models.CharField(max_length=255, blank=True, null=True)
    nota = models.DecimalField(max_digits=5, decimal_places=2, default=0.00) # Escala sobre 20 (o sobre 100)
    observaciones = models.TextField(blank=True, null=True)
    vehiculo_rotacion = models.CharField(max_length=50, blank=True, null=True) # Para Licencia Tipo E
    fecha = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['student', 'categoria', 'fecha']

    def __str__(self):
        return f"Nota Académica {self.student} - {self.categoria}: {self.nota}"

