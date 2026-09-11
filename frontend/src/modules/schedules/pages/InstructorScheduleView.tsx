import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/shared/services/api';
import { authService } from '@/services/authService';
import { 
  Calendar as CalendarIcon, Clock, Truck, User, Award, 
  ChevronLeft, ChevronRight, Filter, Layers, LayoutGrid, List
} from 'lucide-react';
import type { InstructorSchedule } from '@/shared/types';

interface UserItem {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email?: string;
  role?: string;
}

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const InstructorScheduleView: React.FC = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<InstructorSchedule[]>([]);
  const [instructors, setInstructors] = useState<UserItem[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('');
  const [baseDate, setBaseDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);

  const currentUserId = authService.getUserId();
  const isAdmin = authService.isGlobalAdmin() || authService.isVehicleAdmin();

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, schedRes] = await Promise.all([
        api.get('/users/'),
        api.get('/instructor-schedules/')
      ]);

      const usersList: UserItem[] = usersRes.data || [];
      setInstructors(usersList);

      let activeInstId = selectedInstructorId;
      if (!activeInstId) {
        if (currentUserId && usersList.some(u => u.id === currentUserId)) {
          activeInstId = currentUserId.toString();
        } else if (usersList.length > 0) {
          activeInstId = usersList[0].id.toString();
        }
        setSelectedInstructorId(activeInstId);
      }

      setSchedules(schedRes.data || []);
    } catch (e) {
      console.error('Error cargando horario de instructores:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate Monday through Saturday of current week
  const weekDays = useMemo(() => {
    const current = new Date(baseDate);
    const dayOfWeek = current.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(current);
    monday.setDate(current.getDate() + distanceToMonday);

    const days = [];
    for (let i = 0; i < 6; i++) { // Monday to Saturday
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  }, [baseDate]);

  // Date range formatted string
  const weekRangeText = useMemo(() => {
    if (weekDays.length === 0) return '';
    const startStr = weekDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    const endStr = weekDays[weekDays.length - 1].toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    return `Del ${startStr} al ${endStr}`;
  }, [weekDays]);

  // Navigate week
  const changeWeek = (offsetWeeks: number) => {
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + (offsetWeeks * 7));
    setBaseDate(nextDate);
  };

  const resetToToday = () => {
    setBaseDate(new Date());
  };

  // Filtered schedules for selected instructor
  const instructorSchedules = useMemo(() => {
    if (!selectedInstructorId) return schedules;
    return schedules.filter(s => s.instructor === parseInt(selectedInstructorId));
  }, [schedules, selectedInstructorId]);

  const selectedInstructorObj = instructors.find(i => i.id.toString() === selectedInstructorId);

  // DYNAMIC TIME SLOTS: Automatically generated from actual assignment start/end times
  const dynamicTimeSlots = useMemo(() => {
    const slotMap = new Map<string, { start: string; end: string; label: string }>();

    // Add all unique start/end pairs from actual schedules
    instructorSchedules.forEach(s => {
      const startStr = s.hora_inicio.slice(0, 5);
      const endStr = s.hora_fin.slice(0, 5);
      const key = `${startStr}-${endStr}`;
      if (!slotMap.has(key)) {
        slotMap.set(key, {
          start: startStr,
          end: endStr,
          label: `${startStr} - ${endStr}`
        });
      }
    });

    // Default base slots if map is empty
    if (slotMap.size === 0) {
      const baseDefaults = [
        { start: '08:00', end: '09:30', label: '08:00 - 09:30' },
        { start: '09:30', end: '11:00', label: '09:30 - 11:00' },
        { start: '11:00', end: '12:30', label: '11:00 - 12:30' },
        { start: '14:00', end: '15:30', label: '14:00 - 15:30' },
        { start: '15:30', end: '17:00', label: '15:30 - 17:00' },
      ];
      baseDefaults.forEach(d => slotMap.set(`${d.start}-${d.end}`, d));
    }

    // Sort chronologically by start time
    return Array.from(slotMap.values()).sort((a, b) => a.start.localeCompare(b.start));
  }, [instructorSchedules]);

  // Helper to find schedule matching day and time slot
  const getScheduleForSlot = (dayDateStr: string, slotStart: string, slotEnd: string) => {
    return instructorSchedules.filter(s => {
      if (s.fecha !== dayDateStr) return false;
      const sStart = s.hora_inicio.slice(0, 5);
      const sEnd = s.hora_fin.slice(0, 5);
      return sStart === slotStart || (sStart >= slotStart && sStart < slotEnd);
    });
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto pb-32 font-sans">
      {/* Header Bar */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs tracking-wider uppercase mb-1">
            <CalendarIcon className="w-4 h-4" /> Módulo de Prácticas de Conducción
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Horario del Instructor
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Distribución semanal dinámica de clases, alumnos asignados y horarios de práctica.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 bg-emerald-50 p-1.5 rounded-2xl border border-emerald-200">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              viewMode === 'grid' 
                ? 'bg-emerald-800 text-white shadow-sm' 
                : 'text-emerald-900 hover:bg-emerald-100'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Grilla Semanal</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              viewMode === 'list' 
                ? 'bg-emerald-800 text-white shadow-sm' 
                : 'text-emerald-900 hover:bg-emerald-100'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Lista Cronológica</span>
          </button>
        </div>
      </div>

      {/* Top Control Banner (Emerald / Slate System Theme) */}
      <div className="mb-6 bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-900 text-white p-5 rounded-3xl shadow-md border border-emerald-800/60">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          
          {/* Week Info & Navigator */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
              <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider block">Período de Clases:</span>
              <span className="text-sm font-black text-white">{weekRangeText}</span>
            </div>

            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-2xl border border-white/15">
              <button
                type="button"
                onClick={() => changeWeek(-1)}
                className="p-2 hover:bg-white/20 text-white rounded-xl transition-all"
                title="Semana Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={resetToToday}
                className="px-3 py-1 text-xs font-black bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all shadow-xs"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => changeWeek(1)}
                className="p-2 hover:bg-white/20 text-white rounded-xl transition-all"
                title="Semana Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Instructor Dropdown Filter */}
          <div className="w-full lg:w-72">
            <label className="block text-[10px] font-black uppercase text-emerald-300 tracking-wider mb-1">
              Instructor Asignado:
            </label>
            <select
              value={selectedInstructorId}
              onChange={e => setSelectedInstructorId(e.target.value)}
              className="w-full bg-white text-gray-900 text-xs font-black py-2.5 px-3 rounded-2xl border border-emerald-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Todos los Instructores --</option>
              {instructors.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.first_name || inst.last_name ? `${inst.last_name} ${inst.first_name}`.trim() : inst.username}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Main View */}
      {loading ? (
        <div className="py-20 text-center text-emerald-800">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-black uppercase tracking-wider">Cargando horario asignado...</p>
        </div>
      ) : viewMode === 'grid' ? (
        
        /* DYNAMIC WEEKLY GRID TABLE (EMERALD SYSTEM PALETTE) */
        <div className="bg-emerald-50/40 p-2 sm:p-4 rounded-3xl border border-emerald-200/80 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[800px] border-separate border-spacing-2">
            <thead>
              <tr>
                {/* Time Clock Header Box */}
                <th className="w-32 p-3.5 bg-emerald-900 text-white rounded-2xl text-center shadow-sm">
                  <Clock className="w-5 h-5 mx-auto stroke-[2.5] text-emerald-400" />
                  <span className="text-[10px] font-black uppercase block tracking-wider mt-1 text-emerald-300">Horas</span>
                </th>

                {/* Day Header Columns */}
                {weekDays.map((dayDate, idx) => {
                  const dayName = DAY_NAMES[idx];
                  const dayNum = dayDate.getDate();
                  const monthName = dayDate.toLocaleDateString('es-ES', { month: 'short' });
                  const isToday = dayDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

                  return (
                    <th 
                      key={idx} 
                      className={`p-3 rounded-2xl text-center transition-all ${
                        isToday 
                          ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500' 
                          : 'bg-emerald-800 text-white'
                      }`}
                    >
                      <span className="block text-sm font-black tracking-tight">{dayName}</span>
                      <span className="block text-[10px] font-bold text-emerald-200 uppercase">{dayNum} {monthName}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {dynamicTimeSlots.map((slot, slotIdx) => (
                <tr key={slotIdx}>
                  {/* Dynamic Time Slot Column */}
                  <td className="p-3 bg-emerald-100 text-emerald-950 text-xs font-black text-center rounded-2xl shadow-xs border border-emerald-200/80 whitespace-nowrap">
                    {slot.label}
                  </td>

                  {/* Day Cells */}
                  {weekDays.map((dayDate, dayIdx) => {
                    const dayDateStr = dayDate.toISOString().split('T')[0];
                    const matchedSchedules = getScheduleForSlot(dayDateStr, slot.start, slot.end);
                    const hasSchedule = matchedSchedules.length > 0;

                    return (
                      <td 
                        key={dayIdx} 
                        className={`p-2 rounded-2xl align-top transition-all min-h-[95px] h-[95px] border ${
                          hasSchedule 
                            ? 'bg-white border-emerald-300 shadow-sm hover:shadow-md hover:border-emerald-500' 
                            : 'bg-white/40 border-emerald-100/60 hover:bg-emerald-50/60'
                        }`}
                      >
                        {hasSchedule ? (
                          <div className="flex flex-col justify-between h-full space-y-1">
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full border border-amber-200">
                                  {matchedSchedules[0].student_tipo_licencia || matchedSchedules[0].tipo_licencia}
                                </span>
                                <span className="text-[9px] font-bold text-gray-500">
                                  {matchedSchedules[0].hora_inicio.slice(0, 5)} - {matchedSchedules[0].hora_fin.slice(0, 5)}
                                </span>
                              </div>

                              <h4 className="text-xs font-black text-gray-900 leading-tight truncate" title={matchedSchedules[0].student_name}>
                                {matchedSchedules[0].student_name}
                              </h4>
                              
                              <p className="text-[10px] font-bold text-emerald-800 flex items-center gap-1 mt-0.5 truncate">
                                <Truck className="w-3 h-3 shrink-0 text-emerald-600" />
                                {matchedSchedules[0].vehicle_modelo || 'Vehículo'} ({matchedSchedules[0].vehicle_placa || '---'})
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => navigate('/evaluations')}
                              className="w-full py-1 text-[9px] font-black bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl transition-all shadow-xs"
                            >
                              Calificar
                            </button>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-[10px] font-semibold text-emerald-800/20">
                            ---
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : (

        /* CHRONOLOGICAL LIST VIEW */
        <div className="space-y-4">
          {instructorSchedules.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm">
              <Clock className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-black text-gray-800">Sin clases programadas</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                No se encontraron asignaciones para el instructor seleccionado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {instructorSchedules.map(sched => (
                <div 
                  key={sched.id}
                  className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="bg-emerald-950 text-emerald-300 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        {sched.hora_inicio.slice(0, 5)} - {sched.hora_fin.slice(0, 5)}
                      </span>

                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full border border-amber-200">
                        {sched.student_tipo_licencia || sched.tipo_licencia}
                      </span>
                    </div>

                    <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Estudiante:</span>
                    <h3 className="text-base font-black text-gray-900 mt-0.5 mb-1">{sched.student_name}</h3>
                    <p className="text-xs text-gray-500 font-medium mb-3">C.I.: {sched.student_cedula || '---'}</p>

                    <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-100 text-xs space-y-1.5 mb-4">
                      <div className="flex items-center gap-2 font-bold text-gray-800">
                        <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{sched.vehicle_modelo} ({sched.vehicle_placa})</span>
                      </div>
                      <div className="flex items-center gap-2 font-bold text-gray-700">
                        <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{sched.circuito_ruta || 'Circuito Urbano 1'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-[11px]">
                        <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Fecha: {sched.fecha}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/evaluations')}
                    className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Award className="w-4 h-4 text-emerald-300" />
                    <span>Ir a Calificar Alumno</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InstructorScheduleView;
