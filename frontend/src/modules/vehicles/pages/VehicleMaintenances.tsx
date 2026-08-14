import { useState, useEffect, useMemo } from 'react';
import { Wrench, Search, FileText, PenTool, X, Calendar, DollarSign, AlertTriangle, CheckCircle2, ShieldAlert, Clock, LayoutGrid, Table, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { Vehicle, VehicleMaintenance } from '@/shared/types';
import { confirmDialog } from '@/shared/utils/confirmDialog';

interface MaintenanceRecord {
  id: number;
  fecha: string;
  taller: string;
  costo: string;
  actividad_nombre: string;
  notas: string;
}

const VehicleMaintenances = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenances, setMaintenances] = useState<VehicleMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Estados para Modal de Registrar Servicio
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<VehicleMaintenance | null>(null);
  const [formData, setFormData] = useState({ fecha: new Date().toISOString().split('T')[0], fecha_proximo: '', taller: '', costo: '', notas: '' });
  const [submitting, setSubmitting] = useState(false);

  // Estados para Modal de Crear Regla
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createData, setCreateData] = useState({
    vehicle: '',
    actividad: '',
    fecha_ultimo_cambio: new Date().toISOString().split('T')[0],
    fecha_proximo_cambio: '',
    km_ultimo_cambio: '0',
    frecuencia_km: '5000'
  });

  // Estados para Modal de Historial
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedVehicleForHistory, setSelectedVehicleForHistory] = useState<Vehicle | null>(null);
  const [historyRecords, setHistoryRecords] = useState<MaintenanceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vehRes, maintRes] = await Promise.all([
        api.get('/vehicles/'),
        api.get('/vehicle-maintenances/')
      ]);
      setVehicles(vehRes.data || []);
      setMaintenances(maintRes.data || []);
    } catch (error) {
      toast.error('Error al cargar datos de mantenimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRecordModal = (rule: VehicleMaintenance) => {
    setSelectedRule(rule);
    setFormData({ fecha: new Date().toISOString().split('T')[0], fecha_proximo: rule.fecha_proximo_cambio || '', taller: '', costo: '', notas: '' });
    setIsRecordModalOpen(true);
  };

  const handleSubmitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule) return;

    setSubmitting(true);
    try {
      await api.post('/vehicle-maintenance-records/', {
        vehicle: selectedRule.vehicle,
        maintenance_rule: selectedRule.id,
        fecha: formData.fecha,
        taller: formData.taller,
        costo: parseFloat(formData.costo),
        notas: formData.notas
      });

      // Actualizar la regla de mantenimiento (fechas y km)
      const currentVehicle = vehicles.find(v => v.id === selectedRule.vehicle);
      const ruleId = selectedRule.public_id || selectedRule.id;
      await api.patch(`/vehicle-maintenances/${ruleId}/`, {
        fecha_ultimo_cambio: formData.fecha,
        fecha_proximo_cambio: formData.fecha_proximo || null,
        km_ultimo_cambio: currentVehicle?.odometro_actual || 0
      });

      toast.success('Servicio registrado exitosamente');
      setIsRecordModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Error al registrar el servicio');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/vehicle-maintenances/', {
        vehicle: createData.vehicle,
        actividad: createData.actividad,
        fecha_ultimo_cambio: createData.fecha_ultimo_cambio,
        fecha_proximo_cambio: createData.fecha_proximo_cambio || null,
        km_ultimo_cambio: parseInt(createData.km_ultimo_cambio),
        frecuencia_km: parseInt(createData.frecuencia_km)
      });
      toast.success('Programa de mantenimiento creado');
      setIsCreateModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Error al crear programa');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (rule: VehicleMaintenance) => {
    if (await confirmDialog('¿Deseas eliminar este programa de mantenimiento?')) {
      try {
        const identifier = rule.public_id || rule.id;
        await api.delete(`/vehicle-maintenances/${identifier}/`);
        toast.success('Programa eliminado');
        fetchData();
      } catch (error) {
        toast.error('Error al eliminar programa');
      }
    }
  };

  const handleOpenHistoryModal = async (vehicle: Vehicle) => {
    setSelectedVehicleForHistory(vehicle);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/vehicle-maintenance-records/?vehicle=${vehicle.public_id || vehicle.id}`);
      setHistoryRecords(res.data || []);
    } catch (error) {
      toast.error('Error al cargar el historial');
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredMaintenances = useMemo(() => {
    return maintenances.filter(m => {
      const v = vehicles.find(vh => vh.id === m.vehicle);
      if (!v) return false;
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        v.placa.toLowerCase().includes(searchLower) ||
        v.marca.toLowerCase().includes(searchLower) ||
        v.modelo.toLowerCase().includes(searchLower) ||
        m.actividad.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      if (statusFilter === 'urgente') return m.estado_alerta === 'CAMBIO URGENTE';
      if (statusFilter === 'proximo') return m.estado_alerta === 'PRÓXIMO';
      if (statusFilter === 'aldia') return m.estado_alerta === 'AL DÍA' || m.estado_alerta === 'VIGENTE';

      return true;
    });
  }, [maintenances, vehicles, searchTerm, statusFilter]);

  // KPIs
  const totalRules = maintenances.length;
  const countUrgentes = maintenances.filter(m => m.estado_alerta === 'CAMBIO URGENTE').length;
  const countProximos = maintenances.filter(m => m.estado_alerta === 'PRÓXIMO').length;
  const countAlDia = maintenances.filter(m => m.estado_alerta === 'AL DÍA' || m.estado_alerta === 'VIGENTE').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 w-full max-w-[1700px] mx-auto pb-32 relative">
      {/* Background Texture */}
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none rounded-3xl mix-blend-multiply" />

      {/* Header */}
      <div className="relative z-10 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm">
              <Wrench className="w-7 h-7" />
            </div>
            Control de Mantenimientos
          </h1>
          <p className="text-gray-500 mt-1.5 text-base font-medium">
            Planificación de mantenimientos preventivos, alertas de cambio y registro de servicios.
          </p>
        </div>
        
        <button 
          onClick={() => {
            setCreateData({
              vehicle: vehicles[0]?.id.toString() || '',
              actividad: 'Aceite de Motor y Filtro',
              fecha_ultimo_cambio: new Date().toISOString().split('T')[0],
              fecha_proximo_cambio: '',
              km_ultimo_cambio: '0',
              frecuencia_km: '5000'
            });
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          Añadir Programa
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Programas Totales</p>
            <p className="text-2xl font-black text-gray-900">{totalRules}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-red-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Cambios Urgentes</p>
            <p className="text-2xl font-black text-red-600">{countUrgentes}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-amber-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Próximos Cambios</p>
            <p className="text-2xl font-black text-amber-600">{countProximos}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Servicios al Día</p>
            <p className="text-2xl font-black text-emerald-600">{countAlDia}</p>
          </div>
        </div>
      </div>

      {/* Filter and View Control Bar */}
      <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por placa, actividad..."
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Quick Filters */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter('todos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'todos' ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos ({totalRules})
            </button>
            <button
              onClick={() => setStatusFilter('urgente')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'urgente' ? 'bg-red-600 text-white shadow-sm' : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Urgentes ({countUrgentes})
            </button>
            <button
              onClick={() => setStatusFilter('proximo')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'proximo' ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Próximos ({countProximos})
            </button>
            <button
              onClick={() => setStatusFilter('aldia')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'aldia' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Al Día ({countAlDia})
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'table' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
            title="Vista de Tabla Extendida"
          >
            <Table className="w-4 h-4" />
            <span>Tabla Pro</span>
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'cards' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
            title="Vista de Tarjetas por Vehículo"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Tarjetas</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredMaintenances.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900">No hay programas de mantenimiento</h3>
          <p className="text-gray-500 mt-1 text-sm">Prueba ajustando el término de búsqueda o cambia los filtros de estado.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* VISTA DE TABLA PRO EXTENDIDA */
        <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-xs text-left whitespace-nowrap border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white font-bold uppercase tracking-wider shadow-sm">
                  <th className="px-4 py-4 text-center">Nº</th>
                  <th className="px-4 py-4">Vehículo / Placa</th>
                  <th className="px-4 py-4">Actividad / Servicio</th>
                  <th className="px-4 py-4 text-center">Último Cambio</th>
                  <th className="px-4 py-4 text-center">KM Últ. Cambio</th>
                  <th className="px-4 py-4 text-center">Frecuencia</th>
                  <th className="px-4 py-4 text-center">KM Próx. Cambio</th>
                  <th className="px-4 py-4 text-center">Odómetro Actual</th>
                  <th className="px-4 py-4 text-center">KM Recorridos</th>
                  <th className="px-4 py-4 text-center">Fecha Próxima</th>
                  <th className="px-4 py-4 text-center">KM Restantes</th>
                  <th className="px-4 py-4 text-center">Estado / Alerta</th>
                  <th className="px-4 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredMaintenances.map((m, index) => {
                  const v = vehicles.find(vh => vh.id === m.vehicle);
                  if (!v) return null;

                  const isUrgent = m.estado_alerta === 'CAMBIO URGENTE';
                  const isWarning = m.estado_alerta === 'PRÓXIMO';

                  return (
                    <tr 
                      key={m.id} 
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isUrgent ? 'bg-red-50/30' : isWarning ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center text-gray-400 font-bold">{index + 1}</td>
                      
                      <td className="px-4 py-3.5">
                        <div className="font-extrabold text-gray-900 text-sm">{v.placa}</div>
                        <div className="text-[10px] font-semibold text-gray-500">{v.marca} {v.modelo}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-800">{m.actividad}</div>
                      </td>

                      <td className="px-4 py-3.5 text-center text-gray-700">
                        {m.fecha_ultimo_cambio || '-'}
                      </td>

                      <td className="px-4 py-3.5 text-center font-semibold text-gray-800">
                        {m.km_ultimo_cambio.toLocaleString()} km
                      </td>

                      <td className="px-4 py-3.5 text-center text-gray-600">
                        cada {m.frecuencia_km.toLocaleString()} km
                      </td>

                      <td className="px-4 py-3.5 text-center font-bold text-gray-900">
                        {m.km_proximo_cambio.toLocaleString()} km
                      </td>

                      <td className="px-4 py-3.5 text-center font-extrabold text-blue-600">
                        {v.odometro_actual.toLocaleString()} km
                      </td>

                      <td className="px-4 py-3.5 text-center text-gray-700">
                        {m.km_recorridos_desde_cambio.toLocaleString()} km
                      </td>

                      <td className="px-4 py-3.5 text-center text-gray-600">
                        {m.fecha_proximo_cambio || '-'}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className={`font-black px-3 py-1 rounded-lg text-xs ${
                          m.km_restantes_para_proximo_cambio < 0 ? 'bg-red-100 text-red-800' :
                          m.km_restantes_para_proximo_cambio <= 500 ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {m.km_restantes_para_proximo_cambio > 0 ? `${m.km_restantes_para_proximo_cambio.toLocaleString()} km` : `VENCIDO (${Math.abs(m.km_restantes_para_proximo_cambio)} km)`}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm inline-flex items-center gap-1 ${
                          isUrgent ? 'bg-red-600 text-white animate-pulse' :
                          isWarning ? 'bg-amber-500 text-white' :
                          'bg-emerald-600 text-white'
                        }`}>
                          {isUrgent && <AlertTriangle className="w-3 h-3" />}
                          {m.estado_alerta}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            title="Registrar Servicio Realizado"
                            onClick={() => handleOpenRecordModal(m)}
                            className="p-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-colors shadow-sm flex items-center gap-1 font-bold text-[11px]"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>Servicio</span>
                          </button>
                          
                          <button 
                            title="Historial de Mantenimientos"
                            onClick={() => handleOpenHistoryModal(v)}
                            className="p-2 bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 rounded-xl transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button 
                            title="Eliminar Programa"
                            onClick={() => handleDeleteRule(m)}
                            className="p-2 bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600 rounded-xl transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA DE TARJETAS GRID */
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaintenances.map(m => {
            const v = vehicles.find(vh => vh.id === m.vehicle);
            if (!v) return null;

            const isUrgent = m.estado_alerta === 'CAMBIO URGENTE';
            const isWarning = m.estado_alerta === 'PRÓXIMO';

            return (
              <div 
                key={m.id}
                className={`bg-white rounded-3xl border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                  isUrgent ? 'border-red-200' : isWarning ? 'border-amber-200' : 'border-gray-100'
                }`}
              >
                {/* Card Header */}
                <div className={`p-5 flex justify-between items-start ${
                  isUrgent ? 'bg-gradient-to-r from-red-50 to-red-100/50' :
                  isWarning ? 'bg-gradient-to-r from-amber-50 to-amber-100/50' :
                  'bg-gradient-to-r from-emerald-50 to-emerald-100/40'
                }`}>
                  <div>
                    <div className="px-3 py-1 bg-gray-900 text-white font-black text-sm rounded-lg inline-block tracking-wider mb-1">
                      {v.placa}
                    </div>
                    <p className="text-xs font-bold text-gray-600">{v.marca} {v.modelo}</p>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                    isUrgent ? 'bg-red-600 text-white animate-pulse' :
                    isWarning ? 'bg-amber-500 text-white' :
                    'bg-emerald-600 text-white'
                  }`}>
                    {m.estado_alerta}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4 flex-1">
                  <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-emerald-600" />
                    {m.actividad}
                  </h3>

                  <div className="bg-gray-50 p-4 rounded-2xl space-y-2 border border-gray-100 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Último Cambio:</span>
                      <span className="font-bold text-gray-800">{m.fecha_ultimo_cambio || 'Sin registro'} ({m.km_ultimo_cambio.toLocaleString()} km)</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Frecuencia Programada:</span>
                      <span className="font-bold text-gray-800">Cada {m.frecuencia_km.toLocaleString()} km</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Próximo Cambio Objetivo:</span>
                      <span className="font-bold text-gray-900">{m.km_proximo_cambio.toLocaleString()} km</span>
                    </div>

                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-gray-500 font-medium">Odómetro Actual Vehículo:</span>
                      <span className="font-extrabold text-blue-600">{v.odometro_actual.toLocaleString()} km</span>
                    </div>
                  </div>

                  {/* Restantes Highlight */}
                  <div className={`p-3 rounded-2xl text-center font-bold text-xs border ${
                    m.km_restantes_para_proximo_cambio < 0 ? 'bg-red-50 text-red-800 border-red-200' :
                    m.km_restantes_para_proximo_cambio <= 500 ? 'bg-amber-50 text-amber-800 border-amber-200' :
                    'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    KM Restantes: <span className="font-black text-sm">{m.km_restantes_para_proximo_cambio.toLocaleString()} km</span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center gap-2">
                  <button
                    onClick={() => handleOpenHistoryModal(v)}
                    className="flex-1 py-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-700 text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    Historial
                  </button>

                  <button
                    onClick={() => handleOpenRecordModal(m)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    Registrar Servicio
                  </button>

                  <button
                    onClick={() => handleDeleteRule(m)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Eliminar Programa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Crear Regla */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-emerald-100/40">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
                  <Wrench className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Crear Programa de Mantenimiento</h2>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-white/60">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateRule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Vehículo *</label>
                <select
                  required
                  value={createData.vehicle}
                  onChange={e => setCreateData({...createData, vehicle: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                >
                  <option value="">Seleccione vehículo...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.placa} - {v.marca} {v.modelo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Actividad de Mantenimiento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cambio de Aceite de Motor y Filtro"
                  value={createData.actividad}
                  onChange={e => setCreateData({...createData, actividad: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Frecuencia (KM) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="5000"
                    value={createData.frecuencia_km}
                    onChange={e => setCreateData({...createData, frecuencia_km: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">KM Último Cambio *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={createData.km_ultimo_cambio}
                    onChange={e => setCreateData({...createData, km_ultimo_cambio: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Fecha Último Cambio *</label>
                  <input
                    type="date"
                    required
                    value={createData.fecha_ultimo_cambio}
                    onChange={e => setCreateData({...createData, fecha_ultimo_cambio: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Fecha Próximo Cambio</label>
                  <input
                    type="date"
                    value={createData.fecha_proximo_cambio}
                    onChange={e => setCreateData({...createData, fecha_proximo_cambio: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Crear Programa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Registrar Mantenimiento Realizado */}
      {isRecordModalOpen && selectedRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-emerald-100/40">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
                  <PenTool className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Registrar Servicio Realizado</h2>
                  <p className="text-xs font-semibold text-emerald-700">{selectedRule.actividad}</p>
                </div>
              </div>
              <button onClick={() => setIsRecordModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-white/60">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitRecord} className="p-6 space-y-4">
              <div className="bg-emerald-50 text-emerald-900 p-4 rounded-2xl text-xs font-semibold border border-emerald-200 flex gap-3 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-emerald-600 shrink-0" />
                <p>Al confirmar, el odómetro actual (<b>{vehicles.find(v => v.id === selectedRule.vehicle)?.odometro_actual} km</b>) se actualizará como el nuevo kilometraje del último cambio.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Fecha Servicio *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      required
                      value={formData.fecha}
                      onChange={e => setFormData({...formData, fecha: e.target.value})}
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Próxima Fecha</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      value={formData.fecha_proximo}
                      onChange={e => setFormData({...formData, fecha_proximo: e.target.value})}
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Taller / Proveedor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Taller Mecánico Especializado Los Andes"
                  value={formData.taller}
                  onChange={e => setFormData({...formData, taller: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Costo Total ($) *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={formData.costo}
                    onChange={e => setFormData({...formData, costo: e.target.value})}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Observaciones (Opcional)</label>
                <textarea
                  rows={2}
                  value={formData.notas}
                  onChange={e => setFormData({...formData, notas: e.target.value})}
                  placeholder="Detalles sobre marca de insumos usados, piezas cambiadas..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-sm disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Confirmar Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Historial de Mantenimientos por Vehículo */}
      {isHistoryModalOpen && selectedVehicleForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-blue-100/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Historial de Servicios Realizados</h2>
                  <p className="text-xs font-bold text-blue-700">
                    Vehículo: {selectedVehicleForHistory.placa} ({selectedVehicleForHistory.marca} {selectedVehicleForHistory.modelo})
                  </p>
                </div>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 custom-scrollbar">
              {loadingHistory ? (
                <div className="text-center py-12 text-gray-500">Cargando historial...</div>
              ) : historyRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-900">Sin mantenimientos registrados</h3>
                  <p className="text-gray-500 mt-1 text-sm">Este vehículo aún no posee mantenimientos registrados en la plataforma.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyRecords.map(record => (
                    <div key={record.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                      <div>
                        <h4 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-emerald-600" />
                          {record.actividad_nombre}
                        </h4>
                        <div className="mt-2 space-y-1 text-xs font-semibold text-gray-600">
                          <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-gray-400" /> <b>Fecha:</b> {record.fecha}</p>
                          <p className="flex items-center gap-2"><Wrench className="w-3.5 h-3.5 text-gray-400" /> <b>Taller:</b> {record.taller}</p>
                        </div>
                        {record.notas && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs italic text-gray-600 border border-gray-100">
                            "{record.notas}"
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end justify-center shrink-0">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Costo Total</span>
                        <span className="text-2xl font-black text-emerald-600">${parseFloat(record.costo).toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleMaintenances;
