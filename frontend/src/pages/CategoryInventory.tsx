import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Search, ArrowLeft, Download, Filter, Plus, Edit2, Trash2, Image as ImageIcon, Eye, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Product, Department, Category } from '../types';
import ProductModal from '../components/ProductModal';
import ProductViewModal from '../components/ProductViewModal';
import { useInventoryWebSocket } from '../hooks/useInventoryWebSocket';
import { getImageUrl } from '../utils/getImageUrl';
import { generateProductPDF, generateBulkProductsPDF } from '../utils/productPdfGenerator';

const CategoryInventory = () => {
  const { id } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleOpenViewModal = (product: Product) => {
    setSelectedProduct(product);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedProduct(null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, allCatsRes, prodRes, depRes, supRes] = await Promise.all([
        api.get(`/categories/${id}/`),
        api.get('/categories/'),
        api.get('/products/'),
        api.get('/departments/'),
        api.get('/suppliers/')
      ]);
      setCategory(catRes.data);
      setCategories(allCatsRes.data);
      setDepartments(depRes.data);
      setSuppliers(supRes.data);
      
      // Filter products by this category
      const catProducts = prodRes.data.filter((p: Product) => p.category === Number(id));
      setProducts(catProducts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useInventoryWebSocket(fetchData);

  const handleOpenModal = (product?: Product) => {
    setSelectedProduct(product || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSaveProduct = async (formData: FormData) => {
    if (selectedProduct) {
      await api.patch(`/products/${selectedProduct.id}/`, formData);
      toast.success('Producto actualizado');
    } else {
      // Si estamos en la vista de una categoría, forzamos que el nuevo producto sea de esta categoría
      formData.set('category', String(id));
      await api.post('/products/', formData);
      toast.success('Producto creado con éxito');
    }
    fetchData();
  };

  const handleDeleteProduct = async (productId: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto permanentemente?')) {
      try {
        await api.delete(`/products/${productId}/`);
        toast.success('Producto eliminado');
        fetchData();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Error al eliminar el producto');
      }
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.marca && product.marca.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const mantRes = await api.get('/maintenances/');
      await generateBulkProductsPDF(
        filteredProducts, 
        mantRes.data, 
        `Inventario_Categoria_${category?.name || 'Reporte'}_${new Date().toISOString().split('T')[0]}.pdf`
      );
    } catch (error) {
      toast.error('Error al descargar mantenimientos para el reporte');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link 
            to="/categories"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 shrink-0"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Package className="w-8 h-8 text-emerald-600" />
              Inventario: {category?.name || 'Cargando...'}
            </h1>
            <p className="text-gray-500 mt-2 text-lg">
              Listado completo de activos en esta categoría
            </p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm shadow-emerald-200 shrink-0"
        >
          <Plus className="w-5 h-5" />
          Añadir Producto
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por código, nombre o marca..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200 rounded-xl transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium border border-gray-200">
              <Filter className="w-5 h-5" />
              Filtrar
            </button>
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium border border-gray-200 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              {isExporting ? 'Generando...' : 'Exportar'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Foto</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Marca/Modelo</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ubicación</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cant.</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron productos en esta categoría
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <img src={getImageUrl(product.image)} alt={product.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-gray-100 text-gray-800">
                        {product.codigo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{product.nombre}</div>
                      <div className="text-sm text-gray-500">{product.color || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{product.marca || '-'}</div>
                      <div className="text-sm text-gray-500">{product.modelo || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-emerald-50 text-emerald-700">
                        {product.department_name || product.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.estado?.toLowerCase() === 'bueno' ? 'bg-emerald-100 text-emerald-800' :
                        product.estado?.toLowerCase() === 'malo' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {product.estado || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      ${Number(product.costo || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {product.cantidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleOpenViewModal(product)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Ver Detalles"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => generateProductPDF(product)}
                          className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Imprimir Ficha Técnica"
                        >
                          <Printer className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleOpenModal(product)}
                          className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredProducts.length > 0 && (
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-b-2xl">
            <span className="text-sm text-gray-500">
              Mostrando <span className="font-medium text-gray-900">{((currentPage - 1) * itemsPerPage) + 1}</span> a <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> de <span className="font-medium text-gray-900">{filteredProducts.length}</span> resultados
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <div className="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-100">
                Página {currentPage} de {totalPages || 1}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
      
      <ProductModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveProduct}
        product={selectedProduct}
        departments={departments}
        categories={categories}
        suppliers={suppliers}
      />
      
      <ProductViewModal
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
        product={selectedProduct}
      />
    </div>
  );
};

export default CategoryInventory;
