import { useState, useEffect } from 'react';
import { X, Upload, UserCheck, ShieldCheck, Plus, Trash2, IdCard } from 'lucide-react';
import api from '@/shared/services/api';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/shared/utils/getImageUrl';

interface LicenseItem {
  id: string;
  tipo_licencia: string;
  licencia: string;
  fecha_emision_licencia: string;
  fecha_vencimiento_licencia: string;
}

interface DriverSelfProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DriverSelfProfileModal = ({ isOpen, onClose, onSuccess }: DriverSelfProfileModalProps) => {
  const [loading, setLoading] = useState(false);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [licenses, setLicenses] = useState<LicenseItem[]>([
    {
      id: '1',
      tipo_licencia: 'Tipo C',
      licencia: '',
      fecha_emision_licencia: '',
      fecha_vencimiento_licencia: ''
    }
  ]);

  const [formData, setFormData] = useState({
    estado: 'Activo',
    telefono: '',
    direccion: '',
    tipo_sangre: '',
    contacto_emergencia: '',
  });
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchMyProfile();
    }
  }, [isOpen]);

  const fetchMyProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/driver-profiles/me/');
      if (res.data) {
        setHasExistingProfile(!!res.data.exists);
        setFormData({
          estado: res.data.estado || 'Activo',
          telefono: res.data.telefono || '',
          direccion: res.data.direccion || '',
          tipo_sangre: res.data.tipo_sangre || '',
          contacto_emergencia: res.data.contacto_emergencia || '',
        });

        // Configurar licencias múltiples
        if (Array.isArray(res.data.licencias) && res.data.licencias.length > 0) {
          setLicenses(res.data.licencias.map((lic: any, idx: number) => ({
            id: lic.id || String(idx + 1),
            tipo_licencia: lic.tipo_licencia || 'Tipo C',
            licencia: lic.licencia || '',
            fecha_emision_licencia: lic.fecha_emision_licencia || '',
            fecha_vencimiento_licencia: lic.fecha_vencimiento_licencia || ''
          })));
        } else {
          setLicenses([
            {
              id: '1',
              tipo_licencia: res.data.tipo_licencia || 'Tipo C',
              licencia: res.data.licencia || '',
              fecha_emision_licencia: res.data.fecha_emision_licencia || '',
              fecha_vencimiento_licencia: res.data.fecha_vencimiento_licencia || ''
            }
          ]);
        }

        if (res.data.foto) {
          setPreviewUrl(getImageUrl(res.data.foto));
        } else {
          setPreviewUrl('');
        }
      }
    } catch (error) {
      console.error('Error fetching driver self profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLicense = () => {
    setLicenses([
      ...licenses,
      {
        id: String(Date.now()),
        tipo_licencia: 'Tipo E',
        licencia: '',
        fecha_emision_licencia: '',
        fecha_vencimiento_licencia: ''
      }
    ]);
  };

  const handleRemoveLicense = (id: string) => {
    if (licenses.length <= 1) {
      toast.error('Debe mantener al menos una licencia registrada.');
      return;
    }
    setLicenses(licenses.filter(l => l.id !== id));
  };

  const handleLicenseChange = (id: string, field: keyof LicenseItem, val: string) => {
    setLicenses(licenses.map(l => l.id === id ? { ...l, [field]: val } : l));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que la primera licencia tenga número
    if (!licenses[0]?.licencia.trim()) {
      toast.error('El número de licencia es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      const primary = licenses[0];
      const payload = new FormData();
      payload.append('licencia', primary.licencia.trim());
      payload.append('tipo_licencia', primary.tipo_licencia);
      payload.append('estado', formData.estado);
      if (primary.fecha_emision_licencia) payload.append('fecha_emision_licencia', primary.fecha_emision_licencia);
      if (primary.fecha_vencimiento_licencia) payload.append('fecha_vencimiento_licencia', primary.fecha_vencimiento_licencia);
      
      if (formData.telefono) payload.append('telefono', formData.telefono.trim());
      if (formData.direccion) payload.append('direccion', formData.direccion.trim());
      if (formData.tipo_sangre) payload.append('tipo_sangre', formData.tipo_sangre.trim());
      if (formData.contacto_emergencia) payload.append('contacto_emergencia', formData.contacto_emergencia.trim());
      
      // Enviar array completo de licencias en JSON
      payload.append('licencias', JSON.stringify(licenses));

      if (fotoFile) {
        payload.append('foto', fotoFile);
      }

      await api.patch('/driver-profiles/me/', payload);


      toast.success(hasExistingProfile ? 'Perfil de Conductor actualizado' : 'Perfil de Conductor creado exitosamente');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving self driver profile:', error);
      toast.error(error.response?.data?.licencia?.[0] || 'Error al guardar el perfil de conductor');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-emerald-100/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Mi Perfil de Conductor</h2>
              <p className="text-xs text-gray-500 font-medium">Registra tus licencias de conducir y datos personales</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-white/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="selfDriverForm" onSubmit={handleSubmit} className="space-y-6">
            {/* Foto Avatar */}
            <div className="flex flex-col items-center justify-center mb-2">
              <div className="relative group">
                <div className="w-28 h-28 rounded-full bg-gray-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Foto Conductor" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFotoFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Subir o cambiar foto de perfil"
                />
                <div className="mt-2 text-center text-xs font-semibold text-emerald-600 cursor-pointer">
                  {previewUrl ? 'Cambiar Foto' : 'Subir Foto'}
                </div>
              </div>
            </div>

            {/* Licencias Múltiples */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-emerald-600" />
                  Licencias de Conducir ({licenses.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddLicense}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Añadir Otra Licencia
                </button>
              </div>

              {licenses.map((licItem, index) => (
                <div key={licItem.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 relative space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200/60 pb-2">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Licencia #{index + 1} {index === 0 && '(Principal)'}
                    </span>
                    {licenses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLicense(licItem.id)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition-colors"
                        title="Eliminar esta licencia"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Tipo / Categoría *
                      </label>
                      <select
                        required
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                        value={licItem.tipo_licencia}
                        onChange={(e) => handleLicenseChange(licItem.id, 'tipo_licencia', e.target.value)}
                      >
                        <option value="Tipo C">Tipo C</option>
                        <option value="Tipo D">Tipo D</option>
                        <option value="Tipo E">Tipo E</option>
                        <option value="Tipo E1">Tipo E1</option>
                        <option value="Tipo G">Tipo G</option>
                        <option value="Tipo B">Tipo B</option>
                        <option value="Tipo A">Tipo A</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Número de Licencia *
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="Ej: 1003456789"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                        value={licItem.licencia}
                        onChange={(e) => handleLicenseChange(licItem.id, 'licencia', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Emisión Licencia
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                        value={licItem.fecha_emision_licencia}
                        onChange={(e) => handleLicenseChange(licItem.id, 'fecha_emision_licencia', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Vencimiento Licencia
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                        value={licItem.fecha_vencimiento_licencia}
                        onChange={(e) => handleLicenseChange(licItem.id, 'fecha_vencimiento_licencia', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <hr className="border-gray-100 my-2" />
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Datos Personales y de Emergencia
            </h3>

            {/* Datos Personales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  placeholder="Ej: 0991234567"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tipo de Sangre
                </label>
                <input
                  type="text"
                  placeholder="Ej: O+"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  value={formData.tipo_sangre}
                  onChange={(e) => setFormData({ ...formData, tipo_sangre: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Contacto de Emergencia
                </label>
                <input
                  type="text"
                  placeholder="Nombre de familiar y número..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  value={formData.contacto_emergencia}
                  onChange={(e) => setFormData({ ...formData, contacto_emergencia: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Dirección
                </label>
                <textarea
                  placeholder="Dirección domiciliaria completa..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all resize-none text-sm"
                  rows={2}
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            form="selfDriverForm"
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm shadow-emerald-600/20"
          >
            {loading ? 'Guardando...' : (hasExistingProfile ? 'Guardar Cambios' : 'Crear Mi Perfil')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverSelfProfileModal;
