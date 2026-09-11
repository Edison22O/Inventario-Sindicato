import React, { useState, useEffect, useMemo } from 'react';
import api from '@/shared/services/api';
import { toast } from 'react-hot-toast';
import { 
  Users, UserPlus, Search, Phone, Mail, Edit, Tag, IdCard
} from 'lucide-react';


import { useWebSocket } from '@/shared/context/WebSocketContext';

interface Student {

  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  email?: string;
  telefono?: string;
  tipo_licencia: 'C' | 'D_REGULAR' | 'D_CONVALIDADA' | 'E_REGULAR' | 'E_CONVALIDADA';
  tipo_licencia_display?: string;
  activo: boolean;
  created_at?: string;
}

export const StudentCatalog: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [licenseFilter, setLicenseFilter] = useState<string>('todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    cedula: '',
    nombres: '',
    apellidos: '',
    email: '',
    telefono: '',
    tipo_licencia: 'C' as 'C' | 'D_REGULAR' | 'D_CONVALIDADA' | 'E_REGULAR' | 'E_CONVALIDADA',
    activo: true
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students/');
      setStudents(res.data || []);
    } catch (e) {
      console.error('Error al cargar catálogo de estudiantes:', e);
      toast.error('Error al cargar la lista de estudiantes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useWebSocket(fetchStudents);


  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        cedula: student.cedula,
        nombres: student.nombres,
        apellidos: student.apellidos,
        email: student.email || '',
        telefono: student.telefono || '',
        tipo_licencia: student.tipo_licencia,
        activo: student.activo
      });
    } else {
      setEditingStudent(null);
      setFormData({
        cedula: '',
        nombres: '',
        apellidos: '',
        email: '',
        telefono: '',
        tipo_licencia: 'C',
        activo: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingStudent) {
        await api.patch(`/students/${editingStudent.id}/`, formData);
        toast.success('Estudiante actualizado exitosamente');
      } else {
        await api.post('/students/', formData);
        toast.success('Estudiante registrado exitosamente');
      }
      setIsModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      const msg = err.response?.data?.cedula ? 'La cédula ya se encuentra registrada' : 'Error al guardar estudiante';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(st => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        st.nombres.toLowerCase().includes(searchLower) ||
        st.apellidos.toLowerCase().includes(searchLower) ||
        st.cedula.toLowerCase().includes(searchLower) ||
        (st.email && st.email.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

      if (licenseFilter !== 'todos') {
        if (licenseFilter === 'C' && st.tipo_licencia !== 'C') return false;
        if (licenseFilter === 'D_REGULAR' && st.tipo_licencia !== 'D_REGULAR') return false;
        if (licenseFilter === 'D_CONVALIDADA' && st.tipo_licencia !== 'D_CONVALIDADA') return false;
        if (licenseFilter === 'E_REGULAR' && st.tipo_licencia !== 'E_REGULAR') return false;
        if (licenseFilter === 'E_CONVALIDADA' && st.tipo_licencia !== 'E_CONVALIDADA') return false;
      }

      return true;
    });
  }, [students, searchTerm, licenseFilter]);

  const getBadgeStyle = (lic: string) => {
    switch (lic) {
      case 'C': return { label: 'Tipo C', style: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'D_REGULAR': return { label: 'Tipo D Reg.', style: 'bg-teal-50 text-teal-800 border-teal-200' };
      case 'D_CONVALIDADA': return { label: 'Tipo D Conv.', style: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
      case 'E_REGULAR': return { label: 'Tipo E Reg.', style: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'E_CONVALIDADA': return { label: 'Tipo E Conv.', style: 'bg-amber-50 text-amber-800 border-amber-200' };
      default: return { label: lic, style: 'bg-gray-50 text-gray-800 border-gray-200' };
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto pb-32 font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs tracking-wider uppercase mb-1">
            <Users className="w-4 h-4" /> Prácticas de Conducción
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Matrícula y Catálogo de Estudiantes
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Licencias disponibles: Tipo C, Tipo D (Regular y Convalidada) y Tipo E (Regular y Convalidada - Con Rotación Vehicular).
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 w-full sm:w-auto justify-center"
        >
          <UserPlus className="w-4 h-4" /> Matricular Nuevo Estudiante
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por cédula, nombres o correo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* License Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          <button
            onClick={() => setLicenseFilter('todos')}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
              licenseFilter === 'todos' ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos ({students.length})
          </button>
          <button
            onClick={() => setLicenseFilter('C')}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
              licenseFilter === 'C' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tipo C
          </button>
          <button
            onClick={() => setLicenseFilter('D_REGULAR')}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
              licenseFilter === 'D_REGULAR' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tipo D (Regular)
          </button>
          <button
            onClick={() => setLicenseFilter('D_CONVALIDADA')}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
              licenseFilter === 'D_CONVALIDADA' ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tipo D (Conv.)
          </button>
          <button
            onClick={() => setLicenseFilter('E_REGULAR')}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
              licenseFilter === 'E_REGULAR' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tipo E (Regular)
          </button>
          <button
            onClick={() => setLicenseFilter('E_CONVALIDADA')}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
              licenseFilter === 'E_CONVALIDADA' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tipo E (Conv.)
          </button>
        </div>
      </div>

      {/* Student List Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.length > 0 ? (
            filteredStudents.map(st => {
              const isTipoE = st.tipo_licencia.startsWith('E_');
              const badge = getBadgeStyle(st.tipo_licencia);

              return (
                <div key={st.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-emerald-200 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-base uppercase shrink-0">
                        {st.nombres[0]}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-gray-900 leading-tight">
                          {st.apellidos} {st.nombres}
                        </h3>
                        <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                          <IdCard className="w-3 h-3 text-gray-400" /> C.I.: {st.cedula}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shrink-0 ${badge.style}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 mb-4 pt-2 border-t border-gray-50">
                    {st.email && (
                      <p className="flex items-center gap-2 font-medium">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {st.email}
                      </p>
                    )}
                    {st.telefono && (
                      <p className="flex items-center gap-2 font-medium">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {st.telefono}
                      </p>
                    )}
                    <div className="pt-1 flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-[11px] font-bold text-gray-500">
                        {isTipoE ? '🚚 Rotación Heavy (NPR ➔ Sinotruc ➔ Tráiler)' : '🚗 Evaluación Estándar de 5 Fases'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenModal(st)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" /> Editar
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-white p-8 rounded-3xl text-center border border-gray-100">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-500">No se encontraron estudiantes para los filtros seleccionados.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Matricular / Editar Estudiante */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex justify-between items-center">
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> {editingStudent ? 'Editar Estudiante' : 'Matricular Nuevo Estudiante'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cédula de Identidad</label>
                <input
                  type="text"
                  required
                  disabled={!!editingStudent}
                  value={formData.cedula}
                  onChange={e => setFormData({ ...formData, cedula: e.target.value })}
                  placeholder="ej. 0401234567"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombres</label>
                  <input
                    type="text"
                    required
                    value={formData.nombres}
                    onChange={e => setFormData({ ...formData, nombres: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Apellidos</label>
                  <input
                    type="text"
                    required
                    value={formData.apellidos}
                    onChange={e => setFormData({ ...formData, apellidos: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tipo de Licencia</label>
                <select
                  value={formData.tipo_licencia}
                  onChange={e => setFormData({ ...formData, tipo_licencia: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                >
                  <option value="C">Licencia Tipo C (Estándar)</option>
                  <option value="D_REGULAR">Licencia Tipo D (Regular - Autobuses)</option>
                  <option value="D_CONVALIDADA">Licencia Tipo D (Convalidada - Autobuses)</option>
                  <option value="E_REGULAR">Licencia Tipo E (Regular - Con Rotación Heavy)</option>
                  <option value="E_CONVALIDADA">Licencia Tipo E (Convalidada - Con Rotación Heavy)</option>
                </select>
                <p className="text-[10px] text-gray-400 font-semibold mt-1">
                  Nota: Solo las Licencias Tipo E habilitan la rotación vehicular secuencial por NPR, Sinotruc Blanco, Sinotruc Gris y Tráiler.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-600">Cancelar</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md">
                  {submitting ? 'Guardando...' : editingStudent ? 'Actualizar' : 'Matricular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCatalog;
