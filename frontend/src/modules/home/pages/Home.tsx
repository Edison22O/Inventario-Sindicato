import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Layers, ArrowRight, Monitor, Armchair, LayoutDashboard, UserCheck, Award, Clock, FileText } from 'lucide-react';

import { authService } from '@/services/authService';
import api from '@/shared/services/api';
import DriverSelfProfileModal from '@/modules/vehicles/components/DriverSelfProfileModal';

const Home = () => {
  const userRole = authService.getUserRole();
  const userName = authService.getUserName();
  const [orgName, setOrgName] = useState('Sindicato de Choferes');
  const [logoUrl, setLogoUrl] = useState('/logo.png');
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [myProfileStatus, setMyProfileStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        const response = await api.get('/system-settings/');
        if (response.data) {
          if (response.data.organization_name) setOrgName(response.data.organization_name);
          if (response.data.logo) setLogoUrl(response.data.logo);
        }
      } catch (error) {
        console.error('Error fetching org data', error);
      }
    };
    fetchOrgData();
    checkMyProfile();
  }, []);

  const checkMyProfile = async () => {
    try {
      const res = await api.get('/driver-profiles/me/');
      if (res.data && res.data.exists) {
        setMyProfileStatus('Completado');
      } else {
        setMyProfileStatus('Pendiente');
      }
    } catch (error) {
      setMyProfileStatus(null);
    }
  };

  const techActions = [
    {
      title: 'Inventario Tecnológico',
      description: 'Explora y gestiona todos los activos tecnológicos.',
      icon: Monitor,
      to: '/inventory-dashboard',
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-500'
    }
  ];

  const furnitureActions = [
    {
      title: 'Inventario de Mobiliario',
      description: 'Administra sillas, mesas, estantes y más.',
      icon: Armchair,
      to: '/furniture/inventory-dashboard',
      color: 'bg-amber-500',
      lightColor: 'bg-amber-500/10',
      textColor: 'text-amber-500'
    }
  ];

  const drivingSchoolActions = [
    {
      title: 'Horario del Instructor',
      description: 'Consulta visual e informativa de clases asignadas.',
      icon: Clock,
      to: '/instructor-schedules',
      color: 'bg-emerald-600',
      lightColor: 'bg-emerald-600/10',
      textColor: 'text-emerald-600'
    },
    {
      title: 'Calificación por Fases',
      description: 'Calificaciones por 5 fases y rotación vehicular.',
      icon: Award,
      to: '/evaluations',
      color: 'bg-amber-600',
      lightColor: 'bg-amber-600/10',
      textColor: 'text-amber-600'
    },
    {
      title: 'Reporte de Instructores',
      description: 'Control semanal e informe de práctica.',
      icon: FileText,
      to: '/instructor-reports',
      color: 'bg-teal-600',
      lightColor: 'bg-teal-600/10',
      textColor: 'text-teal-600'
    }
  ];

  const conductorActions = [
    {
      title: 'Control de Salidas',
      description: 'Registra entradas, salidas y evidencias de viajes.',
      icon: Layers,
      to: '/vehicles/trips',
      color: 'bg-purple-500',
      lightColor: 'bg-purple-500/10',
      textColor: 'text-purple-500'
    }
  ];

  const vehicleActions = [
    ...conductorActions,
    {
      title: 'Mantenimiento Vehicular',
      description: 'Consulta y reporta mantenimientos de la flota.',
      icon: Truck,
      to: '/vehicles/maintenances',
      color: 'bg-blue-500',
      lightColor: 'bg-blue-500/10',
      textColor: 'text-blue-500'
    }
  ];

  const vehicleAdminActions = [
    {
      title: 'Panel de Control Vehicular',
      description: 'Resumen general, alertas e indicadores de vehículos.',
      icon: LayoutDashboard,
      to: '/vehicles/dashboard',
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-500'
    },
    {
      title: 'Flota Vehicular',
      description: 'Registra y controla los vehículos del sindicato.',
      icon: Truck,
      to: '/vehicles/catalog',
      color: 'bg-blue-500',
      lightColor: 'bg-blue-500/10',
      textColor: 'text-blue-500'
    }
  ];

  const isGlobalAdmin = authService.isGlobalAdmin();
  const isVehicleAdmin = authService.isVehicleAdmin();
  const isTech = authService.isTech();
  const isFurniture = authService.isFurniture();
  const isConductor = authService.isConductor();

  let quickActions: any[] = [];

  if (isGlobalAdmin) {
    quickActions = [...techActions, ...furnitureActions, ...drivingSchoolActions, ...vehicleAdminActions, ...vehicleActions];
  } else {
    if (isTech) quickActions.push(...techActions);
    if (isFurniture) quickActions.push(...furnitureActions);
    quickActions.push(...drivingSchoolActions);
    if (isVehicleAdmin) quickActions.push(...vehicleAdminActions);
    if (isConductor) quickActions.push(...conductorActions);
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#f8fafc]">
      {/* Premium Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-emerald-200/40 to-emerald-400/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-blue-200/40 to-blue-400/10 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-[30%] left-[20%] w-[40%] h-[40%] rounded-full bg-gradient-to-tr from-yellow-100/30 to-transparent blur-[100px]" />
      </div>
      
      <div className="relative z-10 max-w-6xl mx-auto w-full px-6 py-12">
        {/* Header Section */}
        <div className="mb-12 text-center animate-fade-in-up">
          <div className="relative z-10 flex flex-col items-center pt-10 pb-8 px-4">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-xl p-2 mb-8 animate-bounce-slow">
              <img src={logoUrl} alt="Logo Sindicato" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-emerald-600 tracking-tight text-center mb-4 drop-shadow-sm">
              Bienvenido, <span className="text-emerald-500">{userName || userRole}</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 text-center max-w-2xl font-medium">
              Sistema Integrado de <span className="text-emerald-700 font-bold">{orgName}</span>
            </p>
          </div>
        </div>

        {/* Driver Profile Registration Banner / Card */}
        {isConductor && (
          <div className="mb-10 animate-fade-in-up">
            <div 
              onClick={() => setIsDriverModalOpen(true)}
              className="group relative bg-gradient-to-r from-emerald-600 to-teal-700 p-8 rounded-[2.5rem] shadow-xl text-white cursor-pointer hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 overflow-hidden border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-6"
            >
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
              
              <div className="flex items-center gap-6 z-10">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 group-hover:rotate-6 transition-transform duration-300">
                  <UserCheck className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold">Mi Perfil de Conductor</h2>
                    {myProfileStatus && (
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase ${
                        myProfileStatus === 'Completado' 
                          ? 'bg-emerald-400/30 text-emerald-100 border border-emerald-300/40' 
                          : 'bg-amber-400/30 text-amber-100 border border-amber-300/40'
                      }`}>
                        {myProfileStatus}
                      </span>
                    )}
                  </div>
                  <p className="text-emerald-100 text-sm max-w-xl">
                    Completa o actualiza tu licencia, teléfono, tipo de sangre y contacto de emergencia para figurar en el directorio oficial de conductores.
                  </p>
                </div>
              </div>

              <div className="z-10 shrink-0">
                <button className="px-6 py-3 bg-white text-emerald-800 font-bold rounded-2xl shadow-md hover:bg-emerald-50 transition-colors flex items-center gap-2">
                  <span>{myProfileStatus === 'Completado' ? 'Editar Mi Perfil' : 'Completar Perfil'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        {quickActions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link 
                  key={index} 
                  to={action.to}
                  className="group relative bg-white/60 backdrop-blur-2xl p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:bg-white/90 transition-all duration-500 transform hover:-translate-y-2 overflow-hidden flex flex-col justify-between"
                >
                  <div className={`absolute top-0 right-0 w-64 h-64 ${action.color} opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:opacity-15 transition-opacity duration-500`} />
                  
                  <div className="relative z-10 flex items-start justify-between">
                    <div className="flex-1 pr-6">
                      <div className={`w-16 h-16 rounded-2xl ${action.lightColor} flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                        <Icon className={`w-8 h-8 ${action.textColor}`} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight group-hover:text-emerald-800 transition-colors">{action.title}</h3>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed">{action.description}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-gray-400 group-hover:${action.color} group-hover:text-white transition-all duration-500 group-hover:rotate-[-45deg] shrink-0 border border-gray-100 group-hover:border-transparent`}>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 bg-white/50 backdrop-blur-sm p-12 rounded-3xl border border-gray-100">
            No tienes módulos asignados. Contacta al administrador.
          </div>
        )}

        {/* Decorative footer text */}
        <div className="mt-16 text-center text-sm font-semibold text-gray-400 uppercase tracking-widest animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          {quickActions.length > 0 ? 'Selecciona un módulo para comenzar' : ''}
        </div>
      </div>

      {/* Driver Self Profile Modal */}
      <DriverSelfProfileModal
        isOpen={isDriverModalOpen}
        onClose={() => setIsDriverModalOpen(false)}
        onSuccess={() => checkMyProfile()}
      />
    </div>
  );
};

export default Home;
