import { useState, useEffect } from 'react';
import { Truck, AlertTriangle, CheckCircle, Navigation, TrendingUp, Calendar, Wrench, Users, X, DollarSign, PenTool, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';
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
        // Fallback
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!stats) return null;

  // Data for Pie Chart (Estado de Flota)
  const pieData = [
    { name: 'En Sindicato', value: stats.kpis.en_sindicato, color: '#10b981' },
    { name: 'En Ruta', value: stats.kpis.en_ruta, color: '#0284c7' },
    { name: 'En Taller', value: stats.kpis.en_taller, color: '#ef4444' }
  ].filter(d => d.value > 0);

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-8 pb-32 relative">
      {/* Background Texture */}
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none rounded-3xl mix-blend-multiply" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-4 mb-6">
        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm">
          <TrendingUp className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard de Flota Vehicular</h1>
          <p className="text-gray-500 font-medium">Indicadores en tiempo real, control de alertas y desglose de gastos.</p>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
          <div className="relative z-10">
            <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-1">Total Flota</p>
            <h3 className="text-3xl font-black text-gray-900 mb-3">{stats.kpis.total}</h3>
            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 w-fit px-3 py-1 rounded-full text-xs font-bold">
              <Truck className="w-3.5 h-3.5" />
              <span>Registrados</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
          <div className="relative z-10">
            <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-1">En Ruta Actual</p>
            <h3 className="text-3xl font-black text-blue-600 mb-3">{stats.kpis.en_ruta}</h3>
            <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 w-fit px-3 py-1 rounded-full text-xs font-bold">
              <Navigation className="w-3.5 h-3.5" />
              <span>Viajes en Curso</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-red-100 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
          <div className="relative z-10">
            <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-1">Alertas Mantenimiento</p>
            <h3 className="text-3xl font-black text-red-600 mb-3">{stats.kpis.mantenimientos_alertas}</h3>
            <div className="flex items-center gap-1.5 text-red-600 bg-red-50 w-fit px-3 py-1 rounded-full text-xs font-bold">
              <Wrench className="w-3.5 h-3.5" />
              <span>Urgentes</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
          <div className="relative z-10">
            <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-1">Matrículas por Vencer</p>
            <h3 className="text-3xl font-black text-amber-600 mb-3">{stats.kpis.matriculas_alertas}</h3>
            <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 w-fit px-3 py-1 rounded-full text-xs font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <span>Por Renovar</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
          <div className="relative z-10">
            <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-1">Conductores</p>
            <h3 className="text-3xl font-black text-emerald-800 mb-3">{stats.kpis.total_conductores}</h3>
            <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 w-fit px-3 py-1 rounded-full text-xs font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>Personal Habilitado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {/* Gráfico Gastos Combustible */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Top Gastos de Combustible
            </h2>
            <span className="text-xs font-bold text-gray-400 uppercase">Período Reciente</span>
          </div>
          <div className="h-[300px] w-full">
            {stats.fuel_expenses.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.fuel_expenses} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="placa" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 12, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 12}} tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    cursor={{fill: '#f0fdf4'}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Costo Combustible']}
                  />
                  <Bar dataKey="costo_total" fill="#059669" radius={[10, 10, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 font-medium">No hay registros de combustible</div>
            )}
          </div>
        </div>

        {/* Gráfico Estado de Flota */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              Distribución de Estado de Flota
            </h2>
          </div>
          <div className="flex-1 min-h-[300px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={105}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 font-medium">Sin datos de vehículos</div>
            )}
          </div>
        </div>
      </div>

      {/* Alert Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {/* Mantenimientos Urgentes */}
        <div className="bg-white rounded-3xl border border-red-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-red-100/40 border-b border-red-100 flex justify-between items-center">
            <h2 className="font-extrabold text-red-950 flex items-center gap-2 text-sm">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              Mantenimientos que Requieren Atención
            </h2>
            <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full">{stats.alerts.mantenimientos.length}</span>
          </div>
          <div className="p-5 flex-1 space-y-3">
            {stats.alerts.mantenimientos.length === 0 ? (
              <div className="py-12 text-center text-emerald-600 font-bold flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-10 h-10" />
                <span>¡Excelente! Todos los mantenimientos están al día.</span>
              </div>
            ) : (
              stats.alerts.mantenimientos.map((m: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-4 bg-gray-50/80 rounded-2xl border border-gray-100 hover:border-red-200 transition-colors">
                  <div>
                    <h4 className="font-extrabold text-gray-900">{m.vehiculo}</h4>
                    <p className="text-xs font-semibold text-gray-600">{m.actividad}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
                        m.estado === 'CAMBIO URGENTE' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        {m.estado}
                      </span>
                      <p className={`text-xs font-extrabold mt-1 ${m.km_restantes < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {m.km_restantes} KM
                      </p>
                    </div>
                    <button 
                      onClick={() => setSelectedMaint(m)}
                      className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      Resolver
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Matrículas por Vencer */}
        <div className="bg-white rounded-3xl border border-amber-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-amber-100/40 border-b border-amber-100 flex justify-between items-center">
            <h2 className="font-extrabold text-amber-950 flex items-center gap-2 text-sm">
              <Calendar className="w-5 h-5 text-amber-600" />
              Matrículas por Renovar
            </h2>
            <span className="bg-amber-500 text-white text-xs font-black px-3 py-1 rounded-full">{stats.alerts.matriculas.length}</span>
          </div>
          <div className="p-5 flex-1 space-y-3">
            {stats.alerts.matriculas.length === 0 ? (
              <div className="py-12 text-center text-emerald-600 font-bold flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-10 h-10" />
                <span>¡Todo al día! No hay matrículas vencidas ni próximas a vencer.</span>
              </div>
            ) : (
              stats.alerts.matriculas.map((m: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-4 bg-gray-50/80 rounded-2xl border border-gray-100 hover:border-amber-200 transition-colors">
                  <div>
                    <h4 className="font-extrabold text-gray-900">{m.vehiculo}</h4>
                    <p className="text-xs font-semibold text-gray-500">Vencimiento: {m.vencimiento}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
                        m.estado === 'MATRÍCULA VENCIDA' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        {m.estado}
                      </span>
                      <p className={`text-xs font-extrabold mt-1 ${m.dias < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {m.dias} Días
                      </p>
                    </div>
                    <button 
                      onClick={() => setSelectedMatricula(m)}
                      className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Renovar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      
      {/* Maintenance Modal */}
      {selectedMaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <PenTool className="w-5 h-5" />
                Registrar Servicio Realizado
              </h2>
              <button onClick={() => setSelectedMaint(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateMaintenance} className="p-6 space-y-4">
              <div className="bg-emerald-50 text-emerald-900 p-4 rounded-2xl text-xs font-semibold border border-emerald-100 flex gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-emerald-600" />
                <p>Al guardar, el odómetro actual ({selectedMaint.odometro_actual || 0} km) se registrará como el nuevo cambio para <b>"{selectedMaint.actividad}"</b>.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Fecha Servicio *</label>
                  <input
                    type="date"
                    required
                    value={maintForm.fecha}
                    onChange={e => setMaintForm({...maintForm, fecha: e.target.value})}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Próximo Cambio</label>
                  <input
                    type="date"
                    value={maintForm.fecha_proximo}
                    onChange={e => setMaintForm({...maintForm, fecha_proximo: e.target.value})}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Taller / Proveedor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Taller Mecánico Los Andes"
                  value={maintForm.taller}
                  onChange={e => setMaintForm({...maintForm, taller: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Costo Total ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={maintForm.costo}
                  onChange={e => setMaintForm({...maintForm, costo: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  value={maintForm.notas}
                  onChange={e => setMaintForm({...maintForm, notas: e.target.value})}
                  placeholder="Detalles sobre aceites usados, repuestos..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedMaint(null)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-xs disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white shrink-0">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Renovar Matrícula Vehicular
              </h2>
              <button onClick={() => setSelectedMatricula(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form id="matriculaForm" onSubmit={handleUpdateMatricula} className="space-y-4">
                <div className="bg-emerald-50 text-emerald-900 p-4 rounded-2xl text-xs font-medium border border-emerald-100">
                  Renovación de matrícula del vehículo <b>{selectedMatricula.vehiculo}</b>. Vence: {selectedMatricula.vencimiento}.
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Año Matriculado *</label>
                    <input type="number" required value={matriculaForm.año_matriculado} onChange={e => setMatriculaForm({...matriculaForm, año_matriculado: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Costo Total ($) *</label>
                    <input type="number" step="0.01" required value={matriculaForm.costo} onChange={e => setMatriculaForm({...matriculaForm, costo: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Fecha de Pago *</label>
                    <input type="date" required value={matriculaForm.fecha_pago} onChange={e => setMatriculaForm({...matriculaForm, fecha_pago: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nueva Fecha Venc. *</label>
                    <input type="date" required value={matriculaForm.nueva_fecha_vencimiento} onChange={e => setMatriculaForm({...matriculaForm, nueva_fecha_vencimiento: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Lugar de Trámite</label>
                  <input type="text" placeholder="Ej. Agencia ANT Tulcán..." value={matriculaForm.lugar_tramite} onChange={e => setMatriculaForm({...matriculaForm, lugar_tramite: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Notas u Observaciones</label>
                  <textarea rows={2} placeholder="Pago de multas, retenciones..." value={matriculaForm.notas} onChange={e => setMatriculaForm({...matriculaForm, notas: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none resize-none" />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-white">
              <button type="button" onClick={() => setSelectedMatricula(null)} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors text-xs">
                Cancelar
              </button>
              <button type="submit" form="matriculaForm" disabled={submitting} className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-xs flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
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
