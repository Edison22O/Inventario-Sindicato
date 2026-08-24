import { useState, useEffect } from 'react';
import { Wrench, Search, FileDown, Eye, Printer, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { MaintenanceLog, Product } from '@/shared/types';
import jsPDF from 'jspdf';
import { applyAutoTable } from '@/shared/utils/pdfHelper';
import { useInventoryWebSocket } from '@/modules/inventory/hooks/useInventoryWebSocket';
import ProductViewModal from '@/modules/inventory/components/ProductViewModal';
import EditMaintenanceLogModal from '@/modules/maintenance/components/EditMaintenanceLogModal';
import { generateProductPDF, generateBulkProductsPDF } from '@/modules/inventory/utils/productPdfGenerator';

const Maintenances = () => {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isExportingTabla, setIsExportingTabla] = useState(false);
  const [isExportingFichas, setIsExportingFichas] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // States for Edit and Delete
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);
  const [deletingLog, setDeletingLog] = useState<MaintenanceLog | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    fetchLogs();
  }, []);

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

  const handlePrintProduct = async (productId: number) => {
    try {
      const res = await api.get(`/products/${productId}/`);
      await generateProductPDF(res.data);
    } catch (error) {
      toast.error('Error al cargar datos del equipo para imprimir');
    }
  };

  const handleSaveEdit = async (id: number, data: any) => {
    await api.put(`/maintenances/${id}/`, data);
    fetchLogs();
  };

  const handleConfirmDelete = async () => {
    if (!deletingLog) return;
    setIsDeleting(true);
    try {
      await api.delete(`/maintenances/${deletingLog.id}/`);
      toast.success('Mantenimiento eliminado con éxito');
      setDeletingLog(null);
      fetchLogs();
    } catch (error) {
      console.error('Error al eliminar mantenimiento:', error);
      toast.error('Error al eliminar el mantenimiento');
    } finally {
      setIsDeleting(false);
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
    URL.revokeObjectURL(url);
  };

  const handleExportTabla = () => {
    if (isExportingTabla) return;
    setIsExportingTabla(true);
    const toastId = toast.loading('Generando PDF...');
    
    try {
      const tableData = filteredLogs.map(l => {
        return [
          l.fecha ? new Date(`${l.fecha}T12:00:00`).toLocaleDateString('es-EC') : '-',
          l.product_codigo || '',
          l.product_nombre || '',
          l.realizado_por || '',
          `$${Number(l.costo || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`,
          l.estado_resultante || '',
          l.descripcion || ''
        ];
      });

      const doc = new jsPDF('landscape');
      doc.setFontSize(18);
      doc.text(`Reporte de Mantenimientos`, 14, 22);
      doc.setFontSize(11);
      doc.text(`Fecha de generacion: ${new Date().toLocaleDateString('es-EC')}`, 14, 30);

      applyAutoTable(doc, {
        startY: 35,
        head: [['Fecha', 'Codigo Equipo', 'Equipo', 'Tecnico', 'Costo', 'Estado', 'Descripcion']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] },
        styles: { fontSize: 9, minCellHeight: 14, valign: 'middle' },
        columnStyles: { 4: { halign: 'right' } }
      });
      
      doc.save(`Mantenimientos_Tabla_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generado exitosamente', { id: toastId });
    } catch (error) {
      toast.error('Error al generar el PDF', { id: toastId });
    } finally {
      setIsExportingTabla(false);
    }
  };

  const handleExportFichas = async () => {
    if (isExportingFichas) return;
    setIsExportingFichas(true);
    const toastId = toast.loading('Generando fichas técnicas...');
    try {
      const [mantRes, prodRes] = await Promise.all([
        api.get('/maintenances/'),
        api.get('/products/')
      ]);
      const logProductIds = new Set(filteredLogs.map(l => l.product));
      const targetProducts = (prodRes.data as Product[]).filter((p: Product) => logProductIds.has(p.id));
      
      await generateBulkProductsPDF(
        targetProducts, 
        mantRes.data, 
        `Mantenimientos_Fichas_${new Date().toISOString().split('T')[0]}.pdf`
      );
      toast.success('Fichas generadas', { id: toastId });
    } catch (error) {
      toast.error('Error al generar fichas técnicas', { id: toastId });
    } finally {
      setIsExportingFichas(false);
    }
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
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={handleExport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm font-medium"
            title="Exportar CSV"
          >
            <FileDown className="w-5 h-5" /> CSV
          </button>
          <button 
            onClick={handleExportTabla}
            disabled={isExportingTabla}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium border border-gray-200 disabled:opacity-50"
            title="Exportar Tabla (Resumen)"
          >
            <FileDown className="w-5 h-5" /> Tabla (Resumen)
          </button>
          <button 
            onClick={handleExportFichas}
            disabled={isExportingFichas}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors font-medium border border-emerald-200 disabled:opacity-50"
            title="Exportar Fichas Técnicas"
          >
            <Printer className="w-5 h-5" /> Fichas Técnicas
          </button>
        </div>
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
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => handleViewProduct(log.product)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver Detalles del Equipo"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePrintProduct(log.product)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Imprimir Ficha Técnica"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingLog(log)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Editar Mantenimiento"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingLog(log)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar Mantenimiento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
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

      {/* View Product Modal */}
      <ProductViewModal 
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        product={selectedProduct}
      />

      {/* Edit Maintenance Log Modal */}
      <EditMaintenanceLogModal
        isOpen={!!editingLog}
        onClose={() => setEditingLog(null)}
        onSave={handleSaveEdit}
        log={editingLog}
      />

      {/* Delete Maintenance Confirmation Modal */}
      {deletingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 overflow-hidden">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">¿Eliminar Mantenimiento?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar el registro de mantenimiento para el equipo{' '}
              <span className="font-semibold text-gray-900">{deletingLog.product_nombre}</span> ({deletingLog.product_codigo})?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingLog(null)}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Eliminar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenances;
