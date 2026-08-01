import { useState, useEffect } from 'react';
import { Building2, Save, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';

const SystemSettingsPanel = () => {
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    organization_name: '',
    primary_color: '#148143'
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/system-settings/');
      // Response is a single object because of our custom list() method in viewset
      if (response.data) {
        setSettingsId(response.data.id);
        setFormData({
          organization_name: response.data.organization_name,
          primary_color: response.data.primary_color
        });
        setCurrentLogo(response.data.logo);
      }
    } catch (error) {
      console.error("Error fetching settings", error);
    }
  };

  const handleSave = async () => {
    if (!settingsId) return;
    setIsSaving(true);
    try {
      const data = new FormData();
      data.append('organization_name', formData.organization_name);
      data.append('primary_color', formData.primary_color);
      if (logoFile) {
        data.append('logo', logoFile);
      }

      await api.patch(`/system-settings/${settingsId}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Configuración guardada exitosamente. Recarga la página para ver los cambios globales.', { duration: 4000 });
      fetchSettings();
    } catch (error) {
      toast.error('Error al guardar configuración');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden max-w-3xl">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-emerald-600" />
          Perfil de la Organización
        </h2>
        <p className="text-sm text-gray-500 mt-1">Configura el nombre y logotipo que aparecerán en todo el sistema.</p>
      </div>

      <div className="p-8 space-y-8">
        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre Oficial de la Institución</label>
          <input
            type="text"
            value={formData.organization_name}
            onChange={(e) => setFormData({...formData, organization_name: e.target.value})}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-medium text-gray-900"
            placeholder="Ej. Sindicato de Choferes..."
          />
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Logotipo Principal</label>
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden relative group">
              {logoFile ? (
                <img src={URL.createObjectURL(logoFile)} alt="Preview" className="w-full h-full object-contain p-2" />
              ) : currentLogo ? (
                <img src={currentLogo} alt="Current" className="w-full h-full object-contain p-2" />
              ) : (
                <ImageIcon className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
              />
              <p className="text-xs text-gray-500">Se recomienda una imagen PNG con fondo transparente, formato cuadrado o rectangular horizontal.</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-6 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-all disabled:opacity-70"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsPanel;
