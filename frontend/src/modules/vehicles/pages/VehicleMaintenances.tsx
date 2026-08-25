import { useState, useEffect, useMemo } from 'react';
import { Wrench, Search, FileText, PenTool, X, Calendar, DollarSign, AlertTriangle, CheckCircle2, ShieldAlert, LayoutGrid, Table, Plus, Trash2, Store, Camera } from 'lucide-react';

import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { Vehicle, VehicleMaintenance, VehicleMaintenanceRecord, Supplier } from '@/shared/types';
import { confirmDialog } from '@/shared/utils/confirmDialog';
import { getImageUrl } from '@/shared/utils/getImageUrl';
import { compressImage } from '@/shared/utils/imageCompressor';
import { useInventoryWebSocket } from '@/modules/inventory/hooks/useInventoryWebSocket';

const VehicleMaintenances = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenances, setMaintenances] = useState<VehicleMaintenance[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<'todos' | 'Preventivo' | 'Correctivo'>('todos');
  const [vehicleFilter, setVehicleFilter] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Modal para Cargar Factura y Ejecutar Correctivo
  const [isEjecutarModalOpen, setIsEjecutarModalOpen] = useState(false);
  const [selectedCorrective, setSelectedCorrective] = useState<VehicleMaintenance | null>(null);
  const [ejecutarNumeroFactura, setEjecutarNumeroFactura] = useState('');
  const [ejecutarFacturaFile, setEjecutarFacturaFile] = useState<File | null>(null);
  const [ejecutarFacturaPreviewUrl, setEjecutarFacturaPreviewUrl] = useState<string | null>(null);

  // Modal para Registrar Servicio
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<VehicleMaintenance | null>(null);
  const [recordForm, setRecordForm] = useState({
    tipo_mantenimiento: 'Preventivo' as 'Preventivo' | 'Correctivo',
    fecha: new Date().toISOString().split('T')[0],
    fecha_proximo: '',
    taller: '',
    supplier: '',
    subtotal_mano_obra: '',
    subtotal_materiales: '',
    costo: '',
    numero_factura: '',
    fallo_observado: '',
    solucion_aplicada: '',
    notas: ''
  });
  const [facturaFile, setFacturaFile] = useState<File | null>(null);
  const [facturaPreviewUrl, setFacturaPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal para Crear Programa
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createData, setCreateData] = useState({
    vehicle: '',
    tipo_mantenimiento: 'Preventivo' as 'Preventivo' | 'Correctivo',
    actividad: '',
    fecha_ultimo_cambio: new Date().toISOString().split('T')[0],
    fecha_proximo_cambio: '',
    km_ultimo_cambio: '0',
    frecuencia_km: '5000',
    kilometraje_falla: '',
    subtipo_correctivo: 'Programado' as 'Urgente' | 'Programado',
    fallo_observado: '',
    solucion_aplicada: '',
    notas: ''
  });

  // Modal para Historial por Vehículo
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedVehicleForHistory, setSelectedVehicleForHistory] = useState<Vehicle | null>(null);
  const [historyRecords, setHistoryRecords] = useState<VehicleMaintenanceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchData = async () => {
    try {
      const [vehRes, maintRes, suppRes] = await Promise.all([
        api.get('/vehicles/'),
        api.get('/vehicle-maintenances/'),
        api.get('/vehicle-suppliers/')
      ]);
      setVehicles(vehRes.data || []);
      setMaintenances(maintRes.data || []);
      setSuppliers(suppRes.data || []);
    } catch (error) {
      toast.error('Error al cargar datos de mantenimiento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useInventoryWebSocket(fetchData);

  const handleFacturaFileChange = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten fotografías/imágenes (JPG, PNG, WEBP)');
      return;
    }
    try {
      const compressed = await compressImage(file);
      setFacturaFile(compressed);
      setFacturaPreviewUrl(URL.createObjectURL(compressed));
    } catch (err) {
      setFacturaFile(file);
      setFacturaPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleEjecutarFacturaFileChange = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten fotografías/imágenes (JPG, PNG, WEBP)');
      return;
    }
    try {
      const compressed = await compressImage(file);
      setEjecutarFacturaFile(compressed);
      setEjecutarFacturaPreviewUrl(URL.createObjectURL(compressed));
    } catch (err) {
      setEjecutarFacturaFile(file);
      setEjecutarFacturaPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleOpenCreateModal = () => {
    const firstVeh = vehicles[0];
    setCreateData({
      vehicle: firstVeh?.id.toString() || '',
      tipo_mantenimiento: 'Preventivo',
      actividad: 'Aceite de Motor y Filtro',
      fecha_ultimo_cambio: new Date().toISOString().split('T')[0],
      fecha_proximo_cambio: '',
      km_ultimo_cambio: (firstVeh?.odometro_actual || 0).toString(),
      frecuencia_km: '5000',
      kilometraje_falla: (firstVeh?.odometro_actual || 0).toString(),
      subtipo_correctivo: 'Programado',
      fallo_observado: '',
      solucion_aplicada: '',
      notas: ''
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isCorrective = createData.tipo_mantenimiento === 'Correctivo';
      await api.post('/vehicle-maintenances/', {
        vehicle: parseInt(createData.vehicle),
        tipo_mantenimiento: createData.tipo_mantenimiento,
        actividad: createData.actividad,
        fecha_ultimo_cambio: createData.fecha_ultimo_cambio,
        fecha_proximo_cambio: isCorrective ? null : (createData.fecha_proximo_cambio || null),
        km_ultimo_cambio: parseInt(createData.km_ultimo_cambio || '0'),
        frecuencia_km: isCorrective ? null : parseInt(createData.frecuencia_km || '0'),
        kilometraje_falla: isCorrective ? parseInt(createData.kilometraje_falla || '0') : null,
        subtipo_correctivo: isCorrective ? createData.subtipo_correctivo : null,
        estado_correctivo: isCorrective ? 'Pendiente' : null,
        fallo_observado: isCorrective ? createData.fallo_observado : null,
        solucion_aplicada: isCorrective ? createData.solucion_aplicada : null,
        notas: createData.notas
      });

      toast.success(isCorrective ? 'Mantenimiento correctivo registrado como Pendiente' : 'Programa de mantenimiento creado');
      setIsCreateModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Error al guardar el mantenimiento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEjecutarModal = (mantenimiento: VehicleMaintenance) => {
    setSelectedCorrective(mantenimiento);
    setEjecutarNumeroFactura(mantenimiento.numero_factura || '');
    setEjecutarFacturaFile(null);
    setEjecutarFacturaPreviewUrl(null);
    setIsEjecutarModalOpen(true);
  };

  const handleSubmitEjecutar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCorrective) return;

    if (!ejecutarFacturaFile && !selectedCorrective.factura_foto) {
      toast.error('Es obligatorio tomar o subir la fotografía de la factura para cambiar el estado a Ejecutado');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      if (ejecutarNumeroFactura) formData.append('numero_factura', ejecutarNumeroFactura);
      if (ejecutarFacturaFile) formData.append('factura_foto', ejecutarFacturaFile);

      const identifier = selectedCorrective.public_id || selectedCorrective.id;
      await api.post(`/vehicle-maintenances/${identifier}/ejecutar/`, formData);

      toast.success('Factura validada y mantenimiento cambiado a estado EJECUTADO');
      setIsEjecutarModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al ejecutar el mantenimiento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRecordModal = (rule: VehicleMaintenance) => {
    setSelectedRule(rule);
    setRecordForm({
      tipo_mantenimiento: rule.tipo_mantenimiento || 'Preventivo',
      fecha: new Date().toISOString().split('T')[0],
      fecha_proximo: rule.fecha_proximo_cambio || '',
      taller: '',
      supplier: '',
      subtotal_mano_obra: '',
      subtotal_materiales: '',
      costo: '',
      numero_factura: '',
      fallo_observado: rule.fallo_observado || '',
      solucion_aplicada: rule.solucion_aplicada || '',
      notas: ''
    });
    setFacturaFile(null);
    setFacturaPreviewUrl(null);
    setIsRecordModalOpen(true);
  };

  const calculateTotal = (manoObra: string, materiales: string) => {
    const mo = parseFloat(manoObra || '0');
    const mat = parseFloat(materiales || '0');
    return (mo + mat).toFixed(2);
  };

  const handleManoObraChange = (val: string) => {
    setRecordForm(prev => {
      const calc = calculateTotal(val, prev.subtotal_materiales);
      return { ...prev, subtotal_mano_obra: val, costo: calc };
    });
  };

  const handleMaterialesChange = (val: string) => {
    setRecordForm(prev => {
      const calc = calculateTotal(prev.subtotal_mano_obra, val);
      return { ...prev, subtotal_materiales: val, costo: calc };
    });
  };

  const handleSubmitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule) return;

    setSubmitting(true);
    try {
      const postData = new FormData();
      postData.append('vehicle', selectedRule.vehicle.toString());
      if (selectedRule.id) {
        postData.append('maintenance_rule', selectedRule.id.toString());
      }
      postData.append('tipo_mantenimiento', recordForm.tipo_mantenimiento);
      postData.append('fecha', recordForm.fecha);
      postData.append('taller', recordForm.taller || 'Taller Interno');
      if (recordForm.supplier) postData.append('supplier', recordForm.supplier);
      
      const mo = parseFloat(recordForm.subtotal_mano_obra || '0');
      const mat = parseFloat(recordForm.subtotal_materiales || '0');
      const total = parseFloat(recordForm.costo || '0') || (mo + mat);
      
      postData.append('subtotal_mano_obra', mo.toString());
      postData.append('subtotal_materiales', mat.toString());
      postData.append('costo', total.toString());
      if (recordForm.numero_factura) postData.append('numero_factura', recordForm.numero_factura);
      if (recordForm.fallo_observado) postData.append('fallo_observado', recordForm.fallo_observado);
      if (recordForm.solucion_aplicada) postData.append('solucion_aplicada', recordForm.solucion_aplicada);
      if (recordForm.notas) postData.append('notas', recordForm.notas);
      if (facturaFile) {
        postData.append('factura_foto', facturaFile);
      }

      await api.post('/vehicle-maintenance-records/', postData);



      // Actualizar la regla si existe
      const currentVehicle = vehicles.find(v => v.id === selectedRule.vehicle);
      const ruleId = selectedRule.public_id || selectedRule.id;
      if (ruleId) {
        try {
          const updatePayload: any = {
            fecha_ultimo_cambio: recordForm.fecha,
            fecha_proximo_cambio: recordForm.fecha_proximo || null,
            km_ultimo_cambio: currentVehicle?.odometro_actual || 0
          };
          if (facturaFile && selectedRule.tipo_mantenimiento === 'Correctivo') {
            updatePayload.estado_correctivo = 'Ejecutado';
          }
          await api.patch(`/vehicle-maintenances/${ruleId}/`, updatePayload);
        } catch (e) {
          console.warn('Could not update maintenance rule:', e);
        }
      }


      toast.success('Servicio registrado exitosamente');
      setIsRecordModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('API Error Response:', error.response?.data);
      const serverMsg = error.response?.data 
        ? (typeof error.response.data === 'object' 
            ? Object.entries(error.response.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
            : String(error.response.data))
        : 'Error al registrar el servicio';
      toast.error(`Error al registrar el servicio: ${serverMsg}`);
    } finally {

      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (rule: VehicleMaintenance) => {
    if (await confirmDialog('¿Deseas eliminar este registro de mantenimiento?')) {
      try {
        const identifier = rule.public_id || rule.id;
        await api.delete(`/vehicle-maintenances/${identifier}/`);
        toast.success('Mantenimiento eliminado');
        fetchData();
      } catch (error) {
        toast.error('Error al eliminar mantenimiento');
      }
    }
  };

  const handleOpenHistoryModal = async (vehicle: Vehicle) => {
    setSelectedVehicleForHistory(vehicle);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/vehicle-maintenance-records/?vehicle=${vehicle.public_id || vehicle.id}`);
      setHistoryRecords(res.data || []);
    } catch (error) {
      toast.error('Error al cargar el historial');
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredMaintenances = useMemo(() => {
    return maintenances.filter(m => {
      const v = vehicles.find(vh => vh.id === m.vehicle);
      if (!v) return false;
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        v.placa.toLowerCase().includes(searchLower) ||
        v.marca.toLowerCase().includes(searchLower) ||
        v.modelo.toLowerCase().includes(searchLower) ||
        m.actividad.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      if (vehicleFilter !== 'todos' && m.vehicle.toString() !== vehicleFilter) return false;
      if (tipoFilter !== 'todos' && m.tipo_mantenimiento !== tipoFilter) return false;

      if (statusFilter === 'urgente') {
        return m.estado_alerta === 'CAMBIO URGENTE' || 
               m.estado_alerta === 'CAMBIO REQUERIDO' || 
               m.estado_alerta === 'REQUERIMIENTO' || 
               m.estado_alerta === 'PENDIENTE URGENTE' || 
               m.estado_alerta === 'PENDIENTE PROGRAMADO';
      }
      if (statusFilter === 'proximo') return m.estado_alerta === 'REQUERIMIENTO' || m.estado_alerta === 'PENDIENTE PROGRAMADO';
      if (statusFilter === 'aldia') return m.estado_alerta === 'AL DÍA' || m.estado_alerta === 'VIGENTE' || m.estado_alerta === 'EJECUTADO';

      return true;
    });
  }, [maintenances, vehicles, searchTerm, statusFilter, tipoFilter, vehicleFilter]);

  // KPIs
  const totalRules = maintenances.length;
  const countPreventivos = maintenances.filter(m => m.tipo_mantenimiento === 'Preventivo').length;
  const countCorrectivos = maintenances.filter(m => m.tipo_mantenimiento === 'Correctivo').length;
  const countUrgentes = maintenances.filter(m => 
    m.estado_alerta === 'CAMBIO URGENTE' || 
    m.estado_alerta === 'CAMBIO REQUERIDO' || 
    m.estado_alerta === 'REQUERIMIENTO' || 
    m.estado_alerta === 'PENDIENTE URGENTE' || 
    m.estado_alerta === 'PENDIENTE PROGRAMADO'
  ).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 w-full max-w-[1700px] mx-auto pb-32 relative">
      {/* Background Texture */}
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none rounded-3xl mix-blend-multiply" />

      {/* Header */}
      <div className="relative z-10 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm">
              <Wrench className="w-7 h-7" />
            </div>
            Control de Mantenimientos
          </h1>
          <p className="text-gray-500 mt-1.5 text-base font-medium">
            Clasificación de mantenimientos preventivos (con frecuencia) y correctivos (detallando falla y solución), control de facturas y proveedores.
          </p>
        </div>
        
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          Añadir Mantenimiento
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mantenimientos Totales</p>
            <p className="text-2xl font-black text-gray-900">{totalRules}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Preventivos Programados</p>
            <p className="text-2xl font-black text-emerald-600">{countPreventivos}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-red-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Correctivos Registrados</p>
            <p className="text-2xl font-black text-red-600">{countCorrectivos}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-amber-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Alertas / Cambios Urgentes</p>
            <p className="text-2xl font-black text-amber-600">{countUrgentes}</p>
          </div>
        </div>
      </div>

      {/* Filter and View Control Bar */}
      <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por placa, actividad..."
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-xl text-sm font-medium transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtro desplegable por Vehículo */}
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer"
          >
            <option value="todos">Todos los vehículos ({vehicles.length})</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id.toString()}>
                🚗 {v.placa} - {v.marca} {v.modelo}
              </option>
            ))}
          </select>

          {/* Quick Filters for Tipo: Preventivo vs Correctivo */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => { setTipoFilter('todos'); setStatusFilter('todos'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tipoFilter === 'todos' && statusFilter === 'todos' ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos los tipos
            </button>
            <button
              onClick={() => { setTipoFilter('Preventivo'); setStatusFilter('todos'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tipoFilter === 'Preventivo' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Preventivos ({countPreventivos})
            </button>
            <button
              onClick={() => { setTipoFilter('Correctivo'); setStatusFilter('todos'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tipoFilter === 'Correctivo' ? 'bg-red-600 text-white shadow-sm' : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Correctivos ({countCorrectivos})
            </button>
            <button
              onClick={() => setStatusFilter('urgente')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'urgente' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Alertas / Urgentes ({countUrgentes})
            </button>

          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'table' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
            title="Vista de Tabla"
          >
            <Table className="w-4 h-4" />
            <span>Tabla</span>
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'cards' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
            title="Vista de Tarjetas"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Tarjetas</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredMaintenances.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900">No hay mantenimientos que coincidan</h3>
          <p className="text-gray-500 mt-1 text-sm">Prueba ajustando el término de búsqueda o cambia los filtros.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* VISTA DE TABLA PRO */
        <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-xs text-left whitespace-nowrap border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white font-bold uppercase tracking-wider shadow-sm">
                  <th className="px-4 py-4 text-center">Nº</th>
                  <th className="px-4 py-4">TIPO</th>
                  <th className="px-4 py-4">VEHÍCULO / PLACA</th>
                  <th className="px-4 py-4">ACTIVIDAD / SERVICIO</th>
                  <th className="px-4 py-4 text-center">ÚLTIMO CAMBIO</th>
                  <th className="px-4 py-4 text-center">FRECUENCIA (KM)</th>
                  <th className="px-4 py-4 text-center">KM PRÓXIMO</th>
                  <th className="px-4 py-4 text-center">ODÓMETRO ACTUAL</th>
                  <th className="px-4 py-4 text-center">ESTADO / ALERTA</th>
                  <th className="px-4 py-4 text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredMaintenances.map((m, index) => {
                  const v = vehicles.find(vh => vh.id === m.vehicle);
                  if (!v) return null;

                  const isCorrective = m.tipo_mantenimiento === 'Correctivo';
                  const isUrgent = m.estado_alerta === 'CAMBIO URGENTE';
                  const isWarning = m.estado_alerta === 'PRÓXIMO';

                  return (
                    <tr 
                      key={m.id} 
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isCorrective ? 'bg-red-50/20' : isUrgent ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center text-gray-400 font-bold">{index + 1}</td>
                      
                      <td className="px-4 py-3.5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isCorrective ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                        }`}>
                          {m.tipo_mantenimiento || 'Preventivo'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-extrabold text-gray-900 text-sm">{v.placa}</div>
                        <div className="text-[10px] font-semibold text-gray-500">{v.marca} {v.modelo}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-800">{m.actividad}</div>
                        {isCorrective && m.fallo_observado && (
                          <div className="text-[10px] text-red-700 font-semibold truncate max-w-xs">
                            Falló: {m.fallo_observado}
                          </div>
                        )}
                        {!isCorrective && m.notas && (
                          <div className="text-[10px] text-emerald-800 font-semibold truncate max-w-xs">
                            Detalles: {m.notas}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center text-gray-700">
                        {m.fecha_ultimo_cambio || '-'}
                      </td>

                      <td className="px-4 py-3.5 text-center text-gray-600">
                        {m.frecuencia_km ? `cada ${m.frecuencia_km.toLocaleString()} km` : <span className="text-gray-400 font-bold">No requiere</span>}
                      </td>

                      <td className="px-4 py-3.5 text-center font-bold text-gray-900">
                        {m.frecuencia_km ? `${m.km_proximo_cambio.toLocaleString()} km` : '-'}
                      </td>

                      <td className="px-4 py-3.5 text-center font-extrabold text-blue-600">
                        {(v.odometro_actual || 0).toLocaleString()} km
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm inline-flex items-center gap-1 ${
                          isCorrective ? 'bg-red-600 text-white' :
                          isUrgent ? 'bg-red-600 text-white animate-pulse' :
                          isWarning ? 'bg-amber-500 text-white' :
                          'bg-emerald-600 text-white'
                        }`}>
                          {isUrgent && <AlertTriangle className="w-3 h-3" />}
                          {m.estado_alerta}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            title="Registrar Servicio Realizado"
                            onClick={() => handleOpenRecordModal(m)}
                            className="p-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-colors shadow-sm flex items-center gap-1 font-bold text-[11px]"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>Servicio</span>
                          </button>
                          
                          <button 
                            title="Historial por Vehículo"
                            onClick={() => handleOpenHistoryModal(v)}
                            className="p-2 bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 rounded-xl transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button 
                            title="Eliminar"
                            onClick={() => handleDeleteRule(m)}
                            className="p-2 bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600 rounded-xl transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA DE TARJETAS GRID */
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaintenances.map(m => {
            const v = vehicles.find(vh => vh.id === m.vehicle);
            if (!v) return null;

            const isCorrective = m.tipo_mantenimiento === 'Correctivo';
            const isUrgent = m.estado_alerta === 'CAMBIO URGENTE';
            const isWarning = m.estado_alerta === 'PRÓXIMO';

            return (
              <div 
                key={m.id}
                className={`bg-white rounded-3xl border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                  isCorrective ? 'border-red-200' : isUrgent ? 'border-red-200' : isWarning ? 'border-amber-200' : 'border-gray-100'
                }`}
              >
                {/* Card Header */}
                <div className={`p-5 flex justify-between items-start ${
                  isCorrective ? 'bg-gradient-to-r from-red-50 to-red-100/50' :
                  isUrgent ? 'bg-gradient-to-r from-red-50 to-red-100/50' :
                  isWarning ? 'bg-gradient-to-r from-amber-50 to-amber-100/50' :
                  'bg-gradient-to-r from-emerald-50 to-emerald-100/40'
                }`}>
                  <div>
                    <div className="px-3 py-1 bg-gray-900 text-white font-black text-sm rounded-lg inline-block tracking-wider mb-1">
                      {v.placa}
                    </div>
                    <p className="text-xs font-bold text-gray-600">{v.marca} {v.modelo}</p>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                    isCorrective ? (m.estado_correctivo === 'Ejecutado' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white') :
                    isUrgent ? 'bg-red-600 text-white animate-pulse' :
                    isWarning ? 'bg-amber-500 text-white' :
                    'bg-emerald-600 text-white'
                  }`}>
                    {m.tipo_mantenimiento || 'Preventivo'}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4 flex-1">
                  <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-emerald-600" />
                    {m.actividad}
                  </h3>

                  {isCorrective ? (
                    <div className="bg-red-50/60 p-4 rounded-2xl space-y-2 border border-red-100 text-xs">
                      {m.kilometraje_falla && (
                        <p className="text-red-900 font-semibold"><b className="text-red-700">Kilometraje Falla:</b> {m.kilometraje_falla.toLocaleString()} km</p>
                      )}
                      {m.fallo_observado && (
                        <p className="text-red-900 font-semibold"><b className="text-red-700">¿Qué falló?:</b> {m.fallo_observado}</p>
                      )}
                      {m.solucion_aplicada && (
                        <p className="text-emerald-900 font-semibold"><b className="text-emerald-700">Solución:</b> {m.solucion_aplicada}</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-2xl space-y-2 border border-gray-100 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-medium">Último Cambio:</span>
                        <span className="font-bold text-gray-800">{m.fecha_ultimo_cambio || 'Sin registro'} ({m.km_ultimo_cambio.toLocaleString()} km)</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-500 font-medium">Frecuencia Programada:</span>
                        <span className="font-bold text-gray-800">Cada {m.frecuencia_km?.toLocaleString()} km</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-500 font-medium">Próximo Cambio Objetivo:</span>
                        <span className="font-bold text-gray-900">{m.km_proximo_cambio.toLocaleString()} km</span>
                      </div>

                      {m.notas && (
                        <div className="pt-2 border-t border-gray-200/60 text-gray-700 font-medium italic">
                          <b>Detalles:</b> {m.notas}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center p-3 bg-blue-50/50 rounded-2xl border border-blue-100 text-xs">
                    <span className="text-blue-800 font-bold">Odómetro Vehículo:</span>
                    <span className="font-black text-blue-600 text-sm">{(v.odometro_actual || 0).toLocaleString()} km</span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center gap-2">
                  <button
                    onClick={() => handleOpenHistoryModal(v)}
                    className="flex-1 py-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-700 text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    Historial
                  </button>

                  <button
                    onClick={() => handleOpenRecordModal(m)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    Registrar Servicio
                  </button>

                  <button
                    onClick={() => handleDeleteRule(m)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Crear Programa / Mantenimiento (Basado en la imagen adjunta) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl shadow-sm">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-extrabold">Crear Mantenimiento</h2>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateRule} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Selector Tipo: Preventivo vs Correctivo */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tipo de Mantenimiento *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateData({ ...createData, tipo_mantenimiento: 'Preventivo' })}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                      createData.tipo_mantenimiento === 'Preventivo'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Preventivo (Requiere Frecuencia)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateData({ ...createData, tipo_mantenimiento: 'Correctivo' })}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                      createData.tipo_mantenimiento === 'Correctivo'
                        ? 'bg-red-600 text-white border-red-600 shadow-md'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Correctivo (Sin Frecuencia)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Vehículo *</label>
                <select
                  required
                  value={createData.vehicle}
                  onChange={e => setCreateData({...createData, vehicle: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id.toString()}>{v.placa} - {v.marca} {v.modelo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Actividad / Servicio de Mantenimiento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Aceite de Motor y Filtro, Frenos, Amortiguadores..."
                  value={createData.actividad}
                  onChange={e => setCreateData({...createData, actividad: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                />
              </div>

              {/* Si es Preventivo: Frecuencia y Fechas */}
              {createData.tipo_mantenimiento === 'Preventivo' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Frecuencia (KM) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="5000"
                        value={createData.frecuencia_km}
                        onChange={e => setCreateData({...createData, frecuencia_km: e.target.value})}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">KM Último Cambio *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="0"
                        value={createData.km_ultimo_cambio}
                        onChange={e => setCreateData({...createData, km_ultimo_cambio: e.target.value})}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Fecha Último Cambio *</label>
                      <input
                        type="date"
                        required
                        value={createData.fecha_ultimo_cambio}
                        onChange={e => setCreateData({...createData, fecha_ultimo_cambio: e.target.value})}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Fecha Próximo Cambio</label>
                      <input
                        type="date"
                        value={createData.fecha_proximo_cambio}
                        onChange={e => setCreateData({...createData, fecha_proximo_cambio: e.target.value})}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Si es Correctivo: KM de falla, Prioridad, Qué falló y Solución */
                <div className="space-y-4 bg-red-50/50 p-4 rounded-2xl border border-red-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-red-900 uppercase tracking-wider mb-1">
                        KM donde surgió la falla *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="Ej. 125000"
                        value={createData.kilometraje_falla}
                        onChange={e => setCreateData({...createData, kilometraje_falla: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-red-900 uppercase tracking-wider mb-1">
                        Prioridad / Tipo Correctivo *
                      </label>
                      <select
                        value={createData.subtipo_correctivo}
                        onChange={e => setCreateData({...createData, subtipo_correctivo: e.target.value as 'Urgente' | 'Programado'})}
                        className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-sm font-bold text-red-900 focus:ring-2 focus:ring-red-500"
                      >
                        <option value="Programado">Programado</option>
                        <option value="Urgente">Urgente</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-red-900 uppercase tracking-wider mb-1">¿Qué falló? (Causa del Mantenimiento)</label>
                    <textarea
                      rows={2}
                      placeholder="Describe la falla reportada o piezas averiadas..."
                      value={createData.fallo_observado}
                      onChange={e => setCreateData({...createData, fallo_observado: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-sm font-medium resize-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1">Detalle de Solución (Acción Aplicada)</label>
                    <textarea
                      rows={2}
                      placeholder="Describe el trabajo realizado para solucionar la falla..."
                      value={createData.solucion_aplicada}
                      onChange={e => setCreateData({...createData, solucion_aplicada: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm font-medium resize-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Confirmar Mantenimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Registrar Servicio Realizado y Facturación */}
      {isRecordModalOpen && selectedRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl shadow-sm">
                  <PenTool className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold">Registrar Servicio Realizado</h2>
                  <p className="text-xs font-semibold text-emerald-200">{selectedRule.actividad}</p>
                </div>
              </div>
              <button onClick={() => setIsRecordModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitRecord} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="bg-emerald-50 text-emerald-900 p-4 rounded-2xl text-xs font-semibold border border-emerald-200 flex gap-3 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-emerald-600 shrink-0" />
                <p>Al confirmar, el odómetro actual (<b>{vehicles.find(v => v.id === selectedRule.vehicle)?.odometro_actual} km</b>) se actualizará como el nuevo kilometraje de cambio.</p>
              </div>

              {/* Taller / Proveedor Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Store className="w-4 h-4 text-emerald-600" /> Proveedor / Taller *
                </label>
                <select
                  value={recordForm.supplier}
                  onChange={e => {
                    const suppId = e.target.value;
                    const found = suppliers.find(s => s.id.toString() === suppId);
                    setRecordForm(prev => ({
                      ...prev,
                      supplier: suppId,
                      taller: found ? found.name : prev.taller
                    }));
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                >
                  <option value="">Seleccione o ingrese proveedor...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id.toString()}>{s.name} ({s.phone || 'Sin tel'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nombre Taller Libre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Taller Mecánico Los Andes"
                  value={recordForm.taller}
                  onChange={e => setRecordForm({...recordForm, taller: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                />
              </div>

              {/* Desglose de Facturación: Subtotal 1 Mano de obra + Subtotal 2 Materiales = Total */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <p className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Desglose de Costos de Factura
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Subtotal 1: Mano de Obra ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={recordForm.subtotal_mano_obra}
                      onChange={e => handleManoObraChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Subtotal 2: Materiales ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={recordForm.subtotal_materiales}
                      onChange={e => handleMaterialesChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-xs font-black text-gray-700 uppercase">Total Facturado (Subtotal 3):</span>
                  <span className="text-xl font-black text-emerald-600">${recordForm.costo || '0.00'}</span>
                </div>
              </div>

              {/* Número de Factura */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">N.º Factura</label>
                <input
                  type="text"
                  placeholder="Ej. FAC-00123"
                  value={recordForm.numero_factura}
                  onChange={e => setRecordForm({...recordForm, numero_factura: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                />
              </div>

              {/* Fotografía de Factura con Cámara */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-600" /> Fotografía de Factura * (JPG/PNG)
                </label>
                <div className="flex flex-col gap-2">
                  <div className="w-full h-44 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group hover:border-emerald-500 transition-colors">
                    {facturaPreviewUrl ? (
                      <img src={facturaPreviewUrl} alt="Preview Factura" className="w-full h-full object-cover" />
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
                        handleFacturaFileChange(file);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium">Toca el recuadro para tomar una foto de la factura del servicio con la cámara de tu teléfono.</p>
                </div>
              </div>

              {/* Detalles / Observaciones del Servicio */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Detalles / Observaciones del Servicio (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Se cambió aceite 10W30 sintético, filtro K&N, revisión de pastillas de freno..."
                  value={recordForm.notas}
                  onChange={e => setRecordForm({...recordForm, notas: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium resize-none"
                />
              </div>

              {/* Si es Correctivo: Qué falló y Solución */}
              {selectedRule.tipo_mantenimiento === 'Correctivo' && (
                <div className="space-y-3 bg-red-50/50 p-4 rounded-2xl border border-red-100">
                  <div>
                    <label className="block text-xs font-bold text-red-900 uppercase mb-1">¿Qué falló?</label>
                    <textarea
                      rows={2}
                      value={recordForm.fallo_observado}
                      onChange={e => setRecordForm({...recordForm, fallo_observado: e.target.value})}
                      placeholder="Describe la falla reportada..."
                      className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-sm font-medium resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">Detalle de Solución</label>
                    <textarea
                      rows={2}
                      value={recordForm.solucion_aplicada}
                      onChange={e => setRecordForm({...recordForm, solucion_aplicada: e.target.value})}
                      placeholder="Describe la solución realizada..."
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-sm font-medium resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-xs disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Confirmar Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Validar Factura y Ejecutar Correctivo */}
      {isEjecutarModalOpen && selectedCorrective && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-700 to-teal-800 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl shadow-sm">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold">Cargar Factura y Ejecutar</h2>
                  <p className="text-xs font-semibold text-emerald-200">{selectedCorrective.actividad}</p>
                </div>
              </div>
              <button onClick={() => setIsEjecutarModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitEjecutar} className="p-6 space-y-4">
              <div className="bg-amber-50 text-amber-900 p-4 rounded-2xl text-xs font-semibold border border-amber-200 flex gap-3 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <p>Para cambiar el estado de <b>Pendiente</b> a <b>EJECUTADO</b>, es <u>obligatorio</u> adjuntar la foto/comprobante de la factura física o digital.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">N.º de Factura (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. FAC-0012398"
                  value={ejecutarNumeroFactura}
                  onChange={e => setEjecutarNumeroFactura(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-600" /> Fotografía / Documento de Factura *
                </label>
                <div className="flex flex-col gap-2">
                  <div className="w-full h-48 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group hover:border-emerald-500 transition-colors">
                    {ejecutarFacturaPreviewUrl ? (
                      <img src={ejecutarFacturaPreviewUrl} alt="Preview Factura" className="w-full h-full object-cover" />
                    ) : selectedCorrective.factura_foto ? (
                      <img src={getImageUrl(selectedCorrective.factura_foto)} alt="Factura Actual" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <Camera className="w-10 h-10 mb-2 group-hover:text-emerald-600 transition-colors" />
                        <span className="font-semibold text-xs group-hover:text-emerald-600 transition-colors">Tocar para tomar foto o seleccionar archivo</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      capture="environment"
                      onChange={e => {
                        const file = e.target.files ? e.target.files[0] : null;
                        handleEjecutarFacturaFileChange(file);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEjecutarModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-xs disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? 'Guardando...' : 'Validar Factura y Ejecutar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Historial por Vehículo */}
      {isHistoryModalOpen && selectedVehicleForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-blue-100/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Historial de Servicios Realizados</h2>
                  <p className="text-xs font-bold text-blue-700">
                    Vehículo: {selectedVehicleForHistory.placa} ({selectedVehicleForHistory.marca} {selectedVehicleForHistory.modelo})
                  </p>
                </div>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 custom-scrollbar">
              {loadingHistory ? (
                <div className="text-center py-12 text-gray-500">Cargando historial...</div>
              ) : historyRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-900">Sin mantenimientos registrados</h3>
                  <p className="text-gray-500 mt-1 text-sm">Este vehículo aún no posee mantenimientos registrados.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyRecords.map(record => (
                    <div key={record.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            record.tipo_mantenimiento === 'Correctivo' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                          }`}>
                            {record.tipo_mantenimiento || 'Preventivo'}
                          </span>
                          <h4 className="font-extrabold text-gray-900 text-base">
                            {record.actividad_nombre}
                          </h4>
                        </div>

                        <div className="mt-2 space-y-1 text-xs font-semibold text-gray-600">
                          <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-gray-400" /> <b>Fecha:</b> {record.fecha}</p>
                          <p className="flex items-center gap-2"><Store className="w-3.5 h-3.5 text-gray-400" /> <b>Taller / Proveedor:</b> {record.taller} {record.supplier_name ? `(${record.supplier_name})` : ''}</p>
                          {record.numero_factura && <p><b>N.º Factura:</b> {record.numero_factura}</p>}
                          {record.notas && <p className="text-gray-700 italic"><b>Detalles del servicio:</b> {record.notas}</p>}
                        </div>

                        {record.tipo_mantenimiento === 'Correctivo' && (
                          <div className="mt-3 p-3 bg-red-50/60 rounded-xl text-xs space-y-1 border border-red-100">
                            {record.fallo_observado && <p className="text-red-900 font-semibold"><b>¿Qué falló?:</b> {record.fallo_observado}</p>}
                            {record.solucion_aplicada && <p className="text-emerald-900 font-semibold"><b>Solución:</b> {record.solucion_aplicada}</p>}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end justify-center shrink-0">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Mano de Obra: ${parseFloat(record.subtotal_mano_obra?.toString() || '0').toFixed(2)}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Materiales: ${parseFloat(record.subtotal_materiales?.toString() || '0').toFixed(2)}</span>
                        <span className="text-xl font-black text-emerald-600 mt-1">${parseFloat(record.costo?.toString() || '0').toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span>
                        
                        {record.factura_foto ? (
                          <a
                            href={getImageUrl(record.factura_foto)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" /> Ver Factura
                          </a>
                        ) : (
                          <button
                            onClick={() => {
                              setIsHistoryModalOpen(false);
                              const rule = maintenances.find(m => m.id === record.maintenance_rule || m.vehicle === record.vehicle);
                              if (rule) {
                                handleOpenEjecutarModal(rule);
                              } else {
                                const firstRule = maintenances.find(m => m.vehicle === record.vehicle);
                                if (firstRule) handleOpenEjecutarModal(firstRule);
                              }
                            }}
                            className="mt-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md animate-pulse"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Subir Factura para Ejecutar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleMaintenances;
