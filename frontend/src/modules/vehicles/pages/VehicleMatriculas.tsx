import { useState, useEffect, useMemo } from 'react';
import { FileText, Search, RefreshCw, X, CheckCircle, AlertTriangle, ShieldAlert, Clock } from 'lucide-react';
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
  
  const [formData, setFormData] = useState({
    fecha_pago: new Date().toISOString().split('T')[0],
    año_matriculado: new Date().getFullYear().toString(),
    costo: '',
    lugar_tramite: '',
    nueva_fecha_vencimiento: '',
    notas: ''
  });
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles/');
      setVehicles(res.data || []);
    } catch (error) {
      toast.error('Error al cargar la flota vehicular');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRenewModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    
    let suggestedExpiration = new Date().toISOString().split('T')[0];
    if (vehicle.fecha_vencimiento_matricula) {
      const [y, m, d] = vehicle.fecha_vencimiento_matricula.split('-');
      suggestedExpiration = `${parseInt(y) + 1}-${m}-${d}`;
    }

    setFormData({
      fecha_pago: new Date().toISOString().split('T')[0],
      año_matriculado: new Date().getFullYear().toString(),
      costo: '',
      lugar_tramite: '',
      nueva_fecha_vencimiento: suggestedExpiration,
      notas: ''
    });

    setIsRenewModalOpen(true);
  };

  const handleSubmitRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    setSubmitting(true);
    try {
      await api.post('/vehicle-registrations/', {
        ...formData,
        vehicle: selectedVehicle.id,
        costo: parseFloat(formData.costo || '0'),
        año_matriculado: parseInt(formData.año_matriculado)
      });
      toast.success('Renovación registrada exitosamente en el historial');
      setIsRenewModalOpen(false);
      fetchVehicles();
    } catch (error) {
      toast.error('Error al registrar la renovación');
    } finally {
      setSubmitting(false);
    }
  };

  const getMatriculaInfo = (vehicle: Vehicle) => {
    const vencimientoStr = vehicle.fecha_vencimiento_matricula;
    
    if (!vencimientoStr) {
      return {
        inicio: '-',
        vencimiento: '-',
        dias_texto: 'NO REGISTRADA',
        dias_num: null,
        estado_texto: '-',
        color: 'bg-gray-200 text-gray-700'
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [year, month, day] = vencimientoStr.split('-').map(Number);
    const vencDate = new Date(year, month - 1, day);
    const iniDate = new Date(year - 1, month - 1, day);
    
    const diffTime = vencDate.getTime() - today.getTime();
    const diff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let dias_texto = '';
    let estado_texto = '';
    let color = '';

    if (diff < 0) {
      dias_texto = `${Math.abs(diff)} DÍAS VENCIDOS`;
      estado_texto = 'VENCIDO';
      color = 'bg-red-600 text-white font-black';
    } else if (diff <= 30) {
      dias_texto = `${diff} DÍAS VIGENTES`;
      estado_texto = 'PRÓXIMO A VENCER';
      color = 'bg-amber-500 text-white font-extrabold';
    } else {
      dias_texto = `${diff} DÍAS VIGENTES`;
      estado_texto = 'MATRICULADO';
      color = 'bg-emerald-600 text-white font-extrabold';
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

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => 
      v.placa.toLowerCase().includes(searchTerm.toLowerCase()) || 
      v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.modelo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vehicles, searchTerm]);

  // KPIs
  const totalCount = vehicles.length;
  const vigentesCount = vehicles.filter(v => v.alerta_matricula === 'VIGENTE').length;
  const proximosCount = vehicles.filter(v => v.alerta_matricula === 'PRÓXIMA A VENCER').length;
  const vencidosCount = vehicles.filter(v => v.alerta_matricula === 'MATRÍCULA VENCIDA').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto pb-32 relative">
      {/* Background Texture */}
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none rounded-3xl mix-blend-multiply" />

      {/* Header */}
      <div className="relative z-10 mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm">
            <FileText className="w-7 h-7" />
          </div>
          Control de Matrícula Vehicular
        </h1>
        <p className="text-gray-500 mt-1.5 text-base font-medium">
          Listado general de vigencia de matrículas y control de calendarios según el dígito de placa.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vehículos Totales</p>
            <p className="text-2xl font-black text-gray-900">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Matrículas Vigentes</p>
            <p className="text-2xl font-black text-emerald-600">{vigentesCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-amber-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Próximas a Vencer</p>
            <p className="text-2xl font-black text-amber-600">{proximosCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-red-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Matrículas Vencidas</p>
            <p className="text-2xl font-black text-red-600">{vencidosCount}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por placa, marca o modelo..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table Area */}
      <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-center border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white font-bold uppercase tracking-wider shadow-sm">
                <th className="py-4 px-3 text-center border-r border-emerald-600/30">Nº</th>
                <th className="py-4 px-4 border-r border-emerald-600/30">PLACA</th>
                <th className="py-4 px-4 border-r border-emerald-600/30">MARCA / MODELO</th>
                <th className="py-4 px-3 border-r border-emerald-600/30">AÑO</th>
                <th className="py-4 px-3 border-r border-emerald-600/30">COLOR</th>
                <th className="py-4 px-3 border-r border-emerald-600/30">DÍGITO</th>
                <th className="py-4 px-4 border-r border-emerald-600/30">MES MATRÍCULA</th>
                <th className="py-4 px-4 border-r border-emerald-600/30">INICIO VIGENCIA</th>
                <th className="py-4 px-4 border-r border-emerald-600/30">VENCIMIENTO</th>
                <th className="py-4 px-4 border-r border-emerald-600/30">ESTADO Y VIGENCIA</th>
                <th className="py-4 px-4 text-center">ACCIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-xs">
              {filteredVehicles.map((vehicle, index) => {
                const info = getMatriculaInfo(vehicle);
                const digito = vehicle.placa.slice(-1);
                
                let digitoBg = 'bg-gray-100 text-gray-800';
                if (['1'].includes(digito)) digitoBg = 'bg-orange-100 text-orange-900 border border-orange-200';
                else if (['2','3'].includes(digito)) digitoBg = 'bg-blue-100 text-blue-900 border border-blue-200';
                else if (['4'].includes(digito)) digitoBg = 'bg-purple-100 text-purple-900 border border-purple-200';
                else if (['5','6'].includes(digito)) digitoBg = 'bg-pink-100 text-pink-900 border border-pink-200';
                else if (['7'].includes(digito)) digitoBg = 'bg-amber-100 text-amber-900 border border-amber-200';
                else if (['8'].includes(digito)) digitoBg = 'bg-emerald-100 text-emerald-900 border border-emerald-200';
                else if (['9','0'].includes(digito)) digitoBg = 'bg-rose-100 text-rose-900 border border-rose-200';

                return (
                  <tr key={vehicle.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-3 border-r border-gray-100 font-bold text-gray-400">{index + 1}</td>
                    
                    <td className="py-3 px-4 border-r border-gray-100">
                      <span className="px-3 py-1 bg-gray-900 text-white font-black text-xs rounded-lg tracking-widest shadow-sm">
                        {vehicle.placa}
                      </span>
                    </td>

                    <td className="py-3 px-4 border-r border-gray-100 text-left">
                      <div className="font-extrabold text-gray-900">{vehicle.marca}</div>
                      <div className="text-[10px] text-gray-500 font-semibold">{vehicle.modelo}</div>
                    </td>

                    <td className="py-3 px-3 border-r border-gray-100 font-semibold text-gray-700">{vehicle.año}</td>
                    <td className="py-3 px-3 border-r border-gray-100 text-gray-600">{vehicle.color}</td>
                    
                    <td className="py-3 px-3 border-r border-gray-100">
                      <span className={`px-2.5 py-1 font-black text-xs rounded-md shadow-xs ${digitoBg}`}>
                        {digito}
                      </span>
                    </td>

                    <td className="py-3 px-4 border-r border-gray-100 font-bold uppercase text-gray-800">
                      {vehicle.mes_matricula || '-'}
                    </td>
                    
                    <td className="py-3 px-4 border-r border-gray-100 text-gray-600 font-semibold">
                      {info.inicio}
                    </td>

                    <td className="py-3 px-4 border-r border-gray-100 font-extrabold text-gray-900">
                      {info.vencimiento}
                    </td>
                    
                    <td className="py-3 px-4 border-r border-gray-100">
                      <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow-sm ${info.color}`}>
                        {info.estado_texto === 'VENCIDO' && <AlertTriangle className="w-3 h-3" />}
                        {info.dias_texto}
                      </span>
                    </td>
                    
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenRenewModal(vehicle)}
                        title="Renovar Matrícula"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-sm font-bold text-xs flex items-center gap-1 mx-auto"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Renovar</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredVehicles.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-500 font-medium">No se encontraron vehículos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Renovar Matrícula */}
      {isRenewModalOpen && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5" />
                <h2 className="text-lg font-extrabold">Renovar Matrícula Vehicular</h2>
              </div>
              <button onClick={() => setIsRenewModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitRenew} className="p-6 space-y-4">
              <div className="bg-emerald-50 text-emerald-900 p-4 rounded-2xl text-xs font-medium border border-emerald-100">
                Vas a registrar la renovación de matrícula del vehículo <b>{selectedVehicle.placa}</b> ({selectedVehicle.marca}). 
                Actualmente vence el: <b>{selectedVehicle.fecha_vencimiento_matricula || 'No registrada'}</b>.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Año Matriculado *</label>
                  <input type="number" required value={formData.año_matriculado} onChange={e => setFormData({...formData, año_matriculado: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Costo Total ($) *</label>
                  <input type="number" step="0.01" min="0" required value={formData.costo} onChange={e => setFormData({...formData, costo: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Fecha de Pago *</label>
                  <input type="date" required value={formData.fecha_pago} onChange={e => setFormData({...formData, fecha_pago: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nueva Fecha Venc. *</label>
                  <input type="date" required value={formData.nueva_fecha_vencimiento} onChange={e => setFormData({...formData, nueva_fecha_vencimiento: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Lugar de Trámite</label>
                <input type="text" placeholder="Ej. Agencia ANT Tulcán..." value={formData.lugar_tramite} onChange={e => setFormData({...formData, lugar_tramite: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Notas / Observaciones</label>
                <textarea rows={2} value={formData.notas} onChange={e => setFormData({...formData, notas: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none resize-none" placeholder="Multas pagadas, trámites pendientes..." />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRenewModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-xs disabled:opacity-50 flex items-center gap-1.5"
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
