import { useState, useEffect } from 'react';
import { Truck, Search, Plus, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { Vehicle } from '@/shared/types';
import VehicleModal from '@/modules/vehicles/components/VehicleModal';
import { getImageUrl } from '@/shared/utils/getImageUrl';

const VehiclesCatalog = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles/');
      setVehicles(res.data);
    } catch (error) {
      toast.error('Error al cargar la flota');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (vehicle?: Vehicle) => {
    setSelectedVehicle(vehicle || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVehicle(null);
  };

  const handleSaveVehicle = async (formData: FormData) => {
    if (selectedVehicle) {
      await api.patch(`/vehicles/${selectedVehicle.id}/`, formData);
    } else {
      await api.post('/vehicles/', formData);
    }
    fetchVehicles();
  };

  const handleDeleteVehicle = async (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este vehículo permanentemente?')) {
      try {
        await api.delete(`/vehicles/${id}/`);
        toast.success('Vehículo eliminado');
        fetchVehicles();
      } catch (error) {
        toast.error('Error al eliminar el vehículo');
      }
    }
  };

  const filteredVehicles = vehicles.filter(v =>
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.modelo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Truck className="w-8 h-8 text-blue-600" />
            Flota Vehicular
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Catálogo y registro de vehículos del sindicato
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          Registrar Vehículo
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por placa, marca o modelo..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Foto</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Placa</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehículo</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Año / Color</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado Actual</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No hay vehículos registrados
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                        {vehicle.foto_vehiculo ? (
                          <img src={getImageUrl(vehicle.foto_vehiculo)} alt={vehicle.placa} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-gray-100 text-gray-800 border border-gray-200">
                        {vehicle.placa}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{vehicle.marca}</div>
                      <div className="text-sm text-gray-500">{vehicle.modelo}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{vehicle.año}</div>
                      <div className="text-sm text-gray-500">{vehicle.color}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        vehicle.estado_actual === 'En Sindicato' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {vehicle.estado_actual}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(vehicle)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <VehicleModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveVehicle}
        vehicle={selectedVehicle}
      />
    </div>
  );
};

export default VehiclesCatalog;
