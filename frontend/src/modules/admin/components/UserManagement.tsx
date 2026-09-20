import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Key, Shield, Search, Filter, Users, Layers, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import { confirmDialog } from '@/shared/utils/confirmDialog';
import { useWebSocket } from '@/shared/context/WebSocketContext';

interface Role {
  id: number;
  name: string;
  level: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: number | null;
  is_active: boolean;
  last_login: string | null;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Filtering & View state
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | number>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupByRole, setGroupByRole] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users/'),
        api.get('/roles/')
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useWebSocket(fetchData);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email || '',
        password: '',
        role: user.role ? user.role.toString() : '',
        is_active: user.is_active,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        role: '',
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password && formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error('La contraseña es obligatoria para nuevos usuarios.');
      return;
    }

    const payload: any = {
      username: formData.username.trim(),
      email: formData.email.trim(),
      role: formData.role ? parseInt(formData.role) : null,
      is_active: formData.is_active,
    };

    if (formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    try {
      if (editingUser) {
        await api.patch(`/users/${editingUser.id}/`, payload);
        toast.success('Usuario actualizado exitosamente');
      } else {
        await api.post('/users/', payload);
        toast.success('Usuario creado exitosamente');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving user:', error.response?.data || error);
      const data = error.response?.data;
      let errorMsg = 'Error al guardar el usuario';
      
      if (data) {
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.detail) {
          errorMsg = data.detail;
        } else if (typeof data === 'object') {
          const firstKey = Object.keys(data)[0];
          if (firstKey) {
            const firstErr = data[firstKey];
            const msgStr = Array.isArray(firstErr) ? firstErr[0] : String(firstErr);
            errorMsg = `${firstKey}: ${msgStr}`;
          }
        }
      }
      toast.error(errorMsg);
    }
  };

  const handleDelete = async (id: number) => {
    if (await confirmDialog('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        await api.delete(`/users/${id}/`);
        toast.success('Usuario eliminado');
        fetchData();
      } catch (error) {
        toast.error('Error al eliminar usuario');
      }
    }
  };

  const getRoleName = (roleId: number | null) => {
    if (!roleId) return 'Sin Rol';
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Desconocido';
  };

  const getRoleBadgeStyle = (roleName: string) => {
    const nameLower = roleName.toLowerCase();
    if (nameLower.includes('admin')) {
      return {
        bg: 'bg-purple-100 text-purple-900 border-purple-200',
        badgeBg: 'bg-purple-600 text-white',
        border: 'border-purple-200'
      };
    } else if (nameLower.includes('instructor') || nameLower.includes('conductor')) {
      return {
        bg: 'bg-blue-100 text-blue-900 border-blue-200',
        badgeBg: 'bg-blue-600 text-white',
        border: 'border-blue-200'
      };
    } else if (nameLower.includes('vehiculo') || nameLower.includes('flota')) {
      return {
        bg: 'bg-emerald-100 text-emerald-900 border-emerald-200',
        badgeBg: 'bg-emerald-600 text-white',
        border: 'border-emerald-200'
      };
    } else if (nameLower.includes('tecno') || nameLower.includes('sistema')) {
      return {
        bg: 'bg-cyan-100 text-cyan-900 border-cyan-200',
        badgeBg: 'bg-cyan-600 text-white',
        border: 'border-cyan-200'
      };
    } else if (nameLower.includes('mueble') || nameLower.includes('mobiliario')) {
      return {
        bg: 'bg-amber-100 text-amber-900 border-amber-200',
        badgeBg: 'bg-amber-600 text-white',
        border: 'border-amber-200'
      };
    }
    return {
      bg: 'bg-slate-100 text-slate-800 border-slate-200',
      badgeBg: 'bg-slate-600 text-white',
      border: 'border-slate-200'
    };
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedRoleFilter === 'ALL') return true;
      if (selectedRoleFilter === 'NONE') return user.role === null;
      return user.role === Number(selectedRoleFilter);
    });
  }, [users, searchTerm, selectedRoleFilter]);

  const usersGroupedByRole = useMemo(() => {
    const groups: { [key: string]: { roleName: string; roleId: number | null; users: User[] } } = {};

    roles.forEach(r => {
      groups[r.id] = { roleName: r.name, roleId: r.id, users: [] };
    });
    groups['NONE'] = { roleName: 'Sin Rol Asignado', roleId: null, users: [] };

    filteredUsers.forEach(user => {
      const key = user.role ? String(user.role) : 'NONE';
      if (!groups[key]) {
        groups[key] = { roleName: getRoleName(user.role), roleId: user.role, users: [] };
      }
      groups[key].users.push(user);
    });

    return Object.values(groups).filter(g => g.users.length > 0);
  }, [filteredUsers, roles]);

  const getUserCountByRole = (roleId: string | number) => {
    if (roleId === 'ALL') return users.length;
    if (roleId === 'NONE') return users.filter(u => !u.role).length;
    return users.filter(u => u.role === Number(roleId)).length;
  };

  if (isLoading) return <div className="text-center py-10">Cargando usuarios y roles...</div>;

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-600" />
              Gestión de Usuarios y Roles
            </h2>
            <p className="text-xs text-gray-500">
              Filtra y organiza a los usuarios del sistema agrupados por su nivel de acceso.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setGroupByRole(!groupByRole)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                groupByRole
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Layers className="w-4 h-4 text-emerald-600" />
              {groupByRole ? 'Ver Lista Continua' : 'Agrupar por Rol'}
            </button>

            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Nuevo Usuario
            </button>
          </div>
        </div>

        {/* Search Bar & Role Filter Pills */}
        <div className="flex flex-col space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por usuario o correo electrónico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar:
            </span>

            <button
              onClick={() => setSelectedRoleFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                selectedRoleFilter === 'ALL'
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Todos los Roles
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${selectedRoleFilter === 'ALL' ? 'bg-emerald-950 text-emerald-200' : 'bg-gray-200 text-gray-700'}`}>
                {getUserCountByRole('ALL')}
              </span>
            </button>

            {roles.map((role) => {
              const count = getUserCountByRole(role.id);
              const isSelected = selectedRoleFilter === role.id;
              const badgeStyle = getRoleBadgeStyle(role.name);

              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleFilter(role.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                      : `${badgeStyle.bg} hover:opacity-90`
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 opacity-80" />
                  {role.name}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isSelected ? 'bg-emerald-950 text-emerald-200' : badgeStyle.badgeBg}`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {getUserCountByRole('NONE') > 0 && (
              <button
                onClick={() => setSelectedRoleFilter('NONE')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                  selectedRoleFilter === 'NONE'
                    ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                }`}
              >
                Sin Rol
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${selectedRoleFilter === 'NONE' ? 'bg-emerald-950 text-emerald-200' : 'bg-gray-300 text-gray-800'}`}>
                  {getUserCountByRole('NONE')}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {groupByRole ? (
        <div className="space-y-6">
          {usersGroupedByRole.map((group) => {
            const badgeStyle = getRoleBadgeStyle(group.roleName);
            return (
              <div key={group.roleName} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className={`p-4 px-6 border-b flex justify-between items-center ${badgeStyle.bg}`}>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-gray-800" />
                    <h3 className="font-bold text-gray-900 text-base">{group.roleName}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${badgeStyle.badgeBg}`}>
                    {group.users.length} {group.users.length === 1 ? 'usuario' : 'usuarios'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-xs uppercase font-semibold">
                        <th className="px-6 py-3">Usuario</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3">Estado</th>
                        <th className="px-6 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {group.users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3.5 font-semibold text-gray-900">{user.username}</td>
                          <td className="px-6 py-3.5 text-gray-600">{user.email || '-'}</td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {user.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <button
                              onClick={() => handleOpenModal(user)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2"
                              title="Editar Usuario"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar Usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-xs uppercase font-semibold">
                  <th className="px-6 py-4 font-semibold">Usuario</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Rol Asignado</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                  <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredUsers.map((user) => {
                  const roleName = getRoleName(user.role);
                  const badgeStyle = getRoleBadgeStyle(roleName);

                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{user.username}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{user.email || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border ${badgeStyle.bg}`}>
                          <Shield className="w-3.5 h-3.5 mr-1.5 opacity-80" />
                          {roleName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2"
                          title="Editar Usuario"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar Usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                      No se encontraron usuarios con el filtro seleccionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de Usuario</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Correo Electrónico (Opcional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    required={!editingUser}
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder={editingUser ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Rol / Nivel de Acceso</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  <option value="">Seleccione un rol...</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700 font-medium">
                  Usuario Activo (Puede iniciar sesión)
                </label>
              </div>

              <div className="pt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-medium shadow-sm transition-colors"
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
