import { useState, useEffect } from 'react';
import { Truck, Plus, Search, Building2, Phone, Mail, Edit2, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Supplier } from '../types';
import SupplierModal from '../components/SupplierModal';
import SupplierViewModal from '../components/SupplierViewModal';
import { useInventoryWebSocket } from '../hooks/useInventoryWebSocket';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const handleOpenViewModal = (e: React.MouseEvent, supplier: Supplier) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSupplier(supplier);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedSupplier(null);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/suppliers/');
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  useInventoryWebSocket(fetchSuppliers);

  const handleOpenModal = (e?: React.MouseEvent, supplier?: Supplier) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedSupplier(supplier || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSupplier(null);
  };

  const handleSaveSupplier = async (data: Partial<Supplier>) => {
    if (selectedSupplier) {
      await api.put(`/suppliers/${selectedSupplier.id}/`, data);
      toast.success('Proveedor actualizado');
    } else {
      await api.post('/suppliers/', data);
      toast.success('Proveedor creado exitosamente');
    }
    fetchSuppliers();
  };

  const handleDeleteSupplier = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de que deseas eliminar este proveedor? Sus productos quedarán sin proveedor asignado.')) {
      try {
        await api.delete(`/suppliers/${id}/`);
        toast.success('Proveedor eliminado');
        fetchSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
        toast.error('Error al eliminar. Asegúrate de que no tenga relaciones bloqueadas.');
      }
    }
  };

  const filteredSuppliers = suppliers.filter(sup =>
    sup.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (sup.contact_name && sup.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Truck className="w-8 h-8 text-emerald-600" />
            Proveedores
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Administra los proveedores de tus equipos y activos
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold shadow-sm shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Nuevo Proveedor
        </button>
      </div>

      <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white overflow-hidden p-6 mb-10">
        <div className="flex justify-between items-center mb-8">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar proveedor..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-100 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 rounded-xl transition-all"
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
            {filteredSuppliers.map((sup) => (
              <div key={sup.id} className="relative group block bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer flex flex-col h-[220px]">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Building2 className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleOpenViewModal(e, sup)}
                      className="p-2 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-colors"
                      title="Ver Detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleOpenModal(e, sup)}
                      className="p-2 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteSupplier(e, sup.id)}
                      className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 min-h-0">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors mb-1 truncate">
                    {sup.name}
                  </h3>
                  {sup.contact_name && (
                    <p className="text-sm text-gray-500 font-medium truncate mb-2">Contacto: {sup.contact_name}</p>
                  )}
                  
                  <div className="space-y-1.5 mt-auto">
                    {sup.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="truncate">{sup.phone}</span>
                      </div>
                    )}
                    {sup.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate">{sup.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredSuppliers.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-500">
                <Truck className="w-16 h-16 text-gray-200 mb-4" />
                <p className="text-lg font-medium text-gray-400">No se encontraron proveedores</p>
                <button 
                  onClick={() => handleOpenModal()}
                  className="mt-4 px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors font-medium"
                >
                  Crear primer proveedor
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <SupplierModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveSupplier}
        supplier={selectedSupplier}
      />

      <SupplierViewModal
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
        supplier={selectedSupplier}
      />
    </div>
  );
};

export default Suppliers;
