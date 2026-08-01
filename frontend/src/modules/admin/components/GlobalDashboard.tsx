import { useState, useEffect } from 'react';
import { Users, Monitor, Armchair, Truck, Activity } from 'lucide-react';
import api from '@/shared/services/api';

const GlobalDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    tech_assets: 0,
    furniture_assets: 0,
    vehicles: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/admin-stats/summary/');
        setStats(response.data);
      } catch (error) {
        console.error("Error fetching stats", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) return <div className="text-center py-10">Cargando métricas...</div>;

  const totalAssets = stats.tech_assets + stats.furniture_assets + stats.vehicles;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Visión General del Sistema</h2>
          <p className="text-gray-500">Métricas en tiempo real de todos los módulos operando.</p>
        </div>
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100">
          <Activity className="w-8 h-8" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-700">Usuarios</h3>
          </div>
          <p className="text-4xl font-black text-gray-900">{stats.users}</p>
          <p className="text-sm text-gray-500 mt-2">Cuentas activas en el sistema</p>
        </div>

        {/* Tech */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500 opacity-5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-yellow-50 text-gold-600 rounded-xl border border-yellow-100 shadow-sm">
              <Monitor className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-700">Técnologicos</h3>
          </div>
          <p className="text-4xl font-black text-gray-900">{stats.tech_assets}</p>
          <p className="text-sm text-gray-500 mt-2">Equipos y dispositivos</p>
        </div>

        {/* Furniture */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-sm">
              <Armchair className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-700">Mobiliario</h3>
          </div>
          <p className="text-4xl font-black text-gray-900">{stats.furniture_assets}</p>
          <p className="text-sm text-gray-500 mt-2">Muebles y enseres</p>
        </div>

        {/* Vehicles */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500 opacity-5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-yellow-50 text-gold-600 rounded-xl border border-yellow-100 shadow-sm">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-700">Vehículos</h3>
          </div>
          <p className="text-4xl font-black text-gray-900">{stats.vehicles}</p>
          <p className="text-sm text-gray-500 mt-2">Flota automotriz</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-900 to-emerald-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg border border-emerald-800">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Total de Elementos Controlados</h3>
            <p className="text-gray-400">Sumatoria de todos los inventarios y flotas gestionados por la plataforma.</p>
          </div>
          <div className="mt-4 md:mt-0 text-5xl font-black text-gold-400 drop-shadow-[0_0_15px_rgba(255,207,51,0.3)]">
            {totalAssets}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalDashboard;
