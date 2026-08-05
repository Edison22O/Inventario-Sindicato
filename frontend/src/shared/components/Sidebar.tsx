import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Tags, Layers, LogOut, X, Truck, Wrench, FileBarChart, ChevronDown, Monitor, Armchair, Home as HomeIcon, Settings, Users } from 'lucide-react';
import { authService } from '@/services/authService';
import api from '@/shared/services/api';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();
  const [isInventoryExpanded, setIsInventoryExpanded] = useState(false);
  const [isFurnitureExpanded, setIsFurnitureExpanded] = useState(false);
  const [isVehiclesExpanded, setIsVehiclesExpanded] = useState(false);
  
  const [orgName, setOrgName] = useState('Sindicato de Choferes Profesionales del Cantón Espejo');
  const [logoUrl, setLogoUrl] = useState('/logo.png');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/system-settings/');
        if (response.data) {
          if (response.data.organization_name) setOrgName(response.data.organization_name);
          if (response.data.logo) setLogoUrl(response.data.logo);
        }
      } catch (error) {
        console.error("Error fetching settings in Sidebar", error);
      }
    };
    fetchSettings();
  }, []);

  const userRole = authService.getUserRole();
  const isAdmin = userRole === 'Administrador';
  const showTech = isAdmin || userRole === 'Tecnologico';
  const showFurniture = isAdmin || userRole === 'Muebles';
  const showVehicles = isAdmin || userRole === 'Conductores';

  const inventoryLinks = [
    { to: '/inventory-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/departments', icon: Layers, label: 'Departamentos' },
    { to: '/categories', icon: Tags, label: 'Categorías' },
    { to: '/suppliers', icon: Truck, label: 'Proveedores' },
    { to: '/products', icon: Package, label: 'Todo el Inventario' },
    { to: '/maintenances', icon: Wrench, label: 'Mantenimientos' },
    { to: '/discarded', icon: Package, label: 'De Baja' },
    { to: '/reports', icon: FileBarChart, label: 'Reportes' },
  ];

  const furnitureLinks = [
    { to: '/furniture/inventory-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/furniture/departments', icon: Layers, label: 'Departamentos' },
    { to: '/furniture/categories', icon: Tags, label: 'Categorías' },
    { to: '/furniture/suppliers', icon: Truck, label: 'Proveedores' },
    { to: '/furniture/products', icon: Package, label: 'Todo el Inventario' },
    { to: '/furniture/maintenances', icon: Wrench, label: 'Mantenimientos' },
    { to: '/furniture/discarded', icon: Package, label: 'De Baja' },
    { to: '/furniture/reports', icon: FileBarChart, label: 'Reportes' },
  ];

  const vehiclesLinks = [
    { to: '/vehicles/catalog', icon: Truck, label: 'Flota Vehicular' },
    { to: '/vehicles/drivers', icon: Users, label: 'Conductores' },
    { to: '/vehicles/matriculas', icon: FileBarChart, label: 'Matrícula Vehicular' },
    { to: '/vehicles/trips', icon: Layers, label: 'Control de Salidas' },
    { to: '/vehicles/maintenances', icon: Wrench, label: 'Mantenimiento Vehicular' },
    { to: '/vehicles/history', icon: FileBarChart, label: 'Historial de Viajes' },
    { to: '/vehicles/reports', icon: FileBarChart, label: 'Reportes' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div 
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 md:w-[280px] bg-emerald-900 border-r border-emerald-800 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.1)] transition-all duration-400 ease-out overflow-hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Dynamic Background Elements */}
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,_#148143_0%,_transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,_#ffcf33_0%,_transparent_50%)]"></div>
        </div>
        <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none"></div>
        <div className="py-8 flex flex-col items-center gap-4 px-6 border-b border-emerald-800/50 relative z-10">
          <div className="w-24 h-24 bg-white rounded-2xl p-1 shadow-lg overflow-hidden flex items-center justify-center">
            <img src={logoUrl} alt="Logo Sindicato" className="w-full h-full object-contain mix-blend-multiply" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <h1 className="text-sm font-bold text-white tracking-wide leading-tight text-center drop-shadow-sm">
            {orgName}
          </h1>
          <button 
            onClick={onClose}
            className="md:hidden absolute top-4 right-4 p-2 text-emerald-200 hover:text-white hover:bg-emerald-800/50 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="py-6 px-4 space-y-2 overflow-y-auto relative z-10 flex-1">
          {/* Home Link */}
          <Link
            to="/"
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3.5 mb-4 rounded-2xl transition-all duration-300 font-semibold group relative overflow-hidden ${
              location.pathname === '/'
                ? 'bg-white/10 text-white shadow-sm border border-white/10'
                : 'text-emerald-100/70 hover:bg-white/5 hover:text-white border border-transparent'
            }`}
          >
            <HomeIcon className={`w-5 h-5 ${location.pathname === '/' ? 'text-gold-400' : 'text-emerald-200/50 group-hover:text-emerald-200'}`} />
            Inicio
          </Link>

          <div className="space-y-6">
          {showTech && (
            <div>
              <button
                onClick={() => setIsInventoryExpanded(!isInventoryExpanded)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 font-semibold group relative overflow-hidden bg-white/10 text-white border border-white/10 shadow-sm`}
              >
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-emerald-400" />
                  <span className="text-left leading-tight text-sm">Equipos<br/>Tecnológicos</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-emerald-200 transition-transform duration-300 ${isInventoryExpanded ? 'rotate-180' : ''}`} />
              </button>

              <div className={`space-y-1 mt-2 overflow-hidden transition-all duration-300 ${isInventoryExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {inventoryLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to;

                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-4 py-3 ml-2 rounded-xl transition-all duration-300 font-medium group relative overflow-hidden ${
                        isActive
                          ? 'bg-white/10 text-white shadow-sm border border-white/10'
                          : 'text-emerald-100/70 hover:bg-white/5 hover:text-white border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-emerald-200/50 group-hover:text-emerald-200'}`} />
                      <span className="text-sm">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {showFurniture && (
            <div>
              <button
                onClick={() => setIsFurnitureExpanded(!isFurnitureExpanded)}
                className={`w-full flex items-center justify-between px-4 py-3.5 mt-4 rounded-2xl transition-all duration-300 font-semibold group relative overflow-hidden bg-white/10 text-white border border-white/10 shadow-sm`}
              >
                <div className="flex items-center gap-3">
                  <Armchair className="w-5 h-5 text-amber-400" />
                  <span className="text-left leading-tight text-sm">Inventario de<br/>Mobiliario</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-emerald-200 transition-transform duration-300 ${isFurnitureExpanded ? 'rotate-180' : ''}`} />
              </button>

              <div className={`space-y-1 mt-2 overflow-hidden transition-all duration-300 ${isFurnitureExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {furnitureLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);

                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-4 py-3 ml-2 rounded-xl transition-all duration-300 font-medium group relative overflow-hidden ${
                        isActive
                          ? 'bg-white/10 text-white shadow-sm border border-white/10'
                          : 'text-emerald-100/70 hover:bg-white/5 hover:text-white border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-emerald-200/50 group-hover:text-emerald-200'}`} />
                      <span className="text-sm">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {showVehicles && (
            <div>
              <button
                onClick={() => setIsVehiclesExpanded(!isVehiclesExpanded)}
                className={`w-full flex items-center justify-between px-4 py-3.5 mt-4 rounded-2xl transition-all duration-300 font-semibold group relative overflow-hidden bg-white/10 text-white border border-white/10 shadow-sm`}
              >
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-blue-400" />
                  <span className="text-left leading-tight text-sm">Gestión de<br/>Vehículos</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-emerald-200 transition-transform duration-300 ${isVehiclesExpanded ? 'rotate-180' : ''}`} />
              </button>

              <div className={`space-y-1 mt-2 overflow-hidden transition-all duration-300 ${isVehiclesExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {vehiclesLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);

                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-4 py-3 ml-2 rounded-xl transition-all duration-300 font-medium group relative overflow-hidden ${
                        isActive
                          ? 'bg-white/10 text-white shadow-sm border border-white/10'
                          : 'text-emerald-100/70 hover:bg-white/5 hover:text-white border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-emerald-200/50 group-hover:text-emerald-200'}`} />
                      <span className="text-sm">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {isAdmin && (
            <div>
              <Link
                to="/control-panel"
                onClick={onClose}
                className={`w-full flex items-center gap-3 px-4 py-3.5 mt-8 rounded-2xl transition-all duration-300 font-semibold group relative overflow-hidden bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5 shadow-sm`}
              >
                <Settings className={`w-5 h-5 text-gray-400 group-hover:text-white transition-colors ${location.pathname === '/control-panel' ? 'text-white' : ''}`} />
                <span className="text-left leading-tight text-sm">Panel de<br/>Control</span>
              </Link>
            </div>
          )}
          </div>
        </nav>

        <div className="p-4 border-t border-emerald-800/50 mt-2 relative z-10">
          <button
            onClick={() => {
              authService.logout();
              window.location.href = '/login';
            }}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors font-semibold"
          >
            <LogOut className="w-5 h-5 opacity-80" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
