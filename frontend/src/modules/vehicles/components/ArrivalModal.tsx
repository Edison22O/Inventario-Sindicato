import React, { useState } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import type { VehicleTrip } from '@/shared/types';

import { compressImage } from '@/shared/utils/imageCompressor';

interface ArrivalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tripId: number, formData: FormData) => Promise<void>;
  trip: VehicleTrip | null;
}

const ArrivalModal: React.FC<ArrivalModalProps> = ({ isOpen, onClose, onSave, trip }) => {
  const [formData, setFormData] = useState({
    novedades_observaciones: '',
    kilometraje_llegada: '',
    galones_recargados: '0',
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  if (!isOpen || !trip) return null;

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
      toast.error('La foto de evidencia (tablero) es obligatoria al llegar.');
      return;
    }

    if (Number(formData.kilometraje_llegada) < trip.kilometraje_salida) {
      toast.error(`El kilometraje de llegada no puede ser menor al de salida (${trip.kilometraje_salida}).`);
      return;
    }

    setIsSubmitting(true);
    
    const data = new FormData();
    data.append('novedades_observaciones', formData.novedades_observaciones);
    data.append('kilometraje_llegada', formData.kilometraje_llegada);
    data.append('galones_recargados', formData.galones_recargados);
    data.append('foto_evidencia_llegada', imageFile);

    try {
      await onSave(trip.id, data);
      toast.success('Llegada registrada con éxito');
      
      setFormData({ novedades_observaciones: '', kilometraje_llegada: '', galones_recargados: '0' });
      setImageFile(null);
      setPreviewUrl(null);
      
      onClose();
    } catch (error) {
      toast.error("Error al registrar la llegada.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Registrar Llegada</h2>
            <p className="text-sm text-gray-500 mt-1">Vehículo: {trip.vehicle_placa} - Conductor: {trip.conductor_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="arrivalForm" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
              <span className="font-semibold">Recordatorio de Salida:</span> Salió con {trip.kilometraje_salida} KM.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Novedades al llegar (Opcional)</label>
              <textarea name="novedades_observaciones" rows={2} value={formData.novedades_observaciones} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" placeholder="Ej: Todo normal / Rayón en puerta derecha..." />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kilometraje de Llegada *</label>
                <input required type="number" min={trip.kilometraje_salida} name="kilometraje_llegada" value={formData.kilometraje_llegada} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" placeholder="Ej: 154150" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Galones Recargados (Opcional)</label>
                <input type="number" step="0.01" min="0" name="galones_recargados" value={formData.galones_recargados} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" placeholder="Ej: 5.50" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Foto Evidencia del Tablero (Llegada) *</label>
              <div className="flex flex-col gap-4">
                <div className="w-full h-48 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <Camera className="w-10 h-10 mb-2 group-hover:text-emerald-500 transition-colors" />
                      <span className="font-medium group-hover:text-emerald-500 transition-colors">Tocar para abrir cámara</span>
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
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button type="submit" form="arrivalForm" disabled={isSubmitting || isCompressing} className="px-6 py-2.5 rounded-xl font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
            {isSubmitting || isCompressing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            Registrar Llegada
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArrivalModal;
