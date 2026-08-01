import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { authService } from '@/services/authService';
import Sidebar from '@/shared/components/Sidebar';
import api from '@/shared/services/api';

const ProtectedRoute = () => {
  const isAuthenticated = authService.isAuthenticated();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
        console.error("Error fetching settings in ProtectedRoute", error);
      }
    };
    if (isAuthenticated) {
      fetchSettings();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <h1 className="text-sm font-bold text-emerald-800 tracking-wide leading-tight line-clamp-2 max-w-[200px]">
            {orgName}
          </h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
};

export default ProtectedRoute;
