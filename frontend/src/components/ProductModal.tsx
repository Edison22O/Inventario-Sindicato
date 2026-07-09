import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Department, Product, Category, Supplier } from '../types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => Promise<void>;
  product?: Product | null;
  departments: Department[];
  categories: Category[];
  suppliers: Supplier[];
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, product, departments, categories, suppliers }) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    codigo: '',
    nombre: '',
    cantidad: 1,
    department: departments[0]?.id || 1,
    category: categories[0]?.id || undefined,
    supplier: suppliers[0]?.id || undefined,
    estado: 'Bueno',
    costo: '0.00',
    marca: '',
    modelo: '',
    serie: '',
    color: '',
    fecha_compra: '',
    fecha_ultimo_mantenimiento: '',
    caracteristicas: '',
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initialState: Partial<Product> = {
      codigo: '',
      nombre: '',
      cantidad: 1,
      department: departments[0]?.id || 1,
      category: categories[0]?.id || undefined,
      supplier: suppliers[0]?.id || undefined,
      estado: 'Bueno',
      costo: '0.00',
      marca: '',
      modelo: '',
      serie: '',
      color: '',
      fecha_compra: '',
      fecha_ultimo_mantenimiento: '',
      caracteristicas: '',
    };

    if (product) {
      const validStates = ['Bueno', 'Regular', 'Malo', 'De Baja'];
      const currentState = product.estado ? product.estado.toLowerCase() : '';
      const matchedState = validStates.find(s => s.toLowerCase() === currentState) || 'Bueno';
      
      setFormData({ ...product, estado: matchedState });
      setPreviewUrl(product.image || null);
    } else {
      setFormData(initialState);
      setPreviewUrl(null);
    }
    setImageFile(null);
  }, [product, departments, categories, suppliers, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate it's a JPG/PNG
      if (!file.type.includes('jpeg') && !file.type.includes('jpg') && !file.type.includes('png')) {
        toast.error("Por favor, sube solo imágenes JPG o PNG.");
        return;
      }
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'image' && key !== 'media_url' && key !== 'department_name' && key !== 'category_name') {
        data.append(key, String(value));
      }
    });

    if (imageFile) {
      data.append('image', imageFile);
    }

    try {
      await onSave(data);
      toast.success(product ? 'Producto actualizado' : 'Producto creado con éxito');
      onClose();
    } catch (error: any) {
      console.error('Error saving product:', error);
      if (error.response?.data) {
        // Tratar de extraer mensajes de error de DRF
        const dataErrors = error.response.data;
        const errorMessages = Object.entries(dataErrors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs[0] : msgs}`)
          .join('\n');
        toast.error(`Error al guardar:\n${errorMessages}`);
      } else {
        toast.error("Error al guardar el producto. Verifica los datos.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="productForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Foto del Producto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Foto del Producto (Opcional - JPG)</label>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative">
                  {previewUrl ? (
                    <img src={previewUrl.startsWith('blob:') || previewUrl.startsWith('http') ? previewUrl : `http://localhost:8000${previewUrl}`} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  )}
                  <input 
                    type="file" 
                    accept=".jpg,.jpeg,.png"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="text-sm text-gray-500">
                  <p className="font-medium text-gray-700">Haz clic en el recuadro para subir una imagen</p>
                  <p>Formatos soportados: JPG, PNG</p>
                  <p>Tamaño máximo recomendado: 5MB</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                <input required type="text" name="codigo" value={formData.codigo} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input required type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              
              {/* Quantity and Cost */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
                <input required type="number" min="0" name="cantidad" value={formData.cantidad} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Costo ($)</label>
                <input type="number" step="0.01" min="0" name="costo" value={formData.costo} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Compra</label>
                <input type="date" name="fecha_compra" value={formData.fecha_compra || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-gray-700" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Último Mantenimiento</label>
                <input type="date" name="fecha_ultimo_mantenimiento" value={formData.fecha_ultimo_mantenimiento || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-gray-700" />
              </div>

              {/* Location and Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Departamento *</label>
                <select required name="department" value={formData.department} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500">
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select name="category" value={formData.category || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500">
                  <option value="">Seleccione una categoría...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select name="estado" value={formData.estado} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500">
                  <option value="Bueno">Bueno</option>
                  <option value="Regular">Regular</option>
                  <option value="Malo">Malo</option>
                  <option value="De Baja">De Baja</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                <select name="supplier" value={formData.supplier || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500">
                  <option value="">Sin proveedor</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Specs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                <input type="text" name="marca" value={formData.marca} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                <input type="text" name="modelo" value={formData.modelo} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serie</label>
                <input type="text" name="serie" value={formData.serie} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input type="text" name="color" value={formData.color} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Características Adicionales</label>
              <textarea name="caracteristicas" rows={3} value={formData.caracteristicas} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button type="submit" form="productForm" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            Guardar Producto
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
