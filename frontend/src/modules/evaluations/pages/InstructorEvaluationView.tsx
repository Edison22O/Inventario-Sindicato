import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/shared/services/api';
import { toast } from 'react-hot-toast';
import { 
  CheckCircle, Calendar, Award, Clock, Save, Layers, AlertCircle
} from 'lucide-react';
import type { LearningPhase, StudentEvaluation, GradeTemplate, Instructor } from '@/shared/types';
import { useWebSocket } from '@/shared/context/WebSocketContext';
import { formatDateToLocalYYYYMMDD } from '@/shared/utils/dateUtils';

interface Student {
  id: number;
  public_id?: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  email?: string;
  telefono?: string;
  tipo_licencia: 'C' | 'E_CONVALIDADA' | 'E_REGULAR';
  tipo_licencia_display?: string;
}

export const InstructorEvaluationView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const studentIdParam = searchParams.get('studentId');

  const [students, setStudents] = useState<Student[]>([]);
  const [, setInstructors] = useState<Instructor[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [phases, setPhases] = useState<LearningPhase[]>([]);
  const [activePhaseNum, setActivePhaseNum] = useState<number>(1);
  const [selectedVehicleTypeE, setSelectedVehicleTypeE] = useState<'NPR' | 'SINOTRUC_BLANCO' | 'SINOTRUC_GRIS' | 'TRAILER'>('NPR');
  const [evaluations, setEvaluations] = useState<Record<number, { puntuacion: number; observaciones: string; recomendaciones: string }>>({});
  const [gradeTemplates, setGradeTemplates] = useState<Record<number, GradeTemplate>>({});
  const [attendance, setAttendance] = useState<'PRESENTE' | 'RETRASO' | 'AUSENTE'>('PRESENTE');
  const [attendanceObs, setAttendanceObs] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [studentSummary, setStudentSummary] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(formatDateToLocalYYYYMMDD(new Date()));

  // Keep refs for callbacks & WS handler without triggering re-subscribes
  const selectedStudentRef = useRef<Student | null>(null);
  selectedStudentRef.current = selectedStudent;
  const selectedVehicleTypeERef = useRef(selectedVehicleTypeE);
  selectedVehicleTypeERef.current = selectedVehicleTypeE;
  const isSavingRef = useRef(false);

  // Load initial static data (students, instructors, phases, templates)
  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [studentsRes, phasesRes, templatesRes, instRes] = await Promise.all([
        api.get('/students/'),
        api.get('/learning-phases/'),
        api.get('/grade-templates/'),
        api.get('/instructors/').catch(() => ({ data: [] }))
      ]);

      const studentList: Student[] = studentsRes.data || [];
      setStudents(studentList);
      setInstructors(instRes.data || []);

      if (studentList.length > 0) {
        setSelectedStudent(prev => {
          if (!prev) {
            const matched = studentIdParam 
              ? studentList.find(s => s.public_id === studentIdParam || s.id === parseInt(studentIdParam)) 
              : null;
            return matched || studentList[0];
          }
          const existing = studentList.find(s => s.id === prev.id);
          return existing || prev;
        });
      }

      setPhases(phasesRes.data || []);

      const tplDict: Record<number, GradeTemplate> = {};
      (templatesRes.data || []).forEach((t: GradeTemplate) => {
        tplDict[t.puntuacion] = t;
      });
      setGradeTemplates(tplDict);

    } catch (err) {
      console.error('Error al cargar datos de evaluación:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  // Load evaluations and summary when selected student changes
  const fetchStudentData = async (studentId: string | number, vehicleCode?: string) => {
    try {
      const currentSt = selectedStudentRef.current;
      const isTipoE = currentSt ? currentSt.tipo_licencia.startsWith('E_') : false;
      const targetVeh = isTipoE ? (vehicleCode || selectedVehicleTypeERef.current) : 'ESTANDAR';

      const [evalsRes, summaryRes, attRes] = await Promise.all([
        api.get(`/student-evaluations/?student=${studentId}&vehiculo_rotacion=${targetVeh}`),
        api.get(`/student-evaluations/student-summary/?student=${studentId}&vehiculo_rotacion=${targetVeh}`),
        api.get(`/practical-attendances/?student=${studentId}&fecha=${selectedDate}`).catch(() => ({ data: [] }))
      ]);

      const evalsList: StudentEvaluation[] = evalsRes.data || [];
      const evalsDict: Record<number, { puntuacion: number; observaciones: string; recomendaciones: string }> = {};
      evalsList.forEach(e => {
        evalsDict[e.activity] = {
          puntuacion: e.puntuacion,
          observaciones: e.observaciones || '',
          recomendaciones: e.recomendaciones || ''
        };
      });

      setEvaluations(evalsDict);
      setStudentSummary(summaryRes.data || null);

      if (attRes.data && attRes.data.length > 0) {
        setAttendance(attRes.data[0].estado);
        setAttendanceObs(attRes.data[0].observacion || '');
      } else {
        setAttendance('PRESENTE');
        setAttendanceObs('');
      }
    } catch (e) {
      console.error('Error fetching student evaluations:', e);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  // WebSocket real-time updates handler with payload filtering
  useWebSocket((payload) => {
    if (isSavingRef.current) return;
    const model = payload?.model;
    if (model === 'StudentEvaluation' || model === 'PracticalAttendance') {
      if (selectedStudentRef.current) {
        const studentKey = selectedStudentRef.current.public_id || selectedStudentRef.current.id;
        fetchStudentData(studentKey, selectedVehicleTypeERef.current);
      }
    } else if (model === 'Student' || model === 'LearningPhase' || model === 'GradeTemplate') {
      fetchData(false);
    }
  });

  useEffect(() => {
    if (studentIdParam && students.length > 0) {
      const matched = students.find(s => s.public_id === studentIdParam || s.id === parseInt(studentIdParam));
      if (matched && matched.id !== selectedStudent?.id) {
        setSelectedStudent(matched);
      }
    }
  }, [studentIdParam, students]);

  useEffect(() => {
    if (selectedStudent) {
      const studentKey = selectedStudent.public_id || String(selectedStudent.id);
      if (studentIdParam !== studentKey) {
        setSearchParams({ studentId: studentKey }, { replace: true });
      }
      fetchStudentData(studentKey, selectedVehicleTypeE);
    }
  }, [selectedStudent?.id, selectedDate, selectedVehicleTypeE]);

  // Handle rating button click with auto-fill
  const handleScoreChange = (activityId: number, score: number) => {
    const tpl = gradeTemplates[score];
    const defaultObs = tpl ? tpl.observacion_predeterminada : '';
    const defaultRec = tpl ? tpl.recomendacion_predeterminada : '';

    setEvaluations(prev => {
      return {
        ...prev,
        [activityId]: {
          puntuacion: score,
          observaciones: defaultObs,
          recomendaciones: defaultRec
        }
      };
    });
  };

  // Save evaluations for current student
  const handleSaveEvaluations = async () => {
    if (!selectedStudent || submitting) return;
    setSubmitting(true);
    isSavingRef.current = true;

    const isTipoE = selectedStudent.tipo_licencia.startsWith('E_');
    const targetVeh = isTipoE ? selectedVehicleTypeE : 'ESTANDAR';
    const studentKey = selectedStudent.public_id || selectedStudent.id;

    try {
      const evalArray = Object.entries(evaluations).map(([actId, data]) => ({
        activity: parseInt(actId),
        puntuacion: data.puntuacion,
        observaciones: data.observaciones,
        recomendaciones: data.recomendaciones,
        fecha: selectedDate,
        vehiculo_rotacion: targetVeh
      }));

      await Promise.all([
        api.post('/student-evaluations/bulk-save/', {
          student: studentKey,
          vehiculo_rotacion: targetVeh,
          evaluations: evalArray
        }),
        api.post('/practical-attendances/', {
          student: studentKey,
          fecha: selectedDate,
          estado: attendance,
          observacion: attendanceObs
        }).catch(() => null)
      ]);

      toast.success('Evaluación y asistencia guardadas correctamente');
      await fetchStudentData(studentKey, targetVeh);
    } catch (e: any) {
      console.error('Error guardando evaluación:', e?.response?.data || e);
      toast.error('Error al guardar la evaluación');
    } finally {
      setSubmitting(false);
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1000);
    }
  };

  const currentPhase = useMemo(() => {
    return phases.find(p => p.numero === activePhaseNum) || phases[0];
  }, [phases, activePhaseNum]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const unlockedVehicles: string[] = studentSummary?.unlocked_vehicles || ['NPR'];
  const isFullyCompleted = studentSummary?.is_fully_completed || (
    studentSummary?.vehicle_status_map?.['NPR']?.is_passed &&
    studentSummary?.vehicle_status_map?.['SINOTRUC_BLANCO']?.is_passed &&
    studentSummary?.vehicle_status_map?.['SINOTRUC_GRIS']?.is_passed &&
    studentSummary?.vehicle_status_map?.['TRAILER']?.is_passed
  );

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto pb-32 font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs tracking-wider uppercase mb-1">
            <Award className="w-4 h-4" /> Módulo Móvil del Instructor
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Calificación por Fases y Asistencia
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Optimizado para teléfonos. Selecciona un alumno, califica de 0 a 5 y guarda en 1 toque.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-2xl border border-gray-200 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none w-full"
          />
        </div>
      </div>

      {/* Student Carousel / Selection Tabs (Mobile Touch Friendly) */}
      {students.length > 0 ? (
        <div className="mb-6">
          <label className="block text-xs font-black uppercase text-gray-500 mb-2">Alumnos Asignados:</label>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
            {students.map(st => {
              const isSelected = selectedStudent?.id === st.id;
              const isCurrentSemaforo = isSelected && studentSummary ? studentSummary.semaforo : null;

              return (
                <button
                  key={st.id}
                  onClick={() => {
                    setSelectedStudent(st);
                    if (st.tipo_licencia.startsWith('E_')) {
                      setSelectedVehicleTypeE('NPR');
                    }
                  }}
                  className={`snap-start shrink-0 px-4 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 shadow-sm border ${
                    isSelected 
                      ? 'bg-emerald-800 text-white border-emerald-900 ring-2 ring-emerald-600 shadow-emerald-900/20' 
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${
                    isCurrentSemaforo === 'VERDE' ? 'bg-emerald-400 ring-2 ring-emerald-200' :
                    isCurrentSemaforo === 'AMARILLO' ? 'bg-amber-400 ring-2 ring-amber-200' :
                    isCurrentSemaforo === 'ROJO' ? 'bg-red-500 ring-2 ring-red-200' : 'bg-gray-300'
                  }`} />
                  <span className="truncate max-w-[140px]">{st.apellidos} {st.nombres}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 text-center my-6 shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-black text-gray-800">No tienes alumnos asignados para calificar</h3>
          <p className="text-xs text-gray-500 font-medium max-w-md mx-auto mt-1">
            Actualmente no tienes estudiantes matriculados asignados a tu perfil de instructor. Solicita al Administrador que te inscriba alumnos en el Panel de Instructores.
          </p>
        </div>
      )}

      {selectedStudent && (
        <>
          {/* Student Status Summary Card */}
          <div className="mb-6 bg-emerald-900 text-white p-5 rounded-3xl shadow-md border border-emerald-800 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">Expediente de Evaluación Práctica</span>
                <h2 className="text-xl font-black mt-0.5">{selectedStudent.apellidos} {selectedStudent.nombres}</h2>
                <p className="text-xs text-gray-300 font-medium">C.I.: {selectedStudent.cedula}</p>
              </div>

              {/* Traffic Light & Average Badge */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-center">
                  <span className="text-[9px] font-extrabold text-gray-300 uppercase block">Promedio Global</span>
                  <span className="text-xl font-black text-amber-300">
                    {studentSummary ? `${studentSummary.promedio_global.toFixed(2)} / 5.0` : '---'}
                  </span>
                </div>

                <div className={`px-4 py-2 rounded-2xl font-black text-xs flex items-center gap-1.5 shadow-md ${
                  studentSummary?.semaforo === 'VERDE' ? 'bg-emerald-600 text-white' :
                  studentSummary?.semaforo === 'AMARILLO' ? 'bg-amber-500 text-white' :
                  studentSummary?.semaforo === 'ROJO' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}>
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                  {studentSummary ? `ESTADO: ${studentSummary.semaforo}` : 'PENDIENTE'}
                </div>
              </div>
            </div>

            {/* Quick Attendance Selector */}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" /> Asistencia ({selectedDate}):
                </span>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 rounded-full">
                  Licencia: {selectedStudent.tipo_licencia}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setAttendance('PRESENTE')}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 ${
                    attendance === 'PRESENTE' ? 'bg-emerald-600 text-white ring-2 ring-emerald-300' : 'bg-white/10 hover:bg-white/20 text-gray-300'
                  }`}
                >
                  🟩 Presente
                </button>
                <button
                  type="button"
                  onClick={() => setAttendance('RETRASO')}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 ${
                    attendance === 'RETRASO' ? 'bg-amber-500 text-white ring-2 ring-amber-300' : 'bg-white/10 hover:bg-white/20 text-gray-300'
                  }`}
                >
                  🟨 Retraso
                </button>
                <button
                  type="button"
                  onClick={() => setAttendance('AUSENTE')}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 ${
                    attendance === 'AUSENTE' ? 'bg-red-600 text-white ring-2 ring-red-300' : 'bg-white/10 hover:bg-white/20 text-gray-300'
                  }`}
                >
                  🟥 Ausente
                </button>
              </div>
            </div>
          </div>

          {/* Conditional Heavy Vehicle Rotation Bar - EXCLUSIVELY for Licencia Tipo E */}
          {selectedStudent.tipo_licencia.startsWith('E_') ? (
            <div className="mb-6 bg-amber-500/10 p-4 rounded-3xl border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  Rotación Vehicular de Licencia Tipo E (Aprobar 5 Fases para Desbloquear Siguiente)
                </span>
                <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
                  Progreso Secuencial
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { code: 'NPR', label: '1. Camión NPR', prev: 'NPR' },
                  { code: 'SINOTRUC_BLANCO', label: '2. Sinotruc Blanco', prev: 'NPR' },
                  { code: 'SINOTRUC_GRIS', label: '3. Sinotruc Gris', prev: 'Sinotruc Blanco' },
                  { code: 'TRAILER', label: '4. Tráiler / Bus', prev: 'Sinotruc Gris' },
                ].map(veh => {
                  const isUnlocked = unlockedVehicles.includes(veh.code);
                  const isPassed = studentSummary?.vehicle_status_map?.[veh.code]?.is_passed || false;
                  const isSelected = selectedVehicleTypeE === veh.code;

                  return (
                    <button
                      key={veh.code}
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => setSelectedVehicleTypeE(veh.code as any)}
                      className={`p-2.5 rounded-2xl text-xs font-black transition-all border flex items-center justify-between ${
                        isSelected 
                          ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-500' 
                          : isUnlocked
                          ? 'bg-white text-gray-700 border-amber-200 hover:bg-amber-100'
                          : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <span>{veh.label}</span>
                      {isPassed ? (
                        <CheckCircle className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-300' : 'text-emerald-500'}`} />
                      ) : !isUnlocked ? (
                        <span title={`Bloqueado hasta aprobar 5 fases en ${veh.prev}`}>🔒</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {isFullyCompleted ? (
                <div className="mt-3 p-3.5 bg-gradient-to-r from-amber-600 via-emerald-600 to-teal-700 text-white rounded-2xl flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-200 shrink-0" />
                    <span className="text-xs font-black">
                      ¡Ciclo E Finalizado 🎉! El estudiante completó exitosamente la instrucción práctica en los 4 vehículos.
                    </span>
                  </div>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-xl font-extrabold text-[11px] shrink-0 border border-white/30">
                    Ciclo E Completado
                  </span>
                </div>
              ) : studentSummary?.vehicle_status_map?.[selectedVehicleTypeE]?.is_passed ? (
                <div className="mt-3 p-3.5 bg-emerald-800 text-white rounded-2xl flex items-center justify-between gap-3 shadow-md border border-emerald-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-300 shrink-0" />
                    <span className="text-xs font-black">
                      ¡Estudiante aprobó las 5 fases en {selectedVehicleTypeE.replace('_', ' ')}! Notificación enviada al Administrador para realizar la transferencia de vehículo.
                    </span>
                  </div>
                  <span className="px-3 py-1 bg-emerald-950/40 text-emerald-200 rounded-xl font-bold text-[10px] shrink-0 border border-emerald-600/50">
                    Pendiente Transferencia por Admin
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mb-6 bg-blue-500/10 p-3.5 rounded-2xl border border-blue-200 text-xs font-bold text-blue-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Evaluación Estándar de 5 Fases para {selectedStudent.tipo_licencia === 'C' ? 'Licencia Tipo C' : selectedStudent.tipo_licencia.includes('D') ? 'Licencia Tipo D (Autobuses)' : selectedStudent.tipo_licencia} (Sin rotación vehicular de carga pesada).</span>
            </div>
          )}

          {/* Phase Tabs */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {phases.map(phase => {
              const isCurrent = phase.numero === activePhaseNum;
              const summaryPhase = studentSummary?.phases?.find((p: any) => p.phase_numero === phase.numero);
              const isApproved = summaryPhase?.aprobada;

              return (
                <button
                  key={phase.id}
                  onClick={() => setActivePhaseNum(phase.numero)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 border ${
                    isCurrent 
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/20' 
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span>Fase {phase.numero}</span>
                  {isApproved && <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />}
                </button>
              );
            })}
          </div>

          {/* Current Phase Content & Activities */}
          {currentPhase && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
              <div className="p-5 bg-emerald-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-400" />
                    Fase {currentPhase.numero}: {currentPhase.nombre}
                  </h3>
                  <p className="text-xs text-gray-300 font-medium mt-0.5">
                    Duración esperada: {currentPhase.duracion_semanas || '1 a 4 semanas'} | Nota Aprobación: {currentPhase.nota_minima_aprobacion} / 5.0
                  </p>
                </div>
              </div>

              {/* Activities List */}
              <div className="p-4 sm:p-6 space-y-6 divide-y divide-gray-100">
                {currentPhase.activities && currentPhase.activities.length > 0 ? (
                  currentPhase.activities.map((activity, idx) => {
                    const currentEval = evaluations[activity.id] || { puntuacion: 0, observaciones: '', recomendaciones: '' };

                    return (
                      <div key={activity.id} className={`${idx > 0 ? 'pt-6' : ''}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                          <div>
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              Actividad #{activity.numero}
                            </span>
                            <h4 className="text-sm font-black text-gray-900 mt-1">{activity.nombre}</h4>
                            {activity.descripcion && (
                              <p className="text-xs text-gray-500 font-medium mt-0.5">{activity.descripcion}</p>
                            )}
                          </div>
                        </div>

                        {/* Touch-Friendly Mobile Score Selector (0 to 5) */}
                        <div className="mb-4">
                          <label className="block text-[11px] font-black text-gray-600 uppercase mb-1.5">Puntuación (0 a 5):</label>
                          <div className="grid grid-cols-6 gap-2">
                            {[0, 1, 2, 3, 4, 5].map(score => {
                              const isSelected = currentEval.puntuacion === score;
                              return (
                                <button
                                  key={score}
                                  type="button"
                                  onClick={() => handleScoreChange(activity.id, score)}
                                  className={`py-3 rounded-2xl font-black text-sm sm:text-base transition-all shadow-sm flex flex-col items-center justify-center gap-0.5 ${
                                    isSelected
                                      ? score >= 4 
                                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-200 scale-105 shadow-emerald-600/30' 
                                        : score === 3 
                                        ? 'bg-amber-500 text-white ring-4 ring-amber-200 scale-105 shadow-amber-500/30'
                                        : 'bg-red-600 text-white ring-4 ring-red-200 scale-105 shadow-red-600/30'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                  }`}
                                >
                                  <span>{score}</span>
                                  <span className="text-[9px] font-bold opacity-80">
                                    {score === 5 ? 'Excel' : score === 4 ? 'Bueno' : score === 3 ? 'Acept' : score === 2 ? 'Reg' : score === 1 ? 'Malo' : 'N/A'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Auto-filled Observations and Recommendations Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                          <div>
                            <label className="block text-[10px] font-extrabold uppercase text-gray-600 mb-1">
                              Observaciones (Auto-completadas según nota):
                            </label>
                            <textarea
                              rows={2}
                              value={currentEval.observaciones}
                              onChange={e => setEvaluations(prev => ({
                                ...prev,
                                [activity.id]: { ...prev[activity.id], observaciones: e.target.value }
                              }))}
                              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-extrabold uppercase text-gray-600 mb-1">
                              Recomendaciones (Auto-completadas según nota):
                            </label>
                            <textarea
                              rows={2}
                              value={currentEval.recomendaciones}
                              onChange={e => setEvaluations(prev => ({
                                ...prev,
                                [activity.id]: { ...prev[activity.id], recomendaciones: e.target.value }
                              }))}
                              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center py-6 text-xs text-gray-400 font-semibold">No hay actividades cargadas para esta fase.</p>
                )}
              </div>
            </div>
          )}

          {/* Floating Mobile Save Button */}
          <div className="fixed bottom-6 right-6 z-40">
            <button
              onClick={handleSaveEvaluations}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-3xl font-black text-sm shadow-2xl shadow-emerald-700/50 hover:bg-emerald-700 transition-all active:scale-95"
            >
              <Save className="w-5 h-5" />
              {submitting ? 'Guardando...' : 'Guardar Evaluación'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default InstructorEvaluationView;

