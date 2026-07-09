import { useState, useEffect } from 'react';
import { Package, Tags, Layers, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import { useInventoryWebSocket } from '../hooks/useInventoryWebSocket';
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

  const categorySummary = categories.map((cat) => {
    const catProducts = products.filter(p => p.category === cat.id);
    const totalEquipos = catProducts.reduce((acc, curr) => acc + curr.cantidad, 0);
    const totalCosto = catProducts.reduce((acc, curr) => acc + (Number(curr.costo) * curr.cantidad), 0);
    return {
      categoria: cat.name,
      costo: totalCosto,
      equipos: totalEquipos
    };
  }).filter(c => c.costo > 0 || c.equipos > 0).sort((a, b) => b.costo - a.costo);

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

  useInventoryWebSocket(fetchData);

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

        {/* Gráfica de Barras: Inversión por Categoría */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-8 flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl"><Tags className="w-6 h-6 text-blue-600" /></div>
            Inversión por Categoría
          </h2>
          <div className="flex-1 min-h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySummary.slice(0, 8)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="categoria" tick={{ fontSize: 11 }} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(val) => `$${val}`} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, 'Inversión']}
                  labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f9fafb' }}
                />
                <Bar dataKey="costo" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-center text-gray-400 mt-4">Mostrando las 8 categorías principales.</p>
        </div>
      </div>

      {/* Fila 3: Estado, Alertas y Recientes (3 columnas) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Gráfica Circular: Estado Físico */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-6 flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 h-[420px]">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl"><Package className="w-5 h-5 text-emerald-600" /></div>
            Estado de Equipos
          </h2>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={estadoData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
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
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alertas de Mantenimiento */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-6 flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 h-[420px]">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
            Alertas
          </h2>
          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {badStateProducts.length === 0 && regularStateProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center"><AlertTriangle className="w-6 h-6 opacity-20" /></div>
                <p className="text-sm">Todo en buen estado.</p>
              </div>
            ) : (
              <>
                {badStateProducts.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => handleOpenMaintenance(p)}
                    className="flex items-center gap-3 p-3 bg-red-50/50 rounded-xl border border-red-100 hover:bg-red-100 cursor-pointer transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center text-red-700 font-bold shrink-0">!</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm truncate">{p.nombre}</p>
                      <p className="text-xs text-red-600 font-medium">{p.estado || 'Malo'}</p>
                    </div>
                  </div>
                ))}
                {regularStateProducts.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => handleOpenMaintenance(p)}
                    className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100 hover:bg-amber-100 cursor-pointer transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold shrink-0">!</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm truncate">{p.nombre}</p>
                      <p className="text-xs text-amber-600 font-medium">{p.estado || 'Regular'}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Activos Recientes */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-6 flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 h-[420px]">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl"><Package className="w-5 h-5 text-emerald-600" /></div>
            Recientes
          </h2>
          <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {products.slice(0, 6).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-500 truncate">{p.department_name || p.department}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-emerald-700 text-sm">${p.costo}</p>
                  <p className="text-xs text-gray-500">x{p.cantidad}</p>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                <p className="text-sm">Sin registros.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fila 4: Tablas de Resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* Tabla Ubicación */}
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white overflow-hidden flex flex-col h-[400px]">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50/80 to-white/50 shrink-0">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl"><Layers className="w-5 h-5 text-emerald-700" /></div>
              Costos por Ubicación
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white/95 backdrop-blur-md z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Ubicación</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Costo</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100"># Equipos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {departmentSummary.map((dep, idx) => (
                  <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{dep.ubicacion}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-mono">${dep.costo.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-center">{dep.equipos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-5 border-t border-gray-100 bg-gray-50/80 shrink-0 flex justify-between items-center">
             <span className="font-bold text-gray-500 text-sm uppercase tracking-wider">Total General</span>
             <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-medium uppercase mb-0.5">Equipos</p>
                  <span className="font-medium text-gray-600">{grandTotalEquipos} unid.</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-emerald-500 font-medium uppercase mb-0.5">Inversión</p>
                  <span className="font-mono font-bold text-emerald-600 text-lg">${grandTotalCosto.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span>
                </div>
             </div>
          </div>
        </div>

        {/* Tabla Categoría */}
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white overflow-hidden flex flex-col h-[400px]">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50/80 to-white/50 shrink-0">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl"><Tags className="w-5 h-5 text-blue-700" /></div>
              Costos por Categoría
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white/95 backdrop-blur-md z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Categoría</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Costo</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100"># Equipos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categorySummary.map((cat, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{cat.categoria}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-mono">${cat.costo.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-center">{cat.equipos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-5 border-t border-gray-100 bg-gray-50/80 shrink-0 flex justify-between items-center">
             <span className="font-bold text-gray-500 text-sm uppercase tracking-wider">Total General</span>
             <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-medium uppercase mb-0.5">Equipos</p>
                  <span className="font-medium text-gray-600">{categorySummary.reduce((acc, curr) => acc + curr.equipos, 0)} unid.</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-500 font-medium uppercase mb-0.5">Inversión</p>
                  <span className="font-mono font-bold text-blue-600 text-lg">${categorySummary.reduce((acc, curr) => acc + curr.costo, 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span>
                </div>
             </div>
          </div>
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
