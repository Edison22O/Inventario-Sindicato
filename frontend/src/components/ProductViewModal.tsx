import React from 'react';
import { X, Package, Building2, Tags, Truck, Calendar, Hash, Image as ImageIcon, CheckCircle2, AlertTriangle, XCircle, FileText } from 'lucide-react';
import type { Product } from '../types';

interface ProductViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const ProductViewModal: React.FC<ProductViewModalProps> = ({ isOpen, onClose, product }) => {
  if (!isOpen || !product) return null;

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'bueno': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'regular': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'malo': return 'text-red-700 bg-red-50 border-red-200';
      case 'de baja': return 'text-gray-700 bg-gray-50 border-gray-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'bueno': return <CheckCircle2 className="w-5 h-5" />;
      case 'regular': return <AlertTriangle className="w-5 h-5" />;
      case 'malo': return <XCircle className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
        
        <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 to-white/50">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100/50 rounded-xl text-emerald-600">
                <Package className="w-6 h-6" />
              </div>
              Detalles del Producto
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-white p-2.5 rounded-xl transition-all shadow-sm border border-transparent hover:border-gray-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Image & Primary Status */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="aspect-square rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden mb-4 relative group">
                    {product.image ? (
                      <img 
                        src={product.image.startsWith('http') ? product.image : `http://localhost:8000${product.image}`} 
                        alt={product.nombre} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <ImageIcon className="w-16 h-16 text-gray-300" />
                    )}
                  </div>
                  
                  <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-semibold text-lg ${getStatusColor(product.estado)}`}>
                    {getStatusIcon(product.estado)}
                    Estado: {product.estado || 'No definido'}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Información Financiera</h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Costo Unitario</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        ${Number(product.costo || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Cantidad en Inventario</p>
                      <p className="text-xl font-bold text-gray-900">{product.cantidad} unidades</p>
                    </div>
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500 mb-1">Costo Total</p>
                      <p className="text-xl font-bold text-gray-900">
                        ${(Number(product.costo || 0) * product.cantidad).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Details */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Identification */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <Hash className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-lg font-bold text-gray-900">Identificación</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Código de Activo</p>
                      <p className="text-base font-semibold text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 inline-block">{product.codigo}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Nombre / Descripción</p>
                      <p className="text-base font-semibold text-gray-900">{product.nombre}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Marca</p>
                      <p className="text-base font-medium text-gray-900">{product.marca || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Modelo</p>
                      <p className="text-base font-medium text-gray-900">{product.modelo || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Número de Serie</p>
                      <p className="text-base font-medium text-gray-900 font-mono">{product.serie || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Color</p>
                      <p className="text-base font-medium text-gray-900">{product.color || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Organization & Logistics */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        <p className="text-sm font-bold text-gray-700">Ubicación</p>
                      </div>
                      <p className="text-base font-medium text-gray-900">{product.department_name || product.department}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Tags className="w-4 h-4 text-emerald-600" />
                        <p className="text-sm font-bold text-gray-700">Categoría</p>
                      </div>
                      <p className="text-base font-medium text-gray-900">{product.category_name || product.category || '-'}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="w-4 h-4 text-emerald-600" />
                        <p className="text-sm font-bold text-gray-700">Proveedor</p>
                      </div>
                      <p className="text-base font-medium text-gray-900">{product.supplier_name || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-lg font-bold text-gray-900">Fechas Importantes</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Fecha de Ingreso al Sistema</p>
                      <p className="text-base font-medium text-gray-900">{product.fecha_ingreso ? new Date(product.fecha_ingreso).toLocaleDateString('es-EC') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Fecha de Compra</p>
                      <p className="text-base font-medium text-gray-900">{product.fecha_compra ? new Date(product.fecha_compra).toLocaleDateString('es-EC') : '-'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-gray-500 mb-1">Último Mantenimiento</p>
                      <p className="text-base font-medium text-gray-900">{product.fecha_ultimo_mantenimiento ? new Date(product.fecha_ultimo_mantenimiento).toLocaleDateString('es-EC') : '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Specs */}
                {product.caracteristicas && (
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="w-5 h-5 text-emerald-600" />
                      <h4 className="text-lg font-bold text-gray-900">Características Adicionales</h4>
                    </div>
                    <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {product.caracteristicas}
                    </p>
                  </div>
                )}

              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 flex justify-end bg-white">
            <button
              onClick={onClose}
              className="px-8 py-3 text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all shadow-md"
            >
              Cerrar Detalles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductViewModal;
