import { useState, useEffect } from 'react';
import { Wrench, Search, FileDown, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { MaintenanceLog, Product } from '../types';
import { useInventoryWebSocket } from '../hooks/useInventoryWebSocket';
import ProductViewModal from '../components/ProductViewModal';

const Maintenances = () => {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/maintenances/');
      setLogs(res.data);
    } catch (error) {
      toast.error('Error al cargar mantenimientos');
    } finally {
      setLoading(false);
    }
  };

  useInventoryWebSocket(fetchLogs);

  const handleViewProduct = async (productId: number) => {
    try {
      const res = await api.get(`/products/${productId}/`);
      setSelectedProduct(res.data);
      setIsViewModalOpen(true);
    } catch (error) {
      toast.error('Error al cargar detalles del equipo');
    }
  };

  const filteredLogs = logs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (log.product_nombre?.toLowerCase() || '').includes(searchLower) ||
      (log.product_codigo?.toLowerCase() || '').includes(searchLower) ||
      log.realizado_por.toLowerCase().includes(searchLower) ||
      log.descripcion.toLowerCase().includes(searchLower)
    );
  });

  const handleExport = () => {
    const headers = ['Fecha', 'Código Equipo', 'Nombre Equipo', 'Realizado Por', 'Costo', 'Estado Resultante', 'Descripción'];
    
    const csvRows = [
      headers.join(','),
      ...filteredLogs.map(l => [
        l.fecha,
        `"${l.product_codigo || ''}"`,
        `"${l.product_nombre || ''}"`,
        `"${l.realizado_por}"`,
        l.costo,
        `"${l.estado_resultante}"`,
        `"${l.descripcion.replace(/"/g, '""')}"`
      ].join(','))
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mantenimientos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Wrench className="w-8 h-8 text-emerald-600" />
            Registro de Mantenimientos
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Historial de todas las reparaciones y revisiones técnicas
          </p>
        </div>
        
        <button 
          onClick={handleExport}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm font-medium"
        >
          <FileDown className="w-5 h-5" />
          Exportar CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por equipo, técnico o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Fecha</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Equipo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Técnico</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Descripción</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-right">Costo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Estado Final</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                    {log.fecha ? new Date(`${log.fecha}T12:00:00`).toLocaleDateString('es-EC') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900 text-sm">{log.product_nombre}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{log.product_codigo}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {log.realizado_por}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={log.descripcion}>
                    {log.descripcion}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600 text-right">
                    ${Number(log.costo).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      log.estado_resultante.toLowerCase() === 'bueno' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      log.estado_resultante.toLowerCase() === 'regular' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      log.estado_resultante.toLowerCase() === 'malo' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      {log.estado_resultante}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleViewProduct(log.product)}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                      title="Ver Detalles del Equipo"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium text-gray-900">No hay registros</p>
                    <p className="text-sm">No se encontraron mantenimientos que coincidan con la búsqueda.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductViewModal 
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        product={selectedProduct}
      />
    </div>
  );
};

export default Maintenances;
