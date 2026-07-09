import { useState, useEffect } from 'react';
import * as xlsx from 'xlsx';
import { Package, Plus, Search, Filter, Download, Upload, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Product, Department, Category } from '../types';
import ProductModal from '../components/ProductModal';

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, depRes, catRes] = await Promise.all([
        api.get('/products/'),
        api.get('/departments/'),
        api.get('/categories/')
      ]);
      setProducts(prodRes.data);
      setDepartments(depRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

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
      await api.put(`/products/${selectedProduct.id}/`, formData);
    } else {
      await api.post('/products/', formData);
    }
    fetchData(); // Refresh list
  };

  const handleDeleteProduct = async (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto permanentemente?')) {
      try {
        await api.delete(`/products/${id}/`);
        toast.success('Producto eliminado');
        fetchData();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Error al eliminar el producto');
      }
    }
  };

  const handleExport = () => {
    const headers = ['Código', 'Nombre', 'Marca', 'Modelo', 'Serie', 'Color', 'Departamento', 'Categoría', 'Estado', 'Cantidad', 'Costo'];
    
    const csvRows = [
      headers.join(','),
      ...filteredProducts.map(p => {
        return [
          `"${p.codigo}"`,
          `"${p.nombre}"`,
          `"${p.marca || ''}"`,
          `"${p.modelo || ''}"`,
          `"${p.serie || ''}"`,
          `"${p.color || ''}"`,
          `"${p.department_name || p.department}"`,
          `"${p.category_name || p.category || ''}"`,
          `"${p.estado || ''}"`,
          p.cantidad,
          p.costo || 0
        ].join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventario_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = xlsx.read(data, { type: 'array' });
        
        // Find the best sheet
        const sheetName = workbook.SheetNames.includes('EDITABLE') 
          ? 'EDITABLE' 
          : workbook.SheetNames.includes('TODO_PROD') ? 'TODO_PROD' : workbook.SheetNames[0];
          
        const worksheet = workbook.Sheets[sheetName];
        let jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: '' }) as any[];
        
        // Limpiar filas vacías o basura del Excel
        jsonData = jsonData.filter(row => {
          const p = row['PRODUCTO']?.toString().trim().toUpperCase();
          const u = row['UBICACIÓN']?.toString().trim().toUpperCase();
          return p && u && p !== '0' && u !== '0' && p !== 'PRODUCTO' && u !== 'UBICACIÓN';
        });
        
        if (jsonData.length === 0) return toast.error('El archivo Excel está vacío o no tiene el formato correcto');
        
        toast.loading('Analizando archivo y limpiando datos...', { id: 'import' });
        
        const cleanCategory = (name: string) => {
          if (!name) return 'OTROS';
          return name.toString().replace(/[-\s]\d+$/, '').trim().toUpperCase();
        };
        
        const depts = [...new Set(jsonData.map(row => row['UBICACIÓN']?.toString().trim()).filter(Boolean))];
        const cats = [...new Set(jsonData.map(row => cleanCategory(row['PRODUCTO'])).filter(Boolean))];
        
        // Refresh local depts and cats lists from API to be safe
        const [depRes, catRes] = await Promise.all([
          api.get('/departments/'),
          api.get('/categories/')
        ]);
        
        const deptMap: Record<string, number> = {};
        depRes.data.forEach((d: Department) => deptMap[d.name] = d.id);
        
        toast.loading('Sincronizando ubicaciones...', { id: 'import' });
        for (const d of depts) {
          if (!deptMap[d]) {
            const res = await api.post('/departments/', { name: d, description: '' });
            deptMap[d] = res.data.id;
          }
        }
        
        const catMap: Record<string, number> = {};
        catRes.data.forEach((c: Category) => catMap[c.name] = c.id);
        
        toast.loading('Sincronizando categorías...', { id: 'import' });
        for (const c of cats) {
          if (!catMap[c]) {
            const res = await api.post('/categories/', { name: c, description: '' });
            catMap[c] = res.data.id;
          }
        }
        
        toast.loading('Importando equipos. Esto puede tomar un momento...', { id: 'import' });
        
        let count = 0;
        const seenCodes = new Set<string>();
        
        for (const row of jsonData) {
          const prodName = row['PRODUCTO'] || 'Sin Nombre';
          const rawCod = row['CODIGO'] || row['CÓDIGO'];
          // Generate code if missing
          let cod = rawCod ? rawCod.toString().trim() : `SN-${Date.now()}-${Math.floor(Math.random()*1000)}`;
          
          // Handle duplicates in the Excel file to avoid 400 Bad Request
          if (seenCodes.has(cod)) {
            cod = `${cod}-${Math.floor(Math.random()*10000)}`;
          }
          seenCodes.add(cod);
          
          let rawCosto = row['COSTO'];
          if (typeof rawCosto === 'string') {
            rawCosto = rawCosto.replace(/\$/g, '').replace(/\s/g, '').replace(/,/g, '.');
          }
          
          const cantOriginal = Number(row['CANTIDAD']) || 1;
          const costoFila = Number(rawCosto) || 0;
          
          const costoUnitario = Math.round((costoFila / cantOriginal) * 100) / 100;
          const diffCents = Math.round((costoFila - (costoUnitario * cantOriginal)) * 100) / 100;
          
          // Agregamos características y anotamos si era un lote
          let caracteristicas = row['CARACTERISTICAS'] ? row['CARACTERISTICAS'].toString().trim() : '';
          
          const basePayload = {
            nombre: prodName.toString(),
            marca: row['MARCA'] ? row['MARCA'].toString() : '',
            modelo: row['MODELO'] ? row['MODELO'].toString() : '',
            serie: row['SERIE'] ? row['SERIE'].toString() : '',
            color: row['COLOR'] ? row['COLOR'].toString() : '',
            estado: row['ESTADO'] ? row['ESTADO'].toString() : 'Bueno',
            caracteristicas: caracteristicas,
            department: deptMap[row['UBICACIÓN']?.toString().trim().toUpperCase()],
            category: catMap[cleanCategory(prodName)]
          };
          
          try {
            if (diffCents !== 0 && cantOriginal > 1) {
              // Dividimos en dos registros para que el total sume exacto (sin perder centavos por divisiones)
              await api.post('/products/', {
                ...basePayload,
                codigo: cod,
                cantidad: cantOriginal - 1,
                costo: costoUnitario
              });
              count++;
              const codAjuste = `${cod}-aj`;
              await api.post('/products/', {
                ...basePayload,
                codigo: codAjuste,
                cantidad: 1,
                costo: Math.round((costoUnitario + diffCents) * 100) / 100
              });
              count++;
            } else {
              await api.post('/products/', {
                ...basePayload,
                codigo: cod,
                cantidad: cantOriginal,
                costo: costoUnitario
              });
              count++;
            }
          } catch (postErr) {
            console.error('Error post product:', postErr);
          }
        }
        
        toast.success(`¡${count} equipos importados con éxito!`, { id: 'import' });
        fetchData(); // Reload table
        
      } catch (err) {
        console.error(err);
        toast.error('Ocurrió un error al procesar el Excel', { id: 'import' });
      }
      
      // Reset input
      if (e.target) e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = 
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.marca && product.marca.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesDepartment = filterDepartment ? String(product.department) === filterDepartment : true;
    const matchesCategory = filterCategory ? String(product.category) === filterCategory : true;
    const matchesEstado = filterEstado ? product.estado?.toLowerCase() === filterEstado.toLowerCase() : true;

    return matchesSearch && matchesDepartment && matchesCategory && matchesEstado;
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDepartment, filterCategory, filterEstado]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-emerald-600" />
            Catálogo Completo
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Todos los activos de la empresa
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white overflow-hidden">
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
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors font-medium border border-gray-200 ${showFilters ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
              title="Filtrar"
            >
              <Filter className="w-5 h-5" />
            </button>
            
            <label className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium border border-gray-200 cursor-pointer" title="Importar Excel">
              <Upload className="w-5 h-5" />
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
            </label>

            <button 
              onClick={handleExport}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium border border-gray-200"
              title="Exportar"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
              <select 
                value={filterDepartment} 
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              >
                <option value="">Todos</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              >
                <option value="">Todas</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select 
                value={filterEstado} 
                onChange={(e) => setFilterEstado(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              >
                <option value="">Todos</option>
                <option value="Bueno">Bueno</option>
                <option value="Regular">Regular</option>
                <option value="Malo">Malo</option>
                <option value="De Baja">De Baja</option>
              </select>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50/80 to-white/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Foto</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Marca/Modelo</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Serie</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ubicación</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cant.</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <img src={product.image.startsWith('http') ? product.image : `http://localhost:8000${product.image}`} alt={product.nombre} className="w-full h-full object-cover" />
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
                      {product.cantidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
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
          <div className="p-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/30">
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
      />
    </div>
  );
};

export default Products;
