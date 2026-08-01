import { useState } from 'react';
import { Download, Upload, AlertTriangle, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import { confirmDialog } from '@/shared/utils/confirmDialog';

const SystemBackups = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await api.get('/backup/export/', {
        responseType: 'blob', // Important for downloading files
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'backup_inventario.sql');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Respaldo generado exitosamente');
    } catch (error) {
      toast.error('Error al generar el respaldo');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.sql';
    fileInput.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!await confirmDialog('⚠️ ADVERTENCIA CRÍTICA ⚠️\n\nEstás a punto de sobreescribir TODA la base de datos actual con este archivo de respaldo. Perderás cualquier cambio que se haya hecho después de que este archivo fue creado.\n\n¿Estás absolutamente seguro de que quieres continuar?')) {
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        setIsImporting(true);
        const promise = api.post('/backup/import/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        toast.promise(promise, {
          loading: 'Restaurando base de datos... Por favor no cierres la ventana.',
          success: '¡Base de datos restaurada con éxito!',
          error: 'Error al restaurar la base de datos.',
        });

        await promise;
        // Optionally, reload the page after a successful import
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error) {
        console.error(error);
      } finally {
        setIsImporting(false);
      }
    };
    fileInput.click();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Export Card */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-emerald-100/50 hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 text-emerald-600">
          <Download className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">Generar Respaldo</h3>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Descarga un archivo .sql que contiene absolutamente toda la información de usuarios, roles, inventarios y viajes de manera segura.
        </p>
        
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-all disabled:opacity-70"
        >
          {isExporting ? 'Generando Archivo...' : 'Descargar Copia de Seguridad'}
        </button>
      </div>

      {/* Import Card */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-red-100/50 hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 opacity-5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-6 text-red-600">
          <Upload className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">Restaurar Sistema</h3>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Sube un archivo de respaldo previo para devolver la base de datos a ese estado exacto. <span className="font-bold text-red-500">Esta acción es destructiva.</span>
        </p>
        
        <button
          onClick={handleImportClick}
          disabled={isImporting}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold transition-all disabled:opacity-70"
        >
          <AlertTriangle className="w-5 h-5" />
          {isImporting ? 'Restaurando Sistema...' : 'Subir y Restaurar Base de Datos'}
        </button>
      </div>
      
      {/* Informational Panel */}
      <div className="md:col-span-2 bg-gray-50 rounded-3xl p-6 border border-gray-100 flex items-start gap-4">
        <div className="p-3 bg-white rounded-xl shadow-sm">
          <Database className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h4 className="font-bold text-gray-900 mb-1">Acerca de la Seguridad de Datos</h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            Es altamente recomendable generar una copia de seguridad antes de realizar cambios masivos o dar de baja a múltiples usuarios y equipos. 
            Guarda tus archivos <code>.sql</code> en un lugar seguro (como un disco duro externo o la nube).
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemBackups;
