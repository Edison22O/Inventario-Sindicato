import { useState, useEffect } from 'react';
import { Layers, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { Vehicle, VehicleTrip } from '@/shared/types';
import DepartureModal from '@/modules/vehicles/components/DepartureModal';
import ArrivalModal from '@/modules/vehicles/components/ArrivalModal';
import { getImageUrl } from '@/shared/utils/getImageUrl';
import { useInventoryWebSocket } from '@/modules/inventory/hooks/useInventoryWebSocket';

const VehicleTrips = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTrips, setActiveTrips] = useState<VehicleTrip[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isDepartureOpen, setIsDepartureOpen] = useState(false);
  const [selectedVehicleForDeparture, setSelectedVehicleForDeparture] = useState<Vehicle | null>(null);
  
  const [isArrivalOpen, setIsArrivalOpen] = useState(false);
  const [selectedTripForArrival, setSelectedTripForArrival] = useState<VehicleTrip | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vehiclesRes, tripsRes] = await Promise.all([
        api.get('/vehicles/'),
        api.get('/vehicle-trips/')
      ]);
      setVehicles(vehiclesRes.data);
      // Filtramos solo los viajes en curso
      setActiveTrips(tripsRes.data.filter((t: VehicleTrip) => t.estado_viaje === 'En Curso'));
    } catch (error) {
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Escuchar por WebSockets para refrescar automáticamente (para múltiples dispositivos)
  useInventoryWebSocket(fetchData);

  const handleOpenDeparture = (vehicle: Vehicle) => {
    setSelectedVehicleForDeparture(vehicle);
    setIsDepartureOpen(true);
  };

  const handleOpenArrival = (trip: VehicleTrip) => {
    setSelectedTripForArrival(trip);
    setIsArrivalOpen(true);
  };

  const handleSaveDeparture = async (formData: FormData) => {
    await api.post('/vehicle-trips/', formData);
    fetchData();
  };

  const handleSaveArrival = async (tripId: number, formData: FormData) => {
    await api.patch(`/vehicle-trips/${tripId}/register_arrival/`, formData);
    fetchData();
  };

  const vehiclesInUnion = vehicles.filter(v => v.estado_actual === 'En Sindicato');
  
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Layers className="w-8 h-8 text-blue-600" />
          Control de Entradas y Salidas
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          Registra en tiempo real los movimientos de la flota vehicular
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Columna Izquierda: Vehículos en Sindicato (Disponibles para Salir) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-emerald-50 flex items-center gap-3">
            <ArrowUpRight className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-emerald-900">Vehículos en el Sindicato</h2>
            <span className="ml-auto bg-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
              {vehiclesInUnion.length} Disponibles
            </span>
          </div>
          
          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="text-center py-10 text-gray-500">Cargando...</div>
            ) : vehiclesInUnion.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No hay vehículos disponibles.</div>
            ) : (
              vehiclesInUnion.map(vehicle => (
                <div key={vehicle.id} className="border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 shrink-0 overflow-hidden">
                    {vehicle.foto_vehiculo ? (
                      <img src={getImageUrl(vehicle.foto_vehiculo)} alt={vehicle.placa} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">Sin foto</div>
                    )}
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-gray-900 text-lg">{vehicle.placa}</h3>
                    <p className="text-sm text-gray-500">{vehicle.marca} {vehicle.modelo}</p>
                  </div>
                  <button 
                    onClick={() => handleOpenDeparture(vehicle)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    Registrar Salida
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna Derecha: Vehículos Fuera (Esperando Llegada) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-red-50 flex items-center gap-3">
            <Clock className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Vehículos en Ruta</h2>
            <span className="ml-auto bg-red-200 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
              {activeTrips.length} Fuera
            </span>
          </div>
          
          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="text-center py-10 text-gray-500">Cargando...</div>
            ) : activeTrips.length === 0 ? (
              <div className="text-center py-10 text-gray-500">Todos los vehículos están en el sindicato.</div>
            ) : (
              activeTrips.map(trip => (
                <div key={trip.id} className="border border-red-100 bg-red-50/30 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-gray-900 text-lg">{trip.vehicle_placa}</h3>
                    <p className="text-sm text-gray-600 font-medium">Conductor: {trip.conductor_name}</p>
                    <p className="text-xs text-gray-500 mt-1">Salió: {new Date(trip.fecha_hora_salida!).toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => handleOpenArrival(trip)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <ArrowDownLeft className="w-5 h-5" />
                    Registrar Llegada
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <DepartureModal 
        isOpen={isDepartureOpen} 
        onClose={() => setIsDepartureOpen(false)} 
        onSave={handleSaveDeparture} 
        vehicle={selectedVehicleForDeparture} 
      />

      <ArrivalModal 
        isOpen={isArrivalOpen} 
        onClose={() => setIsArrivalOpen(false)} 
        onSave={handleSaveArrival} 
        trip={selectedTripForArrival} 
      />
    </div>
  );
};

export default VehicleTrips;
