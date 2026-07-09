import React from 'react';
import { X, Truck, Building2, User, Phone, Mail, MapPin } from 'lucide-react';
import type { Supplier } from '../types';

interface SupplierViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

const SupplierViewModal: React.FC<SupplierViewModalProps> = ({ isOpen, onClose, supplier }) => {
  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 to-white/50">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100/50 rounded-xl text-emerald-600">
                <Truck className="w-6 h-6" />
              </div>
              Detalles del Proveedor
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-white p-2.5 rounded-xl transition-all shadow-sm border border-transparent hover:border-gray-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8 bg-gray-50/30">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-8">
              
              <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Building2 className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-gray-900">{supplier.name}</h4>
                  <p className="text-emerald-600 font-medium">Proveedor de Inventario</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Contacto Principal</p>
                  </div>
                  <p className="text-lg font-medium text-gray-900 pl-7">{supplier.contact_name || <span className="text-gray-400 italic">No registrado</span>}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Teléfono</p>
                  </div>
                  <p className="text-lg font-medium text-gray-900 pl-7">{supplier.phone || <span className="text-gray-400 italic">No registrado</span>}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Correo Electrónico</p>
                  </div>
                  <p className="text-lg font-medium text-gray-900 pl-7">{supplier.email || <span className="text-gray-400 italic">No registrado</span>}</p>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Dirección Física</p>
                  </div>
                  <p className="text-lg font-medium text-gray-900 pl-7">{supplier.address || <span className="text-gray-400 italic">No registrada</span>}</p>
                </div>
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

export default SupplierViewModal;
