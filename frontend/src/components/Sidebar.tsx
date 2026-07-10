import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Tags, Layers, LogOut, X, Truck, Wrench } from 'lucide-react';
import { authService } from '../services/authService';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/departments', icon: Layers, label: 'Departamentos' },
    { to: '/categories', icon: Tags, label: 'Categorías' },
    { to: '/suppliers', icon: Truck, label: 'Proveedores' },
    { to: '/products', icon: Package, label: 'Todo el Inventario' },
    { to: '/maintenances', icon: Wrench, label: 'Mantenimientos' },
    { to: '/discarded', icon: Package, label: 'De Baja' },
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
            <img src="/logo.png" alt="Logo Sindicato" className="w-full h-full object-contain mix-blend-multiply" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <h1 className="text-sm font-bold text-white tracking-wide leading-tight text-center drop-shadow-sm">
            Sindicato de Choferes<br/><span className="text-emerald-300 font-semibold">Profesionales del Cantón Espejo</span>
          </h1>
          <button 
            onClick={onClose}
            className="md:hidden absolute top-4 right-4 p-2 text-emerald-200 hover:text-white hover:bg-emerald-800/50 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="py-6 px-4 space-y-2 overflow-y-auto relative z-10">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);
            // Special case for dashboard to not match everything
            const isDashboard = link.to === '/';
            const finalIsActive = isDashboard ? location.pathname === '/' : isActive;

            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose} // Auto-close on mobile when clicking a link
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-semibold group relative overflow-hidden ${
                  finalIsActive
                    ? 'bg-white/10 text-white shadow-sm border border-white/10'
                    : 'text-emerald-100/70 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${finalIsActive ? 'text-gold-400' : 'text-emerald-200/50 group-hover:text-emerald-200'}`} />
                {link.label}
              </Link>
            );
          })}
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
