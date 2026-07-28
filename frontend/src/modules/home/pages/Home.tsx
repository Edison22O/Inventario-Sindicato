import { Link } from 'react-router-dom';
import { Package, Truck, Layers, Wrench, ArrowRight } from 'lucide-react';

const Home = () => {
  const quickActions = [
    {
      title: 'Catálogo de Equipos',
      description: 'Explora y gestiona todos los activos tecnológicos.',
      icon: Package,
      to: '/products',
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-500'
    },
    {
      title: 'Mantenimientos',
      description: 'Registra o consulta el historial de reparaciones.',
      icon: Wrench,
      to: '/maintenances',
      color: 'bg-blue-500',
      lightColor: 'bg-blue-500/10',
      textColor: 'text-blue-500'
    },
    {
      title: 'Departamentos',
      description: 'Administra las ubicaciones físicas de los equipos.',
      icon: Layers,
      to: '/departments',
      color: 'bg-purple-500',
      lightColor: 'bg-purple-500/10',
      textColor: 'text-purple-500'
    },
    {
      title: 'Proveedores',
      description: 'Directorio de proveedores y contactos técnicos.',
      icon: Truck,
      to: '/suppliers',
      color: 'bg-amber-500',
      lightColor: 'bg-amber-500/10',
      textColor: 'text-amber-500'
    }
  ];

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
        <div className="mb-20 text-center animate-fade-in-up">
          <div className="inline-flex items-center justify-center p-4 bg-white/80 backdrop-blur-md rounded-3xl mb-8 shadow-xl shadow-emerald-900/5 ring-1 ring-black/5">
            <img src="/logo.png" alt="Logo Sindicato" className="w-20 h-20 object-contain mix-blend-multiply" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-emerald-500 tracking-tight mb-6 drop-shadow-sm">
            Bienvenido al Sistema
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 font-medium max-w-3xl mx-auto leading-relaxed">
            Gestión Inteligente del <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg">Sindicato de Choferes Profesionales del Cantón Espejo</span>
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
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
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight group-hover:text-emerald-800 transition-colors">{action.title}</h3>
                    <p className="text-gray-500 font-medium leading-relaxed">{action.description}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-gray-400 group-hover:${action.color} group-hover:text-white transition-all duration-500 group-hover:rotate-[-45deg] shrink-0 border border-gray-100 group-hover:border-transparent`}>
                    <ArrowRight className="w-6 h-6" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Decorative footer text */}
        <div className="mt-20 text-center text-sm font-semibold text-gray-400 uppercase tracking-widest animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          Selecciona un módulo para comenzar
        </div>
      </div>
    </div>
  );
};

export default Home;
