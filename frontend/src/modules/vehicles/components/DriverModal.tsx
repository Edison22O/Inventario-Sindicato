import { useState, useEffect } from 'react';
import { X, Upload, Plus, Trash2, IdCard } from 'lucide-react';
import api from '@/shared/services/api';
import toast from 'react-hot-toast';
import type { DriverProfile, User } from '@/shared/types';
import { getImageUrl } from '@/shared/utils/getImageUrl';

interface LicenseItem {
  id: string;
  tipo_licencia: string;
  licencia: string;
  fecha_emision_licencia: string;
  fecha_vencimiento_licencia: string;
}

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  driver?: DriverProfile | null;
}

const DriverModal = ({ isOpen, onClose, onSuccess, driver }: DriverModalProps) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
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
    user: '',
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
      fetchUsers();
      if (driver) {
        setFormData({
          user: String(driver.user),
          estado: driver.estado,
          telefono: driver.telefono || '',
          direccion: driver.direccion || '',
          tipo_sangre: driver.tipo_sangre || '',
          contacto_emergencia: driver.contacto_emergencia || '',
        });

        if (Array.isArray((driver as any).licencias) && (driver as any).licencias.length > 0) {
          setLicenses((driver as any).licencias.map((lic: any, idx: number) => ({
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
              tipo_licencia: driver.tipo_licencia || 'Tipo C',
              licencia: driver.licencia || '',
              fecha_emision_licencia: driver.fecha_emision_licencia || '',
              fecha_vencimiento_licencia: driver.fecha_vencimiento_licencia || ''
            }
          ]);
        }

        setPreviewUrl(driver.foto ? getImageUrl(driver.foto) : '');
      } else {
        setFormData({
          user: '',
          estado: 'Activo',
          telefono: '',
          direccion: '',
          tipo_sangre: '',
          contacto_emergencia: '',
        });
        setLicenses([
          {
            id: '1',
            tipo_licencia: 'Tipo C',
            licencia: '',
            fecha_emision_licencia: '',
            fecha_vencimiento_licencia: ''
          }
        ]);
        setPreviewUrl('');
      }
      setFotoFile(null);
    }
  }, [isOpen, driver]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/');
      const allUsers: User[] = res.data || [];
      
      const driverUsers = allUsers.filter((u: User) => {
        if (!u.role_name) return false;
        const role = u.role_name.toLowerCase();
        return role.includes('conductor') || role.includes('chofer') || role.includes('driver');
      });

      if (driverUsers.length > 0) {
        if (driver && driver.user && !driverUsers.some(u => u.id === Number(driver.user))) {
          const current = allUsers.find(u => u.id === Number(driver.user));
          if (current) driverUsers.push(current);
        }
        setUsers(driverUsers);
      } else {
        setUsers(allUsers);
      }
    } catch (error) {
      console.error('Error fetching users', error);
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
    if (!licenses[0]?.licencia.trim()) {
      toast.error('El número de licencia principal es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      const primary = licenses[0];
      const payload = new FormData();
      payload.append('user', formData.user);
      payload.append('licencia', primary.licencia.trim());
      payload.append('tipo_licencia', primary.tipo_licencia);
      payload.append('estado', formData.estado);
      if (primary.fecha_emision_licencia) payload.append('fecha_emision_licencia', primary.fecha_emision_licencia);
      if (primary.fecha_vencimiento_licencia) payload.append('fecha_vencimiento_licencia', primary.fecha_vencimiento_licencia);
      
      if (formData.telefono) payload.append('telefono', formData.telefono.trim());
      if (formData.direccion) payload.append('direccion', formData.direccion.trim());
      if (formData.tipo_sangre) payload.append('tipo_sangre', formData.tipo_sangre.trim());
      if (formData.contacto_emergencia) payload.append('contacto_emergencia', formData.contacto_emergencia.trim());
      
      payload.append('licencias', JSON.stringify(licenses));

      if (fotoFile) {
        payload.append('foto', fotoFile);
      }

      if (driver) {
        await api.patch(`/driver-profiles/${driver.public_id}/`, payload);
        toast.success('Conductor actualizado');
      } else {
        await api.post('/driver-profiles/', payload);
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
      
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">
            {driver ? 'Editar Conductor' : 'Registrar Conductor'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="driverForm" onSubmit={handleSubmit} className="space-y-5">
            <div className="flex justify-center mb-4">
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
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                value={formData.user}
                onChange={(e) => setFormData({ ...formData, user: e.target.value })}
              >
                <option value="">Seleccione un usuario...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} {u.role_name ? `(${u.role_name})` : '(Sin Rol)'} - {u.email || 'Sin correo'}
                  </option>
                ))}
              </select>
            </div>

            {/* Licencias Múltiples */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-blue-600" />
                  Licencias de Conducir ({licenses.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddLicense}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
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
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
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
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
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
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
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
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                        value={licItem.fecha_vencimiento_licencia}
                        onChange={(e) => handleLicenseChange(licItem.id, 'fecha_vencimiento_licencia', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
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
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
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
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
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
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                  value={formData.contacto_emergencia}
                  onChange={(e) => setFormData({ ...formData, contacto_emergencia: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección
                </label>
                <textarea
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none text-sm"
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
            className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            form="driverForm"
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm text-sm"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverModal;
