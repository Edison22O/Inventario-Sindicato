import React, { useState } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Vehicle } from '@/shared/types';

interface DepartureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => Promise<void>;
  vehicle: Vehicle | null;
}

const DepartureModal: React.FC<DepartureModalProps> = ({ isOpen, onClose, onSave, vehicle }) => {
  const [formData, setFormData] = useState({
    descripcion_salida: '',
    kilometraje_salida: '',
    gasolina_salida: '100',
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !vehicle) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      toast.error('La foto de evidencia (tablero) es obligatoria.');
      return;
    }

    setIsSubmitting(true);
    
    const data = new FormData();
    data.append('vehicle', String(vehicle.id));
    data.append('descripcion_salida', formData.descripcion_salida);
    data.append('kilometraje_salida', formData.kilometraje_salida);
    data.append('gasolina_salida', formData.gasolina_salida);
    data.append('foto_evidencia_salida', imageFile);

    try {
      await onSave(data);
      toast.success('Salida registrada con éxito');
      
      // Limpiar
      setFormData({ descripcion_salida: '', kilometraje_salida: '', gasolina_salida: '100' });
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Destino / Motivo de Salida *</label>
              <textarea required name="descripcion_salida" rows={2} value={formData.descripcion_salida} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" placeholder="Ej: Viaje a Quito por reunión directiva..." />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kilometraje Actual *</label>
                <input required type="number" name="kilometraje_salida" value={formData.kilometraje_salida} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" placeholder="Ej: 154000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de Gasolina (%) *</label>
                <select required name="gasolina_salida" value={formData.gasolina_salida} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500">
                  <option value="100">Lleno (100%)</option>
                  <option value="75">Tres Cuartos (75%)</option>
                  <option value="50">Medio Tanque (50%)</option>
                  <option value="25">Un Cuarto (25%)</option>
                  <option value="10">Reserva (10%)</option>
                </select>
              </div>
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
                  {/* El atributo capture="environment" abre la cámara trasera en móviles */}
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
          <button type="submit" form="departureForm" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
            {isSubmitting ? (
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
