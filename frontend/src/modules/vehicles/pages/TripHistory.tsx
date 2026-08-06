import { useState, useEffect } from 'react';
import { FileBarChart, Search, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { VehicleTrip } from '@/shared/types';
import { getImageUrl } from '@/shared/utils/getImageUrl';

const TripHistory = () => {
  const [trips, setTrips] = useState<VehicleTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Para filtrar por usuario
  const [selectedUser, setSelectedUser] = useState<string>('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTrips();
    fetchUsers();
  }, []);

  const fetchTrips = async () => {
    try {
      const res = await api.get('/vehicle-trips/');
      setTrips(res.data);
    } catch (error) {
      toast.error('Error al cargar el historial de viajes');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/roles/'); // Or wherever users can be fetched if roles endpoint returns users, but roles endpoint is for roles. 
      // Actually there's a Users endpoint in core. Let's try /users/ if it exists. 
      // Let's assume /users/ exists from core, otherwise we just map unique conductors from trips.
      // We will map unique conductors from the trips to be safe and avoid additional endpoints if not needed.
    } catch (error) {
      // Ignorar
    }
  };

  // Extraer usuarios únicos de los viajes
  const uniqueConductors = Array.from(new Set(trips.map(t => t.conductor_name))).filter(Boolean);

  const filteredTrips = trips.filter(trip => {
    const matchesSearch = 
      trip.vehicle_placa?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      trip.descripcion_salida.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.conductor_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesUser = selectedUser ? trip.conductor_name === selectedUser : true;
    
    return matchesSearch && matchesUser;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedUser]);

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileBarChart className="w-8 h-8 text-blue-600" />
          Historial de Viajes
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          Registro histórico de todas las salidas y llegadas de la flota
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por placa, conductor o motivo..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative w-full sm:w-64">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded-xl transition-all appearance-none"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="">Todos los Conductores</option>
              {uniqueConductors.map(conductor => (
                <option key={conductor} value={conductor}>{conductor}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Cargando historial...</div>
          ) : filteredTrips.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No se encontraron registros que coincidan con la búsqueda.</div>
          ) : (
            <div className="space-y-6">
              {filteredTrips.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(trip => (
                <div key={trip.id} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  {/* Cabecera del Viaje */}
                  <div className={`p-4 flex items-center justify-between border-b border-gray-200 ${trip.estado_viaje === 'En Curso' ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">
                        Vehículo: {trip.vehicle_placa} {trip.vehicle_marca} {trip.vehicle_modelo}
                      </h3>
                      <p className="text-sm font-medium text-gray-700 mt-1 flex items-center gap-2">
                        <User className="w-4 h-4" /> Conductor: {trip.conductor_name}
                      </p>
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${trip.estado_viaje === 'En Curso' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
                        {trip.estado_viaje}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                    {/* Detalle de Salida */}
                    <div className="p-6">
                      <h4 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Datos de Salida
                      </h4>
                      <div className="space-y-3 text-sm">
                        <p><span className="text-gray-500 font-medium">Fecha y Hora:</span> <span className="font-semibold">{new Date(trip.fecha_hora_salida!).toLocaleString()}</span></p>
                        <p><span className="text-gray-500 font-medium">Motivo/Destino:</span> {trip.descripcion_salida}</p>
                        <p><span className="text-gray-500 font-medium">Kilometraje:</span> {trip.kilometraje_salida} KM</p>
                        <p><span className="text-gray-500 font-medium">Gasolina:</span> {trip.gasolina_salida}%</p>
                        {trip.foto_evidencia_salida && (
                          <div className="mt-4">
                            <span className="text-gray-500 font-medium block mb-2">Foto Evidencia (Tablero):</span>
                            <a href={getImageUrl(trip.foto_evidencia_salida)} target="_blank" rel="noreferrer">
                              <img src={getImageUrl(trip.foto_evidencia_salida)} alt="Salida" className="w-full max-h-48 object-cover rounded-xl border border-gray-200 hover:opacity-80 transition-opacity" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detalle de Llegada */}
                    <div className="p-6">
                      <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Datos de Llegada
                      </h4>
                      {trip.estado_viaje === 'En Curso' ? (
                        <div className="h-full flex items-center justify-center text-gray-400 italic">
                          El vehículo aún no ha regresado.
                        </div>
                      ) : (
                        <div className="space-y-3 text-sm">
                          <p><span className="text-gray-500 font-medium">Fecha y Hora:</span> <span className="font-semibold">{new Date(trip.fecha_hora_llegada!).toLocaleString()}</span></p>
                          <p><span className="text-gray-500 font-medium">Novedades:</span> {trip.descripcion_llegada || 'Ninguna novedad reportada'}</p>
                          <p><span className="text-gray-500 font-medium">Kilometraje:</span> {trip.kilometraje_llegada} KM</p>
                          <p><span className="text-gray-500 font-medium">Gasolina:</span> {trip.gasolina_llegada}%</p>
                          
                          {trip.foto_evidencia_llegada && (
                            <div className="mt-4">
                              <span className="text-gray-500 font-medium block mb-2">Foto Evidencia (Tablero):</span>
                              <a href={getImageUrl(trip.foto_evidencia_llegada)} target="_blank" rel="noreferrer">
                                <img src={getImageUrl(trip.foto_evidencia_llegada)} alt="Llegada" className="w-full max-h-48 object-cover rounded-xl border border-gray-200 hover:opacity-80 transition-opacity" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredTrips.length > itemsPerPage && (
                <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-100 transition-colors text-sm font-medium"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-500 font-medium">
                    Página {currentPage} de {Math.ceil(filteredTrips.length / itemsPerPage)}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredTrips.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(filteredTrips.length / itemsPerPage)}
                    className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-100 transition-colors text-sm font-medium"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripHistory;
