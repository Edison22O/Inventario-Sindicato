import React, { useState } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Vehicle } from '@/shared/types';

import { compressImage } from '@/shared/utils/imageCompressor';

interface DepartureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => Promise<void>;
  vehicle: Vehicle | null;
}

const DepartureModal: React.FC<DepartureModalProps> = ({ isOpen, onClose, onSave, vehicle }) => {
  const [formData, setFormData] = useState({
    tipo_motivo: 'Prácticas' as 'Prácticas' | 'Comisión' | 'Guincha' | 'Otro',
    ruta_practica: 'Ruta 1',
    custom_ruta: '',
    descripcion_salida: '',
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  if (!isOpen || !vehicle) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file);
        setImageFile(compressed);
        setPreviewUrl(URL.createObjectURL(compressed));
      } catch (error) {
        setImageFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      toast.error('La foto de evidencia (tablero) es obligatoria.');
      return;
    }

    setIsSubmitting(true);
    
    const finalRoute = formData.tipo_motivo === 'Prácticas' 
      ? (formData.ruta_practica === 'Otro' ? formData.custom_ruta : formData.ruta_practica)
      : '';
      
    const finalDesc = formData.tipo_motivo === 'Prácticas' 
      ? `Prácticas en ${finalRoute}. ${formData.descripcion_salida}`.trim()
      : (formData.descripcion_salida || formData.tipo_motivo);

    const data = new FormData();
    data.append('vehicle', String(vehicle.id));
    data.append('tipo_motivo', formData.tipo_motivo);
    if (finalRoute) data.append('ruta_practica', finalRoute);
    data.append('descripcion_salida', finalDesc);
    data.append('foto_evidencia_salida', imageFile);

    try {
      await onSave(data);
      toast.success('Salida registrada con éxito');
      
      setFormData({ tipo_motivo: 'Prácticas', ruta_practica: 'Ruta 1', custom_ruta: '', descripcion_salida: '' });
      setImageFile(null);
      setPreviewUrl(null);
      
      onClose();
    } catch (error) {
      toast.error("Error al registrar la salida.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Registrar Salida</h2>
            <p className="text-sm text-gray-500 mt-1">Vehículo: {vehicle.placa} - {vehicle.marca} {vehicle.modelo}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="departureForm" onSubmit={handleSubmit} className="space-y-6">
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Motivo de Salida *</label>
              <select
                name="tipo_motivo"
                value={formData.tipo_motivo}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-emerald-500"
              >
                <option value="Prácticas">Prácticas de Conducción</option>
                <option value="Comisión">Comisión</option>
                <option value="Guincha">Guincha / Remolque</option>
                <option value="Otro">Otro Motivo</option>
              </select>
            </div>

            {formData.tipo_motivo === 'Prácticas' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Ruta de Prácticas *</label>
                <select
                  name="ruta_practica"
                  value={formData.ruta_practica}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-emerald-500"
                >
                  <option value="Ruta 1">Ruta 1</option>
                  <option value="Ruta 2">Ruta 2</option>
                  <option value="Ruta 3">Ruta 3</option>
                  <option value="Otro">Agregar nueva ruta (Personalizada)...</option>
                </select>

                {formData.ruta_practica === 'Otro' && (
                  <input
                    type="text"
                    required
                    name="custom_ruta"
                    placeholder="Escribe el nombre de la nueva ruta..."
                    value={formData.custom_ruta}
                    onChange={handleChange}
                    className="w-full mt-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium"
                  />
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                {formData.tipo_motivo === 'Comisión' ? 'Detalle de la Comisión *' : 'Observaciones / Detalle Adicional'}
              </label>
              <textarea
                required={formData.tipo_motivo === 'Comisión'}
                name="descripcion_salida"
                rows={2}
                value={formData.descripcion_salida}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
                placeholder={formData.tipo_motivo === 'Comisión' ? 'Ingresa los detalles de la comisión...' : 'Detalles de la salida...'}
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
              <span className="font-semibold">Información Actual:</span> El vehículo tiene {vehicle.odometro_actual} KM y {vehicle.combustible_actual_galones} galones de combustible.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Foto Evidencia del Tablero *</label>
              <div className="flex flex-col gap-4">
                <div className="w-full h-48 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <Camera className="w-10 h-10 mb-2 group-hover:text-blue-500 transition-colors" />
                      <span className="font-medium group-hover:text-blue-500 transition-colors">Tocar para abrir cámara</span>
                    </div>
                  )}
                  {/* El atributo capture="environment" obliga a abrir la cámara trasera para evitar subir fotos viejas de la galería */}
                  <input 
                    type="file" 
                    accept="image/*"
                    capture="environment"
                    required
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <p className="text-xs text-gray-500">Toma una foto clara del tablero mostrando el kilometraje y el nivel de gasolina.</p>
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button type="submit" form="departureForm" disabled={isSubmitting || isCompressing} className="px-6 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
            {isSubmitting || isCompressing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            Registrar Salida
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepartureModal;
