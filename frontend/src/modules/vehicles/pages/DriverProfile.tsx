import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Phone, Droplet, PhoneCall, IdCard, Calendar, Truck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { DriverProfile, User as UserType, VehicleTrip } from '@/shared/types';
import { getImageUrl } from '@/shared/utils/getImageUrl';

const DriverProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [user, setUser] = useState<UserType | null>(null);
  const [trips, setTrips] = useState<VehicleTrip[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchDriverData();
  }, [id]);

  const fetchDriverData = async () => {
    try {
      const driverRes = await api.get(`/driver-profiles/${id}/`);
      const driverData: DriverProfile = driverRes.data;
      setDriver(driverData);

      const [userRes, tripsRes] = await Promise.all([
        api.get(`/users/${driverData.user}/`),
        api.get(`/vehicle-trips/?conductor=${driverData.user}`)
      ]);
      
      setUser(userRes.data);
      // Sort trips to show most recent first
      const sortedTrips = tripsRes.data.sort((a: any, b: any) => {
        return new Date(b.fecha_hora_salida).getTime() - new Date(a.fecha_hora_salida).getTime();
      });
      setTrips(sortedTrips);
    } catch (error) {
      toast.error('Error al cargar el perfil del conductor');
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysLeft = (dateString?: string) => {
    if (!dateString) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(dateString);
    const [y, m, d] = dateString.split('-');
    const localTarget = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
    const diff = localTarget.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!driver || !user) {
    return (
      <div className="p-8 text-center text-gray-500">Conductor no encontrado</div>
    );
  }

  const daysLeft = calculateDaysLeft(driver.fecha_vencimiento_licencia);
  let statusBadge = 'VIGENTE';
  let statusColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  
  if (daysLeft !== null) {
    if (daysLeft < 0) {
      statusBadge = 'VENCIDA';
      statusColor = 'bg-red-100 text-red-800 border-red-200';
    } else if (daysLeft <= 30) {
      statusBadge = 'PRÓXIMA A VENCER';
      statusColor = 'bg-orange-100 text-orange-800 border-orange-200';
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/vehicles/drivers" className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            Perfil de Conductor
          </h1>
          <p className="text-gray-500 mt-1">
            Visualización detallada y profesional
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Información Personal y Licencia */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-emerald-800 to-emerald-600 relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
              <div className="absolute -bottom-12 left-6">
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-white flex items-center justify-center">
                  {driver.foto ? (
                    <img src={getImageUrl(driver.foto)} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-gray-300" />
                  )}
                </div>
              </div>
              <div className="absolute top-4 right-4">
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold shadow-sm backdrop-blur-md uppercase tracking-wider ${
                  driver.estado === 'Activo' ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-400/30' : 
                  driver.estado === 'En Viaje' ? 'bg-blue-400/20 text-blue-100 border border-blue-400/30' : 
                  'bg-gray-400/20 text-gray-100 border border-gray-400/30'
                }`}>
                  {driver.estado}
                </span>
              </div>
            </div>
            
            <div className="pt-16 p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{user.get_full_name || user.first_name + ' ' + user.last_name || user.username}</h2>
                <p className="text-sm text-gray-500">{user.email || 'Sin correo registrado'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center flex flex-col items-center">
                  <Phone className="w-5 h-5 text-emerald-600 mb-1" />
                  <div className="text-sm font-bold text-gray-900">{driver.telefono || 'N/A'}</div>
                  <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Teléfono</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center flex flex-col items-center">
                  <Droplet className="w-5 h-5 text-red-500 mb-1" />
                  <div className="text-sm font-bold text-gray-900">{driver.tipo_sangre || 'N/A'}</div>
                  <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Sangre</div>
                </div>
              </div>

              {driver.contacto_emergencia && (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3">
                  <PhoneCall className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">Contacto de Emergencia</p>
                    <p className="text-sm text-red-900 font-medium">{driver.contacto_emergencia}</p>
                  </div>
                </div>
              )}
              
              {driver.direccion && (
                <div className="border-t border-gray-50 pt-4">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Dirección</p>
                  <p className="text-sm text-gray-900">{driver.direccion}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <IdCard className="w-5 h-5 text-emerald-600" />
              Detalles de Licencia
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <span className="text-gray-500 text-sm">Número de Licencia</span>
                <span className="font-bold text-gray-900 text-lg">{driver.licencia}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <span className="text-gray-500 text-sm">Categoría</span>
                <span className="font-medium px-3 py-1 bg-gray-100 rounded-lg text-gray-800">{driver.tipo_licencia}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <span className="text-gray-500 text-sm">Fecha de Emisión</span>
                <span className="font-medium text-gray-900">{driver.fecha_emision_licencia || 'No registrada'}</span>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Fecha de Vencimiento</span>
                  <span className="font-medium text-gray-900">{driver.fecha_vencimiento_licencia || 'No registrada'}</span>
                </div>
                {daysLeft !== null && (
                  <div className={`mt-2 p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm ${statusColor}`}>
                    {daysLeft < 0 ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Calendar className="w-4 h-4 shrink-0" />}
                    <span>{statusBadge} ({Math.abs(daysLeft)} DÍAS {daysLeft < 0 ? 'VENCIDOS' : 'VIGENTES'})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Historial de Viajes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 h-full">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Truck className="w-6 h-6 text-emerald-600" />
              Historial de Viajes Realizados
            </h2>

            {trips.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
                Este conductor no tiene viajes registrados en el sistema
              </div>
            ) : (
              <div className="space-y-4">
                {trips.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(trip => (
                  <div key={trip.id} className="p-4 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-sm transition-all bg-white">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                          {trip.vehicle_placa} 
                          <span className="text-sm font-normal text-gray-500">({trip.vehicle_marca} {trip.vehicle_modelo})</span>
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(trip.fecha_hora_salida!).toLocaleString()} 
                          {trip.fecha_hora_llegada ? ` - ${new Date(trip.fecha_hora_llegada).toLocaleString()}` : ' - En Curso'}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${
                        trip.estado_viaje === 'En Curso' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {trip.estado_viaje}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl mb-3 border border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">KM Salida</p>
                        <p className="font-bold text-gray-900">{trip.kilometraje_salida}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">KM Llegada</p>
                        <p className="font-bold text-gray-900">{trip.kilometraje_llegada || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Recorrido</p>
                        <p className="font-bold text-gray-900">{trip.km_recorridos ? `${trip.km_recorridos} KM` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Gasto Aprox.</p>
                        <p className="font-bold text-gray-900">{trip.costo_combustible_viaje ? `$${trip.costo_combustible_viaje}` : '-'}</p>
                      </div>
                    </div>

                    {(trip.descripcion_salida || trip.novedades_observaciones) && (
                      <div className="space-y-2 mt-3 pt-3 border-t border-gray-100 text-sm">
                        {trip.descripcion_salida && (
                          <div className="flex gap-2">
                            <span className="font-semibold text-gray-700 whitespace-nowrap">Destino:</span>
                            <span className="text-gray-600">{trip.descripcion_salida}</span>
                          </div>
                        )}
                        {trip.novedades_observaciones && (
                          <div className="flex gap-2">
                            <span className="font-semibold text-gray-700 whitespace-nowrap">Novedades:</span>
                            <span className="text-red-600">{trip.novedades_observaciones}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {trips.length > itemsPerPage && (
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-100 transition-colors text-sm font-medium"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-500 font-medium">
                      Página {currentPage} de {Math.ceil(trips.length / itemsPerPage)}
                    </span>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(trips.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(trips.length / itemsPerPage)}
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
    </div>
  );
};

export default DriverProfilePage;
