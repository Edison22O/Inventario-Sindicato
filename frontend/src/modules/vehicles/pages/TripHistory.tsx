import { useState, useEffect, useMemo } from 'react';
import { FileBarChart, Search, User, Calendar, MapPin, Gauge, Fuel, CheckCircle2, Clock, Image as ImageIcon, X, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { VehicleTrip } from '@/shared/types';
import { getImageUrl } from '@/shared/utils/getImageUrl';
import { useWebSocket } from '@/shared/context/WebSocketContext';


const TripHistory = () => {
  const [trips, setTrips] = useState<VehicleTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Image Modal Preview
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vehicle-trips/');
      setTrips(res.data || []);
    } catch (error) {
      toast.error('Error al cargar el historial de viajes');
    } finally {
      setLoading(false);
    }
  };

  useWebSocket(fetchTrips);


  const uniqueConductors = useMemo(() => {
    return Array.from(new Set(trips.map(t => t.conductor_name))).filter(Boolean).sort();
  }, [trips]);

  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (trip.vehicle_placa || '').toLowerCase().includes(searchLower) || 
        (trip.descripcion_salida || '').toLowerCase().includes(searchLower) ||
        (trip.conductor_name || '').toLowerCase().includes(searchLower) ||
        (trip.vehicle_marca || '').toLowerCase().includes(searchLower) ||
        (trip.vehicle_modelo || '').toLowerCase().includes(searchLower);
        
      const matchesUser = selectedUser ? trip.conductor_name === selectedUser : true;
      const matchesStatus = selectedStatus ? trip.estado_viaje === selectedStatus : true;
      
      return matchesSearch && matchesUser && matchesStatus;
    });
  }, [trips, searchTerm, selectedUser, selectedStatus]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedUser, selectedStatus]);

  // KPIs
  const totalKmRecorridos = useMemo(() => {
    return filteredTrips.reduce((acc, t) => acc + (t.km_recorridos || 0), 0);
  }, [filteredTrips]);

  const totalViajesFinalizados = useMemo(() => {
    return filteredTrips.filter(t => t.estado_viaje === 'Finalizado').length;
  }, [filteredTrips]);

  const totalViajesEnCurso = useMemo(() => {
    return filteredTrips.filter(t => t.estado_viaje === 'En Curso').length;
  }, [filteredTrips]);

  const paginatedTrips = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTrips.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTrips, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto pb-32 relative">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none rounded-3xl mix-blend-multiply" />

      {/* Header */}
      <div className="relative z-10 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm">
              <FileBarChart className="w-7 h-7" />
            </div>
            Historial de Viajes
          </h1>
          <p className="text-gray-500 mt-1.5 text-base font-medium">
            Registro cronológico y detallado de todas las salidas y retornos de la flota.
          </p>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Viajes Finalizados</p>
            <p className="text-2xl font-black text-gray-900">{totalViajesFinalizados}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-100 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Viajes En Curso</p>
            <p className="text-2xl font-black text-amber-600">{totalViajesEnCurso}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total KM Recorridos</p>
            <p className="text-2xl font-black text-gray-900">{totalKmRecorridos.toLocaleString('es-EC')} km</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda general */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por placa, modelo, motivo..."
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtro Conductor */}
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium transition-all appearance-none"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="">Todos los Conductores</option>
              {uniqueConductors.map(conductor => (
                <option key={conductor} value={conductor}>{conductor}</option>
              ))}
            </select>
          </div>

          {/* Filtro Estado */}
          <div className="relative">
            <select
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium transition-all appearance-none"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Todos los Estados</option>
              <option value="Finalizado">Finalizado</option>
              <option value="En Curso">En Curso</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline Trips List */}
      <div className="relative z-10 space-y-6">
        {filteredTrips.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
            <FileBarChart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900">No se encontraron viajes</h3>
            <p className="text-gray-500 mt-1 text-sm">Intenta ajustar los términos de búsqueda o filtros seleccionados.</p>
          </div>
        ) : (
          paginatedTrips.map(trip => {
            const isEnCurso = trip.estado_viaje === 'En Curso';

            return (
              <div 
                key={trip.id}
                className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group"
              >
                {/* Header de la tarjeta del viaje */}
                <div className={`p-5 px-8 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 ${
                  isEnCurso ? 'bg-gradient-to-r from-amber-50 to-amber-100/40' : 'bg-gradient-to-r from-emerald-50/70 to-emerald-100/30'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className="px-4 py-1.5 bg-gray-900 text-white rounded-xl text-lg font-black tracking-wider shadow-sm">
                      {trip.vehicle_placa}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                        {trip.vehicle_marca} {trip.vehicle_modelo}
                      </h3>
                      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <User className="w-3.5 h-3.5 text-emerald-600" />
                        Conductor: <span className="text-gray-800 font-bold">{trip.conductor_name}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {(trip.km_recorridos || 0) > 0 && (
                      <span className="px-3.5 py-1 bg-white rounded-full text-xs font-bold text-emerald-700 border border-emerald-200 shadow-sm">
                        + {trip.km_recorridos} KM
                      </span>
                    )}
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-wide uppercase shadow-sm flex items-center gap-1.5 ${
                      isEnCurso 
                        ? 'bg-amber-500 text-white animate-pulse' 
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {isEnCurso ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      {trip.estado_viaje}
                    </span>
                  </div>
                </div>

                {/* Contenido comparativo Salida vs Llegada */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                  {/* Bloque Salida */}
                  <div className="p-6 md:p-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                        <h4 className="font-bold text-emerald-900 text-sm uppercase tracking-wider">Datos de Salida</h4>
                      </div>
                      <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(trip.fecha_hora_salida!).toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-gray-50/80 p-4 rounded-2xl space-y-2.5 border border-gray-100 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs text-gray-400 font-bold uppercase block">Destino / Motivo</span>
                          <span className="font-bold text-gray-900">{trip.descripcion_salida}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/50">
                        <div className="flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-gray-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase block">KM Inicial</span>
                            <span className="font-extrabold text-gray-800">{trip.kilometraje_salida} km</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Fuel className="w-4 h-4 text-gray-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase block">Gasolina</span>
                            <span className="font-extrabold text-gray-800">{trip.gasolina_salida}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Evidencia Salida */}
                    {trip.foto_evidencia_salida && (
                      <div 
                        onClick={() => setSelectedImage({ url: getImageUrl(trip.foto_evidencia_salida), title: `Evidencia Salida - ${trip.vehicle_placa}` })}
                        className="group/img relative rounded-2xl overflow-hidden cursor-pointer border border-gray-200 bg-gray-900 max-h-36 shadow-sm hover:shadow-md transition-all"
                      >
                        <img 
                          src={getImageUrl(trip.foto_evidencia_salida)} 
                          alt="Evidencia Salida" 
                          className="w-full h-36 object-cover group-hover/img:scale-105 group-hover/img:opacity-85 transition-all duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs backdrop-blur-[2px]">
                          <ImageIcon className="w-4 h-4" />
                          <span>Ver Evidencia Salida</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bloque Llegada */}
                  <div className="p-6 md:p-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${isEnCurso ? 'bg-amber-400 ring-4 ring-amber-100' : 'bg-blue-500 ring-4 ring-blue-100'}`} />
                        <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">
                          {isEnCurso ? 'En Ruta' : 'Datos de Llegada'}
                        </h4>
                      </div>
                      {trip.fecha_hora_llegada && (
                        <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(trip.fecha_hora_llegada).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {isEnCurso ? (
                      <div className="h-44 bg-amber-50/50 rounded-2xl border border-dashed border-amber-200 flex flex-col items-center justify-center text-center p-6">
                        <Clock className="w-10 h-10 text-amber-500 mb-2 animate-bounce-slow" />
                        <p className="font-bold text-amber-900 text-sm">Vehículo actualmente en carretera</p>
                        <p className="text-xs text-amber-700/80 mt-1">Esperando registro de retorno por parte del conductor.</p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-gray-50/80 p-4 rounded-2xl space-y-2.5 border border-gray-100 text-sm">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase block">KM Final</span>
                              <span className="font-extrabold text-gray-900">{trip.kilometraje_llegada} km</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase block">Gasolina</span>
                              <span className="font-extrabold text-gray-900">{trip.gasolina_llegada}%</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase block">Costo Comb.</span>
                              <span className="font-extrabold text-emerald-600">${parseFloat(String(trip.costo_combustible_viaje || 0)).toFixed(2)}</span>
                            </div>
                          </div>

                          {trip.novedades_observaciones && (
                            <div className="mt-3 pt-3 border-t border-gray-200/50">
                              <span className="text-[10px] text-amber-800 font-bold uppercase block mb-1">Novedades / Observaciones</span>
                              <p className="text-xs font-semibold text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200/60">
                                "{trip.novedades_observaciones}"
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Evidencia Llegada */}
                        {trip.foto_evidencia_llegada && (
                          <div 
                            onClick={() => setSelectedImage({ url: getImageUrl(trip.foto_evidencia_llegada), title: `Evidencia Llegada - ${trip.vehicle_placa}` })}
                            className="group/img relative rounded-2xl overflow-hidden cursor-pointer border border-gray-200 bg-gray-900 max-h-36 shadow-sm hover:shadow-md transition-all"
                          >
                            <img 
                              src={getImageUrl(trip.foto_evidencia_llegada)} 
                              alt="Evidencia Llegada" 
                              className="w-full h-36 object-cover group-hover/img:scale-105 group-hover/img:opacity-85 transition-all duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs backdrop-blur-[2px]">
                              <ImageIcon className="w-4 h-4" />
                              <span>Ver Evidencia Llegada</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="relative z-10 flex justify-between items-center mt-8 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl disabled:opacity-50 hover:bg-gray-200 transition-colors text-sm"
          >
            Anterior
          </button>
          <span className="text-sm font-extrabold text-gray-600">
            Página {currentPage} de {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl disabled:opacity-50 hover:bg-gray-200 transition-colors text-sm"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Fullscreen Image Preview Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 text-base">{selectedImage.title}</h3>
              <button 
                onClick={() => setSelectedImage(null)} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[75vh] bg-black/5 overflow-hidden">
              <img src={selectedImage.url} alt="Evidencia Full" className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripHistory;
