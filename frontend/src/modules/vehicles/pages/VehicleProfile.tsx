import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Truck, Calendar, Gauge, Droplet, Wrench, FileText, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { Vehicle, VehicleTrip, VehicleMaintenance } from '@/shared/types';
import { getImageUrl } from '@/shared/utils/getImageUrl';

const VehicleProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [trips, setTrips] = useState<VehicleTrip[]>([]);
  const [maintenances, setMaintenances] = useState<VehicleMaintenance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicleData();
  }, [id]);

  const fetchVehicleData = async () => {
    try {
      const [vehicleRes, tripsRes, maintRes] = await Promise.all([
        api.get(`/vehicles/${id}/`),
        api.get(`/vehicle-trips/?vehicle=${id}`),
        api.get(`/vehicle-maintenances/?vehicle=${id}`)
      ]);
      setVehicle(vehicleRes.data);
      // Solo mostramos los viajes que ya terminaron o están en curso, ordenados por fecha (más recientes primero)
      setTrips(tripsRes.data);
      setMaintenances(maintRes.data);
    } catch (error) {
      toast.error('Error al cargar el perfil del vehículo');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-8 text-center text-gray-500">Vehículo no encontrado</div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/vehicles/catalog" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            Perfil de Vehículo: {vehicle.placa}
          </h1>
          <p className="text-gray-500 mt-1">
            {vehicle.marca} {vehicle.modelo} ({vehicle.año})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Detalles del Vehículo */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-48 bg-gray-100 relative">
              {vehicle.foto_vehiculo ? (
                <img src={getImageUrl(vehicle.foto_vehiculo)} alt={vehicle.placa} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Truck className="w-16 h-16 opacity-50" />
                </div>
              )}
              <div className="absolute bottom-4 right-4">
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                  vehicle.estado_actual === 'En Sindicato' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {vehicle.estado_actual}
                </span>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                  <Gauge className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{vehicle.odometro_actual}</div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Kilómetros</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                  <Droplet className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{vehicle.combustible_actual_galones}</div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Galones Disp.</div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-400" />
                  Información Técnica
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">Color</span>
                    <span className="font-medium text-gray-900">{vehicle.color}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">Tipo Combustible</span>
                    <span className="font-medium text-gray-900">{vehicle.tipo_combustible}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">Capacidad Tanque</span>
                    <span className="font-medium text-gray-900">{vehicle.capacidad_tanque_galones} Gal.</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">Rendimiento</span>
                    <span className="font-medium text-gray-900">{vehicle.rendimiento_km_por_galon} KM/Gal.</span>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border ${
                vehicle.alerta_matricula === 'VIGENTE' ? 'bg-blue-50 border-blue-100' :
                vehicle.alerta_matricula === 'PRÓXIMA A VENCER' ? 'bg-orange-50 border-orange-100' :
                'bg-red-50 border-red-100'
              }`}>
                <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Matrícula
                </h3>
                <p className="text-sm font-medium mb-1">Mes: {vehicle.mes_matricula || 'No registrado'}</p>
                <p className="text-sm font-medium">Vencimiento: {vehicle.fecha_vencimiento_matricula || 'No registrado'}</p>
                {vehicle.dias_para_vencimiento_matricula !== null && (
                  <p className="text-xs font-bold mt-2 uppercase tracking-wide">
                    {vehicle.alerta_matricula} ({vehicle.dias_para_vencimiento_matricula} días)
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Columna Derecha: Historial y Mantenimientos */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Mantenimientos */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Wrench className="w-6 h-6 text-emerald-600" />
              Programas de Mantenimiento (PM)
            </h2>
            
            {maintenances.length === 0 ? (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
                No hay programas de mantenimiento registrados
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {maintenances.map(pm => (
                  <div key={pm.id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900">{pm.actividad}</h3>
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        pm.estado_alerta === 'REQUERIDO' ? 'bg-red-100 text-red-700' :
                        pm.estado_alerta === 'PRÓXIMO' ? 'bg-orange-100 text-orange-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {pm.estado_alerta}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Frecuencia: Cada {pm.frecuencia_km} KM</p>
                      <p>Último cambio a los: {pm.km_ultimo_cambio} KM</p>
                      <p className="font-medium text-gray-900 mt-2">Próximo a los: {pm.km_proximo_cambio} KM</p>
                    </div>
                    
                    {pm.estado_alerta === 'REQUERIDO' && (
                      <div className="mt-3 p-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        Mantenimiento Vencido
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial de Viajes */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Truck className="w-6 h-6 text-blue-600" />
              Historial de Viajes
            </h2>

            {trips.length === 0 ? (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
                El vehículo no tiene viajes registrados
              </div>
            ) : (
              <div className="space-y-4">
                {trips.map(trip => (
                  <div key={trip.id} className="p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all bg-white group">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">Conductor: {trip.conductor_name}</h3>
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
                            <span className="font-semibold text-gray-700 whitespace-nowrap">Motivo/Destino:</span>
                            <span className="text-gray-600">{trip.descripcion_salida}</span>
                          </div>
                        )}
                        {trip.novedades_observaciones && (
                          <div className="flex gap-2">
                            <span className="font-semibold text-gray-700 whitespace-nowrap">Novedades al llegar:</span>
                            <span className="text-red-600">{trip.novedades_observaciones}</span>
                          </div>
                        )}
                        {Number(trip.galones_recargados) > 0 && (
                          <div className="flex gap-2">
                            <span className="font-semibold text-gray-700 whitespace-nowrap">Recarga de Combustible:</span>
                            <span className="text-emerald-600">{trip.galones_recargados} Galones</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default VehicleProfile;
