import { useState, useEffect } from 'react';
import { Wrench, Search, AlertTriangle, FileText, CheckCircle, Calendar, DollarSign, PenTool, X } from 'lucide-react';
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
  const [formData, setFormData] = useState({ fecha: new Date().toISOString().split('T')[0], taller: '', costo: '', notas: '' });
  const [submitting, setSubmitting] = useState(false);

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
    setFormData({ fecha: new Date().toISOString().split('T')[0], taller: '', costo: '', notas: '' });
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
      toast.success('Servicio registrado exitosamente');
      setIsRecordModalOpen(false);
      // Refrescar para ver los nuevos estados de alerta
      fetchData();
    } catch (error) {
      toast.error('Error al registrar el servicio');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistoryModal = async (vehicle: Vehicle) => {
    setSelectedVehicleForHistory(vehicle);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/vehicle-maintenance-records/?vehicle=${vehicle.id}`);
      setHistoryRecords(res.data);
    } catch (error) {
      toast.error('Error al cargar el historial');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filtrar vehículos basados en la búsqueda y en si tienen mantenimientos
  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.placa.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          v.marca.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          v.modelo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto pb-32">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <Wrench className="w-8 h-8 text-emerald-600" />
          </div>
          Mantenimiento Vehicular
        </h1>
        <p className="text-gray-500 mt-2 text-base font-medium">Bandeja de alertas y registro de servicios para la flota.</p>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar vehículo por placa, marca o modelo..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl shadow-sm transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-6">
        {filteredVehicles.map(vehicle => {
          const vehicleMaintenances = maintenances.filter(m => m.vehicle === vehicle.id);
          // Si no tiene mantenimientos, podemos ocultarlo o mostrarlo. Lo mostraremos para que se pueda ver su historial si es que tiene.
          
          return (
            <div key={vehicle.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Header del Vehículo */}
              <div className="bg-gray-50 p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    {vehicle.placa} <span className="text-sm font-medium text-gray-500">| {vehicle.marca} {vehicle.modelo}</span>
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Odómetro actual: {vehicle.odometro_actual} KM</p>
                </div>
                <button 
                  onClick={() => handleOpenHistoryModal(vehicle)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors shadow-sm font-medium text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Ver Historial
                </button>
              </div>

              {/* Lista de PMs */}
              <div className="p-6">
                {vehicleMaintenances.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm font-medium bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                    No hay programas de mantenimiento configurados para este vehículo.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehicleMaintenances.map(rule => {
                      const isUrgent = rule.estado_alerta === 'CAMBIO URGENTE' || rule.estado_alerta === 'REQUERIDO';
                      const isWarning = rule.estado_alerta === 'PRÓXIMO';
                      
                      return (
                        <div key={rule.id} className={`p-5 rounded-2xl border transition-all ${
                          isUrgent ? 'bg-red-50/50 border-red-200 hover:shadow-sm hover:border-red-300' : 
                          isWarning ? 'bg-orange-50/50 border-orange-200 hover:shadow-sm hover:border-orange-300' : 
                          'bg-emerald-50/30 border-emerald-100 hover:shadow-sm hover:border-emerald-200'
                        }`}>
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-gray-900 text-lg leading-tight">{rule.actividad}</h3>
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                              isUrgent ? 'bg-red-100 text-red-700' :
                              isWarning ? 'bg-orange-100 text-orange-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {rule.estado_alerta}
                            </span>
                          </div>
                          
                          <div className="space-y-1.5 text-sm text-gray-600 mb-4">
                            <p className="flex justify-between"><span className="text-gray-400">Frecuencia:</span> <span className="font-medium">{rule.frecuencia_km} km</span></p>
                            <p className="flex justify-between"><span className="text-gray-400">Último cambio:</span> <span className="font-medium">{rule.km_ultimo_cambio} km</span></p>
                            <p className="flex justify-between pt-1 border-t border-gray-200/50"><span className="text-gray-500 font-semibold">Toca a los:</span> <span className="font-bold text-gray-900">{rule.km_proximo_cambio} km</span></p>
                          </div>

                          <button 
                            onClick={() => handleOpenRecordModal(rule)}
                            className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                              isUrgent || isWarning 
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm' 
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Registrar Servicio
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
                <p>Al guardar, el odómetro actual ({vehicles.find(v => v.id === selectedRule.vehicle)?.odometro_actual} km) se registrará como el kilometraje del último cambio para <b>"{selectedRule.actividad}"</b> y se reiniciará la alerta.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Fecha del Servicio</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    required
                    value={formData.fecha}
                    onChange={e => setFormData({...formData, fecha: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Taller / Proveedor</label>
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
                <label className="block text-sm font-bold text-gray-700 mb-1">Costo Total ($)</label>
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
