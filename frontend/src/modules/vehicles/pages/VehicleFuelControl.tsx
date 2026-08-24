import React, { useState, useEffect, useMemo } from 'react';
import { Fuel, Plus, Search, DollarSign, FileText, CheckCircle, X, Eye, Edit2, Upload, Image as ImageIcon, ExternalLink, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { Vehicle, VehicleFuelLog } from '@/shared/types';
import { getImageUrl } from '@/shared/utils/getImageUrl';
import { confirmDialog } from '@/shared/utils/confirmDialog';
import { compressImage } from '@/shared/utils/imageCompressor';
import { useInventoryWebSocket } from '@/modules/inventory/hooks/useInventoryWebSocket';

const VehicleFuelControl = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<VehicleFuelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('');
  const [tipoCombustibleFilter, setTipoCombustibleFilter] = useState<string>('todos');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isObserveModalOpen, setIsObserveModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal para ver imagen ampliada en pantalla (Lightbox)
  const [imageModal, setImageModal] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });

  const [selectedLog, setSelectedLog] = useState<VehicleFuelLog | null>(null);

  const [formData, setFormData] = useState({
    vehicle: '',
    fecha_vale: new Date().toISOString().split('T')[0],
    numero_vale: '',
    responsable: '',
    supervisado_por: '',
    odometro_recarga: '',
    tipo_combustible: 'EXTRA' as 'EXTRA' | 'DIESEL',
    galones: '',
    precio_por_galon: '',
    costo_total: '',
    tipo_transaccion: 'EFECTIVO',
    concepto: ''
  });

  const [fotoValeFile, setFotoValeFile] = useState<File | null>(null);
  const [fotoValePreviewUrl, setFotoValePreviewUrl] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [vehRes, logsRes] = await Promise.all([
        api.get('/vehicles/'),
        api.get('/vehicle-fuel-logs/')
      ]);
      setVehicles(vehRes.data || []);
      setFuelLogs(logsRes.data || []);
      if (vehRes.data && vehRes.data.length > 0 && !formData.vehicle) {
        setFormData(prev => ({ ...prev, vehicle: vehRes.data[0].id.toString() }));
      }
    } catch (error) {
      toast.error('Error al cargar vales de despacho de combustible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useInventoryWebSocket(fetchData);

  const handleFotoValeChange = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes (JPG, PNG, WEBP)');
      return;
    }
    try {
      const compressed = await compressImage(file);
      setFotoValeFile(compressed);
      setFotoValePreviewUrl(URL.createObjectURL(compressed));
    } catch (err) {
      setFotoValeFile(file);
      setFotoValePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleOpenModal = () => {
    const defaultVeh = vehicles[0]?.id.toString() || '';
    const currentVehObj = vehicles[0];
    setFormData({
      vehicle: defaultVeh,
      fecha_vale: new Date().toISOString().split('T')[0],
      numero_vale: '',
      responsable: '',
      supervisado_por: '',
      odometro_recarga: currentVehObj ? currentVehObj.odometro_actual?.toString() || '0' : '0',
      tipo_combustible: 'EXTRA',
      galones: '',
      precio_por_galon: '',
      costo_total: '',
      tipo_transaccion: 'EFECTIVO',
      concepto: ''
    });
    setFotoValeFile(null);
    setFotoValePreviewUrl(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (log: VehicleFuelLog) => {
    setSelectedLog(log);
    setFormData({
      vehicle: log.vehicle.toString(),
      fecha_vale: log.fecha_vale || new Date().toISOString().split('T')[0],
      numero_vale: log.numero_vale || '',
      responsable: log.responsable || '',
      supervisado_por: log.supervisado_por || '',
      odometro_recarga: log.odometro_recarga?.toString() || '0',
      tipo_combustible: (log.tipo_combustible as 'EXTRA' | 'DIESEL') || 'EXTRA',
      galones: log.galones?.toString() || '',
      precio_por_galon: log.precio_por_galon?.toString() || '',
      costo_total: log.costo_total?.toString() || '',
      tipo_transaccion: log.tipo_transaccion || 'EFECTIVO',
      concepto: log.concepto || ''
    });
    setFotoValeFile(null);
    setFotoValePreviewUrl(null);
    setIsEditModalOpen(true);
  };

  const handleOpenObserveModal = (log: VehicleFuelLog) => {
    setSelectedLog(log);
    setFotoValeFile(null);
    setIsObserveModalOpen(true);
  };

  // Abrir imagen ampliada en modal flotante (sin abrir otra pestaña)
  const handleOpenImageModal = (url: string, title: string) => {
    setImageModal({
      isOpen: true,
      url,
      title
    });
  };

  const handleVehicleChange = (vehId: string) => {
    const selectedVeh = vehicles.find(v => v.id.toString() === vehId);
    setFormData(prev => ({
      ...prev,
      vehicle: vehId,
      odometro_recarga: selectedVeh ? selectedVeh.odometro_actual?.toString() || '0' : '0'
    }));
  };

  // Cálculo automático del Valor Pagado (Total Importe)
  const handleGalonesOrPrecioChange = (galonesVal: string, precioVal: string) => {
    const g = parseFloat(galonesVal || '0');
    const p = parseFloat(precioVal || '0');
    let calcTotal = '';
    if (g > 0 && p > 0) {
      calcTotal = (g * p).toFixed(2);
    }
    setFormData(prev => ({
      ...prev,
      galones: galonesVal,
      precio_por_galon: precioVal,
      costo_total: calcTotal ? calcTotal : prev.costo_total
    }));
  };

  // Crear Nuevo Vale
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicle || !formData.numero_vale || !formData.galones || !formData.odometro_recarga) {
      toast.error('Por favor completa los campos requeridos (Vehículo, N.º Vale, Galones y Odómetro)');
      return;
    }

    setSubmitting(true);
    try {
      const postData = new FormData();
      postData.append('vehicle', formData.vehicle);
      postData.append('fecha_vale', formData.fecha_vale);
      postData.append('numero_vale', formData.numero_vale.trim());
      if (formData.responsable) postData.append('responsable', formData.responsable);
      if (formData.supervisado_por) postData.append('supervisado_por', formData.supervisado_por);
      postData.append('odometro_recarga', formData.odometro_recarga);
      postData.append('tipo_combustible', formData.tipo_combustible);
      postData.append('galones', formData.galones);
      if (formData.precio_por_galon) postData.append('precio_por_galon', formData.precio_por_galon);
      postData.append('costo_total', formData.costo_total || '0');
      if (formData.tipo_transaccion) postData.append('tipo_transaccion', formData.tipo_transaccion);
      if (formData.concepto) postData.append('concepto', formData.concepto);

      if (fotoValeFile) {
        postData.append('foto_vale', fotoValeFile);
      }

      await api.post('/vehicle-fuel-logs/', postData);

      toast.success('Vale de despacho registrado exitosamente');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('API Error Response:', error.response?.data);
      const serverMsg = error.response?.data 
        ? (typeof error.response.data === 'object' 
            ? Object.entries(error.response.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
            : String(error.response.data))
        : 'Error al registrar el vale de combustible';
      toast.error(`Error: ${serverMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Editar Vale Existente
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLog) return;

    setSubmitting(true);
    try {
      const patchData = new FormData();
      patchData.append('vehicle', formData.vehicle);
      patchData.append('fecha_vale', formData.fecha_vale);
      patchData.append('numero_vale', formData.numero_vale.trim());
      patchData.append('responsable', formData.responsable || '');
      patchData.append('supervisado_por', formData.supervisado_por || '');
      patchData.append('odometro_recarga', formData.odometro_recarga);
      patchData.append('tipo_combustible', formData.tipo_combustible);
      patchData.append('galones', formData.galones);
      patchData.append('precio_por_galon', formData.precio_por_galon || '0');
      patchData.append('costo_total', formData.costo_total || '0');
      patchData.append('tipo_transaccion', formData.tipo_transaccion || 'EFECTIVO');
      patchData.append('concepto', formData.concepto || '');

      if (fotoValeFile) {
        patchData.append('foto_vale', fotoValeFile);
      }

      await api.patch(`/vehicle-fuel-logs/${selectedLog.id}/`, patchData);

      toast.success('Vale de combustible actualizado exitosamente');
      setIsEditModalOpen(false);
      setIsObserveModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('API Error Response:', error.response?.data);
      const serverMsg = error.response?.data 
        ? (typeof error.response.data === 'object' 
            ? Object.entries(error.response.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
            : String(error.response.data))
        : 'Error al actualizar el vale de combustible';
      toast.error(`Error: ${serverMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Reemplazar Fotografía del Vale desde la vista de Observar
  const handleReplaceFotoVale = async (file: File) => {
    if (!selectedLog) return;
    setSubmitting(true);
    try {
      const patchData = new FormData();
      patchData.append('foto_vale', file);
      const res = await api.patch(`/vehicle-fuel-logs/${selectedLog.id}/`, patchData);
      toast.success('Fotografía del vale reemplazada exitosamente');
      fetchData();
      setSelectedLog(res.data);
    } catch (error: any) {
      console.error('API Error Response:', error.response?.data);
      const serverMsg = error.response?.data 
        ? (typeof error.response.data === 'object' 
            ? Object.entries(error.response.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
            : String(error.response.data))
        : 'Error al reemplazar la fotografía';
      toast.error(`Error: ${serverMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (log: VehicleFuelLog) => {
    if (await confirmDialog(`¿Deseas eliminar el vale N.º ${log.numero_vale}?`)) {
      try {
        await api.delete(`/vehicle-fuel-logs/${log.id}/`);
        toast.success('Vale eliminado');
        fetchData();
      } catch (error) {
        toast.error('Error al eliminar el vale');
      }
    }
  };

  // Estado para Presupuesto de Vales de Combustible
  const [fuelBudget, setFuelBudget] = useState<import('@/shared/types').FuelBudget | null>(null);
  const [isBudgetInitialModalOpen, setIsBudgetInitialModalOpen] = useState(false);
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const [initialGasolina, setInitialGasolina] = useState('300');
  const [initialDiesel, setInitialDiesel] = useState('1200');
  const [addGasolina, setAddGasolina] = useState('0');
  const [addDiesel, setAddDiesel] = useState('0');
  const [transferOrigen, setTransferOrigen] = useState<'GASOLINA' | 'DIESEL'>('DIESEL');
  const [transferMonto, setTransferMonto] = useState('');

  const fetchBudget = async () => {
    try {
      const res = await api.get('/fuel-budgets/');
      setFuelBudget(res.data);
    } catch (e) {
      console.warn('Error fetching fuel budget:', e);
    }
  };

  const fetchAllFuelData = async () => {
    try {
      const [vehRes, logsRes, budgetRes] = await Promise.all([
        api.get('/vehicles/'),
        api.get('/vehicle-fuel-logs/'),
        api.get('/fuel-budgets/').catch(() => ({ data: null }))
      ]);
      setVehicles(vehRes.data || []);
      setFuelLogs(logsRes.data || []);
      setFuelBudget(budgetRes.data || null);
      if (vehRes.data && vehRes.data.length > 0 && !formData.vehicle) {
        setFormData(prev => ({ ...prev, vehicle: vehRes.data[0].id.toString() }));
      }
    } catch (error) {
      toast.error('Error al cargar vales de despacho de combustible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllFuelData();
  }, []);

  useInventoryWebSocket(fetchAllFuelData);

  const handleSetInitialBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/fuel-budgets/set-initial/', {
        saldo_gasolina: parseFloat(initialGasolina || '0'),
        saldo_diesel: parseFloat(initialDiesel || '0')
      });
      toast.success('Presupuesto inicial asignado exitosamente');
      setIsBudgetInitialModalOpen(false);
      fetchBudget();
    } catch (e) {
      toast.error('Error al asignar presupuesto inicial');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/fuel-budgets/add-funds/', {
        monto_gasolina: parseFloat(addGasolina || '0'),
        monto_diesel: parseFloat(addDiesel || '0')
      });
      toast.success('Saldo agregado exitosamente');
      setIsAddFundsModalOpen(false);
      setAddGasolina('0');
      setAddDiesel('0');
      fetchBudget();
    } catch (e) {
      toast.error('Error al agregar saldo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/fuel-budgets/transfer/', {
        origen: transferOrigen,
        monto: parseFloat(transferMonto || '0')
      });
      toast.success('Traspaso de saldo realizado exitosamente');
      setIsTransferModalOpen(false);
      setTransferMonto('');
      fetchBudget();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error al realizar el traspaso de saldo');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return fuelLogs.filter(log => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        log.numero_vale.toLowerCase().includes(searchLower) ||
        (log.vehicle_placa && log.vehicle_placa.toLowerCase().includes(searchLower)) ||
        (log.responsable && log.responsable.toLowerCase().includes(searchLower)) ||
        (log.concepto && log.concepto.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

      if (vehicleFilter && log.vehicle.toString() !== vehicleFilter) return false;
      if (tipoCombustibleFilter !== 'todos' && log.tipo_combustible !== tipoCombustibleFilter) return false;

      return true;
    });
  }, [fuelLogs, searchTerm, vehicleFilter, tipoCombustibleFilter]);

  // KPIs
  const totalVales = filteredLogs.length;
  const totalGalones = filteredLogs.reduce((acc, l) => acc + parseFloat(l.galones?.toString() || '0'), 0);
  const totalCosto = filteredLogs.reduce((acc, l) => acc + parseFloat(l.costo_total?.toString() || '0'), 0);

  const saldoTotalNum = parseFloat(fuelBudget?.saldo_total?.toString() || '0');
  const saldoGasolinaNum = parseFloat(fuelBudget?.saldo_gasolina?.toString() || '0');
  const saldoDieselNum = parseFloat(fuelBudget?.saldo_diesel?.toString() || '0');
  const isLowBalance = saldoTotalNum <= 40 || saldoGasolinaNum <= 40 || saldoDieselNum <= 40;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-[1700px] mx-auto pb-32 relative">
      {/* Background Texture */}
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none rounded-3xl mix-blend-multiply" />

      {/* Header */}
      <div className="relative z-10 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm">
              <Fuel className="w-7 h-7" />
            </div>
            Vales de Despacho de Combustible
          </h1>
          <p className="text-gray-500 mt-1.5 text-base font-medium">
            Control de presupuestos (Gasolina/Diésel), traspasos de saldo, alerta a los $40 y registro de vales con fotografía.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAddFundsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-all shadow-md shadow-amber-600/20 text-sm"
          >
            <Plus className="w-4 h-4" />
            Agregar Saldo
          </button>
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 text-sm"
          >
            Traspasar Saldo
          </button>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 text-sm"
          >
            <Plus className="w-5 h-5" />
            Nuevo Vale de Despacho
          </button>
        </div>
      </div>

      {/* Banner de Alerta de Saldo Bajo ($40 o menos o Déficit Negativo) */}
      {(isLowBalance || saldoGasolinaNum < 0 || saldoDieselNum < 0) && (
        <div className={`relative z-10 mb-8 p-5 rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 ${
          saldoGasolinaNum < 0 || saldoDieselNum < 0 ? 'bg-red-700 text-white animate-bounce' : 'bg-amber-600 text-white animate-pulse'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Fuel className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                {saldoGasolinaNum < 0 || saldoDieselNum < 0 ? '🚨 ALERTA DE DÉFICIT EN PRESUPUESTO' : '⚠️ ALERTA DE REABASTECIMIENTO DE SALDO'}
              </h3>
              <p className="text-xs font-semibold text-red-100 mt-0.5">
                {saldoGasolinaNum < 0 
                  ? `Existe un déficit de -$${Math.abs(saldoGasolinaNum).toFixed(2)} en Gasolina Extra. Puedes traspasar saldo desde Diésel para cubrirlo.`
                  : saldoDieselNum < 0
                  ? `Existe un déficit de -$${Math.abs(saldoDieselNum).toFixed(2)} en Diésel. Puedes traspasar saldo desde Gasolina para cubrirlo.`
                  : `El saldo disponible es de $40.00 o menos (Total: $${saldoTotalNum.toFixed(2)} | Gasolina: $${saldoGasolinaNum.toFixed(2)} | Diésel: $${saldoDieselNum.toFixed(2)}).`
                }
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {(saldoGasolinaNum < 0 || saldoDieselNum < 0) && (
              <button
                onClick={() => {
                  setTransferOrigen(saldoGasolinaNum < 0 ? 'DIESEL' : 'GASOLINA');
                  setTransferMonto(Math.abs(saldoGasolinaNum < 0 ? saldoGasolinaNum : saldoDieselNum).toFixed(2));
                  setIsTransferModalOpen(true);
                }}
                className="px-5 py-3 bg-white text-red-800 rounded-2xl font-black hover:bg-red-50 transition-all shadow-md text-xs flex items-center gap-1.5"
              >
                ⇄ Traspasar Saldo Ahora
              </button>
            )}
            <button
              onClick={() => setIsAddFundsModalOpen(true)}
              className="px-5 py-3 bg-red-900/80 text-white border border-white/30 rounded-2xl font-bold hover:bg-red-900 transition-all shadow-md text-xs"
            >
              + Agregar Saldo
            </button>
          </div>
        </div>
      )}

      {/* Control de Presupuesto / Saldos */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className={`rounded-3xl p-6 shadow-md relative overflow-hidden flex justify-between items-center text-white ${
          saldoTotalNum < 0 ? 'bg-gradient-to-br from-red-800 to-rose-900' : 'bg-gradient-to-br from-emerald-800 to-teal-900'
        }`}>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Saldo Total Disponible</span>
            <p className={`text-3xl font-black mt-1 ${saldoTotalNum < 0 ? 'text-rose-200' : ''}`}>
              {saldoTotalNum < 0 ? `-$${Math.abs(saldoTotalNum).toLocaleString('es-EC', { minimumFractionDigits: 2 })}` : `$${saldoTotalNum.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`}
            </p>
            <p className="text-[10px] font-semibold text-emerald-200 mt-1">Presupuesto Global de Vales</p>
          </div>
          <button
            onClick={() => setIsBudgetInitialModalOpen(true)}
            className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors text-xs font-bold"
            title="Ajustar Presupuesto Inicial"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        </div>

        <div className={`rounded-3xl p-6 shadow-sm border flex items-center justify-between transition-all ${
          saldoGasolinaNum < 0 ? 'bg-red-50 border-red-300 ring-2 ring-red-400' : 'bg-white border-emerald-100'
        }`}>
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider ${saldoGasolinaNum < 0 ? 'text-red-900' : 'text-emerald-800'}`}>Saldo Gasolina Extra</span>
            <p className={`text-3xl font-black mt-1 ${saldoGasolinaNum < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {saldoGasolinaNum < 0 ? `-$${Math.abs(saldoGasolinaNum).toLocaleString('es-EC', { minimumFractionDigits: 2 })}` : `$${saldoGasolinaNum.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`}
            </p>
            {saldoGasolinaNum < 0 ? (
              <button
                onClick={() => {
                  setTransferOrigen('DIESEL');
                  setTransferMonto(Math.abs(saldoGasolinaNum).toFixed(2));
                  setIsTransferModalOpen(true);
                }}
                className="mt-1 text-[11px] font-extrabold text-red-700 hover:underline flex items-center gap-1"
              >
                ⇄ Traspasar desde Diésel para cubrir déficit
              </button>
            ) : (
              <p className="text-[10px] text-gray-400 font-semibold mt-1">Para vehículos a gasolina</p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
            saldoGasolinaNum < 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
          }`}>
            <Fuel className="w-6 h-6" />
          </div>
        </div>

        <div className={`rounded-3xl p-6 shadow-sm border flex items-center justify-between transition-all ${
          saldoDieselNum < 0 ? 'bg-red-50 border-red-300 ring-2 ring-red-400' : 'bg-white border-amber-100'
        }`}>
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider ${saldoDieselNum < 0 ? 'text-red-900' : 'text-amber-800'}`}>Saldo Diésel</span>
            <p className={`text-3xl font-black mt-1 ${saldoDieselNum < 0 ? 'text-red-600' : 'text-amber-600'}`}>
              {saldoDieselNum < 0 ? `-$${Math.abs(saldoDieselNum).toLocaleString('es-EC', { minimumFractionDigits: 2 })}` : `$${saldoDieselNum.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`}
            </p>
            {saldoDieselNum < 0 ? (
              <button
                onClick={() => {
                  setTransferOrigen('GASOLINA');
                  setTransferMonto(Math.abs(saldoDieselNum).toFixed(2));
                  setIsTransferModalOpen(true);
                }}
                className="mt-1 text-[11px] font-extrabold text-red-700 hover:underline flex items-center gap-1"
              >
                ⇄ Traspasar desde Gasolina para cubrir déficit
              </button>
            ) : (
              <p className="text-[10px] text-gray-400 font-semibold mt-1">Para vehículos a diésel</p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
            saldoDieselNum < 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
          }`}>
            <Fuel className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vales de Despacho</p>
            <p className="text-3xl font-black text-gray-900">{totalVales}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
            <Fuel className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-teal-800 uppercase tracking-wider">Total Galones Despachados</p>
            <p className="text-3xl font-black text-gray-900">{totalGalones.toFixed(3)} gal</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Valor Total Pagado</p>
            <p className="text-3xl font-black text-gray-900">${totalCosto.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar vale N.º, placa, responsable, detalle..."
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl text-sm font-medium transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Vehicle Selector */}
          <div className="w-full sm:w-60">
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">Todos los vehículos</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id.toString()}>{v.placa} - {v.marca} {v.modelo}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Producto/Combustible Filters */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => setTipoCombustibleFilter('todos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tipoCombustibleFilter === 'todos' ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setTipoCombustibleFilter('EXTRA')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tipoCombustibleFilter === 'EXTRA' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Gasolina Extra
          </button>
          <button
            onClick={() => setTipoCombustibleFilter('DIESEL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tipoCombustibleFilter === 'DIESEL' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Diésel
          </button>
        </div>

      </div>

      {/* Main Table */}
      <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-left whitespace-nowrap border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white font-bold uppercase tracking-wider shadow-sm">
                <th className="px-4 py-4 text-center">Nº</th>
                <th className="px-4 py-4">VALE N.º</th>
                <th className="px-4 py-4 text-center">FOTO VALE</th>
                <th className="px-4 py-4">FECHA DESPACHO</th>
                <th className="px-4 py-4">VEHÍCULO / PLACA</th>
                <th className="px-4 py-4">RESPONSABLE</th>
                <th className="px-4 py-4">SUPERVISADO POR</th>
                <th className="px-4 py-4 text-center">KM AL RECARGAR</th>
                <th className="px-4 py-4 text-center">PRODUCTO</th>
                <th className="px-4 py-4 text-center">GALONES</th>
                <th className="px-4 py-4 text-right">PRECIO/GALÓN</th>
                <th className="px-4 py-4 text-right">VALOR PAGADO</th>
                <th className="px-4 py-4">TRANSACCIÓN</th>
                <th className="px-4 py-4">EN CONCEPTO DE (DETALLE)</th>
                <th className="px-4 py-4 text-center">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-xs">
              {filteredLogs.map((log, index) => {
                return (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3.5 text-center text-gray-400 font-bold">{index + 1}</td>

                    <td className="px-4 py-3.5">
                      <span className="px-3 py-1 bg-gray-900 text-white font-black rounded-lg text-xs tracking-wider">
                        {log.numero_vale}
                      </span>
                    </td>

                    {/* Foto del Vale - Abre en Modal Flotante (sin cambiar de pestaña) */}
                    <td className="px-4 py-3.5 text-center">
                      {log.foto_vale ? (
                        <button
                          type="button"
                          onClick={() => handleOpenImageModal(
                            getImageUrl(log.foto_vale),
                            `Fotografía del Vale N.º ${log.numero_vale} - ${log.vehicle_placa || ''}`
                          )}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-lg font-bold text-[10px] transition-all shadow-2xs"
                          title="Ver fotografía del vale en modal"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ver Foto</span>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-[10px] italic">Sin foto</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-gray-700 font-semibold">{log.fecha_vale}</td>

                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-gray-900">{log.vehicle_placa}</div>
                      <div className="text-[10px] text-gray-500 font-semibold">{log.vehicle_marca} {log.vehicle_modelo}</div>
                    </td>

                    <td className="px-4 py-3.5 text-gray-800 font-bold">
                      {log.responsable || '-'}
                    </td>

                    <td className="px-4 py-3.5 text-gray-600 font-medium">
                      {log.supervisado_por || '-'}
                    </td>

                    <td className="px-4 py-3.5 text-center font-extrabold text-blue-600">
                      {log.odometro_recarga ? log.odometro_recarga.toLocaleString() : 0} km
                    </td>

                    <td className="px-4 py-3.5 text-center font-bold">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-wider ${
                        log.tipo_combustible === 'EXTRA' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {log.tipo_combustible === 'EXTRA' ? 'Gasolina Extra' : 'Diésel'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center font-extrabold text-gray-800">
                      {parseFloat(log.galones?.toString() || '0').toFixed(3)} gal
                    </td>

                    <td className="px-4 py-3.5 text-right text-gray-600 font-semibold">
                      {log.precio_por_galon ? `$${parseFloat(log.precio_por_galon.toString()).toFixed(3)}` : '-'}
                    </td>

                    <td className="px-4 py-3.5 text-right font-black text-emerald-600">
                      ${parseFloat(log.costo_total?.toString() || '0').toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-4 py-3.5 text-gray-700 font-bold uppercase text-[10px]">
                      {log.tipo_transaccion || 'EFECTIVO'}
                    </td>

                    <td className="px-4 py-3.5 text-gray-700 max-w-xs truncate italic">
                      {log.concepto || 'Sin detalle'}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Botón Observar */}
                        <button
                          onClick={() => handleOpenObserveModal(log)}
                          title="Observar Vale y Foto"
                          className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all shadow-sm font-bold text-xs flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Observar</span>
                        </button>

                        {/* Botón Editar */}
                        <button
                          onClick={() => handleOpenEditModal(log)}
                          title="Editar Vale"
                          className="px-2.5 py-1.5 bg-emerald-100 text-emerald-900 border border-emerald-200 hover:bg-emerald-200 rounded-xl transition-all font-bold text-xs flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Editar</span>
                        </button>

                        {/* Botón Eliminar */}
                        <button
                          onClick={() => handleDelete(log)}
                          className="p-1.5 bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 rounded-xl transition-colors font-bold text-xs"
                          title="Eliminar Vale"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-gray-500 font-medium">
                    No se encontraron vales de despacho registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para CREAR Vale de Despacho con Fotografía */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white">
              <div className="flex items-center gap-2.5">
                <Fuel className="w-6 h-6" />
                <h2 className="text-xl font-extrabold">Vale de Despacho de Combustible</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">N.º de Vale / Secuencial *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 0002322 o 1231955"
                    value={formData.numero_vale}
                    onChange={e => setFormData({ ...formData, numero_vale: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Fecha de Despacho *</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha_vale}
                    onChange={e => setFormData({ ...formData, fecha_vale: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Vehículo / Placa *</label>
                <select
                  required
                  value={formData.vehicle}
                  onChange={e => handleVehicleChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id.toString()}>{v.placa} - {v.marca} {v.modelo} (KM actual: {v.odometro_actual})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Responsable</label>
                  <input
                    type="text"
                    placeholder="Ej. Francisco Sánchez"
                    value={formData.responsable}
                    onChange={e => setFormData({ ...formData, responsable: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Supervisado Por</label>
                  <input
                    type="text"
                    placeholder="Ej. Francisco Sánchez"
                    value={formData.supervisado_por}
                    onChange={e => setFormData({ ...formData, supervisado_por: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Kilometraje Actual (KM) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Ej. 116265"
                    value={formData.odometro_recarga}
                    onChange={e => setFormData({ ...formData, odometro_recarga: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-blue-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Producto / Combustible *</label>
                  <select
                    value={formData.tipo_combustible}
                    onChange={e => setFormData({ ...formData, tipo_combustible: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-emerald-900 outline-none"
                  >
                    <option value="EXTRA">Gasolina EXTRA</option>
                    <option value="DIESEL">DIÉSEL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">N.º Galones *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    min="0.001"
                    placeholder="Ej. 6.313"
                    value={formData.galones}
                    onChange={e => handleGalonesOrPrecioChange(e.target.value, formData.precio_por_galon)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Precio/Galón ($)</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Ej. 3.242"
                    value={formData.precio_por_galon}
                    onChange={e => handleGalonesOrPrecioChange(formData.galones, e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Valor Pagado ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej. 20.00"
                    value={formData.costo_total}
                    onChange={e => setFormData({ ...formData, costo_total: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-black text-emerald-600"
                  />
                </div>
              </div>

              {/* Subida de Fotografía del Vale con Cámara */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-600" /> Fotografía del Vale de Combustible (JPG/PNG)
                </label>
                <div className="flex flex-col gap-2">
                  <div className="w-full h-44 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group hover:border-emerald-500 transition-colors">
                    {fotoValePreviewUrl ? (
                      <img src={fotoValePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <Camera className="w-10 h-10 mb-2 group-hover:text-emerald-600 transition-colors" />
                        <span className="font-semibold text-xs group-hover:text-emerald-600 transition-colors">Tocar para abrir cámara</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      capture="environment"
                      onChange={e => {
                        const file = e.target.files ? e.target.files[0] : null;
                        handleFotoValeChange(file);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium">Toca el recuadro para tomar una foto del comprobante físico con la cámara de tu teléfono.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Tipo de Transacción</label>
                <select
                  value={formData.tipo_transaccion}
                  onChange={e => setFormData({ ...formData, tipo_transaccion: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="PREPAGO">Prepago</option>
                  <option value="CONSUMO INTERNO">Consumo Interno</option>
                  <option value="CALIBRACION">Calibración</option>
                  <option value="DECRETO">Decreto</option>
                  <option value="DINERO ELECTRONICO">Dinero Electrónico</option>
                  <option value="MIDENA">Midena</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">En Concepto de (Detalle)</label>
                <textarea
                  rows={2}
                  placeholder="Escribe el concepto o motivo detallado del consumo..."
                  value={formData.concepto}
                  onChange={e => setFormData({ ...formData, concepto: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  {submitting ? 'Guardando...' : 'Confirmar Vale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para EDITAR Vale de Despacho y Reemplazar Fotografía */}
      {isEditModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white">
              <div className="flex items-center gap-2.5">
                <Edit2 className="w-5 h-5" />
                <h2 className="text-xl font-extrabold">Editar Vale de Combustible</h2>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">N.º de Vale / Secuencial *</label>
                  <input
                    type="text"
                    required
                    value={formData.numero_vale}
                    onChange={e => setFormData({ ...formData, numero_vale: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Fecha de Despacho *</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha_vale}
                    onChange={e => setFormData({ ...formData, fecha_vale: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Vehículo / Placa *</label>
                <select
                  required
                  value={formData.vehicle}
                  onChange={e => handleVehicleChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id.toString()}>{v.placa} - {v.marca} {v.modelo} (KM actual: {v.odometro_actual})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Responsable</label>
                  <input
                    type="text"
                    value={formData.responsable}
                    onChange={e => setFormData({ ...formData, responsable: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Supervisado Por</label>
                  <input
                    type="text"
                    value={formData.supervisado_por}
                    onChange={e => setFormData({ ...formData, supervisado_por: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Kilometraje Actual (KM) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.odometro_recarga}
                    onChange={e => setFormData({ ...formData, odometro_recarga: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-blue-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Producto / Combustible *</label>
                  <select
                    value={formData.tipo_combustible}
                    onChange={e => setFormData({ ...formData, tipo_combustible: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-emerald-900 outline-none"
                  >
                    <option value="EXTRA">Gasolina EXTRA</option>
                    <option value="DIESEL">DIÉSEL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">N.º Galones *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    min="0.001"
                    value={formData.galones}
                    onChange={e => handleGalonesOrPrecioChange(e.target.value, formData.precio_por_galon)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Precio/Galón ($)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.precio_por_galon}
                    onChange={e => handleGalonesOrPrecioChange(formData.galones, e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Valor Pagado ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costo_total}
                    onChange={e => setFormData({ ...formData, costo_total: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-black text-emerald-600"
                  />
                </div>
              </div>

              {/* Reemplazar Fotografía del Vale con Cámara */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" /> Fotografía del Vale de Combustible
                  </label>
                  {selectedLog.foto_vale && (
                    <button
                      type="button"
                      onClick={() => handleOpenImageModal(
                        getImageUrl(selectedLog.foto_vale),
                        `Fotografía del Vale N.º ${selectedLog.numero_vale}`
                      )}
                      className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                    >
                      <ImageIcon className="w-3 h-3 text-emerald-600" /> Ver Actual
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="w-full h-44 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group hover:border-emerald-500 transition-colors">
                    {fotoValePreviewUrl ? (
                      <img src={fotoValePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : selectedLog.foto_vale ? (
                      <img src={getImageUrl(selectedLog.foto_vale)} alt="Actual" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <Camera className="w-10 h-10 mb-2 group-hover:text-emerald-600 transition-colors" />
                        <span className="font-semibold text-xs group-hover:text-emerald-600 transition-colors">Tocar para abrir cámara</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      capture="environment"
                      onChange={e => {
                        const file = e.target.files ? e.target.files[0] : null;
                        handleFotoValeChange(file);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium">Toca el recuadro para actualizar la foto usando la cámara de tu teléfono.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Tipo de Transacción</label>
                <select
                  value={formData.tipo_transaccion}
                  onChange={e => setFormData({ ...formData, tipo_transaccion: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="PREPAGO">Prepago</option>
                  <option value="CONSUMO INTERNO">Consumo Interno</option>
                  <option value="CALIBRACION">Calibración</option>
                  <option value="DECRETO">Decreto</option>
                  <option value="DINERO ELECTRONICO">Dinero Electrónico</option>
                  <option value="MIDENA">Midena</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">En Concepto de (Detalle)</label>
                <textarea
                  rows={2}
                  value={formData.concepto}
                  onChange={e => setFormData({ ...formData, concepto: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  {submitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal OBSERVAR Vale de Combustible */}
      {isObserveModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Detalle de Vale N.º {selectedLog.numero_vale}</h2>
                  <p className="text-xs text-emerald-200 font-semibold">Vehículo: {selectedLog.vehicle_placa} ({selectedLog.vehicle_marca} {selectedLog.vehicle_modelo})</p>
                </div>
              </div>
              <button onClick={() => setIsObserveModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar bg-gray-50/50 flex-1">
              {/* Resumen General de los Campos del Vale Físico */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">N.º de Vale</p>
                  <p className="text-base font-black text-gray-900">{selectedLog.numero_vale}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fecha Despacho</p>
                  <p className="text-sm font-extrabold text-gray-800">{selectedLog.fecha_vale}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Producto</p>
                  <p className="text-sm font-black text-emerald-600">{selectedLog.tipo_combustible === 'EXTRA' ? 'Gasolina Extra' : 'Diésel'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Responsable</p>
                  <p className="text-xs font-bold text-gray-800">{selectedLog.responsable || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Supervisado Por</p>
                  <p className="text-xs font-bold text-gray-800">{selectedLog.supervisado_por || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">KM al Recargar</p>
                  <p className="text-sm font-black text-blue-600">{selectedLog.odometro_recarga ? selectedLog.odometro_recarga.toLocaleString() : 0} km</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Galones</p>
                  <p className="text-base font-black text-gray-900">{parseFloat(selectedLog.galones?.toString() || '0').toFixed(3)} gal</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Precio/Galón</p>
                  <p className="text-sm font-extrabold text-gray-800">{selectedLog.precio_por_galon ? `$${parseFloat(selectedLog.precio_por_galon.toString()).toFixed(3)}` : '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Valor Pagado</p>
                  <p className="text-lg font-black text-emerald-600">${parseFloat(selectedLog.costo_total?.toString() || '0').toLocaleString('es-EC', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {/* Concepto / Detalle */}
              {selectedLog.concepto && (
                <div className="bg-white p-4 rounded-2xl border border-gray-200">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">En Concepto de (Detalle)</p>
                  <p className="text-xs font-medium text-gray-700 leading-relaxed">{selectedLog.concepto}</p>
                </div>
              )}

              {/* Previsualización y Reemplazo de Foto del Vale */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-600" /> Fotografía del Comprobante Físico
                  </h3>

                  <label className="cursor-pointer px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all">
                    <Upload className="w-3 h-3 text-emerald-600" />
                    <span>{selectedLog.foto_vale ? 'Reemplazar Foto' : 'Subir Foto'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          handleReplaceFotoVale(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>

                {selectedLog.foto_vale ? (
                  <div className="relative group rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
                    <img
                      src={getImageUrl(selectedLog.foto_vale)}
                      alt={`Foto vale ${selectedLog.numero_vale}`}
                      className="w-full max-h-96 object-contain bg-black/5"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleOpenImageModal(
                          getImageUrl(selectedLog.foto_vale!),
                          `Fotografía del Vale N.º ${selectedLog.numero_vale}`
                        )}
                        className="px-4 py-2 bg-white text-gray-900 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg hover:bg-gray-100 transition-all"
                      >
                        <ImageIcon className="w-4 h-4 text-emerald-600" /> Ampliar Imagen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl">
                    <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 font-semibold">No se ha adjuntado una fotografía para este vale.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-gray-100 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsObserveModalOpen(false);
                  handleOpenEditModal(selectedLog);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" /> Editar Datos
              </button>
              <button
                type="button"
                onClick={() => setIsObserveModalOpen(false)}
                className="px-5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Presupuesto Inicial */}
      {isBudgetInitialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 to-teal-800 text-white">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Configurar Presupuesto Inicial
              </h2>
              <button onClick={() => setIsBudgetInitialModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSetInitialBudget} className="p-6 space-y-4">
              <p className="text-xs font-medium text-gray-500">Define los saldos iniciales disponibles para despacho de combustible:</p>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Saldo Inicial Gasolina Extra ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={initialGasolina}
                  onChange={e => setInitialGasolina(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Saldo Inicial Diésel ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={initialDiesel}
                  onChange={e => setInitialDiesel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900"
                />
              </div>
              <div className="pt-2 flex justify-between items-center text-xs font-black text-emerald-700">
                <span>TOTAL PRESUPUESTO:</span>
                <span className="text-base">${((parseFloat(initialGasolina || '0')) + (parseFloat(initialDiesel || '0'))).toFixed(2)}</span>
              </div>
              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsBudgetInitialModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-600">Cancelar</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20">{submitting ? 'Guardando...' : 'Establecer Presupuesto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Saldo (Acumulativo) */}
      {isAddFundsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-amber-600 to-orange-600 text-white">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <Plus className="w-5 h-5" /> Agregar Saldo Acumulativo
              </h2>
              <button onClick={() => setIsAddFundsModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddFunds} className="p-6 space-y-4">
              <p className="text-xs font-medium text-gray-500">Ingresa los montos que deseas reabastecer al fondo existente:</p>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Monto a agregar a Gasolina ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={addGasolina}
                  onChange={e => setAddGasolina(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 font-bold text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Monto a agregar a Diésel ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={addDiesel}
                  onChange={e => setAddDiesel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 font-bold text-gray-900"
                />
              </div>
              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddFundsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-600">Cancelar</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20">{submitting ? 'Guardando...' : 'Reabastecer Saldo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Traspasar Saldo (Gasolina <-> Diésel) */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                ⇄ Traspaso de Saldo entre Combustibles
              </h2>
              <button onClick={() => setIsTransferModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleTransferFunds} className="p-6 space-y-4">
              <p className="text-xs font-medium text-gray-500">Transfiere dinero sobrante de un fondo de combustible a otro cuando este se agote:</p>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Origen (Fondo del que sale la plata)</label>
                <select
                  value={transferOrigen}
                  onChange={e => setTransferOrigen(e.target.value as 'GASOLINA' | 'DIESEL')}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
                >
                  <option value="DIESEL">Traspasar DESDE Diésel HACIA Gasolina</option>
                  <option value="GASOLINA">Traspasar DESDE Gasolina HACIA Diésel</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Monto a Traspasar ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Ej. 100.00"
                  value={transferMonto}
                  onChange={e => setTransferMonto(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
                />
              </div>
              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsTransferModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-600">Cancelar</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20">{submitting ? 'Transfiriendo...' : 'Confirmar Traspaso'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal FLOTANTE para Previsualizar Vale / Imagen (Estilo Historial de Viajes / Perfil Proveedor) */}
      {imageModal.isOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setImageModal({ isOpen: false, url: '', title: '' })}
        >
          <div 
            className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-base">{imageModal.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={imageModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-gray-200 rounded-full transition-colors"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button 
                  onClick={() => setImageModal({ isOpen: false, url: '', title: '' })} 
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                  title="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[75vh] bg-black/5 overflow-auto">
              {imageModal.url.toLowerCase().endsWith('.pdf') ? (
                <iframe 
                  src={imageModal.url} 
                  title={imageModal.title}
                  className="w-full h-[70vh] rounded-xl border border-gray-200" 
                />
              ) : (
                <img 
                  src={imageModal.url} 
                  alt={imageModal.title} 
                  className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg" 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleFuelControl;
