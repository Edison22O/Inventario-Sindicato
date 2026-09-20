import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, FileSpreadsheet, FileText, Download, Search, RefreshCw, 
  CheckCircle2, AlertCircle, Award, Check, Filter, Calendar as CalendarIcon, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import { authService } from '@/services/authService';
import { exportToExcel, exportToWord, exportTableToPDF } from '@/shared/utils/exportHelpers';
import { useWebSocket } from '@/shared/context/WebSocketContext';

interface StudentData {
  id: number;
  public_id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  tipo_licencia: string;
  tipo_licencia_display: string;
  instructor_id: number | null;
  instructor_name: string | null;
  telefono: string;
  email: string;
}

interface InstructorData {
  id: number;
  full_name: string;
  username: string;
}

interface EvaluationRecord {
  id?: number;
  student: number;
  categoria: string;
  nota: number;
  observaciones: string;
  vehiculo_rotacion?: string;
  fecha: string;
}

interface AttendanceRecord {
  id: number;
  student: number;
  fecha: string;
  estado: 'PRESENTE' | 'RETRASO' | 'AUSENTE';
  observacion?: string;
}

export const AcademicGradesMatrixPage: React.FC = () => {
  const navigate = useNavigate();
  const isGlobalAdmin = authService.isGlobalAdmin();
  const isVehicleAdmin = authService.isVehicleAdmin();
  const isAdmin = isGlobalAdmin || isVehicleAdmin;

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [instructors, setInstructors] = useState<InstructorData[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);

  // Filter States
  const [selectedLicense, setSelectedLicense] = useState<string>('C');
  const [selectedInstructor, setSelectedInstructor] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Absences Detail Modal State
  const [viewingAbsencesStudent, setViewingAbsencesStudent] = useState<StudentData | null>(null);

  // Edit Grades Modal State
  const [editingStudent, setEditingStudent] = useState<StudentData | null>(null);
  const [editGrades, setEditGrades] = useState<{
    deberes: number;
    trabajo_grupo: number;
    trabajos_individuales: number;
    prueba: number;
    examen: number;
    observaciones: string;
  }>({
    deberes: 0,
    trabajo_grupo: 0,
    trabajos_individuales: 0,
    prueba: 0,
    examen: 0,
    observaciones: ''
  });
  const [savingGrades, setSavingGrades] = useState(false);
  const [studentProgressMap, setStudentProgressMap] = useState<Record<number, any>>({});

  useEffect(() => {
    fetchData(true);

    // Periodic silent polling every 4s to ensure grades match Avance Alumnos in real-time
    const interval = setInterval(() => {
      fetchData(false);
    }, 4000);

    // Immediate silent refresh when switching back to this tab/window
    const handleFocus = () => {
      fetchData(false);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [selectedLicense, selectedInstructor]);

  // Real-time WebSocket synchronization for evaluations, students, and grades
  useWebSocket((payload) => {
    const model = payload?.model;
    if (
      !model ||
      model === 'AcademicEvaluation' ||
      model === 'StudentEvaluation' ||
      model === 'PracticalAttendance' ||
      model === 'Student'
    ) {
      fetchData(false);
    }
  });

  const fetchData = async (showLoading: boolean = true) => {
    if (showLoading) setLoading(true);
    try {
      const [studentsRes, instructorsRes, evalsRes, attRes, progressRes] = await Promise.all([
        api.get('/students/', {
          params: {
            tipo_licencia: selectedLicense,
            instructor: selectedInstructor !== 'ALL' ? selectedInstructor : undefined
          }
        }),
        api.get('/instructors/'),
        api.get('/academic-evaluations/', {
          params: { tipo_licencia: selectedLicense }
        }).catch(() => ({ data: [] })),
        api.get('/practical-attendances/').catch(() => ({ data: [] })),
        api.get('/student-evaluations/instructor-students-progress/', {
          params: { instructor: 'ALL' }
        }).catch(() => ({ data: { students_progress: [] } }))
      ]);

      const progressArr = progressRes.data?.students_progress || [];
      const progMap: Record<number, any> = {};
      progressArr.forEach((p: any) => {
        if (p.student_id) progMap[p.student_id] = p;
      });

      setStudents(studentsRes.data.results || studentsRes.data || []);
      setInstructors(instructorsRes.data.results || instructorsRes.data || []);
      setEvaluations(evalsRes.data.results || evalsRes.data || []);
      setAttendances(attRes.data.results || attRes.data || []);
      setStudentProgressMap(progMap);
    } catch (err) {
      console.error('Error al cargar la matriz académica:', err);
      if (showLoading) {
        toast.error('No se pudieron cargar los datos de la matriz académica');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const openEditGrades = (student: StudentData) => {
    setEditingStudent(student);
    const studentEvals = evaluations.filter(e => e.student === student.id);
    
    const getGrade = (cat: string) => {
      const found = studentEvals.find(e => e.categoria === cat);
      return found ? Number(found.nota) : 0;
    };

    setEditGrades({
      deberes: getGrade('DEBERES') || getStudentCategoryGrade(student.id, 'DEBERES'),
      trabajo_grupo: getGrade('TRABAJO_GRUPO') || getStudentCategoryGrade(student.id, 'TRABAJO_GRUPO'),
      trabajos_individuales: getGrade('TRABAJOS_INDIVIDUALES') || getStudentCategoryGrade(student.id, 'TRABAJOS_INDIVIDUALES'),
      prueba: getGrade('PRUEBA') || getStudentCategoryGrade(student.id, 'PRUEBA'),
      examen: getGrade('EXAMEN') || getStudentCategoryGrade(student.id, 'EXAMEN'),
      observaciones: studentEvals[0]?.observaciones || ''
    });
  };

  const saveStudentGrades = async () => {
    if (!editingStudent) return;
    setSavingGrades(true);

    const isLicenseE = editingStudent.tipo_licencia.startsWith('E_');

    const evalsToSave = isLicenseE ? [
      { categoria: 'DEBERES', nota: editGrades.deberes, observaciones: editGrades.observaciones, vehiculo_rotacion: 'NPR' },
      { categoria: 'TRABAJO_GRUPO', nota: editGrades.trabajo_grupo, observaciones: editGrades.observaciones, vehiculo_rotacion: 'SINOTRUC_BLANCO' },
      { categoria: 'PRUEBA', nota: editGrades.prueba, observaciones: editGrades.observaciones, vehiculo_rotacion: 'SINOTRUC_GRIS' },
      { categoria: 'EXAMEN', nota: editGrades.examen, observaciones: editGrades.observaciones, vehiculo_rotacion: 'TRAILER' }
    ] : [
      { categoria: 'DEBERES', nota: editGrades.deberes, observaciones: editGrades.observaciones },
      { categoria: 'TRABAJO_GRUPO', nota: editGrades.trabajo_grupo, observaciones: editGrades.observaciones },
      { categoria: 'TRABAJOS_INDIVIDUALES', nota: editGrades.trabajos_individuales, observaciones: editGrades.observaciones },
      { categoria: 'PRUEBA', nota: editGrades.prueba, observaciones: editGrades.observaciones },
      { categoria: 'EXAMEN', nota: editGrades.examen, observaciones: editGrades.observaciones }
    ];

    try {
      await api.post('/academic-evaluations/bulk-save/', {
        student_id: editingStudent.id,
        evaluations: evalsToSave
      });

      toast.success(`Notas de ${editingStudent.apellidos} ${editingStudent.nombres} guardadas con éxito.`);
      setEditingStudent(null);
      fetchData();
    } catch (err: any) {
      toast.error('Error al guardar las notas');
    } finally {
      setSavingGrades(false);
    }
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const fullName = `${s.apellidos} ${s.nombres} ${s.cedula}`.toLowerCase();
      return fullName.includes(searchTerm.toLowerCase());
    });
  }, [students, searchTerm]);

  const getStudentCategoryGrade = (studentId: number, category: string, vehicle?: string) => {
    // 1. Direct progress calculated from StudentEvaluation (Avance Alumnos module)
    const prog = studentProgressMap[studentId];
    if (prog) {
      const isLicenseE = selectedLicense.startsWith('E_');
      if (isLicenseE) {
        const byVeh = prog.by_vehicle || {};
        const vehKey = vehicle || (category === 'DEBERES' ? 'NPR' : category === 'TRABAJO_GRUPO' ? 'SINOTRUC_BLANCO' : category === 'PRUEBA' ? 'SINOTRUC_GRIS' : 'TRAILER');
        if (byVeh[vehKey] && Number(byVeh[vehKey].promedio || 0) > 0) {
          return Number(byVeh[vehKey].promedio || 0);
        }
      } else {
        const fases = prog.fases || [];
        const findByPhaseNum = (num: number) => {
          const match = fases.find((f: any) => f.phase_numero === num);
          return match ? Number(match.nota_20 || match.nota || 0) : 0;
        };
        let gradeFromProg = 0;
        if (category === 'DEBERES') gradeFromProg = findByPhaseNum(1);
        else if (category === 'TRABAJO_GRUPO') gradeFromProg = findByPhaseNum(2);
        else if (category === 'TRABAJOS_INDIVIDUALES') gradeFromProg = findByPhaseNum(3);
        else if (category === 'PRUEBA') gradeFromProg = findByPhaseNum(4);
        else if (category === 'EXAMEN') gradeFromProg = findByPhaseNum(5);

        if (gradeFromProg > 0) return gradeFromProg;
      }
    }

    // 2. Fallback to AcademicEvaluation records if manual override exists or progress has not loaded
    const ev = evaluations.find(e => {
      if (e.student !== studentId) return false;
      if (e.categoria !== category) return false;
      if (vehicle && e.vehiculo_rotacion && e.vehiculo_rotacion !== vehicle) return false;
      return true;
    });
    if (ev && Number(ev.nota) > 0) return Number(ev.nota);

    return 0;
  };

  const getStudentAverageGrade = (studentId: number) => {
    const isLicenseE = selectedLicense.startsWith('E_');
    const deberes = getStudentCategoryGrade(studentId, 'DEBERES', isLicenseE ? 'NPR' : undefined);
    const trabajo = getStudentCategoryGrade(studentId, 'TRABAJO_GRUPO', isLicenseE ? 'SINOTRUC_BLANCO' : undefined);
    const prueba = getStudentCategoryGrade(studentId, 'PRUEBA', isLicenseE ? 'SINOTRUC_GRIS' : undefined);
    const examen = getStudentCategoryGrade(studentId, 'EXAMEN', isLicenseE ? 'TRAILER' : undefined);

    if (isLicenseE) {
      // 4 vehicles: NPR (Deberes), Sinotruc B (Trabajo Grupo), Sinotruc G (Pruebas), Tráiler (Examen)
      const sum = deberes + trabajo + prueba + examen;
      return (sum / 4.0).toFixed(2);
    } else {
      // 5 phases: Deberes (F1), Trabajo Grupo (F2), Trabajos Ind. (F3), Pruebas (F4), Examen (F5)
      const trabajosInd = getStudentCategoryGrade(studentId, 'TRABAJOS_INDIVIDUALES');
      const sum = deberes + trabajo + trabajosInd + prueba + examen;
      return (sum / 5.0).toFixed(2);
    }
  };

  const getAbsencesCount = (studentId: number) => {
    return attendances.filter(a => a.student === studentId && a.estado === 'AUSENTE').length;
  };

  // Export Data Builder for Excel, Word, PDF
  const getExportData = () => {
    const isLicenseE = selectedLicense.startsWith('E_');

    const headers = isLicenseE ? [
      'Estudiante', 'Cédula', 'Instructor', 'Deberes (NPR)', 'Trabajo Grupo (Sinotruc Blanco)', 'Pruebas (Sinotruc Gris)', 'Examen (Tráiler / Bus)', 'Promedio Final', 'Inasistencias', 'Estado'
    ] : [
      'Estudiante', 'Cédula', 'Instructor', 'Deberes (Fase 1)', 'Trabajo Grupo (Fase 2)', 'Trabajos Ind. (Fase 3)', 'Pruebas (Fase 4)', 'Examen (Fase 5)', 'Promedio Final', 'Inasistencias', 'Estado'
    ];

    const rows = filteredStudents.map(student => {
      const avg = Number(getStudentAverageGrade(student.id));
      const absences = getAbsencesCount(student.id);
      const d = getStudentCategoryGrade(student.id, 'DEBERES', isLicenseE ? 'NPR' : undefined).toFixed(1);
      const tg = getStudentCategoryGrade(student.id, 'TRABAJO_GRUPO', isLicenseE ? 'SINOTRUC_BLANCO' : undefined).toFixed(1);
      const p = getStudentCategoryGrade(student.id, 'PRUEBA', isLicenseE ? 'SINOTRUC_GRIS' : undefined).toFixed(1);
      const e = getStudentCategoryGrade(student.id, 'EXAMEN', isLicenseE ? 'TRAILER' : undefined).toFixed(1);
      const statusStr = avg >= 16.0 ? 'APROBADO' : (avg > 0 ? 'EN PROCESO' : 'PENDIENTE');

      if (isLicenseE) {
        return [
          `${student.apellidos} ${student.nombres}`,
          student.cedula,
          student.instructor_name || 'Sin Asignar',
          d, tg, p, e, `${avg.toFixed(2)} / 20`, absences, statusStr
        ];
      } else {
        const ti = getStudentCategoryGrade(student.id, 'TRABAJOS_INDIVIDUALES').toFixed(1);
        return [
          `${student.apellidos} ${student.nombres}`,
          student.cedula,
          student.instructor_name || 'Sin Asignar',
          d, tg, ti, p, e, `${avg.toFixed(2)} / 20`, absences, statusStr
        ];
      }
    });

    return { headers, rows };
  };

  const handleExportExcel = () => {
    const { headers, rows } = getExportData();
    const excelData = rows.map(r => {
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = r[i]; });
      return obj;
    });
    exportToExcel(excelData, `Matriz_Academica_Licencia_${selectedLicense}`, 'Matriz Academica');
    toast.success('Archivo Excel descargado con éxito.');
  };

  const handleExportWord = () => {
    const { headers, rows } = getExportData();
    exportToWord(`MATRIZ ACADÉMICA Y NOTAS - LICENCIA ${selectedLicense}`, headers, rows, `Matriz_Academica_Licencia_${selectedLicense}`);
    toast.success('Documento Word descargado con éxito.');
  };

  const handleExportPDF = () => {
    const { headers, rows } = getExportData();
    exportTableToPDF(`MATRIZ ACADÉMICA Y NOTAS - LICENCIA ${selectedLicense}`, headers, rows, `Matriz_Academica_Licencia_${selectedLicense}`);
    toast.success('Documento PDF generado con éxito.');
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center font-sans space-y-4 py-20">
        <div className="bg-amber-50 text-amber-900 border border-amber-200 p-8 rounded-3xl shadow-sm space-y-3">
          <BookOpen className="w-12 h-12 text-amber-600 mx-auto" />
          <h2 className="text-xl font-black">Acceso Reservado a Administradores</h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto">
            La Matriz Académica de Calificaciones es de uso exclusivo para la gestión administrativa. Como instructor, puedes consultar tu horario asignado, calificar por fases y revisar tu reporte semanal.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/instructor-schedules')}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black rounded-2xl shadow-sm transition-all"
            >
              Ir a Mi Horario de Prácticas
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto pb-32 font-sans">
      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs tracking-wider uppercase mb-1">
            <BookOpen className="w-4 h-4" /> Módulo de Evaluaciones Independiente
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Matriz Académica & Reporte de Notas
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Calificación por rubros (Deberes, Trabajos, Pruebas, Exámenes), rotación vehicular e inasistencias.
          </p>
        </div>

        {/* 3 Download Formats: Excel, Word, PDF */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
            title="Descargar Hoja de Cálculo Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportWord}
            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-2xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
            title="Descargar Documento Word (.doc)"
          >
            <FileText className="w-4 h-4 text-blue-300" />
            <span>Word</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-2xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
            title="Descargar Documento PDF (.pdf)"
          >
            <Download className="w-4 h-4 text-rose-300" />
            <span>PDF</span>
          </button>

          <button
            onClick={() => fetchData(true)}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-all"
            title="Actualizar Datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar Banner */}
      <div className="mb-6 bg-emerald-900 text-white p-4 sm:p-5 rounded-3xl shadow-md border border-emerald-800 space-y-4">
        {/* License Filter Tabs */}
        <div>
          <span className="block text-[10px] font-black uppercase text-emerald-300 tracking-wider mb-2">
            Seleccionar Tipo de Licencia:
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'C', label: 'Licencia Tipo C' },
              { id: 'D_REGULAR', label: 'Tipo D (Regular)' },
              { id: 'D_CONVALIDADA', label: 'Tipo D (Convalidada)' },
              { id: 'E_REGULAR', label: 'Tipo E (Regular)' },
              { id: 'E_CONVALIDADA', label: 'Tipo E (Convalidada)' }
            ].map(lic => (
              <button
                key={lic.id}
                onClick={() => setSelectedLicense(lic.id)}
                className={`px-4 py-2 text-xs font-black rounded-2xl border transition-all ${
                  selectedLicense === lic.id
                    ? 'bg-emerald-500 text-white border-emerald-300 shadow-md shadow-emerald-500/20'
                    : 'bg-white/10 text-emerald-100 border-white/15 hover:bg-white/20'
                }`}
              >
                {lic.label}
              </button>
            ))}
          </div>
        </div>

        {/* Instructor Filter & Search Input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-800">
          <div>
            <label className="block text-[10px] font-black uppercase text-emerald-300 tracking-wider mb-1">
              Filtrar por Instructor:
            </label>
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <select
                value={selectedInstructor}
                onChange={(e) => setSelectedInstructor(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white text-gray-900 text-xs font-black rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">-- Todos los Instructores --</option>
                {instructors.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.full_name || inst.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-emerald-300 tracking-wider mb-1">
              Buscar Estudiante:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Nombre, apellido o cédula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white text-gray-900 text-xs font-black rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-900 text-white text-xs font-black uppercase tracking-wider whitespace-nowrap">
                <th className="py-4 px-4 whitespace-nowrap">Estudiante</th>
                <th className="py-4 px-4 whitespace-nowrap">Cédula</th>
                <th className="py-4 px-4 whitespace-nowrap">Instructor</th>

                {selectedLicense.startsWith('E_') ? (
                  <>
                    <th className="py-4 px-4 text-center whitespace-nowrap">Deberes (NPR)</th>
                    <th className="py-4 px-4 text-center whitespace-nowrap">Trab. Grupo (Sinotruc B)</th>
                    <th className="py-4 px-4 text-center whitespace-nowrap">Pruebas (Sinotruc G)</th>
                    <th className="py-4 px-4 text-center whitespace-nowrap">Examen (Tráiler / Bus)</th>
                    <th className="py-4 px-4 text-center whitespace-nowrap">Promedio Final</th>
                  </>
                ) : (
                  <>
                    <th className="py-4 px-4 text-center whitespace-nowrap">Deberes (Fase 1)</th>
                    <th className="py-4 px-4 text-center whitespace-nowrap">Trab. Grupo (Fase 2)</th>
                    <th className="py-4 px-4 text-center whitespace-nowrap">Trab. Ind. (Fase 3)</th>
                    <th className="py-4 px-4 text-center whitespace-nowrap">Pruebas (Fase 4)</th>
                    <th className="py-4 px-4 text-center whitespace-nowrap">Examen (Fase 5)</th>
                    <th className="py-4 px-4 text-center whitespace-nowrap">Promedio Final</th>
                  </>
                )}

                <th className="py-4 px-4 text-center whitespace-nowrap">Inasistencias</th>
                <th className="py-4 px-4 text-center whitespace-nowrap">Estado</th>
                <th className="py-4 px-4 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-gray-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
                    Cargando matriz académica...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-gray-500 font-semibold">
                    No se encontraron estudiantes para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isLicenseE = selectedLicense.startsWith('E_');
                  const avg = Number(getStudentAverageGrade(student.id));
                  const isPassed = avg >= 16.0;
                  const absences = getAbsencesCount(student.id);

                  const deberes = getStudentCategoryGrade(student.id, 'DEBERES', isLicenseE ? 'NPR' : undefined).toFixed(1);
                  const trabajo = getStudentCategoryGrade(student.id, 'TRABAJO_GRUPO', isLicenseE ? 'SINOTRUC_BLANCO' : undefined).toFixed(1);
                  const trabajosInd = getStudentCategoryGrade(student.id, 'TRABAJOS_INDIVIDUALES').toFixed(1);
                  const prueba = getStudentCategoryGrade(student.id, 'PRUEBA', isLicenseE ? 'SINOTRUC_GRIS' : undefined).toFixed(1);
                  const examen = getStudentCategoryGrade(student.id, 'EXAMEN', isLicenseE ? 'TRAILER' : undefined).toFixed(1);

                  return (
                    <tr key={student.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-black text-gray-900 whitespace-nowrap">
                        {student.apellidos} {student.nombres}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-mono whitespace-nowrap">
                        {student.cedula}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 font-semibold whitespace-nowrap">
                        {student.instructor_name || <span className="text-gray-400 italic">Sin Asignar</span>}
                      </td>

                      {isLicenseE ? (
                        <>
                          <td className="py-3.5 px-4 text-center font-bold text-gray-900 whitespace-nowrap">
                            {deberes}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-gray-900 whitespace-nowrap">
                            {trabajo}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-gray-900 whitespace-nowrap">
                            {prueba}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-gray-900 whitespace-nowrap">
                            {examen}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3.5 px-4 text-center font-bold text-gray-900 whitespace-nowrap">
                            {deberes}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-gray-900 whitespace-nowrap">
                            {trabajo}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-gray-900 whitespace-nowrap">
                            {trabajosInd}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-gray-900 whitespace-nowrap">
                            {prueba}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-gray-900 whitespace-nowrap">
                            {examen}
                          </td>
                        </>
                      )}

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-block font-black px-3 py-1 rounded-xl text-xs border whitespace-nowrap shadow-xs ${
                          isPassed 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {avg.toFixed(2)} / 20
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {absences > 0 ? (
                          <button
                            type="button"
                            onClick={() => setViewingAbsencesStudent(student)}
                            className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded-full font-black text-[11px] transition-all flex items-center justify-center gap-1 mx-auto shadow-xs whitespace-nowrap"
                            title="Haz clic para ver las fechas exactas en que faltó el estudiante"
                          >
                            <CalendarIcon className="w-3 h-3 text-rose-600" />
                            <span>{absences} Faltas (Ver fechas)</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs font-semibold whitespace-nowrap">0 Faltas</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isPassed ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-black whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Aprobado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-black whitespace-nowrap">
                            <AlertCircle className="w-3.5 h-3.5" /> En Proceso
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEditGrades(student)}
                          className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs rounded-xl shadow-xs transition-all"
                        >
                          Evaluar Rubros
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Grades Modal for Academic Matrix */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 w-full max-w-lg p-6 space-y-5 shadow-2xl text-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-700" />
                Calificar Rubros Académicos ({editingStudent.tipo_licencia})
              </h2>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
              <p className="text-sm font-black text-gray-900">
                {editingStudent.apellidos} {editingStudent.nombres}
              </p>
              <p className="text-xs text-gray-600 font-medium">Cédula: {editingStudent.cedula}</p>
            </div>

            {editingStudent.tipo_licencia.startsWith('E_') ? (
              /* Licencia Tipo E: 4 Vehículos */
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">Deberes - Camión NPR (0 - 20)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.1}
                    value={editGrades.deberes}
                    onChange={(e) => setEditGrades({ ...editGrades, deberes: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">Trabajo en Grupo - Sinotruc Blanco (0 - 20)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.1}
                    value={editGrades.trabajo_grupo}
                    onChange={(e) => setEditGrades({ ...editGrades, trabajo_grupo: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">Pruebas - Sinotruc Gris (0 - 20)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.1}
                    value={editGrades.prueba}
                    onChange={(e) => setEditGrades({ ...editGrades, prueba: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">Examen - Tráiler / Bus (0 - 20)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.1}
                    value={editGrades.examen}
                    onChange={(e) => setEditGrades({ ...editGrades, examen: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            ) : (
              /* Licencias Estándar (Tipo C, D, etc.): 5 Fases */
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">Deberes - Fase 1 (0 - 20)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.1}
                    value={editGrades.deberes}
                    onChange={(e) => setEditGrades({ ...editGrades, deberes: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">Trabajo en Grupo - Fase 2 (0 - 20)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.1}
                    value={editGrades.trabajo_grupo}
                    onChange={(e) => setEditGrades({ ...editGrades, trabajo_grupo: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">Trabajos Ind. - Fase 3 (0 - 20)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.1}
                    value={editGrades.trabajos_individuales}
                    onChange={(e) => setEditGrades({ ...editGrades, trabajos_individuales: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">Pruebas - Fase 4 (0 - 20)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.1}
                    value={editGrades.prueba}
                    onChange={(e) => setEditGrades({ ...editGrades, prueba: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-black text-gray-700 mb-1">Examen - Fase 5 (0 - 20)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.1}
                    value={editGrades.examen}
                    onChange={(e) => setEditGrades({ ...editGrades, examen: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-gray-700 mb-1">Observaciones</label>
              <textarea
                rows={2}
                value={editGrades.observaciones}
                onChange={(e) => setEditGrades({ ...editGrades, observaciones: e.target.value })}
                placeholder="Observaciones adicionales..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveStudentGrades}
                disabled={savingGrades}
                className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm"
              >
                {savingGrades ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Guardar Notas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Absences Detail Modal */}
      {viewingAbsencesStudent && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 w-full max-w-md p-6 space-y-4 shadow-2xl text-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-rose-600 shrink-0" />
                  Fechas de Inasistencia Registradas
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {viewingAbsencesStudent.apellidos} {viewingAbsencesStudent.nombres} (C.I.: {viewingAbsencesStudent.cedula})
                </p>
              </div>
              <button
                onClick={() => setViewingAbsencesStudent(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {attendances.filter(a => a.student === viewingAbsencesStudent.id && (a.estado === 'AUSENTE' || a.estado === 'RETRASO')).length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs font-semibold">
                  No hay inasistencias ni retrasos registrados para este estudiante.
                </div>
              ) : (
                attendances.filter(a => a.student === viewingAbsencesStudent.id && (a.estado === 'AUSENTE' || a.estado === 'RETRASO')).map((att, idx) => (
                  <div key={idx} className="p-3 bg-rose-50/80 rounded-2xl border border-rose-100 flex items-center justify-between text-xs shadow-xs">
                    <div>
                      <span className="font-black text-gray-900 block flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-rose-600" />
                        {att.fecha}
                      </span>
                      <span className="text-[11px] text-gray-600 font-medium block mt-0.5">
                        {att.observacion || 'Sin observaciones registradas'}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${
                      att.estado === 'AUSENTE' ? 'bg-rose-100 text-rose-900 border-rose-200' : 'bg-amber-100 text-amber-900 border-amber-200'
                    }`}>
                      {att.estado}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setViewingAbsencesStudent(null)}
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-black text-xs rounded-2xl transition-all shadow-sm"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicGradesMatrixPage;
