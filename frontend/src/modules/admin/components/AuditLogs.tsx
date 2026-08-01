import { useState, useEffect } from 'react';
import { ShieldAlert, User, PlusCircle, Edit, Trash2, LogIn, Filter } from 'lucide-react';
import api from '@/shared/services/api';

interface ActivityLog {
  id: number;
  user_name: string;
  user_role: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'OTHER';
  module: string;
  description: string;
  timestamp: string;
}

const actionConfig = {
  CREATE: { icon: PlusCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  UPDATE: { icon: Edit, color: 'text-amber-500', bg: 'bg-amber-50' },
  DELETE: { icon: Trash2, color: 'text-red-500', bg: 'bg-red-50' },
  LOGIN: { icon: LogIn, color: 'text-blue-500', bg: 'bg-blue-50' },
  OTHER: { icon: ShieldAlert, color: 'text-gray-500', bg: 'bg-gray-50' }
};

const AuditLogs = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await api.get('/audit-logs/');
      setLogs(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[600px]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-600" />
            Auditoría de Sistema
          </h2>
          <p className="text-sm text-gray-500 mt-1">Registro inmutable de toda la actividad de los usuarios en la plataforma.</p>
        </div>
        <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">
          <Filter className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Cargando registros de auditoría...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-500 font-medium">No hay actividad registrada aún.</p>
        </div>
      ) : (
        <div className="max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
          <div className="relative pl-4 space-y-8 before:absolute before:inset-0 before:ml-10 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
            {logs.map((log) => {
            const config = actionConfig[log.action] || actionConfig.OTHER;
            const Icon = config.icon;
            
            return (
              <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                
                {/* Icon Marker */}
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white ${config.bg} ${config.color} shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2`}>
                  <Icon className="w-4 h-4" />
                </div>
                
                {/* Content Box */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{log.module}</span>
                    <span className="text-xs text-gray-400 font-medium">
                      {new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(log.timestamp))}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{log.description}</h3>
                  <div className="flex items-center gap-2 mt-3 text-xs">
                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-emerald-700" />
                    </div>
                    <span className="font-semibold text-gray-700">{log.user_name}</span>
                    <span className="text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded-md">{log.user_role}</span>
                  </div>
                </div>
                
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
