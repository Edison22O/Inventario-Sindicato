import { useState, useEffect } from 'react';
import { Wrench, Plus, Edit2, Trash2, Car, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import { confirmDialog } from '@/shared/utils/confirmDialog';

interface Vehicle {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
}

interface VehicleMaintenance {
  id: number;
  vehicle: number;
  vehicle_detail?: Vehicle;
  actividad: string;
  fecha_ultimo_cambio: string;
  km_ultimo_cambio: number;
  frecuencia_km: number;
  notas: string;
  km_proximo_cambio: number;
  km_recorridos_desde_cambio: number;
  estado_alerta: string;
}

const VehicleMaintenanceAdmin = () => {
  const [maintenances, setMaintenances] = useState<VehicleMaintenance[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VehicleMaintenance | null>(null);
  
  const [formData, setFormData] = useState({
    vehicle: '',
    actividad: '',
    fecha_ultimo_cambio: '',
    km_ultimo_cambio: '',
    frecuencia_km: '',
    notas: ''
  });

  const [filterVehicleId, setFilterVehicleId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [filterVehicleId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, vRes] = await Promise.all([
        api.get(filterVehicleId ? `/vehicle-maintenances/?vehicle=${filterVehicleId}` : '/vehicle-maintenances/'),
        api.get('/vehicles/')
      ]);
      setMaintenances(mRes.data);
      setVehicles(vRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (await confirmDialog('¿Está seguro de eliminar este programa de mantenimiento?')) {
      try {
        await api.delete(`/vehicle-maintenances/${id}/`);
        toast.success('Programa eliminado');
        fetchData();
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        vehicle: parseInt(formData.vehicle),
        actividad: formData.actividad,
        fecha_ultimo_cambio: formData.fecha_ultimo_cambio,
        km_ultimo_cambio: parseInt(formData.km_ultimo_cambio),
        frecuencia_km: parseInt(formData.frecuencia_km),
        notas: formData.notas
      };

      if (selectedItem) {
        await api.patch(`/vehicle-maintenances/${selectedItem.public_id}/`, payload);
        toast.success('Programa actualizado');
      } else {
        await api.post('/vehicle-maintenances/', payload);
        toast.success('Programa creado');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    }
  };

  const openModal = (item?: VehicleMaintenance) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        vehicle: item.vehicle.toString(),
        actividad: item.actividad,
        fecha_ultimo_cambio: item.fecha_ultimo_cambio,
        km_ultimo_cambio: item.km_ultimo_cambio.toString(),
        frecuencia_km: item.frecuencia_km.toString(),
        notas: item.notas || ''
      });
    } else {
      setSelectedItem(null);
      setFormData({
        vehicle: filterVehicleId || '',
        actividad: '',
        fecha_ultimo_cambio: new Date().toISOString().split('T')[0],
        km_ultimo_cambio: '',
        frecuencia_km: '',
        notas: ''
      });
    }
    setIsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CAMBIO URGENTE': return 'bg-red-100 text-red-800 border-red-200';
      case 'PRÓXIMO': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-emerald-600" />
            Programas de Mantenimiento (PM)
          </h2>
          <p className="text-sm text-gray-500 mt-1">Configura y monitorea los mantenimientos preventivos de la flota.</p>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <select
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
            value={filterVehicleId}
            onChange={(e) => setFilterVehicleId(e.target.value)}
          >
            <option value="">Todos los vehículos</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.placa} - {v.marca}</option>
            ))}
          </select>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shrink-0 font-medium"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nuevo PM</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
        ) : maintenances.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No hay programas de mantenimiento configurados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {maintenances.map(pm => {
              const vehicle = vehicles.find(v => v.id === pm.vehicle);
              return (
                <div key={pm.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col relative group">
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(pm)} className="p-1.5 text-gray-400 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(pm.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Car className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 leading-tight">{vehicle?.placa || 'N/A'}</h3>
                      <p className="text-xs text-gray-500">{vehicle?.marca} {vehicle?.modelo}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-bold text-emerald-800 text-lg">{pm.actividad}</h4>
                  </div>

                  <div className="space-y-3 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Último Cambio:</span>
                      <span className="font-semibold text-gray-700">{pm.km_ultimo_cambio.toLocaleString()} km</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Frecuencia:</span>
                      <span className="font-semibold text-gray-700">Cada {pm.frecuencia_km.toLocaleString()} km</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Próximo Cambio:</span>
                      <span className="font-bold text-gray-900">{pm.km_proximo_cambio.toLocaleString()} km</span>
                    </div>
                  </div>

                  <div className={`mt-6 pt-4 border-t border-gray-100 flex items-center justify-between`}>
                    <span className="text-xs text-gray-400">Hace {pm.km_recorridos_desde_cambio.toLocaleString()} km</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(pm.estado_alerta)} flex items-center gap-1`}>
                      {pm.estado_alerta === 'CAMBIO URGENTE' && <AlertTriangle className="w-3 h-3" />}
                      {pm.estado_alerta}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 border-b pb-4">
              {selectedItem ? 'Editar Programa' : 'Nuevo Programa'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Vehículo *</label>
                <select
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  value={formData.vehicle}
                  onChange={e => {
                    const vehicleId = e.target.value;
                    const selectedV = vehicles.find(v => v.id.toString() === vehicleId);
                    setFormData({
                      ...formData,
                      vehicle: vehicleId,
                      km_ultimo_cambio: selectedV ? selectedV.odometro_actual.toString() : formData.km_ultimo_cambio
                    });
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.placa} - {v.marca}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Actividad (Ej: Cambio de Aceite) *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  value={formData.actividad}
                  onChange={e => setFormData({...formData, actividad: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Último *</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    value={formData.fecha_ultimo_cambio}
                    onChange={e => setFormData({...formData, fecha_ultimo_cambio: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Odómetro (KM) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    value={formData.km_ultimo_cambio}
                    onChange={e => setFormData({...formData, km_ultimo_cambio: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Frecuencia (Cada cuántos KM) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  value={formData.frecuencia_km}
                  onChange={e => setFormData({...formData, frecuencia_km: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notas (Opcional)</label>
                <textarea
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                  value={formData.notas}
                  onChange={e => setFormData({...formData, notas: e.target.value})}
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-colors shadow-sm">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleMaintenanceAdmin;
