import { useState, useEffect } from 'react';
import { Wrench, Search, FileText, PenTool, X, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { Vehicle, VehicleMaintenance } from '@/shared/types';

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

  // Estados para Modal de Registrar
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
    km_ultimo_cambio: '',
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
      setVehicles(vehRes.data);
      setMaintenances(maintRes.data);
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
      await api.patch(`/vehicle-maintenances/${selectedRule.public_id}/`, {
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
      toast.success('Programa creado');
      setIsCreateModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Error al crear programa');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistoryModal = async (vehicle: Vehicle) => {
    setSelectedVehicleForHistory(vehicle);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/vehicle-maintenance-records/?vehicle=${vehicle.public_id}`);
      setHistoryRecords(res.data);
    } catch (error) {
      toast.error('Error al cargar el historial');
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredMaintenances = maintenances.filter(m => {
    const v = vehicles.find(v => v.id === m.vehicle);
    if (!v) return false;
    const searchString = `${v.placa} ${v.marca} ${v.modelo} ${m.actividad}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 w-full max-w-[1600px] mx-auto pb-32">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Wrench className="w-8 h-8 text-emerald-600" />
            </div>
            Control de Mantenimientos
          </h1>
          <p className="text-gray-500 mt-2 text-base font-medium">Bandeja de alertas y registro de servicios idéntica al formato físico.</p>
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
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm"
        >
          + Añadir Programa
        </button>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por placa, actividad..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl shadow-sm transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* TABLA ESTILO EXCEL */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 font-bold border-r border-gray-200">Nº</th>
              <th className="px-4 py-3 font-bold border-r border-gray-200">PLACA</th>
              <th className="px-4 py-3 font-bold border-r border-gray-200">MARCA</th>
              <th className="px-4 py-3 font-bold border-r border-gray-200 bg-gray-50">Actividad</th>
              <th className="px-4 py-3 font-bold border-r border-gray-200 text-center">Fecha Últ. Cambio</th>
              <th className="px-4 py-3 font-bold border-r border-gray-200 text-center">Km Últ. Cambio</th>
              <th className="px-4 py-3 font-bold border-r border-gray-200 text-center">Frecuencia</th>
              <th className="px-4 py-3 font-bold border-r border-gray-200 text-center">Km Próx. Cambio</th>
              <th className="px-4 py-3 font-bold border-r border-gray-200 text-center">Km Actual</th>
              <th className="px-4 py-3 font-bold border-r border-gray-200 text-center">Km Recorridos</th>
              <th className="px-4 py-3 font-bold border-r border-gray-200 text-center">Días Transc.</th>
              <th className="px-4 py-3 font-bold border-r border-gray-200 text-center">Días Restantes</th>
              <th className="px-4 py-3 font-bold border-r border-gray-200 text-center">Fecha Próx. Cambio</th>
              <th className="px-4 py-3 font-bold border-r border-gray-200 text-center bg-gray-50">Km Restantes</th>
              <th className="px-4 py-3 font-bold text-center">Estado / Alerta</th>
              <th className="px-4 py-3 font-bold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaintenances.map((m, index) => {
              const v = vehicles.find(vh => vh.id === m.vehicle);
              if (!v) return null;

              const isUrgent = m.estado_alerta === 'CAMBIO URGENTE';
              const isWarning = m.estado_alerta === 'PRÓXIMO';

              return (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 border-r border-gray-100 text-center text-gray-500 font-medium">{index + 1}</td>
                  <td className="px-4 py-3 border-r border-gray-100 font-bold text-gray-900">{v.placa}</td>
                  <td className="px-4 py-3 border-r border-gray-100 text-gray-600">{v.marca}</td>
                  <td className="px-4 py-3 border-r border-gray-100 font-medium text-gray-800 bg-gray-50/30">{m.actividad}</td>
                  <td className="px-4 py-3 border-r border-gray-100 text-center">{m.fecha_ultimo_cambio}</td>
                  <td className="px-4 py-3 border-r border-gray-100 text-center font-medium">{m.km_ultimo_cambio}</td>
                  <td className="px-4 py-3 border-r border-gray-100 text-center">{m.frecuencia_km}</td>
                  <td className="px-4 py-3 border-r border-gray-100 text-center font-bold text-gray-700">{m.km_proximo_cambio}</td>
                  <td className="px-4 py-3 border-r border-gray-100 text-center font-bold text-blue-600">{v.odometro_actual}</td>
                  <td className="px-4 py-3 border-r border-gray-100 text-center">{m.km_recorridos_desde_cambio}</td>
                  <td className="px-4 py-3 border-r border-gray-100 text-center">{m.dias_transcurridos}</td>
                  <td className={`px-4 py-3 border-r border-gray-100 text-center font-bold ${m.dias_restantes !== null && m.dias_restantes < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                    {m.dias_restantes !== null ? m.dias_restantes : '-'}
                  </td>
                  <td className="px-4 py-3 border-r border-gray-100 text-center">{m.fecha_proximo_cambio || '-'}</td>
                  <td className={`px-4 py-3 border-r border-gray-100 text-center font-black bg-gray-50/50 ${
                    m.km_restantes_para_proximo_cambio < 0 ? 'text-red-600' : 
                    m.km_restantes_para_proximo_cambio <= 500 ? 'text-orange-500' : 'text-emerald-600'
                  }`}>
                    {m.km_restantes_para_proximo_cambio}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider block w-full shadow-sm ${
                      isUrgent ? 'bg-red-500 text-white' :
                      isWarning ? 'bg-orange-400 text-white' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {m.estado_alerta}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        title="Registrar Servicio"
                        onClick={() => handleOpenRecordModal(m)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isUrgent || isWarning ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-700'
                        }`}
                      >
                        <PenTool className="w-4 h-4" />
                      </button>
                      <button 
                        title="Ver Historial del Vehículo"
                        onClick={() => handleOpenHistoryModal(v)}
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredMaintenances.length === 0 && (
              <tr>
                <td colSpan={16} className="px-4 py-8 text-center text-gray-500">
                  No hay programas de mantenimiento registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para Crear Regla */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-600" />
                Crear Programa de Mantenimiento
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateRule} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Vehículo *</label>
                <select
                  required
                  value={createData.vehicle}
                  onChange={e => setCreateData({...createData, vehicle: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Seleccione vehículo...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.placa} - {v.marca} {v.modelo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Actividad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cambio de Aceite y Filtro"
                  value={createData.actividad}
                  onChange={e => setCreateData({...createData, actividad: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Frecuencia (KM) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={createData.frecuencia_km}
                    onChange={e => setCreateData({...createData, frecuencia_km: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">KM Último Cambio *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={createData.km_ultimo_cambio}
                    onChange={e => setCreateData({...createData, km_ultimo_cambio: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Fecha Último Cambio *</label>
                  <input
                    type="date"
                    required
                    value={createData.fecha_ultimo_cambio}
                    onChange={e => setCreateData({...createData, fecha_ultimo_cambio: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Fecha Próximo Cambio</label>
                  <input
                    type="date"
                    value={createData.fecha_proximo_cambio}
                    onChange={e => setCreateData({...createData, fecha_proximo_cambio: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Crear Programa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Registrar Mantenimiento */}
      {isRecordModalOpen && selectedRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-emerald-600" />
                Registrar Servicio Realizado
              </h2>
              <button onClick={() => setIsRecordModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitRecord} className="p-6 space-y-4">
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm font-medium mb-2 border border-emerald-100 flex gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>Al guardar, el odómetro actual ({vehicles.find(v => v.id === selectedRule.vehicle)?.odometro_actual} km) se registrará como el kilometraje del último cambio para <b>"{selectedRule.actividad}"</b>.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Fecha del Servicio *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      required
                      value={formData.fecha}
                      onChange={e => setFormData({...formData, fecha: e.target.value})}
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
                      value={formData.fecha_proximo}
                      onChange={e => setFormData({...formData, fecha_proximo: e.target.value})}
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
                  value={formData.taller}
                  onChange={e => setFormData({...formData, taller: e.target.value})}
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
                    value={formData.costo}
                    onChange={e => setFormData({...formData, costo: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Notas u Observaciones (Opcional)</label>
                <textarea
                  rows={3}
                  value={formData.notas}
                  onChange={e => setFormData({...formData, notas: e.target.value})}
                  placeholder="Detalles sobre aceites usados, piezas reemplazadas, etc."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
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

      {/* Modal para Historial de Mantenimientos */}
      {isHistoryModalOpen && selectedVehicleForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-emerald-600" />
                  Historial de Mantenimientos
                </h2>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  Vehículo: {selectedVehicleForHistory.placa} ({selectedVehicleForHistory.marca})
                </p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              {loadingHistory ? (
                <div className="text-center py-12 text-gray-500">Cargando historial...</div>
              ) : historyRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-900">Sin mantenimientos registrados</h3>
                  <p className="text-gray-500 mt-1">Este vehículo aún no tiene historial de servicios en la plataforma.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyRecords.map(record => (
                    <div key={record.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">{record.actividad_nombre}</h4>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /> {record.fecha}</p>
                          <p className="flex items-center gap-2"><Wrench className="w-4 h-4 text-gray-400" /> {record.taller}</p>
                        </div>
                        {record.notas && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-xl text-sm italic text-gray-600 border border-gray-100">
                            "{record.notas}"
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end justify-center shrink-0">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Costo Total</span>
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
