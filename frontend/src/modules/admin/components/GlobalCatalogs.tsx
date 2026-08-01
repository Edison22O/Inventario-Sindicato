import { useState, useEffect } from 'react';
import { Tags, Layers } from 'lucide-react';
import api from '@/shared/services/api';
import toast from 'react-hot-toast';
import { confirmDialog } from '@/shared/utils/confirmDialog';

// Reusing generic interfaces
interface Item { id: number; name: string; description?: string; }

const GlobalCatalogs = () => {
  const [techCategories, setTechCategories] = useState<Item[]>([]);
  const [techDepts, setTechDepts] = useState<Item[]>([]);
  const [furnCategories, setFurnCategories] = useState<Item[]>([]);
  const [furnDepts, setFurnDepts] = useState<Item[]>([]);

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    try {
      const [tc, td, fc, fd] = await Promise.all([
        api.get('/categories/'),
        api.get('/departments/'),
        api.get('/furniture/categories/'),
        api.get('/furniture/departments/')
      ]);
      setTechCategories(tc.data);
      setTechDepts(td.data);
      setFurnCategories(fc.data);
      setFurnDepts(fd.data);
    } catch (error) {
      console.error(error);
    }
  };

  const SimpleList = ({ title, items, icon: Icon, endpoint }: { title: string, items: Item[], icon: any, endpoint: string }) => {
    const [newItem, setNewItem] = useState('');

    const handleAdd = async () => {
      if (!newItem) return;
      try {
        await api.post(endpoint, { name: newItem, description: '' });
        setNewItem('');
        fetchCatalogs();
        toast.success('Elemento añadido');
      } catch (e) {
        toast.error('Error al guardar');
      }
    };

    const handleDelete = async (id: number) => {
      if (await confirmDialog('Eliminar esto puede afectar inventarios existentes. ¿Continuar?')) {
        try {
          await api.delete(`${endpoint}${id}/`);
          fetchCatalogs();
          toast.success('Eliminado');
        } catch (e) {
          toast.error('No se pudo eliminar');
        }
      }
    };

    return (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Icon className="w-5 h-5 text-emerald-600" />
          {title}
        </h3>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Nuevo nombre..."
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          />
          <button onClick={handleAdd} className="px-3 py-2 bg-emerald-100 text-emerald-700 font-semibold rounded-lg hover:bg-emerald-200 text-sm">
            Añadir
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {items.map(i => (
            <div key={i.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl group hover:bg-emerald-50/50 transition-colors">
              <span className="font-medium text-gray-700 text-sm">{i.name}</span>
              <button onClick={() => handleDelete(i.id)} className="text-red-400 hover:text-red-600 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                Borrar
              </button>
            </div>
          ))}
          {items.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Sin registros</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4 px-2">Catálogos Tecnológicos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SimpleList title="Departamentos (Tecnología)" items={techDepts} icon={Layers} endpoint="/departments/" />
          <SimpleList title="Categorías (Tecnología)" items={techCategories} icon={Tags} endpoint="/categories/" />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4 px-2">Catálogos de Mobiliario</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SimpleList title="Departamentos (Mobiliario)" items={furnDepts} icon={Layers} endpoint="/furniture/departments/" />
          <SimpleList title="Categorías (Mobiliario)" items={furnCategories} icon={Tags} endpoint="/furniture/categories/" />
        </div>
      </div>
    </div>
  );
};

export default GlobalCatalogs;
