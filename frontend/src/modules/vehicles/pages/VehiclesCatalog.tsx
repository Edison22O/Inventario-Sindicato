import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Search, Plus, Edit2, Trash2, Image as ImageIcon, Eye, AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles/');
      setVehicles(res.data || []);
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

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    if (await confirmDialog('¿Estás seguro de que deseas eliminar este vehículo permanentemente?')) {
      try {
        const identifier = vehicle.public_id || vehicle.id;
        await api.delete(`/vehicles/${identifier}/`);
        toast.success('Vehículo eliminado');
        fetchVehicles();
      } catch (error) {
        toast.error('Error al eliminar el vehículo');
      }
    }
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        v.placa.toLowerCase().includes(searchLower) ||
        v.marca.toLowerCase().includes(searchLower) ||
        v.modelo.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      if (statusFilter === 'sindicato') return v.estado_actual === 'En Sindicato';
      if (statusFilter === 'ruta') return v.estado_actual === 'Fuera del Sindicato';
      if (statusFilter === 'taller') return v.estado_actual === 'En Taller';

      return true;
    });
  }, [vehicles, searchTerm, statusFilter]);

  // KPIs
  const totalVehicles = vehicles.length;
  const inUnionCount = vehicles.filter(v => v.estado_actual === 'En Sindicato').length;
  const inRouteCount = vehicles.filter(v => v.estado_actual === 'Fuera del Sindicato').length;
  const inRepairCount = vehicles.filter(v => v.estado_actual === 'En Taller').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto pb-32 relative">
      {/* Background Texture */}
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none rounded-3xl mix-blend-multiply" />

      {/* Header */}
      <div className="relative z-10 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm">
              <Truck className="w-7 h-7" />
            </div>
            Flota Vehicular Institucional
          </h1>
          <p className="text-gray-500 mt-1.5 text-base font-medium">
            Catálogo unificado de vehículos del sindicato con estado en tiempo real.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-bold shadow-md shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          Registrar Vehículo
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Flota Total</p>
            <p className="text-2xl font-black text-gray-900">{totalVehicles}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">En Sindicato</p>
            <p className="text-2xl font-black text-emerald-600">{inUnionCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-blue-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">En Ruta</p>
            <p className="text-2xl font-black text-blue-600">{inRouteCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-amber-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">En Taller</p>
            <p className="text-2xl font-black text-amber-600">{inRepairCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por placa, marca o modelo..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'todos' ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos ({totalVehicles})
          </button>
          <button
            onClick={() => setStatusFilter('sindicato')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'sindicato' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            En Sindicato ({inUnionCount})
          </button>
          <button
            onClick={() => setStatusFilter('ruta')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ruta' ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            En Ruta ({inRouteCount})
          </button>
        </div>
      </div>

      {/* Grid de Vehículos */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
          <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-1">No hay vehículos registrados</h3>
          <p className="text-gray-500 text-sm">Prueba ajustando los filtros o registra un nuevo vehículo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
          {filteredVehicles.map((vehicle) => (
            <div 
              key={vehicle.id} 
              className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Imagen y Placa */}
                <div className="h-48 bg-gray-100 relative overflow-hidden">
                  {vehicle.foto_vehiculo ? (
                    <img 
                      src={getImageUrl(vehicle.foto_vehiculo)} 
                      alt={vehicle.placa} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <ImageIcon className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md ${
                      vehicle.estado_actual === 'En Sindicato' 
                        ? 'bg-emerald-600 text-white' 
                        : vehicle.estado_actual === 'En Taller'
                        ? 'bg-amber-500 text-white'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {vehicle.estado_actual}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3">
                    <span className="inline-block px-3.5 py-1.5 bg-gray-900/90 backdrop-blur-md text-white font-black rounded-xl tracking-widest text-sm shadow-md">
                      {vehicle.placa}
                    </span>
                  </div>
                </div>

                {/* Detalles principales */}
                <div className="p-5">
                  <div className="mb-4">
                    <h3 className="font-extrabold text-xl text-gray-900 leading-tight">{vehicle.marca}</h3>
                    <p className="text-gray-500 text-xs font-semibold">{vehicle.modelo} • Año {vehicle.año}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Odómetro</p>
                      <p className="font-extrabold text-gray-900 text-xs">{vehicle.odometro_actual.toLocaleString()} KM</p>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Combustible</p>
                      <p className="font-extrabold text-emerald-600 text-xs">{vehicle.combustible_actual_galones} Gal.</p>
                    </div>
                  </div>

                  {/* Alertas */}
                  <div className="space-y-1.5 text-xs">
                    {vehicle.alerta_matricula && vehicle.alerta_matricula !== 'NO REGISTRADA' && (
                      <div className={`p-2 rounded-xl font-bold text-[11px] flex items-center gap-2 ${
                        vehicle.alerta_matricula === 'VIGENTE' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60' :
                        vehicle.alerta_matricula === 'PRÓXIMA A VENCER' ? 'bg-amber-50 text-amber-800 border border-amber-200/60' :
                        'bg-red-50 text-red-800 border border-red-200/60'
                      }`}>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Matrícula: {vehicle.alerta_matricula}</span>
                      </div>
                    )}

                    {vehicle.proximo_mantenimiento && vehicle.proximo_mantenimiento !== 'Sin mantenimientos registrados' && (
                      <div className={`p-2 rounded-xl font-bold text-[11px] flex items-center gap-2 ${
                        vehicle.proximo_mantenimiento.startsWith('Urgente') ? 'bg-red-50 text-red-800 border border-red-200/60' :
                        vehicle.proximo_mantenimiento.startsWith('Próximo') ? 'bg-amber-50 text-amber-800 border border-amber-200/60' :
                        'bg-gray-50 text-gray-700 border border-gray-200/60'
                      }`}>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate" title={vehicle.proximo_mantenimiento}>{vehicle.proximo_mantenimiento}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-2">
                <Link 
                  to={`/vehicles/${vehicle.public_id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Eye className="w-4 h-4" />
                  Perfil
                </Link>
                <button 
                  onClick={() => handleOpenModal(vehicle)}
                  className="p-2 text-gray-600 hover:text-emerald-700 bg-white border border-gray-200 hover:border-emerald-200 rounded-xl transition-colors shadow-sm"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteVehicle(vehicle)}
                  className="p-2 text-gray-400 hover:text-red-600 bg-white border border-gray-200 hover:border-red-200 rounded-xl transition-colors shadow-sm"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
