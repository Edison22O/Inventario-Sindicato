import { useState, useEffect, useMemo } from 'react';
import { Truck, AlertTriangle, Navigation, Wrench, X, PieChart as PieIcon, BarChart2 } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import api from '@/shared/services/api';
import toast from 'react-hot-toast';

interface Trip {
  id: number;
  vehicle_placa: string;
  conductor_name: string;
  fecha_hora_llegada: string;
  km_recorridos: number;
  galones_recargados: string;
  costo_combustible_viaje: string;
  estado_viaje: string;
}

interface FuelLog {
  id: number;
  numero_vale: string;
  vehicle_placa?: string;
  fecha_vale: string;
  tipo_combustible: string;
  galones: number | string;
  costo_total: number | string;
}

interface MaintenanceRecord {
  id: number;
  vehicle_placa: string;
  actividad_nombre: string;
  tipo_mantenimiento?: 'Preventivo' | 'Correctivo';
  fecha: string;
  taller: string;
  costo: string;
  notas: string;
}

const VehiclesDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [selectedMaint, setSelectedMaint] = useState<any>(null);
  const [selectedMatricula, setSelectedMatricula] = useState<any>(null);

  // Forms
  const [maintForm, setMaintForm] = useState({ fecha: new Date().toISOString().split('T')[0], fecha_proximo: '', taller: '', costo: '', notas: '' });
  const [matriculaForm, setMatriculaForm] = useState({
    fecha_pago: new Date().toISOString().split('T')[0],
    año_matriculado: new Date().getFullYear().toString(),
    costo: '',
    lugar_tramite: '',
    nueva_fecha_vencimiento: '',
    notas: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (selectedMatricula && selectedMatricula.vencimiento) {
      try {
        const currentDate = new Date(selectedMatricula.vencimiento);
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        const nextYear = currentDate.toISOString().split('T')[0];
        setMatriculaForm(prev => ({ ...prev, nueva_fecha_vencimiento: nextYear, año_matriculado: new Date().getFullYear().toString(), costo: '', notas: '', lugar_tramite: '' }));
      } catch (e) {
        // Fallback
      }
    }
  }, [selectedMatricula]);

  const fetchStats = async () => {
    try {
      const [statsRes, tripsRes, fuelRes, maintRes] = await Promise.all([
        api.get('/vehicle-dashboard-stats/'),
        api.get('/vehicle-trips/'),
        api.get('/vehicle-fuel-logs/'),
        api.get('/vehicle-maintenance-records/')
      ]);
      setStats(statsRes.data);
      setTrips(tripsRes.data || []);
      setFuelLogs(fuelRes.data || []);
      setMaintenanceRecords(maintRes.data || []);
    } catch (error) {
      toast.error('Error al cargar métricas del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMatricula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatricula) return;
    setSubmitting(true);
    try {
      await api.post('/vehicle-registrations/', {
        vehicle: selectedMatricula.vehicle_id,
        fecha_pago: matriculaForm.fecha_pago,
        año_matriculado: parseInt(matriculaForm.año_matriculado),
        costo: parseFloat(matriculaForm.costo || '0'),
        lugar_tramite: matriculaForm.lugar_tramite,
        nueva_fecha_vencimiento: matriculaForm.nueva_fecha_vencimiento,
        notas: matriculaForm.notas
      });
      toast.success('Renovación registrada exitosamente');
      setSelectedMatricula(null);
      fetchStats();
    } catch (error) {
      toast.error('Error al registrar la renovación');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaint) return;
    setSubmitting(true);
    try {
      await api.post('/vehicle-maintenance-records/', {
        vehicle: selectedMaint.vehicle_id,
        maintenance_rule: selectedMaint.id,
        fecha: maintForm.fecha,
        taller: maintForm.taller,
        costo: parseFloat(maintForm.costo || '0'),
        notas: maintForm.notas
      });

      const ruleId = selectedMaint.public_id || selectedMaint.id;
      await api.patch(`/vehicle-maintenances/${ruleId}/`, {
        fecha_ultimo_cambio: maintForm.fecha,
        fecha_proximo_cambio: maintForm.fecha_proximo || null,
        km_ultimo_cambio: selectedMaint.odometro_actual || 0
      });

      toast.success('Mantenimiento registrado y actualizado exitosamente');
      setSelectedMaint(null);
      fetchStats();
    } catch (error) {
      toast.error('Error al actualizar el mantenimiento');
    } finally {
      setSubmitting(false);
    }
  };

  // CÁLCULOS DINÁMICOS EN EL FRONTEND (Garantiza sincronización total con la pestaña Reportes)

  // 1. Gastos Totales: Combustible vs Mantenimiento
  const pieExpensesData = useMemo(() => {
    const fuelTrips = trips.filter(t => t.estado_viaje === 'Finalizado').reduce((acc, t) => acc + parseFloat(t.costo_combustible_viaje || '0'), 0);
    const fuelLogsSum = fuelLogs.reduce((acc, f) => acc + parseFloat(f.costo_total?.toString() || '0'), 0);
    const totalFuel = fuelTrips + fuelLogsSum;
    const totalMaint = maintenanceRecords.reduce((acc, m) => acc + parseFloat(m.costo || '0'), 0);

    return [
      { name: 'Combustible', value: Math.round(totalFuel * 100) / 100, color: '#059669' },
      { name: 'Mantenimientos', value: Math.round(totalMaint * 100) / 100, color: '#d97706' }
    ].filter(i => i.value > 0);
  }, [trips, fuelLogs, maintenanceRecords]);

  // 2. Mantenimiento Preventivo vs Correctivo
  const pieMaintTypeData = useMemo(() => {
    let preventivoCost = 0;
    let correctivoCost = 0;

    maintenanceRecords.forEach(m => {
      const isCorrective = m.tipo_mantenimiento === 'Correctivo' || m.actividad_nombre?.toLowerCase().includes('correctivo');
      const cost = parseFloat(m.costo || '0');
      if (isCorrective) correctivoCost += cost;
      else preventivoCost += cost;
    });

    return [
      { name: 'Mantenimiento Preventivo', value: Math.round(preventivoCost * 100) / 100, color: '#059669' },
      { name: 'Mantenimiento Correctivo', value: Math.round(correctivoCost * 100) / 100, color: '#e11d48' }
    ].filter(i => i.value > 0);
  }, [maintenanceRecords]);

  // 3. Gastos por Vehículo ($)
  const barConsolidadoVehicles = useMemo(() => {
    const map: { [placa: string]: { placa: string; combustible: number; mantenimiento: number; total: number } } = {};

    trips.filter(t => t.estado_viaje === 'Finalizado').forEach(t => {
      const placa = t.vehicle_placa || 'Desconocido';
      if (!map[placa]) map[placa] = { placa, combustible: 0, mantenimiento: 0, total: 0 };
      const c = parseFloat(t.costo_combustible_viaje || '0');
      map[placa].combustible += c;
      map[placa].total += c;
    });

    fuelLogs.forEach(f => {
      const placa = f.vehicle_placa || 'Desconocido';
      if (!map[placa]) map[placa] = { placa, combustible: 0, mantenimiento: 0, total: 0 };
      const c = parseFloat(f.costo_total?.toString() || '0');
      map[placa].combustible += c;
      map[placa].total += c;
    });

    maintenanceRecords.forEach(m => {
      const placa = m.vehicle_placa || 'Desconocido';
      if (!map[placa]) map[placa] = { placa, combustible: 0, mantenimiento: 0, total: 0 };
      const c = parseFloat(m.costo || '0');
      map[placa].mantenimiento += c;
      map[placa].total += c;
    });

    return Object.values(map)
      .map(item => ({
        ...item,
        combustible: Math.round(item.combustible * 100) / 100,
        mantenimiento: Math.round(item.mantenimiento * 100) / 100,
        total: Math.round(item.total * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [trips, fuelLogs, maintenanceRecords]);

  if (loading || !stats) {
    return (
      <div className="flex justify-center items-center h-full py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-[1700px] mx-auto pb-32 relative">
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none rounded-3xl mix-blend-multiply"></div>
      
      {/* Header */}
      <div className="relative z-10 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Truck className="w-6 h-6 text-emerald-600" />
            </div>
            Panel de Control Vehicular
          </h1>
          <p className="text-gray-500 mt-2 text-base font-medium">Métricas clave, estado operacional de la flota y gráficas estadísticas en tiempo real.</p>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 relative z-10">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Flota</p>
            <p className="text-3xl font-black text-gray-900">{stats.kpis.total}</p>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">{stats.kpis.en_sindicato} Disponibles</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Navigation className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Fuera del Sindicato</p>
            <p className="text-3xl font-black text-gray-900">{stats.kpis.en_ruta}</p>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">{stats.active_trips.length} Salidas Activas</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-100 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Wrench className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">En Taller</p>
            <p className="text-3xl font-black text-gray-900">{stats.kpis.en_taller}</p>
            <p className="text-xs text-amber-600 font-semibold mt-0.5">{stats.kpis.mantenimientos_alertas} Alertas Pendientes</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-red-100 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Alertas Matrícula</p>
            <p className="text-3xl font-black text-gray-900">{stats.kpis.matriculas_alertas}</p>
            <p className="text-xs text-red-600 font-semibold mt-0.5">Matrículas Vencidas/Próximas</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE GRÁFICAS DE PASTEL Y BARRAS DEL DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 relative z-10">
        {/* GRÁFICA PASTEL 1: Combustible vs Mantenimiento */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-emerald-600" />
              Gastos: Combustible vs Mantenimiento
            </h2>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Pastel</span>
          </div>

          <div className="h-[240px] w-full flex items-center justify-center">
            {pieExpensesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieExpensesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={(props: any) => `${props.name || ''}: ${((props.percent || 0) * 100).toFixed(0)}%`}
                  >
                    {pieExpensesData.map((entry, idx) => (
                      <Cell key={`cell-exp-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`$${parseFloat(val).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, 'Monto Total']}
                    contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={32} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400 font-medium text-xs">Sin datos registrados</div>
            )}
          </div>
        </div>

        {/* GRÁFICA PASTEL 2: Mantenimiento Preventivo vs Correctivo */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-600" />
              Preventivo vs Correctivo
            </h2>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">Pastel</span>
          </div>

          <div className="h-[240px] w-full flex items-center justify-center">
            {pieMaintTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieMaintTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={(props: any) => `${(props.name || '').split(' ')[1] || props.name}: ${((props.percent || 0) * 100).toFixed(0)}%`}
                  >
                    {pieMaintTypeData.map((entry, idx) => (
                      <Cell key={`cell-mtype-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`$${parseFloat(val).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, 'Monto Total']}
                    contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={32} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400 font-medium text-xs">Sin mantenimientos registrados</div>
            )}
          </div>
        </div>

        {/* GRÁFICA DE BARRAS: Gastos Totales por Vehículo */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-600" />
              Gastos por Vehículo ($)
            </h2>
            <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md">Barras</span>
          </div>

          <div className="h-[240px] w-full">
            {barConsolidadoVehicles.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barConsolidadoVehicles} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="placa" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip
                    cursor={{ fill: '#f0f9ff' }}
                    contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any, name: any) => [`$${parseFloat(val || 0).toFixed(2)}`, name === 'combustible' ? 'Combustible' : 'Mantenimiento']}
                  />
                  <Legend verticalAlign="top" height={32} />
                  <Bar dataKey="combustible" name="Combustible" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="mantenimiento" name="Mantenimiento" fill="#d97706" radius={[6, 6, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 font-medium text-xs">Sin datos para graficar</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Desglose Anual por Conductor (Correctivos vs Preventivos) */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative z-10 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-600" />
              Mantenimientos por Conductor y Año (Preventivos vs Correctivos)
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Desglose detallado de eventos preventivos y correctivos por conductor.
            </p>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-xl">Desglose Anual</span>
        </div>

        {stats.driver_maint_stats && stats.driver_maint_stats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.driver_maint_stats.map((st: any, idx: number) => (
              <div key={idx} className="bg-gray-50/70 p-4 rounded-2xl border border-gray-200/80 hover:border-amber-300 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-gray-900 text-sm truncate max-w-[180px]">{st.conductor}</span>
                  <span className="text-[11px] font-black text-gray-700 bg-white px-2 py-0.5 rounded-lg border border-gray-200">
                    Año {st.año}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase">Preventivos</p>
                    <p className="text-lg font-black text-emerald-900">{st.preventivos}</p>
                    <p className="text-[11px] text-emerald-700 font-bold">${st.costo_preventivos.toFixed(2)}</p>
                  </div>
                  <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                    <p className="text-[10px] font-bold text-rose-800 uppercase">Correctivos</p>
                    <p className="text-lg font-black text-rose-900">{st.correctivos}</p>
                    <p className="text-[11px] text-rose-700 font-bold">${st.costo_correctivos.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm italic py-4">No existen registros de mantenimiento por conductor registrados.</p>
        )}
      </div>

      {/* Row 3: Tablas de Salidas Activas & Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {/* Salidas Activas */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-600" />
                Vehículos en Ruta Activa
              </h2>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                {stats.active_trips.length} En Curso
              </span>
            </div>

            {stats.active_trips.length === 0 ? (
              <div className="py-12 text-center text-gray-400 font-medium">
                No hay vehículos fuera del sindicato actualmente.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.active_trips.map((trip: any) => (
                  <div key={trip.id} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-100">
                    <div>
                      <span className="font-black text-gray-900 text-base">{trip.vehiculo}</span>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Conductor: {trip.conductor}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{trip.destino}</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-xl text-xs font-bold animate-pulse">
                      En Ruta
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mantenimientos Próximos / Vencidos con Acción Rápida */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-600" />
                Alertas de Mantenimiento Requerido
              </h2>
              <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold">
                {stats.alerts.mantenimientos.length} Pendientes
              </span>
            </div>

            {stats.alerts.mantenimientos.length === 0 ? (
              <div className="py-12 text-center text-gray-400 font-medium">
                Todos los mantenimientos de la flota están al día.
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {stats.alerts.mantenimientos.map((maint: any) => (
                  <div key={maint.id} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 text-sm">{maint.vehiculo}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                          maint.estado === 'CAMBIO URGENTE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {maint.estado}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 font-medium mt-1">{maint.actividad}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {maint.km_restantes < 0 ? `Excedido por ${Math.abs(maint.km_restantes)} KM` : `Faltan ${maint.km_restantes} KM`}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedMaint(maint)}
                      className="px-3 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-colors shadow-sm"
                    >
                      Registrar Servicio
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL REGISTRAR RENOVACIÓN DE MATRÍCULA */}
      {selectedMatricula && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-gray-900">Renovar Matrícula: {selectedMatricula.vehiculo}</h3>
              <button onClick={() => setSelectedMatricula(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateMatricula} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Fecha de Pago</label>
                <input
                  type="date"
                  required
                  value={matriculaForm.fecha_pago}
                  onChange={e => setMatriculaForm({ ...matriculaForm, fecha_pago: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Año Matriculado</label>
                <input
                  type="number"
                  required
                  value={matriculaForm.año_matriculado}
                  onChange={e => setMatriculaForm({ ...matriculaForm, año_matriculado: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Costo ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={matriculaForm.costo}
                  onChange={e => setMatriculaForm({ ...matriculaForm, costo: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Lugar de Trámite</label>
                <input
                  type="text"
                  placeholder="Ej. ANT Quito / Agencia GAD"
                  value={matriculaForm.lugar_tramite}
                  onChange={e => setMatriculaForm({ ...matriculaForm, lugar_tramite: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Nueva Fecha Vencimiento</label>
                <input
                  type="date"
                  required
                  value={matriculaForm.nueva_fecha_vencimiento}
                  onChange={e => setMatriculaForm({ ...matriculaForm, nueva_fecha_vencimiento: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Notas / Observaciones</label>
                <textarea
                  rows={2}
                  value={matriculaForm.notas}
                  onChange={e => setMatriculaForm({ ...matriculaForm, notas: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedMatricula(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 text-sm shadow-md"
                >
                  {submitting ? 'Guardando...' : 'Guardar Renovación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR SERVICIO DE MANTENIMIENTO */}
      {selectedMaint && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-black text-gray-900">Registrar Mantenimiento: {selectedMaint.vehiculo}</h3>
                <p className="text-xs text-amber-700 font-medium mt-0.5">{selectedMaint.actividad}</p>
              </div>
              <button onClick={() => setSelectedMaint(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateMaintenance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Fecha del Servicio</label>
                <input
                  type="date"
                  required
                  value={maintForm.fecha}
                  onChange={e => setMaintForm({ ...maintForm, fecha: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Próxima Fecha de Cambio (Opcional)</label>
                <input
                  type="date"
                  value={maintForm.fecha_proximo}
                  onChange={e => setMaintForm({ ...maintForm, fecha_proximo: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Taller / Proveedor</label>
                <input
                  type="text"
                  placeholder="Ej. Taller Central / TecniAuto"
                  value={maintForm.taller}
                  onChange={e => setMaintForm({ ...maintForm, taller: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Costo ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={maintForm.costo}
                  onChange={e => setMaintForm({ ...maintForm, costo: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Notas / Repuestos Cambiados</label>
                <textarea
                  rows={3}
                  value={maintForm.notas}
                  onChange={e => setMaintForm({ ...maintForm, notas: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedMaint(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 text-sm shadow-md"
                >
                  {submitting ? 'Guardando...' : 'Registrar Mantenimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesDashboard;
