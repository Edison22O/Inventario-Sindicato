import React, { useState, useEffect, useMemo } from 'react';
import api from '@/shared/services/api';
import { toast } from 'react-hot-toast';
import { 
  Calendar as CalendarIcon, Clock, Truck, User, Plus, 
  AlertTriangle, Shield, Trash2, AlertCircle
} from 'lucide-react';

import type { InstructorSchedule, Vehicle } from '@/shared/types';
import { useWebSocket } from '@/shared/context/WebSocketContext';

interface UserItem {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  username: string;
  role?: string;
  activo?: boolean;
  assigned_vehicles?: Vehicle[];
  assigned_vehicle_ids?: number[];
  licencias_habilitadas?: string[];
}

interface StudentItem {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  tipo_licencia: string;
  instructor?: number | null;
}

import { formatDateToLocalYYYYMMDD } from '@/shared/utils/dateUtils';
import { Link } from 'react-router-dom';

export const AdminScheduleCalendar: React.FC = () => {
  const [schedules, setSchedules] = useState<InstructorSchedule[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [instructors, setInstructors] = useState<UserItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(formatDateToLocalYYYYMMDD(new Date()));

  // Modal State for new schedule
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    instructor: '',
    student: '',
    vehicle: '',
    fecha: selectedDate,
    hora_inicio: '08:00',
    hora_fin: '09:30',
    tipo_licencia: 'C',
    circuito_ruta: 'Circuito 1'
  });
  const [submitting, setSubmitting] = useState(false);

  const currentInstructorObj = useMemo(() => {
    return instructors.find(i => i.id.toString() === formData.instructor);
  }, [instructors, formData.instructor]);

  const instructorVehicles = useMemo(() => {
    if (currentInstructorObj?.assigned_vehicles && currentInstructorObj.assigned_vehicles.length > 0) {
      return currentInstructorObj.assigned_vehicles;
    }
    return vehicles;
  }, [currentInstructorObj, vehicles]);

  const fetchSchedulesAndData = async () => {
    setLoading(true);
    try {
      const [schedRes, vehRes, instRes, studentsRes] = await Promise.all([
        api.get(`/instructor-schedules/?fecha=${selectedDate}`),
        api.get('/vehicles/'),
        api.get('/instructors/?activo=true'),
        api.get('/students/')
      ]);
      setSchedules(schedRes.data || []);
      setVehicles(vehRes.data || []);
      setInstructors(instRes.data || []);
      setStudents(studentsRes.data || []);

      const availInstructors: UserItem[] = instRes.data || [];
      const availStudents: StudentItem[] = studentsRes.data || [];
      const availVehs: Vehicle[] = vehRes.data || [];

      let selectedInstId = formData.instructor;
      if (availInstructors.length > 0) {
        if (!selectedInstId || !availInstructors.some(i => i.id.toString() === selectedInstId)) {
          selectedInstId = availInstructors[0].id.toString();
        }
      }

      const selInst = availInstructors.find(i => i.id.toString() === selectedInstId);
      const assignedStuds = availStudents.filter(s => s.instructor === parseInt(selectedInstId));
      const availInstVehs = (selInst?.assigned_vehicles && selInst.assigned_vehicles.length > 0)
        ? selInst.assigned_vehicles
        : availVehs;

      setFormData(prev => ({
        ...prev,
        instructor: selectedInstId,
        student: assignedStuds.length > 0 ? assignedStuds[0].id.toString() : '',
        vehicle: (availInstVehs.length > 0 ? availInstVehs[0].id.toString() : ''),
        tipo_licencia: assignedStuds.length > 0 ? assignedStuds[0].tipo_licencia : prev.tipo_licencia
      }));

    } catch (e) {
      console.error('Error al cargar calendario de horarios:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulesAndData();
  }, [selectedDate]);

  useWebSocket(fetchSchedulesAndData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    if (formData.hora_inicio >= formData.hora_fin) {
      const msg = 'La hora de inicio debe ser anterior a la hora de fin.';
      setErrorMsg(msg);
      toast.error(msg);
      setSubmitting(false);
      return;
    }

    // Local overlap validation
    const conflictInst = schedules.find(s => {
      if (s.fecha !== formData.fecha) return false;
      const sStart = s.hora_inicio.slice(0, 5);
      const sEnd = s.hora_fin.slice(0, 5);
      const overlaps = formData.hora_inicio < sEnd && formData.hora_fin > sStart;
      return overlaps && s.instructor === parseInt(formData.instructor);
    });

    if (conflictInst) {
      const msg = `⚠️ Choque de horario: El instructor ya tiene una clase asignada de ${conflictInst.hora_inicio.slice(0, 5)} a ${conflictInst.hora_fin.slice(0, 5)} con el estudiante ${conflictInst.student_name}.`;
      setErrorMsg(msg);
      toast.error(msg);
      setSubmitting(false);
      return;
    }

    const conflictStud = schedules.find(s => {
      if (s.fecha !== formData.fecha) return false;
      const sStart = s.hora_inicio.slice(0, 5);
      const sEnd = s.hora_fin.slice(0, 5);
      const overlaps = formData.hora_inicio < sEnd && formData.hora_fin > sStart;
      return overlaps && s.student === parseInt(formData.student);
    });

    if (conflictStud) {
      const msg = `⚠️ Choque de horario: El estudiante ${conflictStud.student_name} ya tiene una clase asignada de ${conflictStud.hora_inicio.slice(0, 5)} a ${conflictStud.hora_fin.slice(0, 5)}.`;
      setErrorMsg(msg);
      toast.error(msg);
      setSubmitting(false);
      return;
    }

    const conflictVeh = schedules.find(s => {
      if (s.fecha !== formData.fecha) return false;
      const sStart = s.hora_inicio.slice(0, 5);
      const sEnd = s.hora_fin.slice(0, 5);
      const overlaps = formData.hora_inicio < sEnd && formData.hora_fin > sStart;
      return overlaps && s.vehicle === parseInt(formData.vehicle);
    });

    if (conflictVeh) {
      const msg = `⚠️ Choque de horario: El vehículo asignado (${conflictVeh.vehicle_placa}) ya se encuentra ocupado de ${conflictVeh.hora_inicio.slice(0, 5)} a ${conflictVeh.hora_fin.slice(0, 5)}.`;
      setErrorMsg(msg);
      toast.error(msg);
      setSubmitting(false);
      return;
    }

    try {
      await api.post('/instructor-schedules/', {
        instructor: parseInt(formData.instructor),
        student: parseInt(formData.student),
        vehicle: parseInt(formData.vehicle),
        fecha: formData.fecha,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
        tipo_licencia: formData.tipo_licencia,
        circuito_ruta: formData.circuito_ruta
      });
      toast.success('Horario programado exitosamente');
      setIsModalOpen(false);
      fetchSchedulesAndData();
    } catch (e: any) {
      console.error('Error al guardar horario:', e);
      const backendErr = e.response?.data?.error || e.response?.data?.detail || 'Error al guardar el horario';
      setErrorMsg(backendErr);
      toast.error(backendErr);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Deseas eliminar este bloque de horario?')) {
      try {
        await api.delete(`/instructor-schedules/${id}/`);
        fetchSchedulesAndData();
      } catch (e) {
        console.error('Error al eliminar horario:', e);
      }
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto pb-32 font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs tracking-wider uppercase mb-1">
            <CalendarIcon className="w-4 h-4" /> Gestión Administrativa
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Asignación de Horarios de Prácticas
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Asignación de estudiantes a instructores (día, hora y vehículo). Se refleja automáticamente en el Horario del Instructor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 focus:outline-none"
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-2xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" /> Asignar Horario
          </button>
        </div>
      </div>

      {/* Vehicle Progression Rule Card for License Type E */}
      <div className="mb-6 bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 p-4 rounded-3xl border border-amber-200/80">
        <h3 className="text-xs font-black text-amber-900 uppercase flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Secuencia Obligatoria de Rotación Vehicular (Licencia Tipo E)
        </h3>
        <p className="text-[11px] text-amber-800 font-medium mb-3">
          Los estudiantes de Licencia E deben aprobar las fases en cada vehículo secuencialmente antes de ser promocionados:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white p-2.5 rounded-2xl border border-amber-200 text-center">
            <span className="text-[9px] font-black text-gray-400 uppercase block">Paso 1</span>
            <span className="text-xs font-black text-gray-800">Camión NPR</span>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border border-amber-200 text-center">
            <span className="text-[9px] font-black text-gray-400 uppercase block">Paso 2</span>
            <span className="text-xs font-black text-gray-800">Sinotruc Blanco (Uñeta)</span>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border border-amber-200 text-center">
            <span className="text-[9px] font-black text-gray-400 uppercase block">Paso 3</span>
            <span className="text-xs font-black text-gray-800">Sinotruc Gris (Palanca)</span>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border border-amber-200 text-center">
            <span className="text-[9px] font-black text-gray-400 uppercase block">Paso 4</span>
            <span className="text-xs font-black text-gray-800">Tráiler / Bus</span>
          </div>
        </div>
      </div>

      {/* Schedules List */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase text-gray-700 tracking-wider">
            Bloques Programados para el {selectedDate} ({schedules.length}):
          </h2>

          {schedules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedules.map(sch => (
                <div key={sch.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-emerald-200 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">
                      <Clock className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-xs font-black text-emerald-800">
                        {sch.hora_inicio.slice(0,5)} - {sch.hora_fin.slice(0,5)}
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                      Lic. {sch.tipo_licencia}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                      <User className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Alumno: {sch.student_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                      <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Instructor: {sch.instructor_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                      <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Vehículo: {sch.vehicle_placa} ({sch.vehicle_modelo || 'Asignado'})</span>
                    </div>
                    {sch.circuito_ruta && (
                      <p className="text-[11px] font-semibold text-gray-400">Ruta: {sch.circuito_ruta}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => handleDelete(sch.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Eliminar Horario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 text-center">
              <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-500">No hay horarios programados para esta fecha.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Nueva Asignación de Horario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex justify-between items-center">
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <Plus className="w-5 h-5" /> Programar Bloque de Práctica
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-800 flex items-start gap-2 shadow-xs">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="leading-snug">{errorMsg}</div>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={formData.fecha}
                  onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    required
                    value={formData.hora_inicio}
                    onChange={e => setFormData({ ...formData, hora_inicio: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Hora Fin</label>
                  <input
                    type="time"
                    required
                    value={formData.hora_fin}
                    onChange={e => setFormData({ ...formData, hora_fin: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Instructor (Solo Activos)</label>
                <select
                  value={formData.instructor}
                  onChange={e => {
                    const instId = e.target.value;
                    const instObj = instructors.find(i => i.id.toString() === instId);
                    const assignedStuds = students.filter(st => st.instructor === parseInt(instId));
                    const instVehs = (instObj?.assigned_vehicles && instObj.assigned_vehicles.length > 0)
                      ? instObj.assigned_vehicles
                      : vehicles;
                    
                    const firstStud = assignedStuds.length > 0 ? assignedStuds[0] : null;

                    setFormData({
                      ...formData,
                      instructor: instId,
                      student: firstStud ? firstStud.id.toString() : '',
                      vehicle: instVehs.length > 0 ? instVehs[0].id.toString() : '',
                      tipo_licencia: firstStud ? firstStud.tipo_licencia : formData.tipo_licencia
                    });
                  }}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {instructors.length > 0 ? (
                    instructors.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || `${u.first_name || u.username} ${u.last_name || ''}`}
                      </option>
                    ))
                  ) : (
                    <option value="">No hay instructores activos</option>
                  )}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase">Estudiante Asignado</label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {students.filter(st => st.instructor === parseInt(formData.instructor)).length} asignados
                  </span>
                </div>

                {students.filter(st => st.instructor === parseInt(formData.instructor)).length > 0 ? (
                  <select
                    value={formData.student}
                    onChange={e => {
                      const stId = e.target.value;
                      const stObj = students.find(s => s.id.toString() === stId);
                      setFormData({ 
                        ...formData, 
                        student: stId,
                        tipo_licencia: stObj ? stObj.tipo_licencia : formData.tipo_licencia
                      });
                    }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {students
                      .filter(st => st.instructor === parseInt(formData.instructor))
                      .map(st => (
                        <option key={st.id} value={st.id}>
                          {st.apellidos} {st.nombres} ({st.cedula}) - Lic. {st.tipo_licencia}
                        </option>
                      ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] font-medium text-amber-800">
                    <p className="font-bold flex items-center gap-1 text-amber-900 mb-0.5">
                      ⚠️ Instructor sin alumnos asignados
                    </p>
                    Para programar horarios, primero inscribe alumnos a este instructor en el{' '}
                    <Link to="/instructors" className="font-black text-amber-900 underline hover:text-amber-950">
                      Panel de Instructores
                    </Link>.
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase">Vehículo Asignado a Instructor</label>
                  {currentInstructorObj?.assigned_vehicles && currentInstructorObj.assigned_vehicles.length > 0 && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      {currentInstructorObj.assigned_vehicles.length} a su cargo
                    </span>
                  )}
                </div>

                {instructorVehicles.length > 0 ? (
                  <select
                    value={formData.vehicle}
                    onChange={e => setFormData({ ...formData, vehicle: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {instructorVehicles.map((v: Vehicle) => (
                      <option key={v.id} value={v.id}>
                        {v.placa} - {v.marca} {v.modelo} ({v.clase || 'Vehículo'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] font-medium text-amber-800">
                    <p className="font-bold flex items-center gap-1 text-amber-900 mb-0.5">
                      ⚠️ Instructor sin vehículos a cargo
                    </p>
                    Asigna vehículos a este instructor en el{' '}
                    <Link to="/instructors" className="font-black text-amber-900 underline hover:text-amber-950">
                      Panel de Instructores
                    </Link>.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Licencia</label>
                  <select
                    value={formData.tipo_licencia}
                    onChange={e => setFormData({ ...formData, tipo_licencia: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                  >
                    <option value="C">Tipo C</option>
                    <option value="E">Tipo E (Regular)</option>
                    <option value="E-CONVALIDADA">Tipo E (Convalidada)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Circuito / Ruta</label>
                  <input
                    type="text"
                    value={formData.circuito_ruta}
                    onChange={e => setFormData({ ...formData, circuito_ruta: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-600">Cancelar</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md">
                  {submitting ? 'Guardando...' : 'Asignar Horario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScheduleCalendar;
