import React, { useState, useEffect } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Vehicle } from '@/shared/types';
import { getImageUrl } from '@/shared/utils/getImageUrl';
import { compressImage } from '@/shared/utils/imageCompressor';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => Promise<void>;
  vehicle?: Vehicle | null;
}

const VehicleModal: React.FC<VehicleModalProps> = ({ isOpen, onClose, onSave, vehicle }) => {
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    placa: '',
    marca: '',
    modelo: '',
    año: new Date().getFullYear(),
    color: '',
    estado_actual: 'En Sindicato',
    tipo_combustible: 'Gasolina Extra',
    capacidad_tanque_galones: 10,
    rendimiento_km_por_galon: 40,
    odometro_actual: 0,
    combustible_actual_galones: 0,
    mes_matricula: '',
    fecha_vencimiento_matricula: '',
    chasis: '',
    motor: '',
    clase: '',
    tipo: '',
    observacion: ''
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setFormData(vehicle);
      setPreviewUrl(vehicle.foto_vehiculo || null);
    } else {
      setFormData({
        placa: '',
        marca: '',
        modelo: '',
        año: new Date().getFullYear(),
        color: '',
        estado_actual: 'En Sindicato',
        tipo_combustible: 'Gasolina Extra',
        capacidad_tanque_galones: 10,
        rendimiento_km_por_galon: 40,
        odometro_actual: 0,
        combustible_actual_galones: 0,
        mes_matricula: '',
        fecha_vencimiento_matricula: '',
        chasis: '',
        motor: '',
        clase: '',
        tipo: '',
        observacion: ''
      });
      setPreviewUrl(null);
    }
    setImageFile(null);
  }, [vehicle, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    setIsSubmitting(true);
    
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && key !== 'foto_vehiculo') {
        data.append(key, String(value));
      }
    });

    if (imageFile) {
      data.append('foto_vehiculo', imageFile);
    }

    try {
      await onSave(data);
      toast.success(vehicle ? 'Vehículo actualizado' : 'Vehículo creado con éxito');
      onClose();
    } catch (error: any) {
      console.error('Error saving vehicle:', error);
      const serverMsg = error?.response?.data
        ? (typeof error.response.data === 'object'
            ? Object.entries(error.response.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
            : String(error.response.data))
        : 'Error al guardar el vehículo. Revisa que los campos obligatorios estén completos y la placa no esté duplicada.';
      toast.error(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">
            {vehicle ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="vehicleForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Foto del Vehículo idéntica a Control de Salidas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Foto del Vehículo (Opcional - JPG/PNG)</label>
              <div className="flex flex-col gap-4">
                <div className="w-full h-48 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group">
                  {previewUrl ? (
                    <img src={previewUrl.startsWith('blob:') ? previewUrl : getImageUrl(previewUrl)} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <Camera className="w-10 h-10 mb-2 group-hover:text-emerald-600 transition-colors" />
                      <span className="font-medium group-hover:text-emerald-600 transition-colors">Tocar para abrir cámara</span>
                    </div>
                  )}
                  {/* El atributo capture="environment" obliga a abrir la cámara trasera del dispositivo */}
                  <input 
                    type="file" 
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <p className="text-xs text-gray-500">Toca el recuadro para abrir la cámara de tu dispositivo o seleccionar una imagen.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placa *</label>
                <input required type="text" name="placa" value={formData.placa} onChange={handleChange} placeholder="Ej: ABC-1234" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 uppercase" style={{textTransform: 'uppercase'}} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
                <input required type="text" name="marca" value={formData.marca} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
                <input required type="text" name="modelo" value={formData.modelo} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año *</label>
                <input required type="number" min="1900" max="2100" name="año" value={formData.año} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color *</label>
                <input required type="text" name="color" value={formData.color} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              
              {/* Nuevos campos del Excel */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chasis</label>
                <input type="text" name="chasis" value={formData.chasis || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motor</label>
                <input type="text" name="motor" value={formData.motor || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clase (Ej: AUTOMOVIL)</label>
                <input type="text" name="clase" value={formData.clase || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 uppercase" style={{textTransform: 'uppercase'}} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo (Ej: SEDAN)</label>
                <input type="text" name="tipo" value={formData.tipo || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 uppercase" style={{textTransform: 'uppercase'}} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observación</label>
                <input type="text" name="observacion" value={formData.observacion || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 border-t border-gray-100 pt-6">
              <h3 className="col-span-full text-lg font-bold text-gray-900">Configuración de Combustible</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Combustible *</label>
                <select required name="tipo_combustible" value={formData.tipo_combustible || 'Gasolina Extra'} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500">
                  <option value="Gasolina Extra">Gasolina Extra</option>
                  <option value="Diesel">Diesel</option>
                </select>

              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad del Tanque (Galones) *</label>
                <input required type="number" step="0.01" name="capacidad_tanque_galones" value={formData.capacidad_tanque_galones || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rendimiento (KM por Galón) *</label>
                <input required type="number" step="0.01" name="rendimiento_km_por_galon" value={formData.rendimiento_km_por_galon || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 border-t border-gray-100 pt-6">
              <h3 className="col-span-full text-lg font-bold text-gray-900">Estado Inicial</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Odómetro Actual (KM) *</label>
                <input required type="number" name="odometro_actual" value={formData.odometro_actual || 0} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Combustible Actual (Galones) *</label>
                <input required type="number" step="0.01" name="combustible_actual_galones" value={formData.combustible_actual_galones || 0} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 border-t border-gray-100 pt-6">
              <h3 className="col-span-full text-lg font-bold text-gray-900">Matrícula</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mes de Matrícula</label>
                <input type="text" name="mes_matricula" value={formData.mes_matricula || ''} onChange={handleChange} placeholder="Ej: Octubre" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento Matrícula</label>
                <input type="date" name="fecha_vencimiento_matricula" value={formData.fecha_vencimiento_matricula || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button type="submit" form="vehicleForm" disabled={isSubmitting || isCompressing} className="px-6 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
            {isSubmitting || isCompressing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            Guardar Vehículo
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleModal;
