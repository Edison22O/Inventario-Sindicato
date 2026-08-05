import { useState, useEffect } from 'react';
import { FileText, Search, RefreshCw, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { Vehicle } from '@/shared/types';

const VehicleMatriculas = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para renovar matrícula
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles/');
      setVehicles(res.data);
    } catch (error) {
      toast.error('Error al cargar la flota vehicular');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRenewModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    // Sugerir exactamente un año después de su vencimiento actual, o la fecha de hoy si no tiene
    if (vehicle.fecha_vencimiento_matricula) {
      const [y, m, d] = vehicle.fecha_vencimiento_matricula.split('-');
      setNewExpirationDate(`${parseInt(y) + 1}-${m}-${d}`);
    } else {
      setNewExpirationDate(new Date().toISOString().split('T')[0]);
    }
    setIsRenewModalOpen(true);
  };

  const handleSubmitRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    setSubmitting(true);
    try {
      await api.patch(`/vehicles/${selectedVehicle.id}/`, {
        fecha_vencimiento_matricula: newExpirationDate
      });
      toast.success('Matrícula renovada exitosamente');
      setIsRenewModalOpen(false);
      fetchVehicles(); // Refrescar tabla
    } catch (error) {
      toast.error('Error al renovar la matrícula');
    } finally {
      setSubmitting(false);
    }
  };

  const getMatriculaInfo = (vehicle: Vehicle) => {
    const digito = vehicle.placa.slice(-1);
    const vencimientoStr = vehicle.fecha_vencimiento_matricula;
    
    // Si no hay fecha, retornamos vacíos
    if (!vencimientoStr) {
      return {
        inicio: '-',
        vencimiento: '-',
        dias_texto: 'NO REGISTRADA',
        dias_num: null,
        estado_texto: '-',
        color: 'bg-gray-200'
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Parse the date (yyyy-mm-dd format from backend)
    const [year, month, day] = vencimientoStr.split('-').map(Number);
    const vencDate = new Date(year, month - 1, day);
    const iniDate = new Date(year - 1, month - 1, day);
    
    // diff in days
    const diffTime = vencDate.getTime() - today.getTime();
    const diff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let dias_texto = '';
    let estado_texto = '';
    let color = '';

    if (diff < 0) {
      dias_texto = `${Math.abs(diff)} DIAS VENCIDOS`;
      estado_texto = 'Segunda';
      color = 'bg-red-500 text-white';
    } else if (diff <= 30) {
      dias_texto = `${diff} DIAS VIGENTES`;
      estado_texto = 'MATRICULADO';
      color = 'bg-yellow-400 text-black';
    } else {
      dias_texto = `${diff} DIAS VIGENTES`;
      estado_texto = 'MATRICULADO';
      color = 'bg-emerald-500 text-white';
    }

    return {
      inicio: `${iniDate.getDate()}/${iniDate.getMonth() + 1}/${iniDate.getFullYear()}`,
      vencimiento: `${vencDate.getDate()}/${vencDate.getMonth() + 1}/${vencDate.getFullYear()}`,
      dias_texto,
      dias_num: diff,
      estado_texto,
      color
    };
  };

  const filteredVehicles = vehicles.filter(v => 
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.marca.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto pb-32">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <FileText className="w-8 h-8 text-emerald-600" />
          </div>
          Matrícula Vehicular
        </h1>
        <p className="text-gray-500 mt-2 font-medium">SINDICATO DE CHOFERES DEL CANTÓN ESPEJO - LISTADO DE VEHÍCULOS</p>
      </div>

      <div className="mb-6 relative w-full max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por placa o marca..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl shadow-sm transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Cargando datos...</div>
        ) : (
          <table className="w-full text-sm text-center border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-emerald-900 text-white border-b-2 border-emerald-800">
                <th className="py-3 px-2 border-r border-emerald-800 font-bold w-12">Nº</th>
                <th className="py-3 px-3 border-r border-emerald-800 font-bold">PLACA</th>
                <th className="py-3 px-3 border-r border-emerald-800 font-bold">MARCA</th>
                <th className="py-3 px-2 border-r border-emerald-800 font-bold">AÑO</th>
                <th className="py-3 px-3 border-r border-emerald-800 font-bold">COLOR</th>
                <th className="py-3 px-2 border-r border-emerald-800 font-bold">DIGITO</th>
                <th className="py-3 px-3 border-r border-emerald-800 font-bold">MES / MATRICULA</th>
                <th className="py-3 px-3 border-r border-emerald-800 font-bold">FECHA DE INICIO</th>
                <th className="py-3 px-3 border-r border-emerald-800 font-bold">FECHA VENCIMIENT.</th>
                <th className="py-3 px-3 border-r border-emerald-800 font-bold" colSpan={3}>ESTADO</th>
                <th className="py-3 px-3 font-bold w-32 border-r border-emerald-800">OBSERVACIÓN</th>
                <th className="py-3 px-3 font-bold w-12 text-center bg-emerald-800">ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle, index) => {
                const info = getMatriculaInfo(vehicle);
                const digito = vehicle.placa.slice(-1);
                
                // Color mapping for digito/mes cell based on excel approx
                let digitoBg = '';
                if (['1'].includes(digito)) digitoBg = 'bg-[#f4cda5]'; // FEBRERO (Naranja claro)
                else if (['2','3'].includes(digito)) digitoBg = 'bg-[#bcd6ee]'; // MARZO/ABRIL (Celeste)
                else if (['4'].includes(digito)) digitoBg = 'bg-[#dfbdf2]'; // MAYO (Lila)
                else if (['5','6'].includes(digito)) digitoBg = 'bg-[#e6b8b7]'; // JUN/JUL (Rosa)
                else if (['7'].includes(digito)) digitoBg = 'bg-[#c4bd97]'; // AGO (Oliva)
                else if (['8'].includes(digito)) digitoBg = 'bg-[#d8e4bc]'; // SEP (Verde claro)
                else if (['9','0'].includes(digito)) digitoBg = 'bg-[#e6b8b7]'; // OCT/NOV (Rosa/Rojo claro)

                return (
                  <tr key={vehicle.id} className="border-b border-gray-200 hover:bg-emerald-50/50 transition-colors">
                    <td className="py-2 px-2 border-r border-gray-200 font-semibold bg-emerald-50/80 text-emerald-900">{index + 1}</td>
                    <td className="py-2 px-3 border-r border-gray-200 font-semibold text-gray-800">{vehicle.placa}</td>
                    <td className="py-2 px-3 border-r border-gray-200 text-gray-700">{vehicle.marca}</td>
                    <td className="py-2 px-2 border-r border-gray-200 text-gray-700">{vehicle.año}</td>
                    <td className="py-2 px-3 border-r border-gray-200 text-gray-700">{vehicle.color}</td>
                    
                    <td className={`py-2 px-2 border-r border-gray-300 font-bold text-gray-800 ${digitoBg}`}>{digito}</td>
                    <td className={`py-2 px-3 border-r border-gray-300 font-bold uppercase text-gray-800 ${digitoBg}`}>{vehicle.mes_matricula || '-'}</td>
                    
                    <td className="py-2 px-3 border-r border-gray-200 bg-emerald-50/80 text-emerald-900 font-medium">{info.inicio}</td>
                    <td className="py-2 px-3 border-r border-gray-300 bg-emerald-50/80 text-emerald-900 font-medium">{info.vencimiento}</td>
                    
                    {/* ESTADO COLUMNS */}
                    <td className={`py-2 px-3 border-r border-gray-200 font-bold w-40 ${info.dias_num !== null && info.dias_num < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {info.dias_texto}
                    </td>
                    <td className={`py-2 px-3 border-r border-gray-200 font-bold w-32 ${info.estado_texto === 'Segunda' ? 'text-red-600' : 'text-emerald-700'}`}>
                      {info.estado_texto}
                    </td>
                    <td className={`py-2 px-2 border-r border-gray-300 w-12 ${info.color}`}>
                      {info.estado_texto === 'Segunda' ? '-' : ''}
                    </td>
                    
                    <td className="py-2 px-3 border-r border-gray-200 bg-emerald-50/80"></td>
                    <td className="py-1 px-2 text-center bg-gray-50/50">
                      <button
                        onClick={() => handleOpenRenewModal(vehicle)}
                        title="Renovar Matrícula"
                        className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200 hover:shadow-sm"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredVehicles.length === 0 && (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-gray-500">No se encontraron vehículos.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal para Renovar Matrícula */}
      {isRenewModalOpen && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-emerald-900">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-gold-400" />
                Renovar Matrícula
              </h2>
              <button onClick={() => setIsRenewModalOpen(false)} className="text-emerald-300 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitRenew} className="p-6 space-y-5">
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm mb-2 border border-emerald-100">
                <p>
                  Vas a renovar la matrícula del vehículo <b>{selectedVehicle.placa}</b> ({selectedVehicle.marca}).
                  Actualmente vence el {selectedVehicle.fecha_vencimiento_matricula || 'N/A'}.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nueva Fecha de Vencimiento</label>
                <input
                  type="date"
                  required
                  value={newExpirationDate}
                  onChange={e => setNewExpirationDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-2">La "Fecha de inicio" se calculará automáticamente como 1 año antes de esta nueva fecha.</p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRenewModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {submitting ? 'Guardando...' : 'Confirmar Renovación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleMatriculas;
