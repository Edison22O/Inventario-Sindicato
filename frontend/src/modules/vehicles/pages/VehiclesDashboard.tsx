import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Truck,
  AlertTriangle,
  Navigation,
  Wrench,
  X,
  PieChart as PieIcon,
  BarChart2,
  Fuel,
  FileText,
  DollarSign,
  Gauge,
  Users,
  Plus,
  RefreshCw,
  ShieldAlert,
  CheckCircle,
  TrendingUp,
  Clock,
  ChevronRight,
  ExternalLink,
  Activity,
  Building2,
  Search,
  Filter,
  PenTool,
  Store,
  Camera,
  Edit3,
  Settings
} from 'lucide-react';
import { compressImage } from '@/shared/utils/imageCompressor';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

import api from '@/shared/services/api';
import toast from 'react-hot-toast';
import { useInventoryWebSocket } from '@/modules/inventory/hooks/useInventoryWebSocket';

interface Trip {
  id: number;
  vehicle_placa: string;
  conductor_name: string;
  fecha_hora_llegada: string;
  km_recorridos: number;
  galones_recargados: string;
  costo_combustible_viaje: string;
  estado_viaje: string;
}

interface FuelLog {
  id: number;
  numero_vale: string;
  vehicle_placa?: string;
  fecha_vale: string;
  tipo_combustible: string;
  galones: number | string;
  costo_total: number | string;
}

interface MaintenanceRecord {
  id: number;
  vehicle_placa: string;
  actividad_nombre: string;
  tipo_mantenimiento?: 'Preventivo' | 'Correctivo';
  fecha: string;
  taller: string;
  costo: string;
  notas: string;
}

interface SupplierMaintStat {
  año?: number;
  year?: number;
  anio?: number;
  proveedor?: string;
  taller?: string;
  name?: string;
  supplier_id?: number | null;
  supplier_public_id?: string | null;
  correctivos: number;
  preventivos: number;
  costo_correctivos: number;
  costo_preventivos: number;
  costo_total: number;
  total_servicios: number;
}

const VehiclesDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab State: 'resumen' | 'mantenimiento' | 'combustible' | 'alertas'
  const [activeTab, setActiveTab] = useState<'resumen' | 'mantenimiento' | 'combustible' | 'alertas'>('resumen');

  // Supplier maintenance filter states
  const [supplierSearch, setSupplierSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('todos');

  // Modal States
  const [selectedMaint, setSelectedMaint] = useState<any>(null);
  const [selectedMatricula, setSelectedMatricula] = useState<any>(null);

  // Forms
  const [maintForm, setMaintForm] = useState({
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

  // Control de Precios de Combustible (Gasolina / Diésel)
  const [isFuelPriceModalOpen, setIsFuelPriceModalOpen] = useState(false);
  const [fuelPricesForm, setFuelPricesForm] = useState({
    precio_gasolina: '2.40',
    precio_diesel: '1.75'
  });

  const handleOpenFuelPriceModal = () => {
    setFuelPricesForm({
      precio_gasolina: (stats?.fuel_prices?.precio_gasolina || 2.40).toString(),
      precio_diesel: (stats?.fuel_prices?.precio_diesel || 1.75).toString()
    });
    setIsFuelPriceModalOpen(true);
  };

  const handleSaveFuelPrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch('/system-settings/fuel_prices/', {
        precio_gasolina: parseFloat(fuelPricesForm.precio_gasolina),
        precio_diesel: parseFloat(fuelPricesForm.precio_diesel)
      });
      toast.success('Precios de combustible actualizados exitosamente. Se aplicarán a los nuevos registros de vales y viajes.');
      setIsFuelPriceModalOpen(false);
      fetchStats();
    } catch (error) {
      toast.error('Error al actualizar precios de combustible');
    } finally {
      setSubmitting(false);
    }
  };

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

  const calculateTotal = (manoObra: string, materiales: string) => {
    const mo = parseFloat(manoObra || '0');
    const mat = parseFloat(materiales || '0');
    return (mo + mat).toFixed(2);
  };

  const handleManoObraChange = (val: string) => {
    setMaintForm(prev => {
      const calc = calculateTotal(val, prev.subtotal_materiales);
      return { ...prev, subtotal_mano_obra: val, costo: calc };
    });
  };

  const handleMaterialesChange = (val: string) => {
    setMaintForm(prev => {
      const calc = calculateTotal(prev.subtotal_mano_obra, val);
      return { ...prev, subtotal_materiales: val, costo: calc };
    });
  };

  const handleOpenRecordModal = (maint: any) => {
    setSelectedMaint(maint);
    setMaintForm({
      fecha: new Date().toISOString().split('T')[0],
      fecha_proximo: '',
      taller: '',
      supplier: '',
      subtotal_mano_obra: '',
      subtotal_materiales: '',
      costo: '',
      numero_factura: '',
      fallo_observado: maint.fallo_observado || '',
      solucion_aplicada: maint.solucion_aplicada || '',
      notas: ''
    });
    setFacturaFile(null);
    setFacturaPreviewUrl(null);
  };

  const [matriculaForm, setMatriculaForm] = useState({
    fecha_pago: new Date().toISOString().split('T')[0],
    año_matriculado: new Date().getFullYear().toString(),
    costo: '',
    lugar_tramite: '',
    nueva_fecha_vencimiento: '',
    notas: ''
  });
  const [registeredSuppliers, setRegisteredSuppliers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchStats = async () => {
    try {
      const [statsRes, tripsRes, fuelRes, maintRes, suppRes] = await Promise.all([
        api.get('/vehicle-dashboard-stats/'),
        api.get('/vehicle-trips/'),
        api.get('/vehicle-fuel-logs/'),
        api.get('/vehicle-maintenance-records/'),
        api.get('/vehicle-suppliers/')
      ]);
      setStats(statsRes.data);
      setTrips(tripsRes.data || []);
      setFuelLogs(fuelRes.data || []);
      setMaintenanceRecords(maintRes.data || []);
      setRegisteredSuppliers(suppRes.data || []);
    } catch (error) {
      toast.error('Error al cargar métricas del dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useInventoryWebSocket(fetchStats);

  useEffect(() => {
    if (selectedMatricula && selectedMatricula.vencimiento) {
      try {
        const currentDate = new Date(selectedMatricula.vencimiento);
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        const nextYear = currentDate.toISOString().split('T')[0];
        setMatriculaForm(prev => ({
          ...prev,
          nueva_fecha_vencimiento: nextYear,
          año_matriculado: new Date().getFullYear().toString(),
          costo: '',
          notas: '',
          lugar_tramite: ''
        }));
      } catch (e) {
        // Fallback
      }
    }
  }, [selectedMatricula]);

  const handleUpdateMatricula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatricula) return;
    setSubmitting(true);
    try {
      await api.patch(`/vehicles/${selectedMatricula.vehicle_id}/`, {
        fecha_pago_matricula: matriculaForm.fecha_pago,
        año_matriculado: parseInt(matriculaForm.año_matriculado),
        costo_matricula: parseFloat(matriculaForm.costo || '0'),
        lugar_tramite_matricula: matriculaForm.lugar_tramite,
        fecha_vencimiento_matricula: matriculaForm.nueva_fecha_vencimiento,
        notas_matricula: matriculaForm.notas
      });

      toast.success('Renovación de matrícula registrada exitosamente');
      setSelectedMatricula(null);
      fetchStats();
    } catch (error) {
      toast.error('Error al registrar la renovación');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaint) return;
    setSubmitting(true);
    try {
      const postData = new FormData();
      postData.append('vehicle', (selectedMaint.vehicle_id || selectedMaint.vehicle)?.toString());
      if (selectedMaint.id) {
        postData.append('maintenance_rule', selectedMaint.id.toString());
      }
      postData.append('tipo_mantenimiento', selectedMaint.tipo_mantenimiento || 'Preventivo');
      postData.append('fecha', maintForm.fecha);
      postData.append('taller', maintForm.taller || 'Taller Interno');
      if (maintForm.supplier) postData.append('supplier', maintForm.supplier);

      const mo = parseFloat(maintForm.subtotal_mano_obra || '0');
      const mat = parseFloat(maintForm.subtotal_materiales || '0');
      const total = parseFloat(maintForm.costo || '0') || (mo + mat);

      postData.append('subtotal_mano_obra', mo.toString());
      postData.append('subtotal_materiales', mat.toString());
      postData.append('costo', total.toString());
      if (maintForm.numero_factura) postData.append('numero_factura', maintForm.numero_factura);
      if (maintForm.fallo_observado) postData.append('fallo_observado', maintForm.fallo_observado);
      if (maintForm.solucion_aplicada) postData.append('solucion_aplicada', maintForm.solucion_aplicada);
      if (maintForm.notas) postData.append('notas', maintForm.notas);
      if (facturaFile) {
        postData.append('factura_foto', facturaFile);
      }

      await api.post('/vehicle-maintenance-records/', postData);

      const ruleId = selectedMaint.public_id || selectedMaint.id;
      if (ruleId) {
        try {
          await api.patch(`/vehicle-maintenances/${ruleId}/`, {
            fecha_ultimo_cambio: maintForm.fecha,
            fecha_proximo_cambio: maintForm.fecha_proximo || null,
            km_ultimo_cambio: selectedMaint.odometro_actual || 0
          });
        } catch (e) {
          // Silencioso
        }
      }

      toast.success('Servicio de mantenimiento registrado correctamente');
      setSelectedMaint(null);
      fetchStats();
    } catch (error) {
      toast.error('Error al registrar el mantenimiento');
    } finally {
      setSubmitting(false);
    }
  };

  // CÁLCULOS DINÁMICOS PARA GRÁFICAS Y TABLAS

  // 1. Distribución de Estado de la Flota (Donut Chart)
  const pieFleetStatusData = useMemo(() => {
    if (!stats?.kpis) return [];
    return [
      { name: 'En Sindicato (Disponible)', value: stats.kpis.en_sindicato || 0, color: '#10b981' },
      { name: 'Fuera (En Ruta)', value: stats.kpis.en_ruta || 0, color: '#3b82f6' },
      { name: 'En Taller (Mantenimiento)', value: stats.kpis.en_taller || 0, color: '#f59e0b' }
    ].filter(i => i.value > 0);
  }, [stats]);

  // 2. Gastos Totales: Combustible vs Mantenimiento
  const pieExpensesData = useMemo(() => {
    const fuelTrips = trips.filter(t => t.estado_viaje === 'Finalizado').reduce((acc, t) => acc + parseFloat(t.costo_combustible_viaje || '0'), 0);
    const fuelLogsSum = fuelLogs.reduce((acc, f) => acc + parseFloat(f.costo_total?.toString() || '0'), 0);
    const totalFuel = fuelTrips + fuelLogsSum;
    const totalMaint = maintenanceRecords.reduce((acc, m) => acc + parseFloat(m.costo || '0'), 0);

    return [
      { name: 'Combustible', value: Math.round(totalFuel * 100) / 100, color: '#059669' },
      { name: 'Mantenimiento', value: Math.round(totalMaint * 100) / 100, color: '#d97706' }
    ].filter(i => i.value > 0);
  }, [trips, fuelLogs, maintenanceRecords]);

  // 3. Gastos por Vehículo ($) (Top 7)
  const barConsolidadoVehicles = useMemo(() => {
    const map: { [placa: string]: { placa: string; combustible: number; mantenimiento: number; total: number } } = {};

    trips.filter(t => t.estado_viaje === 'Finalizado').forEach(t => {
      const placa = t.vehicle_placa || 'Desconocido';
      if (!map[placa]) map[placa] = { placa, combustible: 0, mantenimiento: 0, total: 0 };
      const c = parseFloat(t.costo_combustible_viaje || '0');
      map[placa].combustible += c;
      map[placa].total += c;
    });

    fuelLogs.forEach(f => {
      const placa = f.vehicle_placa || 'Desconocido';
      if (!map[placa]) map[placa] = { placa, combustible: 0, mantenimiento: 0, total: 0 };
      const c = parseFloat(f.costo_total?.toString() || '0');
      map[placa].combustible += c;
      map[placa].total += c;
    });

    maintenanceRecords.forEach(m => {
      const placa = m.vehicle_placa || 'Desconocido';
      if (!map[placa]) map[placa] = { placa, combustible: 0, mantenimiento: 0, total: 0 };
      const c = parseFloat(m.costo || '0');
      map[placa].mantenimiento += c;
      map[placa].total += c;
    });

    return Object.values(map)
      .map(item => ({
        ...item,
        combustible: Math.round(item.combustible * 100) / 100,
        mantenimiento: Math.round(item.mantenimiento * 100) / 100,
        total: Math.round(item.total * 100) / 100
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [trips, fuelLogs, maintenanceRecords]);

  // 4. Ranking de Odómetro
  const topOdometerData = useMemo(() => {
    if (!stats?.odometer_data) return [];
    return stats.odometer_data.slice(0, 6);
  }, [stats]);

  // 5. Mantenimientos por Proveedor (Filtrados e interactivos con respaldo directo)
  const rawSupplierStats: SupplierMaintStat[] = useMemo(() => {
    if (stats?.supplier_maint_stats && Array.isArray(stats.supplier_maint_stats) && stats.supplier_maint_stats.length > 0) {
      return stats.supplier_maint_stats;
    }

    const map: { [key: string]: SupplierMaintStat } = {};
    const defaultYear = new Date().getFullYear();

    // Pre-poblar todos los proveedores registrados oficialmente
    (registeredSuppliers || []).forEach(s => {
      const provName = (s.name || '').trim();
      if (provName) {
        const key = `${defaultYear}-${provName}`;
        map[key] = {
          year: defaultYear,
          anio: defaultYear,
          año: defaultYear,
          proveedor: provName,
          supplier_id: s.id,
          supplier_public_id: s.public_id ? s.public_id.toString() : null,
          correctivos: 0,
          preventivos: 0,
          costo_correctivos: 0,
          costo_preventivos: 0,
          costo_total: 0,
          total_servicios: 0
        };
      }
    });

    (maintenanceRecords || []).forEach(rec => {
      let year = defaultYear;
      if (rec.fecha) {
        try {
          year = new Date(rec.fecha).getFullYear() || defaultYear;
        } catch (e) {
          // Fallback
        }
      }

      let matchedSup: any = null;

      if (rec.supplier) {
        if (typeof rec.supplier === 'object' && rec.supplier !== null) {
          const targetId = (rec.supplier as any).id || rec.supplier;
          matchedSup = registeredSuppliers.find(s => s.id === targetId || s.id?.toString() === targetId?.toString());
        } else if (typeof rec.supplier === 'number' || typeof rec.supplier === 'string') {
          matchedSup = registeredSuppliers.find(s => s.id === rec.supplier || s.id?.toString() === rec.supplier?.toString());
        }
      }

      const tallerText = (rec.taller || '').trim();
      if (!matchedSup && tallerText) {
        const tLower = tallerText.toLowerCase();
        matchedSup = registeredSuppliers.find(s => s.name && (s.name.toLowerCase().includes(tLower) || tLower.includes(s.name.toLowerCase())));
      }

      if (matchedSup) {
        const provName = matchedSup.name.trim();
        const key = `${year}-${provName}`;
        if (!map[key]) {
          map[key] = {
            year,
            anio: year,
            año: year,
            proveedor: provName,
            supplier_id: matchedSup.id,
            supplier_public_id: matchedSup.public_id ? matchedSup.public_id.toString() : null,
            correctivos: 0,
            preventivos: 0,
            costo_correctivos: 0,
            costo_preventivos: 0,
            costo_total: 0,
            total_servicios: 0
          };
        }

        const isCorrective = rec.tipo_mantenimiento === 'Correctivo' || (rec.actividad_nombre || '').toLowerCase().includes('correctivo');
        const cost = parseFloat(rec.costo?.toString() || '0');
        map[key].total_servicios += 1;
        map[key].costo_total += cost;
        if (isCorrective) {
          map[key].correctivos += 1;
          map[key].costo_correctivos += cost;
        } else {
          map[key].preventivos += 1;
          map[key].costo_preventivos += cost;
        }
      }
    });

    return Object.values(map).sort((a, b) => b.costo_total - a.costo_total);
  }, [stats, maintenanceRecords, registeredSuppliers]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    rawSupplierStats.forEach(st => {
      const yr = st.year ?? st.anio ?? st.año;
      if (yr) years.add(Number(yr));
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [rawSupplierStats]);

  const filteredSupplierStats = useMemo(() => {
    return rawSupplierStats.filter(st => {
      const provName = st.proveedor || st.taller || st.name || 'Taller Particular / Interno';
      const matchesSearch = !supplierSearch.trim() || provName.toLowerCase().includes(supplierSearch.trim().toLowerCase());
      const itemYr = (st.year ?? st.anio ?? st.año ?? '').toString();
      const matchesYear = yearFilter === 'todos' || !yearFilter || !itemYr || itemYr === yearFilter;
      return matchesSearch && matchesYear;
    });
  }, [rawSupplierStats, supplierSearch, yearFilter]);

  // Data para Gráfica de Barras de Proveedores (Preventivo vs Correctivo por Taller)
  const supplierChartData = useMemo(() => {
    const map: { [key: string]: { proveedor: string; preventivo: number; correctivo: number; total: number } } = {};
    filteredSupplierStats.forEach(st => {
      const prov = st.proveedor || st.taller || st.name || 'Taller Particular / Interno';
      if (!map[prov]) map[prov] = { proveedor: prov, preventivo: 0, correctivo: 0, total: 0 };
      map[prov].preventivo += st.costo_preventivos || 0;
      map[prov].correctivo += st.costo_correctivos || 0;
      map[prov].total += st.costo_total || ((st.costo_preventivos || 0) + (st.costo_correctivos || 0));
    });

    return Object.values(map)
      .map(item => ({
        ...item,
        preventivo: Math.round(item.preventivo * 100) / 100,
        correctivo: Math.round(item.correctivo * 100) / 100,
        total: Math.round(item.total * 100) / 100
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [filteredSupplierStats]);

  if (loading || !stats) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-emerald-500 border-t-transparent shadow-lg"></div>
        <p className="text-gray-500 font-semibold text-sm animate-pulse">Cargando métricas ejecutivas de la flota...</p>
      </div>
    );
  }

  const kpis = stats.kpis || {};
  const alerts = stats.alerts || {};

  // Cálculo dinámico de Inversión Financiera Total (Combustible + Mantenimiento)
  const computedFuelCost = trips.filter(t => t.estado_viaje === 'Finalizado').reduce((acc, t) => acc + parseFloat(t.costo_combustible_viaje || '0'), 0)
    + fuelLogs.reduce((acc, f) => acc + parseFloat(f.costo_total?.toString() || '0'), 0);
  const computedMaintCost = maintenanceRecords.reduce((acc, m) => acc + parseFloat(m.costo || '0'), 0);
  const computedGrandCost = Math.round((computedFuelCost + computedMaintCost) * 100) / 100;
  
  const grandCost = kpis.total_grand_cost || computedGrandCost;
  const totalKm = kpis.total_km_recorridos || (stats?.odometer_data || []).reduce((acc: number, v: any) => acc + (v.odometro || 0), 0) || 0;
  const computedCostoKm = kpis.costo_promedio_km || (totalKm > 0 ? (grandCost / totalKm).toFixed(2) : '0.00');

  return (
    <div className="p-4 sm:p-8 max-w-[1700px] mx-auto pb-32 relative bg-gray-50/50 min-h-screen">
      {/* Background Subtle Accent Pattern */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none rounded-3xl"></div>

      {/* HEADER PRINCIPAL Y ESTADO EN TIEMPO REAL */}
      <div className="relative z-10 mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/20">
              <Truck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Panel de Control Vehicular</h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  En Vivo
                </span>
              </div>
              <p className="text-gray-500 mt-1 text-sm font-medium">
                Monitoreo operativo de la flota, control financiero, proveedores de mantenimiento y cumplimiento legal.
              </p>
            </div>
          </div>
        </div>

        {/* Refresh & Direct Catalog Link */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold rounded-xl transition-all border border-gray-200"
            title="Recargar datos"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <Link
            to="/vehicles/catalog"
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
          >
            Ver Flota Completa
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* BARRA DE ACCIONES RÁPIDAS (QUICK ACTIONS) - ALINEADA 100% AL DISEÑO DEL SISTEMA */}
      <div className="relative z-10 mb-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Acciones Rápidas del Módulo</h2>
              <p className="text-xs text-gray-500 font-medium">Accesos directos para operarios y administradores</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/vehicles/trips')}
            className="group p-4 bg-gray-50/80 hover:bg-emerald-50/60 rounded-2xl border border-gray-200/80 hover:border-emerald-300 transition-all flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-105 transition-transform">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 group-hover:text-emerald-900">Registrar Salida / Llegada</p>
                <p className="text-[11px] text-gray-500 font-medium">Control de viajes y rutas</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => navigate('/vehicles/fuel-control')}
            className="group p-4 bg-gray-50/80 hover:bg-emerald-50/60 rounded-2xl border border-gray-200/80 hover:border-emerald-300 transition-all flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform">
                <Fuel className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 group-hover:text-emerald-900">Registrar Vale Combustible</p>
                <p className="text-[11px] text-gray-500 font-medium">Control de recargas y vales</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => navigate('/vehicles/maintenances')}
            className="group p-4 bg-gray-50/80 hover:bg-emerald-50/60 rounded-2xl border border-gray-200/80 hover:border-emerald-300 transition-all flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 group-hover:text-emerald-900">Registrar Mantenimiento</p>
                <p className="text-[11px] text-gray-500 font-medium">Servicios y talleres</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => navigate('/vehicles/matriculas')}
            className="group p-4 bg-gray-50/80 hover:bg-emerald-50/60 rounded-2xl border border-gray-200/80 hover:border-emerald-300 transition-all flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 group-hover:text-emerald-900">Renovar Matrícula</p>
                <p className="text-[11px] text-gray-500 font-medium">Control legal de unidades</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>

      {/* GRID DE KPIs EJECUTIVOS PRIMARIOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 relative z-10">
        {/* KPI 1: Estado de Flota */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Flota & Disponibilidad</p>
              <p className="text-3xl font-black text-gray-900 mt-1">{kpis.total || 0} <span className="text-sm font-semibold text-gray-400">vehículos</span></p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Truck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
              <span className="text-emerald-700">{kpis.en_sindicato || 0} Disponibles ({kpis.disponibilidad_pct || 0}%)</span>
              <span className="text-blue-600">{kpis.en_ruta || 0} En Ruta</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${kpis.disponibilidad_pct || 0}%` }}></div>
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${kpis.total ? ((kpis.en_ruta || 0) / kpis.total) * 100 : 0}%` }}></div>
              <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${kpis.total ? ((kpis.en_taller || 0) / kpis.total) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>

        {/* KPI 2: Inversión Financiera Total */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">Inversión Financiera Total</p>
              <p className="text-3xl font-black text-gray-900 mt-1">
                ${(grandCost || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform border border-emerald-100">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-500">Costo/KM Promedio:</span>
            <span className="font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              ${computedCostoKm || '0.00'} / KM
            </span>
          </div>
        </div>

        {/* KPI 3: Salud Mecánica & Servicios */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">Mantenimientos Urgentes</p>
              <p className="text-3xl font-black text-gray-900 mt-1">{kpis.mantenimientos_alertas || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Wrench className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-500">Gasto Preventivo:</span>
            <span className="font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
              ${(kpis.total_preventive_cost || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* KPI 4: Alertas Legal & Cumplimiento */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-extrabold text-rose-800 uppercase tracking-wider">Alertas Legales Totales</p>
              <p className="text-3xl font-black text-gray-900 mt-1">{kpis.total_alertas_unificadas || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Matrículas ({kpis.matriculas_alertas || 0})</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>Licencias ({kpis.licencias_alertas || 0})</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>Servicios ({kpis.mantenimientos_alertas || 0})</span>
          </div>
        </div>
      </div>

      {/* SISTEMA DE PESTAÑAS (TABS DE NAVEGACIÓN) */}
      <div className="relative z-10 mb-6 bg-white p-2 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('resumen')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'resumen'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <PieIcon className="w-4 h-4" />
          Resumen Ejecutivo
        </button>

        <button
          onClick={() => setActiveTab('mantenimiento')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'mantenimiento'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Proveedores & Mantenimientos
        </button>

        <button
          onClick={() => setActiveTab('combustible')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'combustible'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Fuel className="w-4 h-4" />
          Finanzas y Combustible
        </button>

        <button
          onClick={() => setActiveTab('alertas')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs transition-all ${
            activeTab === 'alertas'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Control Legal y Alertas ({kpis.total_alertas_unificadas || 0})
        </button>
      </div>

      {/* CONTENIDO DE PESTAÑAS */}

      {/* PESTAÑA 1: RESUMEN EJECUTIVO */}
      {activeTab === 'resumen' && (
        <div className="space-y-8 relative z-10 animate-fadeIn">
          {/* Fila 1: Gráficas de Pastel Donut y Consolidado de Gastos por Vehículo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Donut Chart: Distribución Operacional */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-emerald-600" />
                  Distribución de Flota
                </h2>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">Operativo</span>
              </div>

              <div className="h-[240px] w-full flex items-center justify-center">
                {pieFleetStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieFleetStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieFleetStatusData.map((entry, idx) => (
                          <Cell key={`cell-fleet-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-400 font-medium text-xs">Sin datos registrados</div>
                )}
              </div>
            </div>

            {/* Donut Chart: Combustible vs Mantenimiento */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                  Combustible vs Mantenimiento
                </h2>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg">Financiero</span>
              </div>

              <div className="h-[240px] w-full flex items-center justify-center">
                {pieExpensesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieExpensesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieExpensesData.map((entry, idx) => (
                          <Cell key={`cell-exp-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`$${parseFloat(val).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, 'Gasto Total']}
                        contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-400 font-medium text-xs">Sin datos financieros registrados</div>
                )}
              </div>
            </div>

            {/* Bar Chart: Gastos por Vehículo */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-blue-600" />
                  Top Gastos por Vehículo ($)
                </h2>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg">Consolidado</span>
              </div>

              <div className="h-[240px] w-full">
                {barConsolidadoVehicles.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barConsolidadoVehicles} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="placa" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} tickFormatter={val => `$${val}`} />
                      <Tooltip
                        cursor={{ fill: '#f0f9ff' }}
                        contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: any, name: any) => [`$${parseFloat(val || 0).toFixed(2)}`, name === 'combustible' ? 'Combustible' : 'Mantenimiento']}
                      />
                      <Bar dataKey="combustible" name="Combustible" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="mantenimiento" name="Mantenimiento" fill="#d97706" radius={[6, 6, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 font-medium text-xs">Sin datos para graficar</div>
                )}
              </div>
            </div>
          </div>

          {/* Fila 2: Salidas Activas en Ruta & Alertas de Mantenimiento Integradas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Salidas Activas en Ruta */}
            <div className="bg-white rounded-3xl shadow-xs border border-gray-100 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Navigation className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-gray-900">Vehículos Fuera del Sindicato (En Ruta)</h2>
                      <p className="text-xs text-gray-500 font-medium">Movimientos activos monitoreados</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
                    {stats.active_trips.length} En Curso
                  </span>
                </div>

                {stats.active_trips.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 font-medium text-sm flex flex-col items-center gap-2">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                    No hay vehículos fuera del sindicato en este momento.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.active_trips.map((trip: any) => (
                      <div key={trip.id} className="p-4 bg-blue-50/40 rounded-2xl flex items-center justify-between border border-blue-100/80 hover:border-blue-300 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 text-base">{trip.vehiculo}</span>
                            <span className="px-2.5 py-0.5 bg-blue-500 text-white rounded-lg text-[10px] font-extrabold animate-pulse">
                              En Ruta
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 font-bold mt-1">Conductor: {trip.conductor}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Destino / Motivo: {trip.destino || 'Sin especificar'}</p>
                        </div>

                        <Link
                          to="/vehicles/trips"
                          className="px-3 py-2 bg-white text-blue-600 border border-blue-200 text-xs font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-xs flex items-center gap-1"
                        >
                          Ver Detalle
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mantenimientos Próximos / Vencidos con Modal de Acción Rápida */}
            <div className="bg-white rounded-3xl shadow-xs border border-gray-100 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-gray-900">Alertas de Servicio Requerido</h2>
                      <p className="text-xs text-gray-500 font-medium">Preventivos y correctivos urgentes</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-bold border border-amber-200">
                    {alerts.mantenimientos?.length || 0} Pendientes
                  </span>
                </div>

                {!alerts.mantenimientos || alerts.mantenimientos.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 font-medium text-sm flex flex-col items-center gap-2">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                    Todos los servicios de mantenimiento están al día.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                    {alerts.mantenimientos.map((maint: any) => (
                      <div key={maint.id} className="p-4 bg-amber-50/40 rounded-2xl flex items-center justify-between border border-amber-100 hover:border-amber-300 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 text-sm">{maint.vehiculo}</span>
                            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${
                              maint.estado === 'CAMBIO URGENTE' || maint.estado === 'PENDIENTE URGENTE'
                                ? 'bg-rose-100 text-rose-700 border-rose-200'
                                : maint.estado === 'CAMBIO REQUERIDO'
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                            }`}>
                              {maint.estado}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 font-bold mt-1">{maint.actividad}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 font-semibold">
                            {maint.km_restantes < 0
                              ? `Excedido por ${Math.abs(maint.km_restantes)} KM`
                              : maint.km_restantes === 0
                              ? `Alcanzó el odómetro (0 KM restantes)`
                              : `Faltan ${maint.km_restantes} KM para el servicio`}
                          </p>
                        </div>

                        <button
                          onClick={() => setSelectedMaint(maint)}
                          className="px-3 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-colors shadow-xs"
                        >
                          Registrar Servicio
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: PROVEEDORES Y MANTENIMIENTOS (INTERACTIVA 100%) */}
      {activeTab === 'mantenimiento' && (
        <div className="space-y-8 relative z-10 animate-fadeIn">
          {/* Header de Sección e Interacciones de Filtro */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2.5">
                  <Building2 className="w-6 h-6 text-emerald-600" />
                  Mantenimientos por Proveedor y Taller
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Desglose interactivo de intervenciones técnicas, preventivos y correctivos por taller contratado.
                </p>
              </div>

              <Link
                to="/vehicles/suppliers"
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-all shadow-xs"
              >
                Catálogo de Proveedores
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>

            {/* BARRA INTERACTIVA DE BÚSQUEDA Y FILTROS POR AÑO */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar proveedor o taller mecánico..."
                  value={supplierSearch}
                  onChange={e => setSupplierSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                />
                {supplierSearch && (
                  <button onClick={() => setSupplierSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
                <select
                  value={yearFilter}
                  onChange={e => setYearFilter(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="todos">Todos los Años</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={yr.toString()}>Año {yr}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* GRÁFICA INTERACTIVA: COMPARATIVA DE GASTOS POR PROVEEDOR */}
            {supplierChartData.length > 0 && (
              <div className="mb-8 p-5 bg-gray-50/60 rounded-2xl border border-gray-200/80">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-emerald-600" />
                    Gastos Comparativos por Proveedor ($)
                  </h3>
                  <span className="text-[10px] font-bold text-gray-500">Preventivos vs Correctivos</span>
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={supplierChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="proveedor" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} tickFormatter={val => `$${val}`} />
                      <Tooltip
                        cursor={{ fill: '#f0f9ff' }}
                        contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: any, name: any) => [`$${parseFloat(val || 0).toFixed(2)}`, name === 'preventivo' ? 'Preventivo' : 'Correctivo']}
                      />
                      <Bar dataKey="preventivo" name="Preventivo" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="correctivo" name="Correctivo" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TARJETAS INTERACTIVAS DE PROVEEDORES */}
            {filteredSupplierStats.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSupplierStats.map((st, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-5 rounded-2xl border border-gray-200/80 hover:border-emerald-300 hover:shadow-md transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-black text-gray-900 text-sm block leading-tight group-hover:text-emerald-700 transition-colors">
                              {st.proveedor || 'Taller Particular / Interno'}
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium">Año {st.year ?? st.anio ?? st.año ?? ''}</span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                          ${(st.costo_total || (st.costo_preventivos + st.costo_correctivos)).toFixed(2)}
                        </span>
                      </div>

                      {/* Progreso de Mantenimiento */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                          <p className="text-[10px] font-bold text-emerald-800 uppercase">Preventivos ({st.preventivos})</p>
                          <p className="text-base font-black text-emerald-900 mt-0.5">${st.costo_preventivos.toFixed(2)}</p>
                        </div>
                        <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100">
                          <p className="text-[10px] font-bold text-rose-800 uppercase">Correctivos ({st.correctivos})</p>
                          <p className="text-base font-black text-rose-900 mt-0.5">${st.costo_correctivos.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] text-gray-500 font-semibold">{st.total_servicios || (st.preventivos + st.correctivos)} Servicios totales</span>
                      {(st.supplier_public_id || st.supplier_id) ? (
                        <Link
                          to={`/vehicles/suppliers/${st.supplier_public_id || st.supplier_id}`}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
                        >
                          Perfil Taller →
                        </Link>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Taller Particular</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 font-medium text-sm flex flex-col items-center gap-2">
                <Building2 className="w-8 h-8 text-gray-300" />
                No se encontraron proveedores que coincidan con la búsqueda.
              </div>
            )}
          </div>

          {/* Ranking de Odómetro / Kilometraje Acumulado de la Flota */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-blue-600" />
                  Top Vehículos por Kilometraje Acumulado (Odómetro)
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Ranking de exigencia operativa de las unidades de la flota</p>
              </div>
              <span className="text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-xl">Kilometraje Total</span>
            </div>

            <div className="h-[280px] w-full">
              {topOdometerData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topOdometerData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="placa" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 11, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} tickFormatter={val => `${val} KM`} />
                    <Tooltip
                      cursor={{ fill: '#f0f9ff' }}
                      contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: any) => [`${parseInt(val).toLocaleString('es-EC')} KM`, 'Odómetro Acumulado']}
                    />
                    <Bar dataKey="odometro" name="Odómetro (KM)" fill="#3b82f6" radius={[8, 8, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs">Sin datos de odómetro</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: FINANZAS Y COMBUSTIBLE */}
      {activeTab === 'combustible' && (
        <div className="space-y-8 relative z-10 animate-fadeIn">
          {/* Tarjetas Resumen de Combustible */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Fuel className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Gastado Combustible</p>
                <p className="text-2xl font-black text-gray-900 mt-0.5">
                  ${(kpis.total_fuel_cost || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-emerald-700 font-semibold mt-1">Vales + Viajes finalizados</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Gauge className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Galones Consumidos</p>
                <p className="text-2xl font-black text-gray-900 mt-0.5">
                  {(kpis.total_galones || 0).toLocaleString('es-EC')} <span className="text-sm font-bold text-gray-500">Gal.</span>
                </p>
                <p className="text-xs text-blue-600 font-semibold mt-1">Recargas consolidadas</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Wrench className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Gastado Mantenimiento</p>
                <p className="text-2xl font-black text-gray-900 mt-0.5">
                  ${(kpis.total_maint_cost || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-amber-700 font-semibold mt-1">Talleres y repuestos</p>
              </div>
            </div>
          </div>

          {/* CONTROL Y EDICIÓN DE PRECIOS VIGENTES DE COMBUSTIBLE */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden border border-emerald-800">
            <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
              <Fuel className="w-64 h-64 text-white" />
            </div>
            
            <div className="relative z-10 space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Tarifa Vigente Oficial
                </span>
                <span className="text-xs text-emerald-200/80 font-medium">Aplica para nuevos vales y viajes</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white pt-1">Precios Oficiales de Combustible por Galón</h2>
              <p className="text-xs text-emerald-100/80 leading-relaxed font-medium">
                Edita los precios oficiales de gasolina y diésel desde este panel. Los registros históricos creados previamente conservarán su precio original guardado.
              </p>

              {/* Badges de Precios Activos */}
              <div className="flex flex-wrap items-center gap-4 pt-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
                  <span className="text-base">⛽</span>
                  <div>
                    <p className="text-[10px] uppercase font-extrabold text-emerald-200">Gasolina (Extra / Súper)</p>
                    <p className="text-lg font-black text-white">${(stats?.fuel_prices?.precio_gasolina || 2.40).toFixed(2)} <span className="text-xs font-semibold text-emerald-200">/ Galón</span></p>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
                  <span className="text-base">🚛</span>
                  <div>
                    <p className="text-[10px] uppercase font-extrabold text-teal-200">Diésel</p>
                    <p className="text-lg font-black text-white">${(stats?.fuel_prices?.precio_diesel || 1.75).toFixed(2)} <span className="text-xs font-semibold text-teal-200">/ Galón</span></p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleOpenFuelPriceModal}
              className="relative z-10 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-xs rounded-2xl transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2.5 shrink-0 group cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-gray-950 group-hover:rotate-12 transition-transform" />
              Actualizar Precios Vigentes
            </button>
          </div>

          {/* Tabla / Ranking de Gastos en Combustible por Vehículo */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Fuel className="w-5 h-5 text-emerald-600" />
                  Desglose de Combustible por Vehículo
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Consumo acumulado y monto gastado</p>
              </div>
              <Link
                to="/vehicles/fuel-control"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200"
              >
                Ir a Control de Combustible →
              </Link>
            </div>

            {stats.fuel_expenses && stats.fuel_expenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                      <th className="pb-3">Vehículo (Placa)</th>
                      <th className="pb-3">Marca / Modelo</th>
                      <th className="pb-3 text-right">Inversión Combustible ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {stats.fuel_expenses.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 font-black text-gray-900">{item.placa}</td>
                        <td className="py-3 text-gray-600 font-medium">{item.marca} {item.modelo}</td>
                        <td className="py-3 text-right font-black text-emerald-700">
                          ${item.costo_total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400 text-xs">Sin registros de gasto en combustible.</div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 4: CONTROL LEGAL Y ALERTAS */}
      {activeTab === 'alertas' && (
        <div className="space-y-8 relative z-10 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Alertas de Matrículas */}
            <div className="bg-white rounded-3xl shadow-xs border border-gray-100 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">Alertas de Matrícula Vehicular</h2>
                    <p className="text-xs text-gray-500 font-medium">Matrículas vencidas o próximas a caducar</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-200">
                  {alerts.matriculas?.length || 0} Alertas
                </span>
              </div>

              {!alerts.matriculas || alerts.matriculas.length === 0 ? (
                <div className="py-12 text-center text-gray-400 font-medium text-sm flex flex-col items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                  Todas las matrículas de la flota están al día.
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.matriculas.map((mat: any) => (
                    <div key={mat.vehicle_id} className="p-4 bg-rose-50/40 rounded-2xl flex items-center justify-between border border-rose-100 hover:border-rose-300 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900 text-sm">{mat.vehiculo}</span>
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                            mat.estado === 'MATRÍCULA VENCIDA' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {mat.estado}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Vencimiento: {mat.vencimiento || 'No registrada'}</p>
                        <p className="text-[11px] text-rose-700 font-bold mt-0.5">
                          {mat.dias < 0 ? `Vencida hace ${Math.abs(mat.dias)} días` : `Vence en ${mat.dias} días`}
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedMatricula(mat)}
                        className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-xs"
                      >
                        Renovar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alertas de Licencias de Conducir */}
            <div className="bg-white rounded-3xl shadow-xs border border-gray-100 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">Alertas de Licencias de Choferes</h2>
                    <p className="text-xs text-gray-500 font-medium">Vigencia de documentos de conductores</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold border border-purple-200">
                  {alerts.licencias?.length || 0} Alertas
                </span>
              </div>

              {!alerts.licencias || alerts.licencias.length === 0 ? (
                <div className="py-12 text-center text-gray-400 font-medium text-sm flex flex-col items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                  Todas las licencias de conducir están vigentes.
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.licencias.map((lic: any) => (
                    <div key={lic.id} className="p-4 bg-purple-50/40 rounded-2xl flex items-center justify-between border border-purple-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900 text-sm">{lic.conductor}</span>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-lg text-[10px] font-black">
                            {lic.tipo}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Vencimiento: {lic.vencimiento}</p>
                        <p className="text-[11px] text-purple-700 font-bold mt-0.5">
                          {lic.dias < 0 ? `Caducada hace ${Math.abs(lic.dias)} días` : `Caduca en ${lic.dias} días`}
                        </p>
                      </div>

                      <Link
                        to={`/vehicles/drivers/${lic.id}`}
                        className="px-3 py-2 bg-white text-purple-700 border border-purple-200 text-xs font-bold rounded-xl hover:bg-purple-50 transition-colors shadow-xs"
                      >
                        Ver Chofer
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alertas de Servicio Requerido (Mantenimientos) */}
            <div className="bg-white rounded-3xl shadow-xs border border-gray-100 p-6 sm:p-8 lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">Alertas de Servicio Requerido (Mantenimientos)</h2>
                    <p className="text-xs text-gray-500 font-medium">Servicios preventivos y correctivos vencidos o con odómetro alcanzado</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-200">
                  {alerts.mantenimientos?.length || 0} Alertas
                </span>
              </div>

              {!alerts.mantenimientos || alerts.mantenimientos.length === 0 ? (
                <div className="py-12 text-center text-gray-400 font-medium text-sm flex flex-col items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                  Todos los mantenimientos preventivos y correctivos de la flota están al día.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alerts.mantenimientos.map((m: any) => (
                    <div key={m.id} className="p-4 bg-amber-50/40 rounded-2xl flex items-center justify-between border border-amber-100 hover:border-amber-300 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900 text-sm">{m.vehiculo}</span>
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${
                            m.estado === 'CAMBIO URGENTE' || m.estado === 'PENDIENTE URGENTE'
                              ? 'bg-rose-100 text-rose-700 border-rose-200'
                              : m.estado === 'CAMBIO REQUERIDO'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}>
                            {m.estado}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-700 mt-1">{m.actividad}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 font-semibold">
                          {m.km_restantes < 0
                            ? `Excedido por ${Math.abs(m.km_restantes)} KM`
                            : m.km_restantes === 0
                            ? `Alcanzó el odómetro (0 KM restantes)`
                            : `Faltan ${m.km_restantes} KM para el servicio`}
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedMaint(m)}
                        className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-xs"
                      >
                        Registrar Servicio
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR RENOVACIÓN DE MATRÍCULA */}
      {selectedMatricula && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-black text-gray-900">Renovar Matrícula: {selectedMatricula.vehiculo}</h3>
                <p className="text-xs text-gray-500">Registro oficial de matrícula anual</p>
              </div>
              <button onClick={() => setSelectedMatricula(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateMatricula} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Fecha de Pago</label>
                <input
                  type="date"
                  required
                  value={matriculaForm.fecha_pago}
                  onChange={e => setMatriculaForm({ ...matriculaForm, fecha_pago: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Año Matriculado</label>
                <input
                  type="number"
                  required
                  value={matriculaForm.año_matriculado}
                  onChange={e => setMatriculaForm({ ...matriculaForm, año_matriculado: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Costo ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={matriculaForm.costo}
                  onChange={e => setMatriculaForm({ ...matriculaForm, costo: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Lugar de Trámite</label>
                <input
                  type="text"
                  placeholder="Ej. ANT / Agencia GAD Municipal"
                  value={matriculaForm.lugar_tramite}
                  onChange={e => setMatriculaForm({ ...matriculaForm, lugar_tramite: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nueva Fecha Vencimiento</label>
                <input
                  type="date"
                  required
                  value={matriculaForm.nueva_fecha_vencimiento}
                  onChange={e => setMatriculaForm({ ...matriculaForm, nueva_fecha_vencimiento: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Notas / Observaciones</label>
                <textarea
                  rows={2}
                  value={matriculaForm.notas}
                  onChange={e => setMatriculaForm({ ...matriculaForm, notas: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedMatricula(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 text-sm shadow-md"
                >
                  {submitting ? 'Guardando...' : 'Guardar Renovación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL COMPLETO REGISTRAR SERVICIO REALIZADO (OFICIAL) */}
      {selectedMaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100">
            {/* Header Verde Gradiente Oficial */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl shadow-sm">
                  <PenTool className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">Registrar Servicio Realizado</h2>
                  <p className="text-xs font-semibold text-emerald-200">{selectedMaint.actividad || 'Mantenimiento Vehicular'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMaint(null)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleUpdateMaintenance} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="bg-emerald-50 text-emerald-900 p-4 rounded-2xl text-xs font-semibold border border-emerald-200 flex gap-3 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-emerald-600 shrink-0" />
                <p>Al confirmar, el odómetro actual (<b>{selectedMaint.odometro_actual || 0} km</b>) del vehículo <b>{selectedMaint.vehiculo}</b> se actualizará como el nuevo kilometraje de cambio.</p>
              </div>

              {/* Taller / Proveedor Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Store className="w-4 h-4 text-emerald-600" /> Proveedor / Taller *
                </label>
                <select
                  value={maintForm.supplier}
                  onChange={e => {
                    const suppId = e.target.value;
                    const found = registeredSuppliers.find(s => s.id?.toString() === suppId);
                    setMaintForm(prev => ({
                      ...prev,
                      supplier: suppId,
                      taller: found ? found.name : prev.taller
                    }));
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                >
                  <option value="">Seleccione o ingrese proveedor...</option>
                  {registeredSuppliers.map(s => (
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
                  value={maintForm.taller}
                  onChange={e => setMaintForm({ ...maintForm, taller: e.target.value })}
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
                      value={maintForm.subtotal_mano_obra}
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
                      value={maintForm.subtotal_materiales}
                      onChange={e => handleMaterialesChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-xs font-black text-gray-700 uppercase">Total Facturado (Subtotal 3):</span>
                  <span className="text-xl font-black text-emerald-600">${maintForm.costo || '0.00'}</span>
                </div>
              </div>

              {/* Número de Factura */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">N.º Factura</label>
                <input
                  type="text"
                  placeholder="Ej. FAC-00123"
                  value={maintForm.numero_factura}
                  onChange={e => setMaintForm({ ...maintForm, numero_factura: e.target.value })}
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
                  value={maintForm.notas}
                  onChange={e => setMaintForm({ ...maintForm, notas: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedMaint(null)}
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

      {/* MODAL CONFIGURAR PRECIOS DE COMBUSTIBLE */}
      {isFuelPriceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl shadow-sm">
                  <Fuel className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">Actualizar Precios de Combustible</h2>
                  <p className="text-xs text-emerald-200">Definir precio por galón oficial</p>
                </div>
              </div>
              <button onClick={() => setIsFuelPriceModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveFuelPrices} className="p-6 space-y-4">
              <div className="bg-amber-50 text-amber-900 p-4 rounded-2xl text-xs font-semibold border border-amber-200 flex gap-3 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <p><b>Nota de Control Financiero:</b> Los nuevos precios se aplicarán únicamente a las futuras recargas de vales y cálculos de viajes. Los registros creados anteriormente conservarán su costo histórico.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  ⛽ Precio Gasolina (Extra/Súper) por Galón ($)
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="2.40"
                  value={fuelPricesForm.precio_gasolina}
                  onChange={e => setFuelPricesForm({ ...fuelPricesForm, precio_gasolina: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  🚛 Precio Diésel por Galón ($)
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="1.75"
                  value={fuelPricesForm.precio_diesel}
                  onChange={e => setFuelPricesForm({ ...fuelPricesForm, precio_diesel: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-gray-900"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFuelPriceModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-xs disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Nuevos Precios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesDashboard;
