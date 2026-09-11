import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, Truck, User, FileText } from 'lucide-react';
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

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [vehiclesRes, tripsRes] = await Promise.all([
        api.get('/vehicles/'),
        api.get('/vehicle-trips/')
      ]);
      setVehicles(vehiclesRes.data || []);
      setActiveTrips((tripsRes.data || []).filter((t: VehicleTrip) => t.estado_viaje === 'En Curso'));
    } catch (error) {
      console.error('Error al cargar los datos:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useInventoryWebSocket(() => fetchData(false));

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
    fetchData(false);
  };

  const handleSaveArrival = async (tripId: number, formData: FormData) => {
    await api.patch(`/vehicle-trips/${tripId}/register_arrival/`, formData);
    fetchData(false);
  };

  const vehiclesInUnion = vehicles.filter(v => v.estado_actual === 'En Sindicato');
  const vehiclesInRoute = vehicles.filter(v => v.estado_actual === 'Fuera del Sindicato');
  
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

      {/* Header con botón de Actas de Entrega */}
      <div className="relative z-10 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm">
              <Layers className="w-7 h-7" />
            </div>
            Control de Entradas y Salidas
          </h1>
          <p className="text-gray-500 mt-1.5 text-base font-medium">
            Monitoreo en tiempo real y registro inmediato de movimientos vehiculares del Sindicato.
          </p>
        </div>

        <Link
          to="/vehicles/handovers"
          className="px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-2xl transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <FileText className="w-4 h-4 text-emerald-300" />
          Ver Actas de Entrega / Recepción
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Flota Registrada</p>
            <p className="text-2xl font-black text-gray-900">{vehicles.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">En Sindicato (Disponibles)</p>
            <p className="text-2xl font-black text-emerald-600">{vehiclesInUnion.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-amber-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Fuera del Sindicato (En Ruta)</p>
            <p className="text-2xl font-black text-amber-600">{vehiclesInRoute.length}</p>
          </div>
        </div>
      </div>

      {/* 2 Column Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {/* Columna Izquierda: Disponibles para Salida */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-emerald-100/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-extrabold text-emerald-950">Vehículos en Sindicato</h2>
              </div>
              <span className="bg-emerald-600 text-white text-xs font-black px-3.5 py-1 rounded-full shadow-sm">
                {vehiclesInUnion.length} Listos
              </span>
            </div>
            
            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
              {vehiclesInUnion.length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-medium">
                  No hay vehículos disponibles en la sede en este momento.
                </div>
              ) : (
                vehiclesInUnion.map(vehicle => (
                  <div 
                    key={vehicle.id} 
                    className="border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 hover:shadow-lg hover:border-emerald-200 transition-all duration-300 bg-white group"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 shrink-0 overflow-hidden border border-gray-200 shadow-sm">
                      {vehicle.foto_vehiculo ? (
                        <img src={getImageUrl(vehicle.foto_vehiculo)} alt={vehicle.placa} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Truck className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <div className="px-3 py-0.5 bg-gray-900 text-white font-black text-xs rounded-md tracking-wider inline-block mb-1">
                        {vehicle.placa}
                      </div>
                      <h3 className="font-extrabold text-gray-900 text-base">{vehicle.marca} {vehicle.modelo}</h3>
                      <p className="text-xs text-gray-500 font-semibold mt-0.5">Odómetro: {(vehicle.odometro_actual || 0).toLocaleString()} KM</p>
                    </div>

                    <button 
                      onClick={() => handleOpenDeparture(vehicle)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md shadow-emerald-600/20 text-xs flex items-center justify-center gap-1.5"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Registrar Salida
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Vehículos en Ruta */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-amber-100/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <h2 className="text-lg font-extrabold text-amber-950">Vehículos en Ruta</h2>
              </div>
              <span className="bg-amber-500 text-white text-xs font-black px-3.5 py-1 rounded-full shadow-sm">
                {activeTrips.length} Fuera
              </span>
            </div>
            
            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
              {activeTrips.length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-medium">
                  Todos los vehículos se encuentran actualmente en el Sindicato.
                </div>
              ) : (
                activeTrips.map(trip => (
                  <div 
                    key={trip.id} 
                    className="border border-amber-200/80 bg-amber-50/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex-1 text-center sm:text-left">
                      <div className="px-3 py-0.5 bg-gray-900 text-white font-black text-xs rounded-md tracking-wider inline-block mb-1">
                        {trip.vehicle_placa}
                      </div>
                      <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                        <User className="w-4 h-4 text-amber-600 inline" />
                        {trip.conductor_name}
                      </h3>
                      <p className="text-xs font-semibold text-gray-600 mt-1">
                        Destino: <span className="text-gray-900 font-bold">{trip.descripcion_salida}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                        Salió: {new Date(trip.fecha_hora_salida!).toLocaleString()}
                      </p>
                    </div>

                    <button 
                      onClick={() => handleOpenArrival(trip)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-600/20 text-xs flex items-center justify-center gap-1.5"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      Registrar Llegada
                    </button>
                  </div>
                ))
              )}
            </div>
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
