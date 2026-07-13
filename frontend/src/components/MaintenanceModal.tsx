import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Product } from '../types';
import { getImageUrl } from '../utils/getImageUrl';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: { estado_resultante: string; fecha: string; realizado_por: string; descripcion: string; costo: number | string; product: number }) => Promise<void>;
  product: Product | null;
}

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ isOpen, onClose, onSave, product }) => {
  const [estado, setEstado] = useState('Bueno');
  const [fechaMantenimiento, setFechaMantenimiento] = useState('');
  const [realizadoPor, setRealizadoPor] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [costo, setCosto] = useState('0.00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  useEffect(() => {
    if (product) {
      const validStates = ['Bueno', 'Regular', 'Malo', 'De Baja'];
      const currentState = product.estado ? product.estado.toLowerCase() : '';
      const matchedState = validStates.find(s => s.toLowerCase() === currentState) || 'Bueno';
      
      setEstado(matchedState);
      
      // Set today's date as default for maintenance if not set
      const today = new Date().toISOString().split('T')[0];
      setFechaMantenimiento(product.fecha_ultimo_mantenimiento || today);
      setRealizadoPor('');
      setDescripcion('');
      setCosto('0.00');
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSave(product.id, {
        product: product.id,
        estado_resultante: estado,
        fecha: fechaMantenimiento,
        realizado_por: realizadoPor,
        descripcion: descripcion,
        costo: costo
      });
      toast.success('Mantenimiento registrado con éxito');
      onClose();
    } catch (error: any) {
      console.error('Error saving maintenance:', error);
      toast.error('Error al guardar el mantenimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-amber-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              Resolver Alerta de Mantenimiento
            </h2>
            <p className="text-sm text-gray-500 mt-1">Actualiza el estado físico del equipo tras la revisión.</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Read Only Info */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8 flex flex-col sm:flex-row gap-6 items-start">
            <div 
              className="w-24 h-24 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={() => product.image && setIsImageExpanded(true)}
              title={product.image ? "Haz clic para ampliar la imagen" : ""}
            >
              {product.image ? (
                <img src={getImageUrl(product.image)} alt="Product" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-gray-300" />
              )}
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{product.nombre}</h3>
                <p className="text-sm text-gray-500 font-medium">Código: {product.codigo}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>{product.department_name || product.department}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Marca:</span> {product.marca || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Modelo:</span> {product.modelo || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Serie:</span> {product.serie || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <form id="maintenanceForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nuevo Estado del Equipo</label>
                <select 
                  value={estado} 
                  onChange={(e) => setEstado(e.target.value)} 
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-amber-500 focus:border-amber-500 font-medium text-gray-900 shadow-sm"
                >
                  <option value="Bueno">Bueno (Resuelto)</option>
                  <option value="Regular">Regular</option>
                  <option value="Malo">Malo</option>
                  <option value="De Baja">De Baja</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">Cámbialo a "Bueno" para quitar la alerta del panel.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fecha de la Revisión
                  </div>
                </label>
                <input 
                  type="date" 
                  required
                  value={fechaMantenimiento} 
                  onChange={(e) => setFechaMantenimiento(e.target.value)} 
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-amber-500 focus:border-amber-500 text-gray-900 shadow-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Realizado por *</label>
                <input 
                  type="text" 
                  required
                  value={realizadoPor} 
                  onChange={(e) => setRealizadoPor(e.target.value)} 
                  placeholder="Nombre del técnico o taller"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-amber-500 focus:border-amber-500 text-gray-900 shadow-sm" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Costo del Mantenimiento ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  required
                  value={costo} 
                  onChange={(e) => setCosto(e.target.value)} 
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-amber-500 focus:border-amber-500 text-gray-900 shadow-sm" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descripción del Trabajo *</label>
              <textarea 
                required
                rows={3}
                value={descripcion} 
                onChange={(e) => setDescripcion(e.target.value)} 
                placeholder="Detalla qué reparaciones o ajustes se le hicieron al equipo..."
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-amber-500 focus:border-amber-500 text-gray-900 shadow-sm" 
              />
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" form="maintenanceForm" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            Guardar Mantenimiento
          </button>
        </div>
      </div>

      {/* Expanded Image Overlay */}
      {isImageExpanded && product.image && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setIsImageExpanded(false)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <button 
              className="absolute -top-12 right-0 text-white hover:text-amber-400 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsImageExpanded(false);
              }}
            >
              <X className="w-8 h-8" />
            </button>
            <img 
              src={getImageUrl(product.image)} 
              alt="Ampliada" 
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceModal;
