import { useState, useEffect } from 'react';
import { Truck, AlertTriangle, CheckCircle, Navigation, TrendingUp, Calendar, Wrench, Users, X, DollarSign, PenTool, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '@/shared/services/api';
import toast from 'react-hot-toast';

const VehiclesDashboard = () => {
  const [stats, setStats] = useState<any>(null);
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
        // Fallback if date is invalid
      }
    }
  }, [selectedMatricula]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/vehicle-dashboard-stats/');
      setStats(res.data);
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
      // 1. Create Maintenance Record
      await api.post('/vehicle-maintenance-records/', {
        vehicle: selectedMaint.vehicle_id,
        maintenance_rule: selectedMaint.id,
        fecha: maintForm.fecha,
        taller: maintForm.taller,
        costo: parseFloat(maintForm.costo || '0'),
        notas: maintForm.notas
      });

      // 2. Update the rule
      await api.patch(`/vehicle-maintenances/${selectedMaint.id}/`, {
        fecha_ultimo_cambio: maintForm.fecha,
        fecha_proximo_cambio: maintForm.fecha_proximo || null,
        km_ultimo_cambio: selectedMaint.odometro_actual || 0
      });

      toast.success('Servicio registrado exitosamente');
      setSelectedMaint(null);
      fetchStats();
    } catch (error) {
      toast.error('Error al registrar el mantenimiento');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!stats) return null;

  // Data for Pie Chart (Estado de Flota)
  const pieData = [
    { name: 'En Sindicato', value: stats.kpis.en_sindicato, color: '#10b981' },
    { name: 'En Ruta', value: stats.kpis.en_ruta, color: '#3b82f6' },
    { name: 'En Taller', value: stats.kpis.en_taller, color: '#ef4444' }
  ].filter(d => d.value > 0);

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-8 pb-32">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-emerald-100 rounded-2xl">
          <TrendingUp className="w-8 h-8 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Dashboard de Flota Vehicular</h1>
          <p className="text-gray-500 font-medium">Indicadores, gastos y estado en tiempo real</p>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <p className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-1">Total Vehículos</p>
            <h3 className="text-4xl font-black text-gray-900 mb-4">{stats.kpis.total}</h3>
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 w-fit px-3 py-1.5 rounded-full text-sm font-bold">
              <Truck className="w-4 h-4" />
              <span>Flota Registrada</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <p className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-1">En Ruta Actual</p>
            <h3 className="text-4xl font-black text-gray-900 mb-4">{stats.kpis.en_ruta}</h3>
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 w-fit px-3 py-1.5 rounded-full text-sm font-bold">
              <Navigation className="w-4 h-4" />
              <span>Viajes en Curso</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-red-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <p className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-1">Alertas Mantenimiento</p>
            <h3 className="text-4xl font-black text-red-600 mb-4">{stats.kpis.mantenimientos_alertas}</h3>
            <div className="flex items-center gap-2 text-red-600 bg-red-50 w-fit px-3 py-1.5 rounded-full text-sm font-bold">
              <Wrench className="w-4 h-4" />
              <span>Requieren Atención</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-orange-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <p className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-1">Matrículas por Vencer</p>
            <h3 className="text-3xl sm:text-4xl font-black text-orange-600 mb-4">{stats.kpis.matriculas_alertas}</h3>
            <div className="flex items-center gap-2 text-orange-600 bg-orange-50 w-fit px-3 py-1.5 rounded-full text-sm font-bold">
              <Calendar className="w-4 h-4" />
              <span>Por Vencer</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-purple-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px] sm:text-xs mb-1">Conductores</p>
            <h3 className="text-3xl sm:text-4xl font-black text-purple-600 mb-4">{stats.kpis.total_conductores}</h3>
            <div className="flex items-center gap-2 text-purple-600 bg-purple-50 w-fit px-3 py-1.5 rounded-full text-[10px] sm:text-sm font-bold">
              <Users className="w-4 h-4" />
              <span>Personal Activo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico Gastos Combustible */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            Top Gastos de Combustible
          </h2>
          <div className="h-[300px] w-full">
            {stats.fuel_expenses.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.fuel_expenses} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="placa" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    cursor={{fill: '#f3f4f6'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Costo']}
                  />
                  <Bar dataKey="costo_total" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 font-medium">No hay gastos registrados</div>
            )}
          </div>
        </div>

        {/* Gráfico Estado de Flota */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            Estado Actual de Flota
          </h2>
          <div className="flex-1 min-h-[300px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 font-medium">Sin datos de vehículos</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Alertas Inmediatas: Mantenimientos */}
        <div className="bg-white rounded-3xl border border-red-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-red-50/50 border-b border-red-100 flex justify-between items-center">
            <h2 className="font-bold text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Mantenimientos Urgentes
            </h2>
            <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">{stats.alerts.mantenimientos.length}</span>
          </div>
          <div className="p-4 flex-1">
            {stats.alerts.mantenimientos.length === 0 ? (
              <div className="h-full flex items-center justify-center text-emerald-600 font-bold gap-2">
                <CheckCircle className="w-5 h-5" /> Todo al día
              </div>
            ) : (
              <div className="space-y-3">
                {stats.alerts.mantenimientos.map((m: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <h4 className="font-bold text-gray-900">{m.vehiculo}</h4>
                      <p className="text-sm text-gray-500">{m.actividad}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div>
                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                          m.estado === 'CAMBIO URGENTE' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {m.estado}
                        </span>
                        <p className={`text-sm font-bold mt-1 ${m.km_restantes < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                          {m.km_restantes} KM
                        </p>
                      </div>
                      <button 
                        onClick={() => setSelectedMaint(m)}
                        className="text-xs font-bold bg-white border border-gray-200 px-3 py-1 rounded-full text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                      >
                        Resolver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Alertas Inmediatas: Matrículas */}
        <div className="bg-white rounded-3xl border border-orange-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-orange-50/50 border-b border-orange-100 flex justify-between items-center">
            <h2 className="font-bold text-orange-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              Matrículas por Vencer
            </h2>
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full">{stats.alerts.matriculas.length}</span>
          </div>
          <div className="p-4 flex-1">
            {stats.alerts.matriculas.length === 0 ? (
              <div className="h-full flex items-center justify-center text-emerald-600 font-bold gap-2">
                <CheckCircle className="w-5 h-5" /> Todo al día
              </div>
            ) : (
              <div className="space-y-3">
                {stats.alerts.matriculas.map((m: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <h4 className="font-bold text-gray-900">{m.vehiculo}</h4>
                      <p className="text-sm text-gray-500">Vence: {m.vencimiento}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div>
                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                          m.estado === 'MATRÍCULA VENCIDA' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {m.estado}
                        </span>
                        <p className={`text-sm font-bold mt-1 ${m.dias < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                          {m.dias} Días
                        </p>
                      </div>
                      <button 
                        onClick={() => setSelectedMatricula(m)}
                        className="text-xs font-bold bg-white border border-gray-200 px-3 py-1 rounded-full text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                      >
                        Renovar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      
      {/* Maintenance Modal */}
      {selectedMaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-emerald-600" />
                Registrar Servicio Realizado
              </h2>
              <button onClick={() => setSelectedMaint(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateMaintenance} className="p-6 space-y-4">
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm font-medium mb-2 border border-emerald-100 flex gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>Al guardar, el odómetro actual ({selectedMaint.odometro_actual || 0} km) se registrará como el kilometraje del último cambio para <b>"{selectedMaint.actividad}"</b>.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Fecha del Servicio *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      required
                      value={maintForm.fecha}
                      onChange={e => setMaintForm({...maintForm, fecha: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Próximo Cambio</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      value={maintForm.fecha_proximo}
                      onChange={e => setMaintForm({...maintForm, fecha_proximo: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Taller / Proveedor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Taller Mecánico Los Andes"
                  value={maintForm.taller}
                  onChange={e => setMaintForm({...maintForm, taller: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Costo Total ($) *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={maintForm.costo}
                    onChange={e => setMaintForm({...maintForm, costo: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Notas u Observaciones (Opcional)</label>
                <textarea
                  rows={3}
                  value={maintForm.notas}
                  onChange={e => setMaintForm({...maintForm, notas: e.target.value})}
                  placeholder="Detalles sobre aceites usados, piezas reemplazadas, etc."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMaint(null)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Confirmar Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Matricula Modal */}
      {selectedMatricula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-[#0a5c36] text-white flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Renovar Matrícula
              </h2>
              <button onClick={() => setSelectedMatricula(null)} className="text-white/70 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form id="matriculaForm" onSubmit={handleUpdateMatricula} className="space-y-4">
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm border border-emerald-100">
                  <p>Vas a renovar la matrícula del vehículo <b>{selectedMatricula.vehiculo}</b>.</p>
                  <p>Actualmente vence el {selectedMatricula.vencimiento}.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1a2b3c] mb-1">Año Matriculado *</label>
                    <input type="number" required value={matriculaForm.año_matriculado} onChange={e => setMatriculaForm({...matriculaForm, año_matriculado: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0a5c36] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1a2b3c] mb-1">Costo Total ($) *</label>
                    <input type="number" step="0.01" required value={matriculaForm.costo} onChange={e => setMatriculaForm({...matriculaForm, costo: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0a5c36] outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1a2b3c] mb-1">Fecha de Pago *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input type="date" required value={matriculaForm.fecha_pago} onChange={e => setMatriculaForm({...matriculaForm, fecha_pago: e.target.value})} className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0a5c36] outline-none text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1a2b3c] mb-1">Nueva Fecha Vencimiento *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input type="date" required value={matriculaForm.nueva_fecha_vencimiento} onChange={e => setMatriculaForm({...matriculaForm, nueva_fecha_vencimiento: e.target.value})} className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0a5c36] outline-none text-sm" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1a2b3c] mb-1">Lugar de Trámite</label>
                  <input type="text" placeholder="Ej. Agencia ANT..." value={matriculaForm.lugar_tramite} onChange={e => setMatriculaForm({...matriculaForm, lugar_tramite: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0a5c36] outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1a2b3c] mb-1">Notas u Observaciones</label>
                  <textarea rows={2} placeholder="Pago de multas, retenciones..." value={matriculaForm.notas} onChange={e => setMatriculaForm({...matriculaForm, notas: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0a5c36] outline-none resize-none" />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-white">
              <button type="button" onClick={() => setSelectedMatricula(null)} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
              <button type="submit" form="matriculaForm" disabled={submitting} className="px-5 py-2.5 rounded-xl font-bold bg-[#0a5c36] text-white hover:bg-[#08482a] transition-all flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {submitting ? 'Guardando...' : 'Confirmar Renovación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesDashboard;
