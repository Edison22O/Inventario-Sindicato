import { useState, useEffect } from 'react';
import { Package, Tags, Layers, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import type { Product } from '../types/index';
import type { Department } from '../types/index';
import type { Category } from '../types/index';
import MaintenanceModal from '../components/MaintenanceModal';

const Dashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Maintenance Modal State
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [selectedAlertProduct, setSelectedAlertProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, depRes, catRes] = await Promise.all([
        api.get('/products/'),
        api.get('/departments/'),
        api.get('/categories/')
      ]);
      setProducts(prodRes.data);
      setDepartments(depRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalAssets = products.reduce((acc, curr) => acc + curr.cantidad, 0);
  const totalValue = products.reduce((acc, curr) => acc + (Number(curr.costo) * curr.cantidad), 0);
  const badStateProducts = products.filter(p => p.estado?.toLowerCase() === 'malo' || p.estado?.toLowerCase() === 'de baja');
  const regularStateProducts = products.filter(p => p.estado?.toLowerCase() === 'regular');

  const departmentSummary = departments.map((dep) => {
    const depProducts = products.filter(p => p.department === dep.id);
    const totalEquipos = depProducts.reduce((acc, curr) => acc + curr.cantidad, 0);
    const totalCosto = depProducts.reduce((acc, curr) => acc + (Number(curr.costo) * curr.cantidad), 0);
    return {
      ubicacion: dep.name,
      costo: totalCosto,
      equipos: totalEquipos
    };
  }).sort((a, b) => a.ubicacion.localeCompare(b.ubicacion))
    .map((dep, index) => ({ ...dep, nro: index + 1 }));

  const grandTotalCosto = departmentSummary.reduce((acc, curr) => acc + curr.costo, 0);
  const grandTotalEquipos = departmentSummary.reduce((acc, curr) => acc + curr.equipos, 0);

  const handleOpenMaintenance = (product: Product) => {
    setSelectedAlertProduct(product);
    setIsMaintenanceModalOpen(true);
  };

  const handleSaveMaintenance = async (id: number, data: { estado: string; fecha_ultimo_mantenimiento: string }) => {
    await api.patch(`/products/${id}/`, data);
    fetchData(); // Refrescar el dashboard para que la alerta desaparezca
  };

  const estadoData = [
    { name: 'Bueno', value: products.filter(p => p.estado?.toLowerCase() === 'bueno' || p.estado?.toLowerCase() === 'bueno (resuelto)').length },
    { name: 'Regular', value: regularStateProducts.length },
    { name: 'Malo', value: products.filter(p => p.estado?.toLowerCase() === 'malo').length },
    { name: 'De Baja', value: products.filter(p => p.estado?.toLowerCase() === 'de baja').length },
  ].filter(d => d.value > 0);

  const stats = [
    {
      title: 'Total de Activos',
      value: totalAssets.toLocaleString(),
      icon: Package,
      color: 'bg-emerald-50 text-emerald-600',
      trend: '+12% este mes'
    },
    {
      title: 'Departamentos',
      value: departments.length.toLocaleString(),
      icon: Layers,
      color: 'bg-blue-50 text-blue-600',
      trend: 'Activos en uso'
    },
    {
      title: 'Valor Total',
      value: `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'bg-green-50 text-green-600',
      trend: 'Inversión actual'
    },
    {
      title: 'Atención Requerida',
      value: (badStateProducts.length + regularStateProducts.length).toString(),
      icon: AlertTriangle,
      color: 'bg-amber-50 text-amber-600',
      trend: 'Equipos en mal estado'
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Panel de Control</h1>
        <p className="text-gray-500 mt-2 text-lg font-medium">Resumen general del inventario institucional</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-4 rounded-2xl ${stat.color} shadow-inner`}>
                  <Icon className="w-7 h-7" />
                </div>
              </div>
              <h3 className="text-gray-500 text-sm font-semibold mb-1 uppercase tracking-wider">{stat.title}</h3>
              <div className="text-4xl font-black text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-400 mt-2 font-medium bg-gray-50/50 inline-block px-3 py-1 rounded-lg">{stat.trend}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* Gráfica de Barras: Inversión por Ubicación */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-8 flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl"><TrendingUp className="w-6 h-6 text-emerald-600" /></div>
            Inversión por Ubicación
          </h2>
          <div className="flex-1 min-h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentSummary.slice(0, 8)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="ubicacion" tick={{ fontSize: 11 }} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(val) => `$${val}`} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, 'Inversión']}
                  labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f9fafb' }}
                />
                <Bar dataKey="costo" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-center text-gray-400 mt-4">Mostrando las 8 ubicaciones principales.</p>
        </div>

        {/* Gráfica Circular: Estado Físico */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-8 flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl"><Package className="w-6 h-6 text-emerald-600" /></div>
            Estado Físico de Equipos
          </h2>
          <div className="flex-1 min-h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={estadoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {estadoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.name === 'Bueno' ? '#10b981' : 
                      entry.name === 'Regular' ? '#f59e0b' : 
                      entry.name === 'Malo' ? '#ef4444' : '#6b7280'
                    } />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'medium' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-xl"><AlertTriangle className="w-6 h-6 text-amber-600" /></div>
            Alertas de Mantenimiento
          </h2>
          <div className="space-y-4">
            {badStateProducts.length === 0 && regularStateProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Todos los equipos están en buen estado.</p>
            ) : (
              <>
                {badStateProducts.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => handleOpenMaintenance(p)}
                    className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center text-red-700 font-bold">!</div>
                      <div>
                        <p className="font-semibold text-gray-900">{p.nombre}</p>
                        <p className="text-sm text-red-600 font-medium">{p.estado || 'Malo'} - Clic para resolver</p>
                      </div>
                    </div>
                  </div>
                ))}
                {regularStateProducts.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => handleOpenMaintenance(p)}
                    className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100 hover:bg-amber-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold">!</div>
                      <div>
                        <p className="font-semibold text-gray-900">{p.nombre}</p>
                        <p className="text-sm text-amber-600 font-medium">{p.estado || 'Regular'} - Clic para revisar</p>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl"><Package className="w-6 h-6 text-emerald-600" /></div>
            Activos Recientes
          </h2>
          <div className="space-y-4">
            {products.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{p.nombre}</p>
                    <p className="text-sm text-gray-500">{p.marca || 'Sin marca'} - {p.department_name || p.department}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${p.costo}</p>
                  <p className="text-sm text-gray-500">Cant: {p.cantidad}</p>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <p className="text-gray-500 text-center py-4">No hay activos registrados aún.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white overflow-hidden mb-10">
        <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white/50">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl"><Layers className="w-6 h-6 text-emerald-600" /></div>
            Resumen de Costos por Ubicación
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-emerald-600 text-white">
                <th className="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider w-20 border-r border-emerald-500">NRO</th>
                <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider border-r border-emerald-500">Ubicación</th>
                <th className="px-6 py-4 text-right text-sm font-semibold uppercase tracking-wider w-40 border-r border-emerald-500">Costo</th>
                <th className="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider w-32"># Equipos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {departmentSummary.map((dep) => (
                <tr key={dep.nro} className="hover:bg-emerald-50/30 transition-colors">
                  <td className="px-6 py-3 text-center text-sm font-medium text-gray-900 border-r border-gray-100">{dep.nro}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 uppercase font-medium border-r border-gray-100">{dep.ubicacion}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 text-right font-mono border-r border-gray-100">
                    {dep.costo.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900 text-center font-mono">
                    {dep.equipos}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td colSpan={2} className="px-6 py-4 text-right text-sm text-gray-900 uppercase border-r border-gray-200">
                  TOTAL:
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900 font-mono border-r border-gray-200">
                  {grandTotalCosto.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-900 font-mono">
                  {grandTotalEquipos}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <MaintenanceModal 
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        onSave={handleSaveMaintenance}
        product={selectedAlertProduct}
      />
    </div>
  );
};

export default Dashboard;
