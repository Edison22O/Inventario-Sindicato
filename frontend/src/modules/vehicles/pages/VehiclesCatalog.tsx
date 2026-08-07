import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Search, Plus, Edit2, Trash2, Image as ImageIcon, Eye, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { Vehicle } from '@/shared/types';
import VehicleModal from '@/modules/vehicles/components/VehicleModal';
import { getImageUrl } from '@/shared/utils/getImageUrl';
import { confirmDialog } from '@/shared/utils/confirmDialog';
import { useInventoryWebSocket } from '@/modules/inventory/hooks/useInventoryWebSocket';

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

  useInventoryWebSocket(fetchVehicles);

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
      await api.patch(`/vehicles/${selectedVehicle.public_id}/`, formData);
    } else {
      await api.post('/vehicles/', formData);
    }
    fetchVehicles();
  };

  const handleDeleteVehicle = async (id: number) => {
    if (await confirmDialog('¿Estás seguro de que deseas eliminar este vehículo permanentemente?')) {
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

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="relative w-full max-w-xl">
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

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
          <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No hay vehículos registrados</h3>
          <p className="text-gray-500">Agrega un nuevo vehículo a la flota para comenzar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group overflow-hidden flex flex-col">
              
              <div className="h-48 bg-gray-100 relative">
                {vehicle.foto_vehiculo ? (
                  <img src={getImageUrl(vehicle.foto_vehiculo)} alt={vehicle.placa} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                
                <div className="absolute top-4 right-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${
                    vehicle.estado_actual === 'En Sindicato' 
                      ? 'bg-emerald-100/90 text-emerald-800' 
                      : 'bg-red-100/90 text-red-800'
                  }`}>
                    {vehicle.estado_actual}
                  </span>
                </div>

                <div className="absolute bottom-4 left-4">
                  <span className="inline-block px-3 py-1.5 bg-gray-900/80 backdrop-blur-md text-white font-bold rounded-lg tracking-widest shadow-sm">
                    {vehicle.placa}
                  </span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="font-bold text-xl text-gray-900 leading-tight">{vehicle.marca}</h3>
                  <p className="text-gray-500 text-sm">{vehicle.modelo} • {vehicle.año}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Odómetro</p>
                    <p className="font-bold text-gray-900 text-sm">{vehicle.odometro_actual} KM</p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Combustible</p>
                    <p className="font-bold text-gray-900 text-sm">{vehicle.combustible_actual_galones} Gal.</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-xs">
                  {vehicle.alerta_matricula && vehicle.alerta_matricula !== 'NO REGISTRADA' && (
                    <div className={`p-2 rounded-lg font-medium flex items-center gap-2 ${
                      vehicle.alerta_matricula === 'VIGENTE' ? 'bg-blue-50 text-blue-700' :
                      vehicle.alerta_matricula === 'PRÓXIMA A VENCER' ? 'bg-orange-50 text-orange-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Matrícula: {vehicle.alerta_matricula}</span>
                    </div>
                  )}

                  {vehicle.proximo_mantenimiento && vehicle.proximo_mantenimiento !== 'Sin mantenimientos registrados' && (
                    <div className={`p-2 rounded-lg font-medium flex items-center gap-2 ${
                      vehicle.proximo_mantenimiento.startsWith('Urgente') ? 'bg-red-50 text-red-700' :
                      vehicle.proximo_mantenimiento.startsWith('Próximo') ? 'bg-orange-50 text-orange-700' :
                      'bg-gray-50 text-gray-700 border border-gray-100'
                    }`}>
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate" title={vehicle.proximo_mantenimiento}>{vehicle.proximo_mantenimiento}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-auto border-t border-gray-100 pt-4 flex gap-2">
                  <Link 
                    to={`/vehicles/${vehicle.public_id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-xl hover:bg-blue-100 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Perfil
                  </Link>
                  <button 
                    onClick={() => handleOpenModal(vehicle)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-gray-200 hover:border-blue-100"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-gray-200 hover:border-red-100"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
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
