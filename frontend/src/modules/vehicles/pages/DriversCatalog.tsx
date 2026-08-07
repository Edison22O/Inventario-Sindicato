import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Plus, Edit2, Trash2, Phone, Droplet, PhoneCall, IdCard } from 'lucide-react';
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
      setDrivers(driversRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      toast.error('Error al cargar conductores');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (await confirmDialog('¿Estás seguro de que deseas eliminar el perfil de este conductor?')) {
      try {
        await api.delete(`/driver-profiles/${id}/`);
        toast.success('Conductor eliminado');
        fetchData();
      } catch (error) {
        toast.error('Error al eliminar el conductor');
      }
    }
  };

  const filteredDrivers = drivers.filter(d => {
    const user = users.find(u => u.id === d.user);
    const searchString = `${user?.username} ${d.licencia} ${d.tipo_licencia}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Directorio de Conductores
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Gestión de perfiles de conductores y licencias
          </p>
        </div>
        <button 
          onClick={() => {
            setSelectedDriver(null);
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          Registrar Conductor
        </button>
      </div>

      <div className="mb-8 relative w-full sm:w-96">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por nombre, licencia..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
          No hay conductores registrados
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDrivers.map(driver => {
            const user = users.find(u => u.id === driver.user);
            return (
              <div 
                key={driver.id} 
                className="relative rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-b from-emerald-900 to-emerald-700 flex flex-col items-center pt-8 pb-6 px-4 group"
              >
                {/* Textura de Cubos (Fondo Institucional) */}
                <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>

                {/* Opciones en hover (Editar/Eliminar) */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button 
                    onClick={() => {
                      setSelectedDriver(driver);
                      setIsModalOpen(true);
                    }}
                    className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm transition-colors"
                    title="Editar Conductor"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(driver.id)}
                    className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full backdrop-blur-sm transition-colors"
                    title="Eliminar Conductor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Status Badge */}
                <div className="absolute top-4 left-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md ${
                    driver.estado === 'Activo' ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-400/30' : 
                    driver.estado === 'En Viaje' ? 'bg-blue-400/20 text-blue-100 border border-blue-400/30' : 
                    'bg-gray-400/20 text-gray-100 border border-gray-400/30'
                  }`}>
                    {driver.estado}
                  </span>
                </div>

                {/* Profile Photo */}
                <div className="relative z-10 w-28 h-28 rounded-full border-4 border-white/20 shadow-xl overflow-hidden mb-4 bg-white/10 flex items-center justify-center shrink-0">
                  {driver.foto ? (
                    <img src={getImageUrl(driver.foto)} alt={user?.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-3xl font-bold uppercase">
                      {user?.username?.substring(0,2) || 'CD'}
                    </span>
                  )}
                </div>

                {/* Name */}
                <h3 className="relative z-10 text-white font-bold text-xl mb-6 text-center">
                  {user?.username || 'Desconocido'}
                </h3>

                {/* Circular Data Icons (Reemplazo de los de redes sociales) */}
                <div className="relative z-10 flex justify-center gap-4 mb-8 w-full">
                  {/* Icono Tipo de Sangre */}
                  <div className="flex flex-col items-center gap-1 group/icon" title={`Sangre: ${driver.tipo_sangre || 'N/A'}`}>
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md hover:-translate-y-1 transition-transform cursor-pointer">
                      <Droplet className={`w-5 h-5 ${driver.tipo_sangre ? 'text-red-500' : 'text-gray-400'}`} />
                    </div>
                    <span className="text-white/80 text-[10px] font-medium">{driver.tipo_sangre || 'S/D'}</span>
                  </div>

                  {/* Icono Teléfono */}
                  <div className="flex flex-col items-center gap-1 group/icon" title={`Teléfono: ${driver.telefono || 'N/A'}`}>
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md hover:-translate-y-1 transition-transform cursor-pointer">
                      <Phone className="w-5 h-5 text-emerald-800" />
                    </div>
                    <span className="text-white/80 text-[10px] font-medium">{driver.telefono ? 'Llamar' : 'S/D'}</span>
                  </div>

                  {/* Icono Licencia */}
                  <div className="flex flex-col items-center gap-1 group/icon" title={`Licencia: ${driver.tipo_licencia} - ${driver.licencia}`}>
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md hover:-translate-y-1 transition-transform cursor-pointer">
                      <IdCard className="w-5 h-5 text-emerald-800" />
                    </div>
                    <span className="text-white/80 text-[10px] font-medium">{driver.tipo_licencia}</span>
                  </div>

                  {/* Icono Emergencia */}
                  <div className="flex flex-col items-center gap-1 group/icon" title={`Emergencia: ${driver.contacto_emergencia || 'N/A'}`}>
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md hover:-translate-y-1 transition-transform cursor-pointer">
                      <PhoneCall className="w-5 h-5 text-emerald-800" />
                    </div>
                    <span className="text-white/80 text-[10px] font-medium text-center leading-tight">SOS</span>
                  </div>
                </div>

                {/* Mostrar Más Button */}
                <Link 
                  to={`/vehicles/drivers/${driver.public_id}`}
                  className="relative z-10 w-full max-w-[200px] mt-auto py-2.5 bg-emerald-950 hover:bg-emerald-800 text-white font-medium rounded-xl shadow-lg transition-colors border border-white/10 text-center"
                >
                  Ver Perfil
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
