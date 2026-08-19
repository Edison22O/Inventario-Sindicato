import React, { useState, useEffect } from 'react';
import { X, Calendar, Wrench, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { MaintenanceLog } from '@/shared/types';

interface EditMaintenanceLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: {
    fecha: string;
    realizado_por: string;
    descripcion: string;
    costo: number | string;
    estado_resultante: string;
    product: number;
  }) => Promise<void>;
  log: MaintenanceLog | null;
}

const EditMaintenanceLogModal: React.FC<EditMaintenanceLogModalProps> = ({
  isOpen,
  onClose,
  onSave,
  log
}) => {
  const [estado, setEstado] = useState('Bueno');
  const [fecha, setFecha] = useState('');
  const [realizadoPor, setRealizadoPor] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [costo, setCosto] = useState('0.00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (log) {
      setFecha(log.fecha || new Date().toISOString().split('T')[0]);
      setRealizadoPor(log.realizado_por || '');
      setDescripcion(log.descripcion || '');
      setCosto(log.costo ? String(log.costo) : '0.00');
      
      const validStates = ['Bueno', 'Regular', 'Malo', 'De Baja'];
      const matchedState = validStates.find(
        s => s.toLowerCase() === (log.estado_resultante || '').toLowerCase()
      ) || 'Bueno';
      setEstado(matchedState);
    }
  }, [log, isOpen]);

  if (!isOpen || !log) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSave(log.id, {
        product: log.product,
        fecha,
        realizado_por: realizadoPor,
        descripcion,
        costo,
        estado_resultante: estado
      });
      toast.success('Mantenimiento actualizado con éxito');
      onClose();
    } catch (error: any) {
      console.error('Error al actualizar el mantenimiento:', error);
      toast.error('Error al actualizar el mantenimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-emerald-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-600" />
              Editar Mantenimiento
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Modifica los detalles del registro de mantenimiento seleccionado.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {/* Read Only Equipment Info Banner */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Equipo Asociado
            </div>
            <div className="font-bold text-gray-900 text-base">{log.product_nombre || 'N/A'}</div>
            {log.product_codigo && (
              <div className="text-xs text-gray-500 font-mono mt-0.5">
                Código: {log.product_codigo}
              </div>
            )}
          </div>

          <form id="editMaintenanceForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado Resultante del Equipo
                </label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 font-medium text-gray-900 shadow-sm"
                >
                  <option value="Bueno">Bueno</option>
                  <option value="Regular">Regular</option>
                  <option value="Malo">Malo</option>
                  <option value="De Baja">De Baja</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Fecha de Revisión
                  </div>
                </label>
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Realizado por *
                </label>
                <input
                  type="text"
                  required
                  value={realizadoPor}
                  onChange={(e) => setRealizadoPor(e.target.value)}
                  placeholder="Nombre del técnico o taller"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Costo ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={costo}
                  onChange={(e) => setCosto(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción del Trabajo *
              </label>
              <textarea
                required
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalla las reparaciones o mantenimientos realizados..."
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 shadow-sm"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="editMaintenanceForm"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMaintenanceLogModal;
