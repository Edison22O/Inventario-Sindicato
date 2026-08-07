import { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import api from '@/shared/services/api';
import toast from 'react-hot-toast';
import type { DriverProfile, User } from '@/shared/types';
import { getImageUrl } from '@/shared/utils/getImageUrl';

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  driver?: DriverProfile | null;
}

const DriverModal = ({ isOpen, onClose, onSuccess, driver }: DriverModalProps) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    user: '',
    licencia: '',
    tipo_licencia: 'Tipo C',
    estado: 'Activo',
    telefono: '',
    direccion: '',
    tipo_sangre: '',
    contacto_emergencia: '',
    fecha_emision_licencia: '',
    fecha_vencimiento_licencia: ''
  });
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      if (driver) {
        setFormData({
          user: String(driver.user),
          licencia: driver.licencia,
          tipo_licencia: driver.tipo_licencia,
          estado: driver.estado,
          telefono: driver.telefono || '',
          direccion: driver.direccion || '',
          tipo_sangre: driver.tipo_sangre || '',
          contacto_emergencia: driver.contacto_emergencia || '',
          fecha_emision_licencia: driver.fecha_emision_licencia || '',
          fecha_vencimiento_licencia: driver.fecha_vencimiento_licencia || ''
        });
        setPreviewUrl(driver.foto ? getImageUrl(driver.foto) : '');
      } else {
        setFormData({
          user: '',
          licencia: '',
          tipo_licencia: 'Tipo C',
          estado: 'Activo',
          telefono: '',
          direccion: '',
          tipo_sangre: '',
          contacto_emergencia: '',
          fecha_emision_licencia: '',
          fecha_vencimiento_licencia: ''
        });
        setPreviewUrl('');
      }
      setFotoFile(null);
    }
  }, [isOpen, driver]);

  const fetchUsers = async () => {
    try {
      // Filtrar usuarios que tienen rol Conductores o que queremos permitir
      const res = await api.get('/users/');
      setUsers(res.data.filter((u: User) => u.role_name === 'Conductores'));
    } catch (error) {
      console.error('Error fetching users', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('user', formData.user);
      payload.append('licencia', formData.licencia);
      payload.append('tipo_licencia', formData.tipo_licencia);
      payload.append('estado', formData.estado);
      if (formData.telefono) payload.append('telefono', formData.telefono);
      if (formData.direccion) payload.append('direccion', formData.direccion);
      if (formData.tipo_sangre) payload.append('tipo_sangre', formData.tipo_sangre);
      if (formData.contacto_emergencia) payload.append('contacto_emergencia', formData.contacto_emergencia);
      if (formData.fecha_emision_licencia) payload.append('fecha_emision_licencia', formData.fecha_emision_licencia);
      if (formData.fecha_vencimiento_licencia) payload.append('fecha_vencimiento_licencia', formData.fecha_vencimiento_licencia);
      
      if (fotoFile) {
        payload.append('foto', fotoFile);
      }

      if (driver) {
        await api.patch(`/driver-profiles/${driver.public_id}/`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Conductor actualizado');
      } else {
        await api.post('/driver-profiles/', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Conductor registrado');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar el conductor');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">
            {driver ? 'Editar Conductor' : 'Registrar Conductor'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="driverForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
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
                  title="Subir Foto del Conductor"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario del Sistema *
              </label>
              <select
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                value={formData.user}
                onChange={(e) => setFormData({ ...formData, user: e.target.value })}
              >
                <option value="">Seleccione un usuario...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.email || 'Sin correo'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Licencia *
              </label>
              <input
                required
                type="text"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                value={formData.licencia}
                onChange={(e) => setFormData({ ...formData, licencia: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Licencia *
              </label>
              <select
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                value={formData.tipo_licencia}
                onChange={(e) => setFormData({ ...formData, tipo_licencia: e.target.value })}
              >
                <option value="Tipo C">Tipo C</option>
                <option value="Tipo D">Tipo D</option>
                <option value="Tipo E">Tipo E</option>
                <option value="Tipo E1">Tipo E1</option>
                <option value="Tipo G">Tipo G</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emisión Licencia
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={formData.fecha_emision_licencia}
                  onChange={(e) => setFormData({ ...formData, fecha_emision_licencia: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vencimiento Licencia
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={formData.fecha_vencimiento_licencia}
                  onChange={(e) => setFormData({ ...formData, fecha_vencimiento_licencia: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="En Viaje">En Viaje</option>
              </select>
            </div>

            <hr className="my-4 border-gray-100" />
            <h3 className="font-bold text-gray-800 text-sm mb-4 uppercase tracking-wider">Datos Personales</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Sangre
                </label>
                <input
                  type="text"
                  placeholder="Ej: O+"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={formData.tipo_sangre}
                  onChange={(e) => setFormData({ ...formData, tipo_sangre: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contacto de Emergencia
                </label>
                <input
                  type="text"
                  placeholder="Nombre y número..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={formData.contacto_emergencia}
                  onChange={(e) => setFormData({ ...formData, contacto_emergencia: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                  rows={2}
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            form="driverForm"
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverModal;
