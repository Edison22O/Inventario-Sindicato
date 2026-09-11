import React, { useState, useEffect } from 'react';
import api from '@/shared/services/api';
import { 
  Calendar as CalendarIcon, Clock, Truck, User, Plus, 
  AlertTriangle, Shield, Trash2
} from 'lucide-react';

import type { InstructorSchedule, Vehicle } from '@/shared/types';
import { useWebSocket } from '@/shared/context/WebSocketContext';


interface UserItem {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  role?: string;
}

interface StudentItem {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  tipo_licencia: string;
}

import { formatDateToLocalYYYYMMDD } from '@/shared/utils/dateUtils';

export const AdminScheduleCalendar: React.FC = () => {
  const [schedules, setSchedules] = useState<InstructorSchedule[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [instructors, setInstructors] = useState<UserItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(formatDateToLocalYYYYMMDD(new Date()));


  // Modal State for new schedule
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const fetchSchedulesAndData = async () => {
    setLoading(true);
    try {
      const [schedRes, vehRes, usersRes, studentsRes] = await Promise.all([
        api.get(`/instructor-schedules/?fecha=${selectedDate}`),
        api.get('/vehicles/'),
        api.get('/users/'),
        api.get('/students/')
      ]);
      setSchedules(schedRes.data || []);
      setVehicles(vehRes.data || []);
      setInstructors(usersRes.data || []);
      setStudents(studentsRes.data || []);

      const availInstructors: UserItem[] = usersRes.data || [];
      const availStudents: StudentItem[] = studentsRes.data || [];
      const availVehs: Vehicle[] = vehRes.data || [];

      if (availInstructors.length > 0) {
        setFormData(prev => ({
          ...prev,
          instructor: prev.instructor || (availInstructors[0].id.toString())
        }));
      }

      if (availStudents.length > 0) {
        setFormData(prev => ({
          ...prev,
          student: prev.student || (availStudents[0].id.toString())
        }));
      }

      if (availVehs.length > 0) {
        setFormData(prev => ({
          ...prev,
          vehicle: prev.vehicle || availVehs[0].id.toString()
        }));
      }

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
    setSubmitting(true);
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
      setIsModalOpen(false);
      fetchSchedulesAndData();
    } catch (e) {
      console.error('Error al guardar horario:', e);
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
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Instructor</label>
                <select
                  value={formData.instructor}
                  onChange={e => setFormData({ ...formData, instructor: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                >
                  {instructors.map(u => (
                    <option key={u.id} value={u.id}>{u.first_name || u.username} {u.last_name || ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Estudiante</label>
                <select
                  value={formData.student}
                  onChange={e => setFormData({ ...formData, student: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                >
                  {students.map(st => (
                    <option key={st.id} value={st.id}>{st.apellidos} {st.nombres} ({st.cedula})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Vehículo Asignado</label>
                <select
                  value={formData.vehicle}
                  onChange={e => setFormData({ ...formData, vehicle: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.placa} - {v.marca} {v.modelo}</option>
                  ))}
                </select>
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
