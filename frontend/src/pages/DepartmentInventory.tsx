import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Search, ArrowLeft, Download, Filter, Plus, Edit2, Trash2, Image as ImageIcon, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Product, Department, Category } from '../types';
import ProductModal from '../components/ProductModal';
import ProductViewModal from '../components/ProductViewModal';
import { useInventoryWebSocket } from '../hooks/useInventoryWebSocket';
import { getImageUrl } from '../utils/getImageUrl';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const DepartmentInventory = () => {
  const { id } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [department, setDepartment] = useState<Department | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
      const [deptRes, allDeptsRes, prodRes, catRes, supRes] = await Promise.all([
        api.get(`/departments/${id}/`),
        api.get('/departments/'),
        api.get('/products/'),
        api.get('/categories/'),
        api.get('/suppliers/')
      ]);
      setDepartment(deptRes.data);
      setDepartments(allDeptsRes.data);
      setCategories(catRes.data);
      setSuppliers(supRes.data);
      
      // Filter products by this department
      const deptProducts = prodRes.data.filter((p: Product) => p.department === Number(id));
      setProducts(deptProducts);
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
    } else {
      // Si estamos en la vista de un departamento, forzamos que el nuevo producto sea de este departamento
      formData.set('department', String(id));
      await api.post('/products/', formData);
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

  const getBase64ImageFromUrl = async (imageUrl: string): Promise<string> => {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const toastId = toast.loading('Generando PDF...');
    
    try {
      // 1. Preload images as Base64
      const loadedImages: Record<number, string> = {};
      
      const imagePromises = filteredProducts.map(async (p) => {
        if (!p.image) return;
        try {
          const url = getImageUrl(p.image);
          const base64 = await getBase64ImageFromUrl(url);
          loadedImages[p.id] = base64;
        } catch (err) {
          console.warn('Could not load image for PDF', p.image);
        }
      });

      await Promise.all(imagePromises);

      let totalGeneral = 0;
      const tableData = filteredProducts.map(p => {
        const precioUnitario = Number(p.costo || 0);
        const precioTotal = precioUnitario * p.cantidad;
        totalGeneral += precioTotal;
        
        return [
          '', // Placeholder for 'Foto'
          p.codigo,
          p.nombre,
          `${p.marca || ''} ${p.modelo || ''}`.trim(),
          p.serie || '',
          p.estado || '',
          p.cantidad,
          `$${precioUnitario.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`,
          `$${precioTotal.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`
        ];
      });

      tableData.push([
        '', '', '', '', '', '', 'TOTAL GENERAL:', '',
        `$${totalGeneral.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`
      ]);

      const doc = new jsPDF('landscape');
      
      doc.setFontSize(18);
      doc.text(`Reporte de Inventario: ${department?.name || 'Departamento'}`, 14, 22);
      
      doc.setFontSize(11);
      doc.text(`Fecha de generacion: ${new Date().toLocaleDateString('es-EC')}`, 14, 30);

      (doc as any).autoTable({
        startY: 35,
        head: [['Foto', 'Codigo', 'Producto', 'Marca/Modelo', 'Serie', 'Estado', 'Cant.', 'Precio Unit.', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] }, // emerald-600
        styles: { fontSize: 9, minCellHeight: 14, valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 16 }, // Foto column width
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right' }
        },
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 0) {
            // Ensure we are not on the 'TOTAL GENERAL' row
            if (data.row.index < filteredProducts.length) {
              const product = filteredProducts[data.row.index];
              const base64Img = loadedImages[product.id];
              if (base64Img) {
                try {
                   // Center image in the cell (12x12 dimensions)
                   const imgDim = 12;
                   const x = data.cell.x + (data.cell.width - imgDim) / 2;
                   const y = data.cell.y + (data.cell.height - imgDim) / 2;
                   
                   // Extract extension for jsPDF (jpeg, png, webp)
                   let format = 'JPEG';
                   if (base64Img.startsWith('data:image/png')) format = 'PNG';
                   else if (base64Img.startsWith('data:image/webp')) format = 'WEBP';

                   doc.addImage(base64Img, format, x, y, imgDim, imgDim);
                } catch (e) {
                   console.error('Error drawing image in PDF', e);
                }
              }
            }
          }
        }
      });

      const fileName = `Inventario_${department?.name || 'Departamento'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success('PDF generado exitosamente', { id: toastId });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link 
            to="/departments"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 shrink-0"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Package className="w-8 h-8 text-emerald-600" />
              Inventario: {department?.name || 'Cargando...'}
            </h1>
            <p className="text-gray-500 mt-2 text-lg">
              Listado completo de activos en esta ubicación
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
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium border border-gray-200"
            >
              <Download className="w-5 h-5" />
              Exportar
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Serie</th>
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
                    No se encontraron productos en este departamento
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.serie || '-'}
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

export default DepartmentInventory;
