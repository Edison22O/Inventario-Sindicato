import { useState, useEffect } from 'react';
import { 
  Users, Monitor, Armchair, Truck, Activity, RefreshCw, 
  CheckCircle2, BookOpen, ArrowUpRight,
  Radio, HardDrive
} from 'lucide-react';
import api from '@/shared/services/api';
import { useWebSocket } from '@/shared/context/WebSocketContext';
import { Link } from 'react-router-dom';

interface SystemStats {
  users: number;
  tech_assets: number;
  furniture_assets: number;
  vehicles: number;
  active_trips?: number;
  students_count?: number;
  pending_maintenances?: number;
}

interface VehicleTrip {
  id: number;
  vehicle_details?: { placa: string; marca: string; modelo: string };
  driver_name?: string;
  fecha_salida?: string;
  hora_salida?: string;
  destino?: string;
  estado: string;
}

interface AuditLogItem {
  id: number;
  user_username?: string;
  action: string;
  timestamp: string;
  details?: string;
}

const GlobalDashboard = () => {
  const wsState = useWebSocket();
  const [stats, setStats] = useState<SystemStats>({
    users: 0,
    tech_assets: 0,
    furniture_assets: 0,
    vehicles: 0,
    active_trips: 0,
    students_count: 0,
    pending_maintenances: 0
  });

  const [activeTrips, setActiveTrips] = useState<VehicleTrip[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, tripsRes, studentsRes, auditRes, maintsRes] = await Promise.all([
        api.get('/admin-stats/summary/').catch(() => ({ data: {} })),
        api.get('/vehicle-trips/', { params: { estado: 'EN_PROGRESO' } }).catch(() => ({ data: [] })),
        api.get('/students/').catch(() => ({ data: [] })),
        api.get('/audit-logs/').catch(() => ({ data: [] })),
        api.get('/vehicle-maintenances/').catch(() => ({ data: [] }))
      ]);

      const tripsData = tripsRes.data.results || tripsRes.data || [];
      const studentsData = studentsRes.data.results || studentsRes.data || [];
      const auditData = auditRes.data.results || auditRes.data || [];
      const maintsData = maintsRes.data.results || maintsRes.data || [];

      setStats({
        users: statsRes.data?.users || 0,
        tech_assets: statsRes.data?.tech_assets || 0,
        furniture_assets: statsRes.data?.furniture_assets || 0,
        vehicles: statsRes.data?.vehicles || 0,
        active_trips: tripsData.length,
        students_count: studentsData.length,
        pending_maintenances: maintsData.filter((m: any) => m.estado === 'PENDIENTE' || m.estado === 'EN_PROGRESO').length
      });

      setActiveTrips(tripsData.slice(0, 5));
      setRecentAuditLogs(auditData.slice(0, 5));
    } catch (error) {
      console.error("Error fetching dashboard supervision data", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return <div className="text-center py-16 text-gray-500 font-medium">Cargando centro de mando y supervisión global...</div>;
  }

  const totalAssets = stats.tech_assets + stats.furniture_assets + stats.vehicles;

  return (
    <div className="space-y-8 font-sans">
      {/* System Command Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-15 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Centro de Mando Activo
              </span>
              <span className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                wsState.isConnected ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20' : 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
              }`}>
                <span className={`w-2 h-2 rounded-full ${wsState.isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                {wsState.isConnected ? 'WebSocket Sincronizado' : 'Conectando Servidor'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Supervisión Integral de Operaciones
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/80 max-w-xl">
              Panel general de monitoreo centralizado en tiempo real para flotas vehiculares, inventarios, usuarios y la Escuela de Conducción.
            </p>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
            <button
              onClick={fetchDashboardData}
              disabled={isRefreshing}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold flex items-center gap-2 border border-white/10 backdrop-blur-md transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              {isRefreshing ? 'Actualizando...' : 'Actualizar Métricas'}
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid (6 Module Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Vehicles & Active Trips */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
              <Truck className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-[11px] font-extrabold">
              {stats.active_trips} En Salida
            </span>
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Flota Vehicular</span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-3xl font-black text-gray-900">{stats.vehicles}</h3>
            <span className="text-xs text-gray-500 font-medium">Vehículos Registrados</span>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
            <span className="text-gray-500 font-semibold">Salidas Activas:</span>
            <span className="font-extrabold text-blue-700">{stats.active_trips} en ruta</span>
          </div>
        </div>

        {/* Driving School Students */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-extrabold">
              Prácticas Activas
            </span>
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Escuela de Conducción</span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-3xl font-black text-gray-900">{stats.students_count}</h3>
            <span className="text-xs text-gray-500 font-medium">Estudiantes Matriculados</span>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
            <span className="text-gray-500 font-semibold">Acceso a Notas:</span>
            <span className="font-extrabold text-emerald-700">Restringido a Admins</span>
          </div>
        </div>

        {/* Users & Security */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 text-purple-700 rounded-2xl border border-purple-100">
              <Users className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-[11px] font-extrabold">
              Seguridad & Cuentas
            </span>
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gestión de Usuarios</span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-3xl font-black text-gray-900">{stats.users}</h3>
            <span className="text-xs text-gray-500 font-medium">Cuentas Habilitadas</span>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
            <span className="text-gray-500 font-semibold">Filtrado por Rol:</span>
            <span className="font-extrabold text-purple-700">Habilitado</span>
          </div>
        </div>

        {/* Tech Assets */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-cyan-50 text-cyan-700 rounded-2xl border border-cyan-100">
              <Monitor className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 bg-cyan-100 text-cyan-800 rounded-full text-[11px] font-extrabold">
              Tecnología
            </span>
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Equipos Tecnológicos</span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-3xl font-black text-gray-900">{stats.tech_assets}</h3>
            <span className="text-xs text-gray-500 font-medium">Equipos Controlados</span>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
            <span className="text-gray-500 font-semibold">Mantenimientos Pendientes:</span>
            <span className="font-extrabold text-cyan-700">{stats.pending_maintenances}</span>
          </div>
        </div>

        {/* Furniture Assets */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100">
              <Armchair className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[11px] font-extrabold">
              Mobiliario
            </span>
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inventario de Muebles</span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-3xl font-black text-gray-900">{stats.furniture_assets}</h3>
            <span className="text-xs text-gray-500 font-medium">Bienes de Mobiliario</span>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
            <span className="text-gray-500 font-semibold">Total en Sistema:</span>
            <span className="font-extrabold text-amber-700">{totalAssets} activos</span>
          </div>
        </div>

        {/* System Total Summary Banner Card */}
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Total Global de Bienes</span>
              <h3 className="text-4xl font-black text-white mt-1">{totalAssets}</h3>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl text-amber-300">
              <HardDrive className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-emerald-200/80 font-medium mt-4">
            Consolidado de vehículos, inventario tecnológico y mobiliario institucional.
          </p>
        </div>
      </div>

      {/* Live Operations Supervision Hub (2 Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Vehicles Currently Out (Salidas en Curso) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900 text-base">Vehículos Fuera (Salidas en Curso)</h3>
            </div>
            <Link
              to="/vehicles/trips"
              className="text-xs font-extrabold text-emerald-700 hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activeTrips.length > 0 ? (
            <div className="space-y-3">
              {activeTrips.map((trip) => (
                <div key={trip.id} className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-center justify-between hover:bg-gray-100/60 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-900 font-black text-xs">
                        {trip.vehicle_details?.placa || 'VEHÍCULO'}
                      </span>
                      <span className="font-bold text-gray-900 text-xs">
                        {trip.vehicle_details?.marca} {trip.vehicle_details?.modelo}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium">
                      Conductor: <span className="font-semibold text-gray-800">{trip.driver_name || 'Sin especificar'}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold inline-block mb-1">
                      EN RUTA
                    </span>
                    <p className="text-[11px] text-gray-400 font-medium">{trip.hora_salida || 'Hora Salida'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-400 text-xs font-semibold">
              No hay vehículos con salidas activas en este momento. Todos los vehículos están en parqueadero.
            </div>
          )}
        </div>

        {/* Live System Activity Feed */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-gray-900 text-base">Bitácora de Auditoría en Vivo</h3>
            </div>
            <span className="text-xs font-bold text-gray-400">Últimos Eventos</span>
          </div>

          {recentAuditLogs.length > 0 ? (
            <div className="space-y-3">
              {recentAuditLogs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {log.user_username || 'Usuario Sistema'}
                      </p>
                      <span className="text-[10px] font-semibold text-gray-400 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{log.action}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-400 text-xs font-semibold">
              El historial de eventos y auditoría se encuentra actualizado sin incidencias de seguridad.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalDashboard;
