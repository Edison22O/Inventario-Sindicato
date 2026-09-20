import React, { useState, useEffect, useMemo } from 'react';
import api from '@/shared/services/api';
import { toast } from 'react-hot-toast';
import { 
  Users, UserCheck, UserX, Search, Trash2, CheckCircle, 
  X, Shield, AlertCircle, UserPlus, Award, Truck, Download,
  Filter, ChevronRight, Settings, Lock, ArrowRight, Clock
} from 'lucide-react';
import type { Instructor, Student, Vehicle } from '@/shared/types';
import { useWebSocket } from '@/shared/context/WebSocketContext';
import { exportProgressMatrixToPDF } from '@/shared/utils/exportHelpers';

export const InstructorManagement: React.FC = () => {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Top Page View Tab: INSTRUCTORS | PROGRESS_MATRIX
  const [activeViewTab, setActiveViewTab] = useState<'INSTRUCTORS' | 'PROGRESS_MATRIX'>('INSTRUCTORS');

  // Modal state for student assignment
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'ASSIGNED' | 'UNASSIGNED'>('ASSIGNED');
  const [modalSearch, setModalSearch] = useState('');
  const [selectedUnassignedIds, setSelectedUnassignedIds] = useState<number[]>([]);
  const [filterByInstructorLicense, setFilterByInstructorLicense] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal state for Instructor Configuration (Vehicles & Licenses)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configInstructor, setConfigInstructor] = useState<Instructor | null>(null);
  const [configSelectedVehicles, setConfigSelectedVehicles] = useState<number[]>([]);
  const [configSelectedLicenses, setConfigSelectedLicenses] = useState<string[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // Modal state for Student Transfer across vehicle cycles & instructors
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferStudentData, setTransferStudentData] = useState<{
    id: number;
    public_id?: string;
    student_name: string;
    cedula: string;
    tipo_licencia: string;
    current_veh: string;
    is_passed: boolean;
    promedio: number;
  } | null>(null);
  const [transferTargetVeh, setTransferTargetVeh] = useState<string>('SINOTRUC_BLANCO');
  const [transferTargetInstructorId, setTransferTargetInstructorId] = useState<string>('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Admin Notification State for Pending Student Transfers
  const [pendingTransfersList, setPendingTransfersList] = useState<any[]>([]);

  // State for student progress matrix page tab
  const [selectedInstructorProgress, setSelectedInstructorProgress] = useState<Instructor | null>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Hierarchical License Filter States (No Emojis!)
  const [selectedMainLicense, setSelectedMainLicense] = useState<'ALL' | 'C' | 'D' | 'E'>('ALL');
  const [selectedDSubType, setSelectedDSubType] = useState<'ALL' | 'D_REGULAR' | 'D_CONVALIDADA'>('ALL');
  const [selectedESubType, setSelectedESubType] = useState<'ALL' | 'E_REGULAR' | 'E_CONVALIDADA'>('ALL');
  const [selectedEVehicle, setSelectedEVehicle] = useState<'ALL' | 'E_NPR' | 'E_SINOTRUC_BLANCO' | 'E_SINOTRUC_GRIS' | 'E_TRAILER'>('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [instRes, studRes, vehRes, pendingRes] = await Promise.all([
        api.get('/instructors/'),
        api.get('/students/'),
        api.get('/vehicles/'),
        api.get('/students/pending-transfers/').catch(() => ({ data: { count: 0, pending_transfers: [] } }))
      ]);
      const instData = instRes.data || [];
      setInstructors(instData);
      setStudents(studRes.data || []);
      setVehicles(vehRes.data || []);
      setPendingTransfersList(pendingRes.data?.pending_transfers || []);

      if (!selectedInstructorProgress && instData.length > 0) {
        setSelectedInstructorProgress(instData[0]);
      }
    } catch (e) {
      console.error('Error al cargar datos de instructores:', e);
      toast.error('Error al cargar la lista de instructores');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, []);

  const handleWebSocketMessage = React.useCallback((payload?: any) => {
    if (!payload?.model || ['Student', 'StudentEvaluation', 'InstructorProfile', 'User', 'LearningPhase'].includes(payload.model)) {
      fetchData();
    }
  }, []);

  useWebSocket(handleWebSocketMessage);

  // Fetch progress matrix when selected instructor changes or when progress tab is activated
  const loadInstructorProgress = async (inst: Instructor) => {
    setSelectedInstructorProgress(inst);
    setLoadingProgress(true);
    try {
      let res;
      try {
        res = await api.get(`/instructors/${inst.id}/students-progress/`);
      } catch {
        res = await api.get(`/student-evaluations/instructor-students-progress/?instructor=${inst.id}`);
      }
      setProgressData(res.data);
    } catch (e) {
      console.error('Error al cargar avance de estudiantes:', e);
      toast.error('Error al cargar la matriz de avance de los estudiantes');
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleSwitchToProgressTab = (inst?: Instructor) => {
    const targetInst = inst || selectedInstructorProgress || (instructors.length > 0 ? instructors[0] : null);
    setActiveViewTab('PROGRESS_MATRIX');
    if (targetInst) {
      loadInstructorProgress(targetInst);
    }
  };

  // Filtered Progress Matrix Students
  const filteredProgressStudents = useMemo(() => {
    if (!progressData || !progressData.students_progress) return [];

    return progressData.students_progress.filter((st: any) => {
      const lic = st.tipo_licencia || '';
      const isTipoE = st.is_tipo_e || lic.startsWith('E_');

      // 1. Main License Filter
      if (selectedMainLicense === 'C' && lic !== 'C') return false;

      if (selectedMainLicense === 'D') {
        if (!lic.startsWith('D')) return false;
        if (selectedDSubType === 'D_REGULAR' && lic !== 'D_REGULAR') return false;
        if (selectedDSubType === 'D_CONVALIDADA' && lic !== 'D_CONVALIDADA') return false;
      }

      if (selectedMainLicense === 'E') {
        if (!isTipoE) return false;
        if (selectedESubType === 'E_REGULAR' && lic !== 'E_REGULAR') return false;
        if (selectedESubType === 'E_CONVALIDADA' && lic !== 'E_CONVALIDADA') return false;
      }

      return true;
    }).map((st: any) => {
      let targetVehCode: string | null = null;
      if (selectedEVehicle === 'E_NPR') targetVehCode = 'NPR';
      else if (selectedEVehicle === 'E_SINOTRUC_BLANCO') targetVehCode = 'SINOTRUC_BLANCO';
      else if (selectedEVehicle === 'E_SINOTRUC_GRIS') targetVehCode = 'SINOTRUC_GRIS';
      else if (selectedEVehicle === 'E_TRAILER') targetVehCode = 'TRAILER';

      const vehData = (targetVehCode && st.by_vehicle && st.by_vehicle[targetVehCode])
        ? st.by_vehicle[targetVehCode]
        : null;

      const fasesToRender = vehData ? vehData.fases : st.fases;
      const promedioToRender = vehData ? vehData.promedio : st.promedio;

      return {
        ...st,
        targetVehCode,
        fasesToRender,
        promedioToRender
      };
    });
  }, [progressData, selectedMainLicense, selectedDSubType, selectedESubType, selectedEVehicle]);

  // Dynamic filter label for PDF output
  const getFilterLabelForPDF = () => {
    if (selectedMainLicense === 'C') return 'Licencia Tipo C';
    if (selectedMainLicense === 'D') {
      if (selectedDSubType === 'D_REGULAR') return 'Licencia Tipo D (Regular)';
      if (selectedDSubType === 'D_CONVALIDADA') return 'Licencia Tipo D (Convalidada)';
      return 'Licencia Tipo D (Todas)';
    }
    if (selectedMainLicense === 'E') {
      let base = 'Licencia Tipo E';
      if (selectedESubType === 'E_REGULAR') base += ' (Regular)';
      else if (selectedESubType === 'E_CONVALIDADA') base += ' (Convalidada)';
      else base += ' (Todas)';

      if (selectedEVehicle === 'E_NPR') base += ' - Camión NPR';
      else if (selectedEVehicle === 'E_SINOTRUC_BLANCO') base += ' - Sinotruc Blanco';
      else if (selectedEVehicle === 'E_SINOTRUC_GRIS') base += ' - Sinotruc Gris';
      else if (selectedEVehicle === 'E_TRAILER') base += ' - Tráiler / Bus';

      return base;
    }
    return 'Todas las Licencias';
  };

  // Statistics calculation
  const totalInstructors = instructors.length;
  const activeInstructors = instructors.filter(i => i.activo).length;
  const inactiveInstructors = totalInstructors - activeInstructors;
  const totalStudents = students.length;
  const assignedStudentsCount = students.filter(s => s.instructor != null).length;
  const unassignedStudentsCount = totalStudents - assignedStudentsCount;

  // Toggle instructor active / inactive state
  const handleToggleActive = async (instructor: Instructor) => {
    const newStatus = !instructor.activo;
    try {
      await api.patch(`/instructors/${instructor.id}/toggle-active/`, { activo: newStatus });
      toast.success(
        newStatus 
          ? `Instructor ${instructor.full_name} activado para asignación de horarios` 
          : `Instructor ${instructor.full_name} inhabilitado`
      );
      fetchData();
    } catch (e) {
      console.error('Error al cambiar estado del instructor:', e);
      toast.error('No se pudo cambiar el estado del instructor');
    }
  };

  // Open modal for student assignment
  const openAssignmentModal = (instructor: Instructor) => {
    setSelectedInstructor(instructor);
    setSelectedUnassignedIds([]);
    setModalSearch('');
    setModalTab('ASSIGNED');
    setIsModalOpen(true);
  };

  // Assign selected unassigned students to current instructor
  const handleAssignStudents = async () => {
    if (!selectedInstructor || selectedUnassignedIds.length === 0) return;
    setSubmitting(true);
    try {
      await api.post('/students/assign-instructor/', {
        instructor_id: selectedInstructor.id,
        student_ids: selectedUnassignedIds
      });
      toast.success(`${selectedUnassignedIds.length} estudiante(s) asignados a ${selectedInstructor.full_name}`);
      setSelectedUnassignedIds([]);
      await fetchData();
    } catch (e) {
      console.error('Error al asignar estudiantes:', e);
      toast.error('Error al asignar estudiantes');
    } finally {
      setSubmitting(false);
    }
  };

  // Unassign/Free a specific student or multiple students
  const handleUnassignStudents = async (studentIds: number[]) => {
    if (studentIds.length === 0) return;
    setSubmitting(true);
    try {
      await api.post('/students/assign-instructor/', {
        instructor_id: null,
        student_ids: studentIds
      });
      toast.success(`${studentIds.length} estudiante(s) desvinculados y dejados libres`);
      await fetchData();
    } catch (e) {
      console.error('Error al liberar estudiantes:', e);
      toast.error('Error al desvincular estudiante(s)');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Instructors List
  const filteredInstructors = useMemo(() => {
    return instructors.filter(inst => {
      const matchesSearch = 
        inst.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inst.email && inst.email.toLowerCase().includes(searchTerm.toLowerCase()));

      if (statusFilter === 'ACTIVE') return matchesSearch && inst.activo;
      if (statusFilter === 'INACTIVE') return matchesSearch && !inst.activo;
      return matchesSearch;
    });
  }, [instructors, searchTerm, statusFilter]);

  // Students assigned to currently opened modal instructor
  const assignedToModalInstructor = useMemo(() => {
    if (!selectedInstructor) return [];
    return students.filter(s => s.instructor === selectedInstructor.id && (
      s.nombres.toLowerCase().includes(modalSearch.toLowerCase()) ||
      s.apellidos.toLowerCase().includes(modalSearch.toLowerCase()) ||
      s.cedula.includes(modalSearch)
    ));
  }, [students, selectedInstructor, modalSearch]);

  // Open Configuration Modal for Instructor Vehicles & Licenses
  const openConfigModal = (inst: Instructor) => {
    setConfigInstructor(inst);
    setConfigSelectedVehicles(inst.assigned_vehicle_ids || []);
    setConfigSelectedLicenses(inst.licencias_habilitadas || ['C', 'D_REGULAR', 'D_CONVALIDADA', 'E_REGULAR', 'E_CONVALIDADA']);
    setIsConfigModalOpen(true);
  };

  // Save Instructor Vehicles & Licenses Configuration
  const handleSaveConfig = async () => {
    if (!configInstructor) return;
    setSavingConfig(true);
    try {
      await api.post(`/instructors/${configInstructor.id}/update-configuration/`, {
        assigned_vehicle_ids: configSelectedVehicles,
        licencias_habilitadas: configSelectedLicenses
      });
      toast.success(`Configuración guardada para ${configInstructor.full_name}`);
      setIsConfigModalOpen(false);
      await fetchData();
    } catch (e) {
      console.error('Error al guardar configuración de instructor:', e);
      toast.error('No se pudo guardar la configuración');
    } finally {
      setSavingConfig(false);
    }
  };

  // Helper: Get remaining heavy vehicles student HAS NOT yet completed
  const getRemainingVehiclesOptions = (currentVeh: string) => {
    const allHeavy = [
      { code: 'NPR', label: '1. Camión NPR' },
      { code: 'SINOTRUC_BLANCO', label: '2. Sinotruc Blanco (Uñeta)' },
      { code: 'SINOTRUC_GRIS', label: '3. Sinotruc Gris (Palanca)' },
      { code: 'TRAILER', label: '4. Tráiler / Bus' }
    ];

    if (currentVeh === 'NPR') {
      return allHeavy.filter(v => v.code !== 'NPR');
    } else if (currentVeh === 'SINOTRUC_BLANCO') {
      return allHeavy.filter(v => v.code !== 'NPR' && v.code !== 'SINOTRUC_BLANCO');
    } else if (currentVeh === 'SINOTRUC_GRIS') {
      return allHeavy.filter(v => v.code === 'TRAILER');
    }
    return allHeavy.filter(v => v.code !== currentVeh);
  };

  // Helper: Filter instructors who CAN teach the target vehicle
  const getTargetInstructorsForVeh = (vehCode: string, studentLicence: string) => {
    const activeInstructors = instructors.filter(i => i.activo);

    const qualified = activeInstructors.filter(inst => {
      const hasAssignedVeh = inst.assigned_vehicles?.some(v => {
        const vText = `${v.tipo || ''} ${v.modelo || ''} ${v.observacion || ''} ${v.placa || ''}`.toUpperCase();
        if (vehCode === 'NPR') return vText.includes('NPR') || vText.includes('CAMION') || vText.includes('PBF-5510') || vText.includes('ABC-321');
        if (vehCode === 'SINOTRUC_BLANCO') return vText.includes('SINOTRUC') || vText.includes('BLANCO') || vText.includes('UÑETA') || vText.includes('PBA-1024') || vText.includes('FTR');
        if (vehCode === 'SINOTRUC_GRIS') return vText.includes('SINOTRUC') || vText.includes('GRIS') || vText.includes('PALANCA') || vText.includes('PBB-3058') || vText.includes('D-MAX');
        if (vehCode === 'TRAILER') return vText.includes('TRAILER') || vText.includes('BUS') || vText.includes('TBA-4192') || vText.includes('GH 1726');
        return true;
      });

      const hasLicense = inst.licencias_habilitadas?.includes(studentLicence) || 
                         inst.licencias_habilitadas?.some((l: string) => studentLicence.startsWith(l.split('_')[0]));

      return hasAssignedVeh || hasLicense;
    });

    return qualified.length > 0 ? qualified : activeInstructors;
  };

  // Open Transfer Modal for student
  const openTransferModal = (st: any) => {
    const isPassed = st.fasesToRender && st.fasesToRender.length === 5 && st.fasesToRender.every((f: any) => f.is_passed);
    const currentVehCode = st.targetVehCode || 'NPR';

    if (!isPassed) {
      toast.error(`🔒 Estudiante ${st.student_name} aún no aprueba el ciclo de ${currentVehCode.replace('_', ' ')} (requiere promedio >= 4.0 en todas las fases).`);
      return;
    }

    const remainingVehs = getRemainingVehiclesOptions(currentVehCode);
    const defaultTargetVeh = remainingVehs.length > 0 ? remainingVehs[0].code : 'SINOTRUC_BLANCO';
    const candidateInsts = getTargetInstructorsForVeh(defaultTargetVeh, st.tipo_licencia);

    setTransferStudentData({
      id: st.student_id,
      public_id: st.student_public_id,
      student_name: st.student_name,
      cedula: st.cedula,
      tipo_licencia: st.tipo_licencia,
      current_veh: currentVehCode,
      is_passed: true,
      promedio: st.promedioToRender || 0
    });
    setTransferTargetVeh(defaultTargetVeh);
    setTransferTargetInstructorId(candidateInsts.length > 0 ? candidateInsts[0].id.toString() : (instructors.length > 0 ? instructors[0].id.toString() : ''));
    setIsTransferModalOpen(true);
  };

  // Submit Student Transfer
  const handleTransferStudent = async () => {
    if (!transferStudentData || !transferTargetInstructorId) return;
    setSubmittingTransfer(true);
    try {
      const studentKey = transferStudentData.public_id || transferStudentData.id;
      const res = await api.post(`/students/${studentKey}/transfer-vehicle-instructor/`, {
        target_instructor_id: parseInt(transferTargetInstructorId),
        current_vehicle: transferStudentData.current_veh,
        target_vehicle: transferTargetVeh
      });
      toast.success(res.data.message || 'Estudiante transferido exitosamente');
      setIsTransferModalOpen(false);
      await fetchData();
      if (selectedInstructorProgress) {
        await loadInstructorProgress(selectedInstructorProgress);
      }
    } catch (e: any) {
      console.error('Error al transferir estudiante:', e);
      const errMsg = e.response?.data?.error || 'Error al transferir estudiante';
      toast.error(errMsg);
    } finally {
      setSubmittingTransfer(false);
    }
  };

  // Unassigned / Free students pool (filtered by Instructor's License Types if active)
  const unassignedStudentsPool = useMemo(() => {
    return students.filter(s => {
      if (s.instructor != null) return false;
      
      const matchesSearch = 
        s.nombres.toLowerCase().includes(modalSearch.toLowerCase()) ||
        s.apellidos.toLowerCase().includes(modalSearch.toLowerCase()) ||
        s.cedula.includes(modalSearch);

      if (!matchesSearch) return false;

      if (filterByInstructorLicense && selectedInstructor && selectedInstructor.licencias_habilitadas && selectedInstructor.licencias_habilitadas.length > 0) {
        return selectedInstructor.licencias_habilitadas.includes(s.tipo_licencia);
      }

      return true;
    });
  }, [students, modalSearch, selectedInstructor, filterByInstructorLicense]);


  const toggleSelectUnassigned = (id: number) => {
    setSelectedUnassignedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllUnassigned = () => {
    if (selectedUnassignedIds.length === unassignedStudentsPool.length) {
      setSelectedUnassignedIds([]);
    } else {
      setSelectedUnassignedIds(unassignedStudentsPool.map(s => s.id));
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto pb-32 font-sans">
      
      {/* Top Main Navigation Tabs */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs tracking-wider uppercase mb-1">
            <Users className="w-4 h-4 text-emerald-600" /> Prácticas de Conducción
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Gestión Académica de Instructores
          </h1>
        </div>

        {/* Professional View Switcher */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
          <button
            onClick={() => setActiveViewTab('INSTRUCTORS')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${
              activeViewTab === 'INSTRUCTORS'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" /> Gestión de Instructores
          </button>
          <button
            onClick={() => handleSwitchToProgressTab()}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${
              activeViewTab === 'PROGRESS_MATRIX'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Award className="w-4 h-4" /> Matriz de Avance de Alumnos
          </button>
        </div>
      </div>



      {/* VIEW TAB 1: INSTRUCTORS & ASSIGNMENT */}
      {activeViewTab === 'INSTRUCTORS' && (
        <div>
          {/* KPI Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-gray-400 block">Total Instructores</span>
                <span className="text-2xl font-black text-gray-900">{totalInstructors}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="p-3 bg-emerald-100/60 rounded-2xl text-emerald-700">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-gray-400 block">Instructores Activos</span>
                <span className="text-2xl font-black text-emerald-700">{activeInstructors}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-gray-400 block">Alumnos Asignados</span>
                <span className="text-2xl font-black text-blue-700">{assignedStudentsCount} / {totalStudents}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-gray-400 block">Alumnos Libres</span>
                <span className="text-2xl font-black text-amber-600">{unassignedStudentsCount}</span>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="mb-6 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, apellido o usuario de instructor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
            </div>

            <div className="flex gap-1.5 bg-gray-100 p-1 rounded-2xl">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  statusFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Todos ({instructors.length})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Activos ({activeInstructors})
              </button>
              <button
                onClick={() => setStatusFilter('INACTIVE')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  statusFilter === 'INACTIVE' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Inactivos ({inactiveInstructors})
              </button>
            </div>
          </div>

          {/* Instructors Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredInstructors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredInstructors.map(inst => {
                const instPendingCount = pendingTransfersList.filter(p => p.current_instructor_id === inst.id).length;

                return (
                  <div 
                    key={inst.id} 
                    className={`bg-white rounded-3xl p-5 shadow-sm border transition-all duration-300 relative flex flex-col justify-between ${
                      instPendingCount > 0
                        ? 'border-red-300 ring-2 ring-red-100/70 shadow-md'
                        : inst.activo ? 'border-gray-100 hover:border-emerald-300 hover:shadow-md' : 'border-gray-200 bg-gray-50/70 opacity-80'
                    }`}
                  >
                    <div>
                      {/* Header Card Info */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm relative ${
                            inst.activo ? 'bg-emerald-800 text-white' : 'bg-gray-300 text-gray-600'
                          }`}>
                            {inst.full_name.slice(0, 2).toUpperCase()}
                            {instPendingCount > 0 && (
                              <span 
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white animate-pulse"
                                title={`${instPendingCount} alumno(s) aprobados pendientes de transferir`}
                              >
                                {instPendingCount}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="text-base font-black text-gray-900 leading-snug">{inst.full_name}</h3>
                            <span className="text-[11px] font-bold text-gray-400">@{inst.username}</span>
                            {inst.role_name && (
                              <span className="ml-2 text-[10px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                                {inst.role_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {instPendingCount > 0 && (
                          <span 
                            className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-[10px] font-extrabold flex items-center gap-1 shrink-0 animate-pulse"
                            title={`${instPendingCount} alumno(s) aprobados necesitan transferencia`}
                          >
                            <span className="w-2 h-2 rounded-full bg-red-600" />
                            {instPendingCount} por transferir
                          </span>
                        )}
                      </div>

                      {/* Active/Inactive Toggle Button (No emojis!) */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                          <Shield className={`w-4 h-4 ${inst.activo ? 'text-emerald-600' : 'text-gray-400'}`} />
                          Estado en Horarios:
                        </span>
                        
                        <button
                          onClick={() => handleToggleActive(inst)}
                          className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-sm ${
                            inst.activo 
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                              : 'bg-red-500 text-white hover:bg-red-600'
                          }`}
                        >
                          {inst.activo ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" /> Activo
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5" /> Inactivo
                            </>
                          )}
                        </button>
                      </div>

                      {/* Assigned Vehicles & Licenses Info Box */}
                      <div className="mb-4 p-3 bg-amber-50/60 rounded-2xl border border-amber-100/80 space-y-2">
                        <div>
                          <span className="text-[10px] font-black uppercase text-amber-900 flex items-center gap-1.5 mb-1">
                            <Truck className="w-3.5 h-3.5 text-amber-700" /> Vehículo(s) a Cargo:
                          </span>
                          {inst.assigned_vehicles && inst.assigned_vehicles.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {inst.assigned_vehicles.map(v => (
                                <span key={v.id} className="px-2 py-0.5 text-[10px] font-black bg-amber-200/80 text-amber-900 rounded-md border border-amber-300">
                                  {v.placa} - {v.marca} {v.modelo}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400 font-semibold italic block">Sin vehículos asignados a su cargo</span>
                          )}
                        </div>

                        <div className="pt-1.5 border-t border-amber-200/50">
                          <span className="text-[10px] font-black uppercase text-amber-900 flex items-center gap-1.5 mb-1">
                            <Award className="w-3.5 h-3.5 text-amber-700" /> Licencia(s) Impartidas:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {(inst.licencias_habilitadas && inst.licencias_habilitadas.length > 0
                              ? inst.licencias_habilitadas
                              : ['C', 'D', 'E']
                            ).map(lic => (
                              <span key={lic} className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-900 rounded-md border border-emerald-200">
                                Lic. {lic}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Assigned Students Summary Badge */}
                      <div className="mb-4 flex items-center justify-between p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                        <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-emerald-700" /> Alumnos Asignados:
                        </span>
                        <span className="text-sm font-black bg-emerald-800 text-white px-3 py-1 rounded-xl shadow-sm">
                          {inst.assigned_students_count} Alumno(s)
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 mt-auto">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSwitchToProgressTab(inst)}
                          className={`flex-1 py-2.5 px-3 rounded-2xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 ${
                            instPendingCount > 0
                              ? 'bg-gradient-to-r from-red-700 via-amber-700 to-red-800 text-white ring-2 ring-red-300 shadow-red-700/20'
                              : 'bg-gradient-to-r from-emerald-900 to-teal-800 text-white hover:from-emerald-950 hover:to-teal-900'
                          }`}
                          title="Ver Matriz de Avance Académico"
                        >
                          <Award className="w-4 h-4 text-white" /> Avance Alumnos
                          {instPendingCount > 0 && (
                            <span className="w-2.5 h-2.5 rounded-full bg-red-400 ring-2 ring-white animate-ping ml-0.5" />
                          )}
                        </button>
                        <button
                          onClick={() => openConfigModal(inst)}
                          className="py-2.5 px-3 bg-amber-600 text-white rounded-2xl font-black text-xs hover:bg-amber-700 transition-all shadow-md flex items-center justify-center gap-1"
                          title="Configurar Vehículos y Licencias de Instructor"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => openAssignmentModal(inst)}
                        className="w-full py-2.5 px-3 bg-emerald-600 text-white rounded-2xl font-black text-xs hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                      >
                        <UserPlus className="w-4 h-4" /> Inscribir Alumnos
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-700">No se encontraron instructores</h3>
              <p className="text-xs text-gray-400 mt-1">Prueba cambiando los criterios de búsqueda o filtros.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW TAB 2: MATRIZ DE AVANCE DE ALUMNOS (DEDICATED FULL PAGE TAB) */}
      {activeViewTab === 'PROGRESS_MATRIX' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">
          
          {/* Header & Instructor Selector */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-gray-100">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">Panel Académico</span>
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Award className="w-6 h-6 text-emerald-600" /> Matriz de Rendimiento y Avance de Alumnos
              </h2>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-xs font-black text-gray-700 uppercase shrink-0">Instructor:</label>
              <select
                value={selectedInstructorProgress?.id || ''}
                onChange={e => {
                  const inst = instructors.find(i => i.id === Number(e.target.value));
                  if (inst) loadInstructorProgress(inst);
                }}
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs flex-1 md:w-64"
              >
                {instructors.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.full_name} ({inst.assigned_students_count} alumnos)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  if (!selectedInstructorProgress) return;
                  exportProgressMatrixToPDF(
                    selectedInstructorProgress.full_name,
                    getFilterLabelForPDF(),
                    filteredProgressStudents
                  );
                }}
                disabled={!selectedInstructorProgress || filteredProgressStudents.length === 0}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Download className="w-4 h-4" /> Descargar Reporte PDF
              </button>
            </div>
          </div>

          {/* Subtle Admin Notification Bar for Selected Instructor's Pending Transfers */}
          {(() => {
            const selectedInstPending = pendingTransfersList.filter(p => p.current_instructor_id === selectedInstructorProgress?.id);
            if (selectedInstPending.length === 0) return null;
            return (
              <div className="bg-red-50 border border-red-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-red-900 text-xs font-bold animate-fade-in shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
                  <span>
                    Este instructor tiene <strong>{selectedInstPending.length} alumno(s)</strong> que ya aprobaron su vehículo y requieren ser transferidos: {' '}
                    <span className="font-extrabold text-red-800">
                      {selectedInstPending.map(s => s.student_name).join(', ')}
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMainLicense('E')}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-black transition-all shrink-0 shadow-xs"
                >
                  Filtrar Licencia E
                </button>
              </div>
            );
          })()}

          {/* Hierarchical License Filters (ZERO Emojis) */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
            
            {/* Main License Level 1 */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-gray-700 uppercase px-2 flex items-center gap-1.5 shrink-0">
                <Filter className="w-4 h-4 text-emerald-700" /> TIPO DE LICENCIA:
              </span>

              <button
                type="button"
                onClick={() => setSelectedMainLicense('ALL')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  selectedMainLicense === 'ALL'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                Todas las Licencias
              </button>

              <button
                type="button"
                onClick={() => setSelectedMainLicense('C')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  selectedMainLicense === 'C'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                Licencia Tipo C
              </button>

              <button
                type="button"
                onClick={() => setSelectedMainLicense('D')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  selectedMainLicense === 'D'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                Licencia Tipo D
              </button>

              <button
                type="button"
                onClick={() => setSelectedMainLicense('E')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  selectedMainLicense === 'E'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                Licencia Tipo E
              </button>
            </div>

            {/* Level 2: Sub-filters for Licencia D */}
            {selectedMainLicense === 'D' && (
              <div className="pt-2 border-t border-gray-200 flex flex-wrap items-center gap-2 pl-4">
                <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5" /> Subtipo D:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDSubType('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedDSubType === 'ALL'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  Todas Tipo D
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDSubType('D_REGULAR')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedDSubType === 'D_REGULAR'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  D Regular
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDSubType('D_CONVALIDADA')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedDSubType === 'D_CONVALIDADA'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  D Convalidada
                </button>
              </div>
            )}

            {/* Level 2: Sub-filters for Licencia E */}
            {selectedMainLicense === 'E' && (
              <div className="pt-2 border-t border-gray-200 space-y-2 pl-4">
                
                {/* E Subtypes */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                    <ChevronRight className="w-3.5 h-3.5" /> Subtipo E:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedESubType('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedESubType === 'ALL'
                        ? 'bg-teal-800 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    Todas Tipo E
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedESubType('E_REGULAR')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedESubType === 'E_REGULAR'
                        ? 'bg-teal-800 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    E Regular
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedESubType('E_CONVALIDADA')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedESubType === 'E_CONVALIDADA'
                        ? 'bg-teal-800 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    E Convalidada
                  </button>
                </div>

                {/* E Vehicle Rotation */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" /> Rotación por Vehículo:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedEVehicle('ALL')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all ${
                      selectedEVehicle === 'ALL'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    Promedio General
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEVehicle('E_NPR')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all ${
                      selectedEVehicle === 'E_NPR'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    1. Camión NPR
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEVehicle('E_SINOTRUC_BLANCO')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all ${
                      selectedEVehicle === 'E_SINOTRUC_BLANCO'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    2. Sinotruc Blanco
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEVehicle('E_SINOTRUC_GRIS')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all ${
                      selectedEVehicle === 'E_SINOTRUC_GRIS'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    3. Sinotruc Gris
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEVehicle('E_TRAILER')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all ${
                      selectedEVehicle === 'E_TRAILER'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    4. Tráiler / Bus
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Matrix Table */}
          {loadingProgress ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredProgressStudents.length > 0 ? (
            <div className="overflow-x-auto border-2 border-gray-900 rounded-2xl shadow-sm">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-900 text-gray-900 font-black uppercase text-[11px]">
                    <th className="p-3 border-r border-gray-900 min-w-[180px]">Estudiante</th>
                    <th className="p-3 border-r border-gray-300 text-center" colSpan={2}>Fase 1</th>
                    <th className="p-3 border-r border-gray-300 text-center" colSpan={2}>Fase 2</th>
                    <th className="p-3 border-r border-gray-300 text-center" colSpan={2}>Fase 3</th>
                    <th className="p-3 border-r border-gray-300 text-center" colSpan={2}>Fase 4</th>
                    <th className="p-3 border-r border-gray-900 text-center" colSpan={2}>Fase 5</th>
                    <th className="p-3 border-r border-gray-900 text-center min-w-[90px]">Promedio</th>
                    <th className="p-3 text-center min-w-[150px]">Promoción / Transferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-semibold text-gray-800">
                  {filteredProgressStudents.map((st: any) => {
                    const isTipoE = st.is_tipo_e || st.tipo_licencia?.startsWith('E_');
                    const fasesToRender = st.fasesToRender || [];
                    const promedioToRender = st.promedioToRender || 0;
                    const isCycleApproved = fasesToRender.length === 5 && fasesToRender.every((f: any) => f.is_passed);
                    const currentInstId = st.current_instructor_id || st.instructor_id;
                    const isTransferredStatus = isCycleApproved && (currentInstId && selectedInstructorProgress && Number(currentInstId) !== Number(selectedInstructorProgress.id));

                    return (
                      <tr key={st.student_id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 border-r border-gray-900 font-black text-gray-900">
                          <div className="flex flex-col gap-1">
                            <span>{st.student_name}</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-extrabold text-gray-500">C.I: {st.cedula}</span>
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-100 text-emerald-900 rounded-md border border-emerald-300">
                                Lic. {st.tipo_licencia}
                              </span>
                              {isTipoE && st.targetVehCode && (
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-amber-100 text-amber-900 rounded-md border border-amber-300">
                                  {st.targetVehCode.replace('_', ' ')}
                                </span>
                              )}
                              {isTipoE && isCycleApproved && !isTransferredStatus && (
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-red-100 text-red-700 rounded-md border border-red-300 animate-pulse flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> Transferir
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        {fasesToRender.map((fase: any, fIdx: number) => (
                          <React.Fragment key={fIdx}>
                            <td className="p-2 border-r border-gray-200 text-center">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase inline-block whitespace-nowrap shadow-xs ${
                                fase.is_passed 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                  : 'bg-red-100 text-red-800 border border-red-300'
                              }`}>
                                {fase.estado_texto}
                              </span>
                            </td>
                            <td className={`p-2 border-r ${fIdx === 4 ? 'border-gray-900' : 'border-gray-300'} text-center`}>
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-black inline-block min-w-[45px] text-white shadow-xs ${
                                fase.is_passed ? 'bg-emerald-600' : 'bg-red-500'
                              }`}>
                                {fase.nota.toFixed(2)}
                              </span>
                            </td>
                          </React.Fragment>
                        ))}
                        <td className="p-3 border-r border-gray-900 text-center font-black text-xs text-gray-900 bg-gray-50">
                          <span className="px-3 py-1 bg-gray-200 text-gray-900 rounded-xl">
                            {promedioToRender.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-3 text-center bg-gray-50/80">
                          {isTipoE ? (
                            isTransferredStatus ? (
                              <span className="px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl font-black text-xs flex items-center justify-center gap-1 shadow-xs">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Transferido
                              </span>
                            ) : st.can_current_inst_teach_next ? (
                              <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl font-black text-xs flex items-center justify-center gap-1 shadow-xs">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Continúa con Mismo Instructor
                              </span>
                            ) : isCycleApproved ? (
                              <button
                                onClick={() => openTransferModal(st)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                                title="Estudiante aprobó este ciclo. Haz clic para transferir al Instructor del siguiente vehículo"
                              >
                                <ArrowRight className="w-3.5 h-3.5" /> Transferir
                              </button>
                            ) : (
                              <button
                                onClick={() => openTransferModal(st)}
                                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-500 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                                title="🔒 Requisito Pendiente: El estudiante debe aprobar las 5 fases en este vehículo con promedio >= 4.0 para poder transferirse."
                              >
                                <Lock className="w-3.5 h-3.5 text-gray-400" /> Bloqueado
                              </button>
                            )
                          ) : (
                            isCycleApproved ? (
                              <span className="px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl font-black text-xs flex items-center justify-center gap-1 shadow-xs">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Ciclo Completo
                              </span>
                            ) : (
                              <span className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-xl font-bold text-xs flex items-center justify-center gap-1 border border-gray-200">
                                <Clock className="w-3.5 h-3.5 text-gray-400" /> En Cursado
                              </span>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              No se encontraron estudiantes para la licencia o filtro seleccionado.
            </div>
          )}

        </div>
      )}

      {/* Modal: Student Enrollment & Management */}
      {isModalOpen && selectedInstructor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-800 text-white flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider">Gestión de Alumnos del Instructor</span>
                <h2 className="text-lg sm:text-xl font-black flex items-center gap-2 mt-0.5">
                  <Users className="w-5 h-5 text-emerald-400" /> {selectedInstructor.full_name}
                </h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 hover:bg-white/20 rounded-xl text-white font-bold transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shrink-0">
              <div className="flex gap-2 bg-gray-200/80 p-1 rounded-2xl">
                <button
                  onClick={() => setModalTab('ASSIGNED')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    modalTab === 'ASSIGNED' 
                      ? 'bg-emerald-800 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <UserCheck className="w-4 h-4" /> Alumnos Asignados ({assignedToModalInstructor.length})
                </button>
                <button
                  onClick={() => setModalTab('UNASSIGNED')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    modalTab === 'UNASSIGNED' 
                      ? 'bg-emerald-800 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <UserPlus className="w-4 h-4" /> Inscribir Libres ({unassignedStudentsPool.length})
                </button>
              </div>

              {/* Search input inside modal */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar estudiante..."
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-48"
                />
              </div>
            </div>

            {/* Modal Content Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {modalTab === 'ASSIGNED' ? (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold text-gray-500">
                      Estudiantes matriculados asignados a {selectedInstructor.full_name}:
                    </p>
                    {assignedToModalInstructor.length > 0 && (
                      <button
                        onClick={() => handleUnassignStudents(assignedToModalInstructor.map(s => s.id))}
                        disabled={submitting}
                        className="text-[11px] font-black text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-xl transition-colors border border-red-200 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Desvincular Todos
                      </button>
                    )}
                  </div>

                  {assignedToModalInstructor.length > 0 ? (
                    <div className="space-y-2">
                      {assignedToModalInstructor.map(st => (
                        <div 
                          key={st.id} 
                          className="p-3 bg-white border border-gray-100 rounded-2xl flex items-center justify-between shadow-xs hover:border-emerald-200 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                              {st.nombres[0]}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-gray-900 block">{st.apellidos} {st.nombres}</span>
                              <span className="text-[10px] text-gray-400 font-semibold">C.I: {st.cedula} • Licencia: {st.tipo_licencia}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleUnassignStudents([st.id])}
                            disabled={submitting}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            title="Desvincular estudiante"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      No hay estudiantes asignados a este instructor.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-gray-500">
                        Estudiantes libres disponibles:
                      </p>
                      <button
                        type="button"
                        onClick={() => setFilterByInstructorLicense(!filterByInstructorLicense)}
                        className={`text-[10px] font-black px-2 py-0.5 rounded-lg border transition-all ${
                          filterByInstructorLicense 
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                            : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                        }`}
                        title="Alternar entre filtrar solo por las licencias que imparte el instructor o mostrar todos los estudiantes libres"
                      >
                        {filterByInstructorLicense ? '✓ Filtrando por Licencia del Instructor' : 'Mostrar Todas las Licencias'}
                      </button>
                    </div>

                    {unassignedStudentsPool.length > 0 && (
                      <button
                        onClick={handleSelectAllUnassigned}
                        className="text-[11px] font-black text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl transition-colors shrink-0"
                      >
                        {selectedUnassignedIds.length === unassignedStudentsPool.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                      </button>
                    )}
                  </div>

                  {unassignedStudentsPool.length > 0 ? (
                    <div className="space-y-2">
                      {unassignedStudentsPool.map(st => {
                        const isSelected = selectedUnassignedIds.includes(st.id);
                        return (
                          <div 
                            key={st.id} 
                            onClick={() => toggleSelectUnassigned(st.id)}
                            className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected 
                                ? 'bg-emerald-50/80 border-emerald-400 shadow-xs' 
                                : 'bg-white border-gray-100 hover:border-emerald-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={() => {}} 
                                className="w-4 h-4 text-emerald-600 rounded-md border-gray-300 focus:ring-emerald-500"
                              />
                              <div>
                                <span className="font-bold text-xs text-gray-900 block">{st.apellidos} {st.nombres}</span>
                                <span className="text-[10px] text-gray-400 font-semibold">C.I: {st.cedula} • Licencia: {st.tipo_licencia}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                              Libre
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      No hay estudiantes libres para asignar.
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
              <span className="text-xs text-gray-500 font-bold">
                {modalTab === 'ASSIGNED' ? `${assignedToModalInstructor.length} Asignado(s)` : `${selectedUnassignedIds.length} Seleccionado(s)`}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all"
                >
                  Cerrar
                </button>

                {modalTab === 'UNASSIGNED' && (
                  <button
                    type="button"
                    disabled={submitting || selectedUnassignedIds.length === 0}
                    onClick={handleAssignStudents}
                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-extrabold shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    {submitting ? 'Asignando...' : `Inscribir ${selectedUnassignedIds.length} Estudiante(s)`}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Configurar Vehículos y Licencias del Instructor */}
      {isConfigModalOpen && configInstructor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-gradient-to-r from-amber-700 to-amber-900 text-white flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-200 tracking-wider">Configuración de Instructor</span>
                <h2 className="text-lg sm:text-xl font-black flex items-center gap-2 mt-0.5">
                  <Settings className="w-5 h-5 text-amber-300" /> {configInstructor.full_name}
                </h2>
              </div>
              <button 
                onClick={() => setIsConfigModalOpen(false)} 
                className="p-1.5 hover:bg-white/20 rounded-xl text-white font-bold transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* Vehicles Selection */}
              <div>
                <label className="block text-xs font-black uppercase text-gray-700 mb-1 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-amber-600" /> Vehículos a Cargo del Instructor:
                </label>
                <p className="text-[11px] text-gray-500 font-medium mb-3">
                  Puedes seleccionar un solo vehículo (ej. NPR) o múltiples vehículos si imparte distintas clases (ej. NPR y Sinotruc).
                </p>

                {vehicles.length > 0 ? (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {vehicles.map(v => {
                      const isChecked = configSelectedVehicles.includes(v.id);
                      return (
                        <div
                          key={v.id}
                          onClick={() => {
                            setConfigSelectedVehicles(prev =>
                              prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id]
                            );
                          }}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                            isChecked
                              ? 'bg-amber-50 border-amber-400 shadow-xs'
                              : 'bg-white border-gray-200 hover:border-amber-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                            />
                            <div>
                              <span className="font-bold text-xs text-gray-900 block">{v.placa} • {v.marca} {v.modelo} ({v.año})</span>
                              <span className="text-[10px] text-gray-400 font-semibold">{v.clase || 'Vehículo'} • Combustible: {v.tipo_combustible}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md">
                            {isChecked ? 'Asignado' : 'Disponible'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No hay vehículos registrados en la flota.</p>
                )}
              </div>

              {/* Licenses Selection */}
              <div className="pt-3 border-t border-gray-100">
                <label className="block text-xs font-black uppercase text-gray-700 mb-1 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" /> Tipos de Licencias Impartidas:
                </label>
                <p className="text-[11px] text-gray-500 font-medium mb-3">
                  Solo los alumnos con estas licencias aparecerán al inscribir estudiantes a este instructor.
                </p>

                <div className="space-y-2">
                  {[
                    { code: 'C', label: 'Licencia Tipo C' },
                    { code: 'D_REGULAR', label: 'Licencia Tipo D (Regular)' },
                    { code: 'D_CONVALIDADA', label: 'Licencia Tipo D (Convalidada)' },
                    { code: 'E_REGULAR', label: 'Licencia Tipo E (Regular)' },
                    { code: 'E_CONVALIDADA', label: 'Licencia Tipo E (Convalidada)' },
                  ].map(lic => {
                    const isChecked = configSelectedLicenses.includes(lic.code);
                    return (
                      <div
                        key={lic.code}
                        onClick={() => {
                          setConfigSelectedLicenses(prev =>
                            prev.includes(lic.code) ? prev.filter(x => x !== lic.code) : [...prev, lic.code]
                          );
                        }}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                            : 'bg-white border-gray-200 hover:border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                          />
                          <span className="font-bold text-xs text-gray-900">{lic.label}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-md">
                          {isChecked ? 'Habilitada' : 'Inactiva'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingConfig}
                onClick={handleSaveConfig}
                className="px-5 py-2 bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-md hover:bg-amber-800 transition-all flex items-center gap-1.5"
              >
                <Settings className="w-4 h-4" />
                {savingConfig ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Transferir Estudiante de Vehículo e Instructor */}
      {isTransferModalOpen && transferStudentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-800 text-white flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider">Promoción y Transferencia de Vehículo</span>
                <h2 className="text-lg sm:text-xl font-black flex items-center gap-2 mt-0.5">
                  <ArrowRight className="w-5 h-5 text-emerald-400" /> Transferir Estudiante
                </h2>
              </div>
              <button 
                onClick={() => setIsTransferModalOpen(false)} 
                className="p-1.5 hover:bg-white/20 rounded-xl text-white font-bold transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Student Summary */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-[10px] font-black uppercase text-emerald-800 block">Estudiante a Promover:</span>
                <h3 className="text-base font-black text-gray-900">{transferStudentData.student_name}</h3>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-600 mt-1">
                  <span>C.I: {transferStudentData.cedula}</span>
                  <span>•</span>
                  <span>Licencia: {transferStudentData.tipo_licencia}</span>
                </div>
                <div className="mt-2 text-xs font-black text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Ciclo Aprobado: {transferStudentData.current_veh.replace('_', ' ')} (Promedio: {transferStudentData.promedio.toFixed(2)}/5.0)
                </div>
              </div>

              {/* Select Target Vehicle */}
              <div>
                <label className="block text-xs font-black uppercase text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600" /> Siguiente Vehículo a Asignar:
                </label>
                <select
                  value={transferTargetVeh}
                  onChange={e => {
                    const newVeh = e.target.value;
                    setTransferTargetVeh(newVeh);
                    const qualified = getTargetInstructorsForVeh(newVeh, transferStudentData.tipo_licencia);
                    if (qualified.length > 0) {
                      setTransferTargetInstructorId(qualified[0].id.toString());
                    }
                  }}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {getRemainingVehiclesOptions(transferStudentData.current_veh).map(veh => (
                    <option key={veh.code} value={veh.code}>
                      {veh.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Target Instructor */}
              <div>
                <label className="block text-xs font-black uppercase text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-emerald-600" /> Seleccionar Instructor de Destino (Solo Habilitados):
                </label>
                <select
                  value={transferTargetInstructorId}
                  onChange={e => setTransferTargetInstructorId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {getTargetInstructorsForVeh(transferTargetVeh, transferStudentData.tipo_licencia).map(inst => {
                    const hasTargetVeh = inst.assigned_vehicles?.some(v => {
                      const vText = `${v.tipo || ''} ${v.modelo || ''} ${v.observacion || ''} ${v.placa || ''}`.toUpperCase();
                      if (transferTargetVeh === 'NPR') return vText.includes('NPR') || vText.includes('CAMION');
                      if (transferTargetVeh === 'SINOTRUC_BLANCO') return vText.includes('SINOTRUC') || vText.includes('BLANCO') || vText.includes('UÑETA') || vText.includes('FTR');
                      if (transferTargetVeh === 'SINOTRUC_GRIS') return vText.includes('SINOTRUC') || vText.includes('GRIS') || vText.includes('PALANCA') || vText.includes('D-MAX');
                      if (transferTargetVeh === 'TRAILER') return vText.includes('TRAILER') || vText.includes('BUS');
                      return true;
                    });

                    return (
                      <option key={inst.id} value={inst.id}>
                        {inst.full_name} {hasTargetVeh ? '⭐ (A cargo de este vehículo)' : ''} ({inst.assigned_students_count} alumnos)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submittingTransfer || !transferTargetInstructorId}
                onClick={handleTransferStudent}
                className="px-5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md hover:bg-emerald-800 transition-all flex items-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                {submittingTransfer ? 'Transferido...' : 'Confirmar Transferencia'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InstructorManagement;

