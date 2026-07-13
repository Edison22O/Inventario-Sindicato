import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Category } from '../types';
import toast from 'react-hot-toast';
import { Tags, Plus, Search, MapPin, Edit2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import CategoryModal from '../components/CategoryModal';

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories/');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (e: React.MouseEvent, category?: Category) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedCategory(category || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  const handleSaveCategory = async (data: Partial<Category>) => {
    if (selectedCategory) {
      await api.put(`/categories/${selectedCategory.id}/`, data);
    } else {
      await api.post('/categories/', data);
    }
    fetchCategories();
  };

  const handleDeleteCategory = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
      try {
        await api.delete(`/categories/${id}/`);
        toast.success('Categoría eliminada');
        fetchCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
        toast.error('Error al eliminar. Asegúrate de que no haya productos usando esta categoría.');
      }
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Tags className="w-8 h-8 text-emerald-600" />
            Categorías
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Gestiona las clasificaciones de tus productos
          </p>
        </div>
        <button 
          onClick={(e) => handleOpenModal(e)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Nueva Categoría
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-8">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar categoría (ej. computadores)..."
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
            {filteredCategories.map((cat) => (
              <div key={cat.id} className="relative group">
                <Link 
                  to={`/categories/${cat.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-4 h-48"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Tags className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      {cat.name}
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
                    onClick={(e) => handleOpenModal(e, cat)}
                    className="p-2 bg-white rounded-full shadow-sm hover:text-emerald-600 transition-colors border border-gray-100"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteCategory(e, cat.id)}
                    className="p-2 bg-white rounded-full shadow-sm hover:text-red-600 transition-colors border border-gray-100"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {filteredCategories.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
                <Tags className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-lg">No se encontraron categorías</p>
              </div>
            )}
          </div>
        )}
      </div>

      <CategoryModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveCategory}
        category={selectedCategory}
      />
    </div>
  );
};

export default Categories;
