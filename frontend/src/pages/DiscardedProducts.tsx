import { useState, useEffect } from 'react';
import * as xlsx from 'xlsx';
import { Package, Search, Filter, Download, Upload, Edit2, Trash2, Image as ImageIcon, Eye, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Product, Department, Category, Supplier } from '../types';
import ProductModal from '../components/ProductModal';
import ProductViewModal from '../components/ProductViewModal';
import { useInventoryWebSocket } from '../hooks/useInventoryWebSocket';
import { getImageUrl } from '../utils/getImageUrl';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateProductPDF } from '../utils/productPdfGenerator';

const DiscardedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchData();
  }, []);

  // ... (keeping fetchData as is, adding view handlers after handleCloseModal)
  const handleOpenViewModal = (product: Product) => {
    setSelectedProduct(product);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedProduct(null);
  };

  const fetchData = async () => {
    try {
      const [productsRes, deptsRes, catsRes, suppsRes] = await Promise.all([
        api.get('/products/'),
        api.get('/departments/'),
        api.get('/categories/'),
        api.get('/suppliers/')
      ]);
      setProducts(productsRes.data);
      setDepartments(deptsRes.data);
      setCategories(catsRes.data);
      setSuppliers(suppsRes.data);
    } catch (error) {
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  useInventoryWebSocket(fetchData);

  useEffect(() => {
    fetchData();
  }, []);

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
    const headers = ['Código', 'Nombre', 'Marca', 'Modelo', 'Serie', 'Color', 'Departamento', 'Categoría', 'Proveedor', 'Estado', 'Cantidad', 'Costo', 'Fecha de Compra'];
    
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
          `"${p.supplier_name || ''}"`,
          `"${p.estado || ''}"`,
          p.cantidad,
          p.costo || 0,
          `"${p.fecha_compra || ''}"`
        ].join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bajas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const handleExportPDF = async () => {
    if (isExportingPDF) return;
    setIsExportingPDF(true);
    const toastId = toast.loading('Generando PDF...');
    
    try {
      const loadedImages: Record<number, string> = {};
      const imagePromises = filteredProducts.map(async (p) => {
        if (!p.image) return;
        try {
          const url = getImageUrl(p.image);
          const base64 = await getBase64ImageFromUrl(url);
          loadedImages[p.id] = base64;
        } catch (err) {
          console.warn('Could not load image', p.image);
        }
      });
      await Promise.all(imagePromises);

      let totalGeneral = 0;
      const tableData = filteredProducts.map(p => {
        const precioUnitario = Number(p.costo || 0);
        const precioTotal = precioUnitario * p.cantidad;
        totalGeneral += precioTotal;
        return [
          '', 
          p.codigo, 
          p.nombre, 
          `${p.marca || ''} ${p.modelo || ''}`.trim(), 
          p.serie || '', 
          p.department_name || p.department || '',
          p.estado || '', 
          p.cantidad, 
          `$${precioUnitario.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, 
          `$${precioTotal.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`
        ];
      });

      tableData.push(['', '', '', '', '', '', '', 'TOTAL:', '', `$${totalGeneral.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`]);

      const doc = new jsPDF('landscape');
      doc.setFontSize(18);
      doc.text(`Reporte de Equipos de Baja`, 14, 22);
      doc.setFontSize(11);
      doc.text(`Fecha de generacion: ${new Date().toLocaleDateString('es-EC')}`, 14, 30);

      autoTable(doc, {
        startY: 35,
        head: [['Foto', 'Codigo', 'Producto', 'Marca/Modelo', 'Serie', 'Ubicacion', 'Estado', 'Cant.', 'Precio Unit.', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] },
        styles: { fontSize: 8, minCellHeight: 14, valign: 'middle' },
        columnStyles: { 0: { cellWidth: 16 }, 7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' } },
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 0) {
            if (data.row.index < filteredProducts.length) {
              const product = filteredProducts[data.row.index];
              if (!product) return;
              const base64Img = loadedImages[product.id];
              if (base64Img) {
                try {
                   const imgDim = 12;
                   const x = data.cell.x + (data.cell.width - imgDim) / 2;
                   const y = data.cell.y + (data.cell.height - imgDim) / 2;
                   let format = 'JPEG';
                   if (base64Img.startsWith('data:image/png')) format = 'PNG';
                   else if (base64Img.startsWith('data:image/webp')) format = 'WEBP';
                   doc.addImage(base64Img, format, x, y, imgDim, imgDim);
                } catch (e) { console.error('Error drawing image', e); }
              }
            }
          }
        }
      });
      doc.save(`Bajas_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generado exitosamente', { id: toastId });
    } catch (error) {
      toast.error('Error al generar el PDF', { id: toastId });
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // keeping upload logic in case they want to import discards
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
          
          // Extract Date
          let rawFecha = row['FECHA DE COMPRA'] || row['FECHA COMPRA'] || row['FECHA'] || row['AÑO'];
          let parsedFecha = null;
          if (rawFecha) {
            // Check if it's an excel serial date
            if (typeof rawFecha === 'number') {
              const date = new Date(Math.round((rawFecha - 25569) * 86400 * 1000));
              parsedFecha = date.toISOString().split('T')[0];
            } else if (typeof rawFecha === 'string') {
              // Try to parse basic formats like DD/MM/YYYY or YYYY-MM-DD
              const parts = rawFecha.split(/[-\/]/);
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  parsedFecha = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`; // YYYY-MM-DD
                } else {
                  parsedFecha = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`; // DD-MM-YYYY
                }
              }
            }
          }

          const basePayload = {
            nombre: prodName.toString(),
            marca: row['MARCA'] ? row['MARCA'].toString() : '',
            modelo: row['MODELO'] ? row['MODELO'].toString() : '',
            serie: row['SERIE'] ? row['SERIE'].toString() : '',
            color: row['COLOR'] ? row['COLOR'].toString() : '',
            estado: 'De Baja', // Force De Baja for this view if imported here
            caracteristicas: caracteristicas,
            fecha_compra: parsedFecha,
            department: deptMap[row['UBICACIÓN']?.toString().trim().toUpperCase()],
            category: catMap[cleanCategory(prodName)]
          };
          
          try {
            if (diffCents !== 0 && cantOriginal > 1) {
              await api.post('/products/', { ...basePayload, codigo: cod, cantidad: cantOriginal - 1, costo: costoUnitario });
              count++;
              await api.post('/products/', { ...basePayload, codigo: `${cod}-aj`, cantidad: 1, costo: Math.round((costoUnitario + diffCents) * 100) / 100 });
              count++;
            } else {
              await api.post('/products/', { ...basePayload, codigo: cod, cantidad: cantOriginal, costo: costoUnitario });
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
    // SOLO MOSTRAR DE BAJA
    if (product.estado?.toLowerCase() !== 'de baja') return false;

    const matchesSearch = 
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.marca && product.marca.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesDepartment = filterDepartment ? String(product.department) === filterDepartment : true;
    const matchesCategory = filterCategory ? String(product.category) === filterCategory : true;

    return matchesSearch && matchesDepartment && matchesCategory;
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDepartment, filterCategory]);

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
            <Package className="w-8 h-8 text-red-600" />
            Equipos Dados de Baja
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Activos retirados del inventario
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
              title="Exportar CSV"
            >
              <Download className="w-5 h-5" /> CSV
            </button>
            <button 
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-colors font-medium border border-red-200 disabled:opacity-50"
              title="Exportar PDF"
            >
              <Download className="w-5 h-5" /> PDF
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Proveedor</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cant.</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron productos
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
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-emerald-50 text-emerald-700">
                        {product.department_name || product.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.supplier_name || <span className="text-gray-300 italic">No asignado</span>}
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

export default DiscardedProducts;
