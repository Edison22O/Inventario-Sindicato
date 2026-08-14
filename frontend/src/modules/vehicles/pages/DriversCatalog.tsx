import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Plus, Edit2, Trash2, Phone, Droplet, PhoneCall, IdCard, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { DriverProfile, User } from '@/shared/types';
import { confirmDialog } from '@/shared/utils/confirmDialog';
import { getImageUrl } from '@/shared/utils/getImageUrl';
import DriverModal from '../components/DriverModal';

const DriversCatalog = () => {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [driversRes, usersRes] = await Promise.all([
        api.get('/driver-profiles/'),
        api.get('/users/')
      ]);
      setDrivers(driversRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      toast.error('Error al cargar conductores');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (driver: DriverProfile) => {
    if (await confirmDialog('¿Estás seguro de que deseas eliminar el perfil de este conductor?')) {
      try {
        const identifier = driver.public_id || driver.id;
        await api.delete(`/driver-profiles/${identifier}/`);
        toast.success('Conductor eliminado');
        fetchData();
      } catch (error) {
        toast.error('Error al eliminar el conductor');
      }
    }
  };

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const user = users.find(u => u.id === d.user);
      if (!user) return false;
      const roleName = user.role_name ? user.role_name.toLowerCase() : '';
      const isDriverRole = roleName.includes('conductor') || roleName.includes('chofer') || roleName.includes('driver');
      if (!isDriverRole) return false;
      const searchString = `${user.username} ${d.licencia} ${d.tipo_licencia}`.toLowerCase();
      return searchString.includes(searchTerm.toLowerCase());
    });
  }, [drivers, users, searchTerm]);

  // KPIs
  const totalDrivers = filteredDrivers.length;
  const activeCount = filteredDrivers.filter(d => d.estado === 'Activo').length;
  const inTripCount = filteredDrivers.filter(d => d.estado === 'En Viaje').length;

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
              <Users className="w-7 h-7" />
            </div>
            Directorio de Conductores
          </h1>
          <p className="text-gray-500 mt-1.5 text-base font-medium">
            Gestión de perfiles de conductores, licencias y datos de contacto de emergencia.
          </p>
        </div>
        <button 
          onClick={() => {
            setSelectedDriver(null);
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-bold shadow-md shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          Registrar Conductor
        </button>
      </div>

      {/* KPI Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Conductores Habilitados</p>
            <p className="text-2xl font-black text-gray-900">{totalDrivers}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Activos en Sindicato</p>
            <p className="text-2xl font-black text-emerald-600">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-blue-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">En Ruta Actualmente</p>
            <p className="text-2xl font-black text-blue-600">{inTripCount}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar conductor por nombre o licencia..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Cards Grid */}
      {filteredDrivers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-1">No hay conductores registrados</h3>
          <p className="text-gray-500 text-sm">Registra un conductor para habilitar la asignación de viajes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
          {filteredDrivers.map(driver => {
            const user = users.find(u => u.id === driver.user);
            return (
              <div 
                key={driver.id} 
                className="relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-800 flex flex-col items-center pt-8 pb-6 px-5 group border border-emerald-800"
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none" />

                {/* Edit & Delete hover overlay */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button 
                    onClick={() => {
                      setSelectedDriver(driver);
                      setIsModalOpen(true);
                    }}
                    className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-colors"
                    title="Editar Conductor"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(driver)}
                    className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full backdrop-blur-md transition-colors"
                    title="Eliminar Conductor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Status Badge */}
                <div className="absolute top-4 left-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md ${
                    driver.estado === 'Activo' ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30' : 
                    driver.estado === 'En Viaje' ? 'bg-blue-400/20 text-blue-200 border border-blue-400/30 animate-pulse' : 
                    'bg-gray-400/20 text-gray-200 border border-gray-400/30'
                  }`}>
                    {driver.estado}
                  </span>
                </div>

                {/* Profile Photo */}
                <div className="relative z-10 w-28 h-28 rounded-full border-4 border-white/20 shadow-2xl overflow-hidden mb-4 bg-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                  {driver.foto ? (
                    <img src={getImageUrl(driver.foto)} alt={user?.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-3xl font-extrabold uppercase">
                      {user?.username?.substring(0,2) || 'CD'}
                    </span>
                  )}
                </div>

                {/* Driver Name */}
                <h3 className="relative z-10 text-white font-extrabold text-xl mb-6 text-center tracking-tight">
                  {user?.username || 'Desconocido'}
                </h3>

                {/* Data Icons Bar */}
                <div className="relative z-10 flex justify-center gap-3 mb-8 w-full">
                  {/* Tipo de Sangre */}
                  <div className="flex flex-col items-center gap-1" title={`Sangre: ${driver.tipo_sangre || 'N/A'}`}>
                    <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-md hover:-translate-y-1 transition-transform cursor-pointer">
                      <Droplet className={`w-5 h-5 ${driver.tipo_sangre ? 'text-red-500' : 'text-gray-400'}`} />
                    </div>
                    <span className="text-white/80 text-[10px] font-bold">{driver.tipo_sangre || 'S/D'}</span>
                  </div>

                  {/* Teléfono */}
                  <div className="flex flex-col items-center gap-1" title={`Teléfono: ${driver.telefono || 'N/A'}`}>
                    <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-md hover:-translate-y-1 transition-transform cursor-pointer">
                      <Phone className="w-5 h-5 text-emerald-800" />
                    </div>
                    <span className="text-white/80 text-[10px] font-bold">{driver.telefono ? 'Llamar' : 'S/D'}</span>
                  </div>

                  {/* Licencias */}
                  {(() => {
                    const licList = Array.isArray((driver as any).licencias) && (driver as any).licencias.length > 0
                      ? (driver as any).licencias
                      : [{ tipo_licencia: driver.tipo_licencia, licencia: driver.licencia }];
                    const licTypesStr = licList.map((l: any) => l.tipo_licencia).join(', ');
                    return (
                      <div className="flex flex-col items-center gap-1" title={`Licencias: ${licTypesStr}`}>
                        <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-md hover:-translate-y-1 transition-transform cursor-pointer">
                          <IdCard className="w-5 h-5 text-emerald-800" />
                        </div>
                        <span className="text-white/80 text-[10px] font-bold truncate max-w-[70px] text-center">{licTypesStr}</span>
                      </div>
                    );
                  })()}

                  {/* Contacto Emergencia */}
                  <div className="flex flex-col items-center gap-1" title={`Emergencia: ${driver.contacto_emergencia || 'N/A'}`}>
                    <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-md hover:-translate-y-1 transition-transform cursor-pointer">
                      <PhoneCall className="w-5 h-5 text-emerald-800" />
                    </div>
                    <span className="text-white/80 text-[10px] font-bold text-center">SOS</span>
                  </div>
                </div>

                {/* Perfil Button */}
                <Link 
                  to={`/vehicles/drivers/${driver.public_id}`}
                  className="relative z-10 w-full mt-auto py-3 bg-emerald-950/80 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg transition-all border border-white/10 text-center text-xs tracking-wider uppercase"
                >
                  Ver Perfil Conductor
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <DriverModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        driver={selectedDriver}
      />
    </div>
  );
};

export default DriversCatalog;
