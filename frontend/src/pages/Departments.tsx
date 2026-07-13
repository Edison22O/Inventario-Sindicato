import { useState, useEffect } from 'react';
import { Layers, Plus, Search, Building2, MapPin, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Department } from '../types';
import { Link } from 'react-router-dom';
import DepartmentModal from '../components/DepartmentModal';

const Departments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/departments/');
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (e: React.MouseEvent, department?: Department) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDepartment(department || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDepartment(null);
  };

  const handleSaveDepartment = async (data: Partial<Department>) => {
    if (selectedDepartment) {
      await api.put(`/departments/${selectedDepartment.id}/`, data);
    } else {
      await api.post('/departments/', data);
    }
    fetchDepartments();
  };

  const handleDeleteDepartment = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de que deseas eliminar este departamento? Se eliminarán también todos sus productos.')) {
      try {
        await api.delete(`/departments/${id}/`);
        toast.success('Departamento eliminado');
        fetchDepartments();
      } catch (error) {
        console.error('Error deleting department:', error);
        toast.error('Error al eliminar. Asegúrate de que no tenga productos o permisos especiales.');
      }
    }
  };

  const filteredDepartments = departments.filter(dep =>
    dep.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Layers className="w-8 h-8 text-emerald-600" />
            Departamentos y Ubicaciones
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Selecciona un departamento para ver su inventario
          </p>
        </div>
        <button 
          onClick={(e) => handleOpenModal(e)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Nuevo Departamento
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-8">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar departamento..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200 rounded-xl transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDepartments.map((dep) => (
              <div key={dep.id} className="relative group">
                <Link 
                  to={`/departments/${dep.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-4 h-48"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Building2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      {dep.name}
                    </h3>
                    <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mt-2">
                      <MapPin className="w-4 h-4" />
                      <span>Ver Inventario</span>
                    </div>
                  </div>
                </Link>
                {/* Actions that appear on hover */}
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => handleOpenModal(e, dep)}
                    className="p-2 bg-white rounded-full shadow-sm hover:text-emerald-600 transition-colors border border-gray-100"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteDepartment(e, dep.id)}
                    className="p-2 bg-white rounded-full shadow-sm hover:text-red-600 transition-colors border border-gray-100"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {filteredDepartments.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
                <Layers className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-lg">No se encontraron departamentos</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <DepartmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveDepartment}
        department={selectedDepartment}
      />
    </div>
  );
};

export default Departments;
