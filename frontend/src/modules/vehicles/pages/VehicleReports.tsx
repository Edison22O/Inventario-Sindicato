import { useState, useEffect, useMemo } from 'react';
import { FileBarChart, Download, Calendar, Truck, TrendingUp, Filter, User, Wrench, DollarSign, Layers, PieChart as PieIcon, BarChart2 } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import jsPDF from 'jspdf';
import { applyAutoTable } from '@/shared/utils/pdfHelper';

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
  responsable?: string;
  concepto?: string;
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

type TimeFilter = 'hoy' | 'semana' | 'mes' | 'año' | 'todo' | 'custom';
type ReportCategory = 'todos' | 'combustible' | 'mantenimiento';

const VehicleReports = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Categoría de Reporte
  const [reportCategory, setReportCategory] = useState<ReportCategory>('todos');

  // Filtros de estado
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('mes');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedConductor, setSelectedConductor] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedActividad, setSelectedActividad] = useState('');
  const [selectedTipoMantenimiento, setSelectedTipoMantenimiento] = useState<'todos' | 'Preventivo' | 'Correctivo'>('todos');

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      const [tripsRes, fuelRes, maintRes] = await Promise.all([
        api.get('/vehicle-trips/'),
        api.get('/vehicle-fuel-logs/'),
        api.get('/vehicle-maintenance-records/')
      ]);
      setTrips(tripsRes.data || []);
      setFuelLogs(fuelRes.data || []);
      setMaintenanceRecords(maintRes.data || []);
    } catch (error) {
      toast.error('Error al cargar datos de reportes');
    } finally {
      setLoading(false);
    }
  };

  const uniqueConductors = Array.from(new Set(trips.map(t => t.conductor_name))).filter(Boolean).sort();
  const uniqueVehicles = Array.from(
    new Set([
      ...trips.map(t => t.vehicle_placa),
      ...fuelLogs.map(f => f.vehicle_placa || ''),
      ...maintenanceRecords.map(m => m.vehicle_placa)
    ])
  ).filter(Boolean).sort();

  const uniqueActividades = Array.from(
    new Set(maintenanceRecords.map(m => m.actividad_nombre))
  ).filter(Boolean).sort();

  const getISODate = (d: Date) => {
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  };

  const dateRange = useMemo(() => {
    const today = new Date();
    
    if (timeFilter === 'hoy') {
      return { start: getISODate(today), end: getISODate(today) };
    } else if (timeFilter === 'semana') {
      const first = new Date(today);
      first.setDate(first.getDate() - first.getDay() + (first.getDay() === 0 ? -6 : 1));
      const last = new Date(first);
      last.setDate(last.getDate() + 6);
      return { start: getISODate(first), end: getISODate(last) };
    } else if (timeFilter === 'mes') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: getISODate(first), end: getISODate(last) };
    } else if (timeFilter === 'año') {
      const first = new Date(today.getFullYear(), 0, 1);
      const last = new Date(today.getFullYear(), 11, 31);
      return { start: getISODate(first), end: getISODate(last) };
    } else if (timeFilter === 'custom') {
      return { start: startDate, end: endDate };
    }
    return { start: '', end: '' };
  }, [timeFilter, startDate, endDate]);

  // Datos filtrados de viajes (Combustible)
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      if (trip.estado_viaje !== 'Finalizado' || !trip.fecha_hora_llegada) return false;
      const tripDateStr = trip.fecha_hora_llegada.substring(0, 10);
      
      if (selectedConductor && trip.conductor_name !== selectedConductor) return false;
      if (selectedVehicle && trip.vehicle_placa !== selectedVehicle) return false;
      if (dateRange.start && tripDateStr < dateRange.start) return false;
      if (dateRange.end && tripDateStr > dateRange.end) return false;
      
      return true;
    });
  }, [trips, dateRange, selectedConductor, selectedVehicle]);

  // Datos filtrados de vales de combustible
  const filteredFuelLogs = useMemo(() => {
    return fuelLogs.filter(log => {
      if (!log.fecha_vale) return false;
      const logDateStr = log.fecha_vale;
      if (selectedVehicle && log.vehicle_placa !== selectedVehicle) return false;
      if (dateRange.start && logDateStr < dateRange.start) return false;
      if (dateRange.end && logDateStr > dateRange.end) return false;
      return true;
    });
  }, [fuelLogs, dateRange, selectedVehicle]);

  // Datos filtrados de mantenimientos
  const filteredMaintenances = useMemo(() => {
    return maintenanceRecords.filter(record => {
      if (!record.fecha) return false;
      const dateStr = record.fecha;
      
      if (selectedVehicle && record.vehicle_placa !== selectedVehicle) return false;
      if (selectedActividad && record.actividad_nombre !== selectedActividad) return false;
      if (selectedTipoMantenimiento !== 'todos') {
        const type = record.tipo_mantenimiento || (record.actividad_nombre?.toLowerCase().includes('correctivo') ? 'Correctivo' : 'Preventivo');
        if (type !== selectedTipoMantenimiento) return false;
      }
      if (dateRange.start && dateStr < dateRange.start) return false;
      if (dateRange.end && dateStr > dateRange.end) return false;
      
      return true;
    });
  }, [maintenanceRecords, dateRange, selectedVehicle, selectedActividad, selectedTipoMantenimiento]);

  // Totales de Combustible (Viajes + Vales)
  const totalCostoCombustibleTrips = filteredTrips.reduce((acc, t) => acc + parseFloat(t.costo_combustible_viaje || '0'), 0);
  const totalCostoFuelLogs = filteredFuelLogs.reduce((acc, l) => acc + parseFloat(l.costo_total?.toString() || '0'), 0);
  const totalCostoCombustible = totalCostoCombustibleTrips + totalCostoFuelLogs;
  const totalKm = filteredTrips.reduce((acc, t) => acc + (t.km_recorridos || 0), 0);

  const totalCostoMantenimiento = filteredMaintenances.reduce((acc, m) => acc + parseFloat(m.costo || '0'), 0);
  const totalCostoGeneral = totalCostoCombustible + totalCostoMantenimiento;

  // TAB TODOS (Consolidado)
  const pieConsolidadoData = useMemo(() => {
    return [
      { name: 'Combustible', value: Math.round(totalCostoCombustible * 100) / 100, color: '#059669' },
      { name: 'Mantenimientos', value: Math.round(totalCostoMantenimiento * 100) / 100, color: '#d97706' }
    ].filter(item => item.value > 0);
  }, [totalCostoCombustible, totalCostoMantenimiento]);

  const barConsolidadoVehicles = useMemo(() => {
    const map: { [placa: string]: { placa: string; combustible: number; mantenimiento: number; total: number } } = {};

    filteredTrips.forEach(t => {
      const placa = t.vehicle_placa || 'Desconocido';
      if (!map[placa]) map[placa] = { placa, combustible: 0, mantenimiento: 0, total: 0 };
      const c = parseFloat(t.costo_combustible_viaje || '0');
      map[placa].combustible += c;
      map[placa].total += c;
    });

    filteredFuelLogs.forEach(f => {
      const placa = f.vehicle_placa || 'Desconocido';
      if (!map[placa]) map[placa] = { placa, combustible: 0, mantenimiento: 0, total: 0 };
      const c = parseFloat(f.costo_total?.toString() || '0');
      map[placa].combustible += c;
      map[placa].total += c;
    });

    filteredMaintenances.forEach(m => {
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
        total: Math.round(item.total * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filteredTrips, filteredFuelLogs, filteredMaintenances]);

  // TAB COMBUSTIBLE
  const pieFuelTypeData = useMemo(() => {
    let extraCost = 0;
    let dieselCost = 0;

    filteredFuelLogs.forEach(f => {
      const cost = parseFloat(f.costo_total?.toString() || '0');
      if (f.tipo_combustible === 'DIESEL') dieselCost += cost;
      else extraCost += cost;
    });

    filteredTrips.forEach(t => {
      extraCost += parseFloat(t.costo_combustible_viaje || '0');
    });

    return [
      { name: 'Gasolina Extra', value: Math.round(extraCost * 100) / 100, color: '#059669' },
      { name: 'Diésel', value: Math.round(dieselCost * 100) / 100, color: '#d97706' }
    ].filter(item => item.value > 0);
  }, [filteredFuelLogs, filteredTrips]);

  const barFuelByVehicle = useMemo(() => {
    const map: { [placa: string]: { placa: string; costo: number; km: number } } = {};

    filteredTrips.forEach(t => {
      const placa = t.vehicle_placa || 'Desconocido';
      if (!map[placa]) map[placa] = { placa, costo: 0, km: 0 };
      map[placa].costo += parseFloat(t.costo_combustible_viaje || '0');
      map[placa].km += t.km_recorridos || 0;
    });

    filteredFuelLogs.forEach(f => {
      const placa = f.vehicle_placa || 'Desconocido';
      if (!map[placa]) map[placa] = { placa, costo: 0, km: 0 };
      map[placa].costo += parseFloat(f.costo_total?.toString() || '0');
    });

    return Object.values(map)
      .map(item => ({
        ...item,
        costo: Math.round(item.costo * 100) / 100
      }))
      .sort((a, b) => b.costo - a.costo)
      .slice(0, 8);
  }, [filteredTrips, filteredFuelLogs]);

  // TAB MANTENIMIENTOS
  const pieMaintTypeData = useMemo(() => {
    let preventivoCost = 0;
    let correctivoCost = 0;

    filteredMaintenances.forEach(m => {
      const isCorrective = m.tipo_mantenimiento === 'Correctivo' || m.actividad_nombre?.toLowerCase().includes('correctivo');
      const cost = parseFloat(m.costo || '0');
      if (isCorrective) correctivoCost += cost;
      else preventivoCost += cost;
    });

    return [
      { name: 'Mantenimiento Preventivo', value: Math.round(preventivoCost * 100) / 100, color: '#059669' },
      { name: 'Mantenimiento Correctivo', value: Math.round(correctivoCost * 100) / 100, color: '#e11d48' }
    ].filter(item => item.value > 0);
  }, [filteredMaintenances]);

  const barMaintByActivity = useMemo(() => {
    const map: { [actividad: string]: { actividad: string; costo: number; servicios: number } } = {};

    filteredMaintenances.forEach(m => {
      const act = m.actividad_nombre || 'Servicio General';
      if (!map[act]) map[act] = { actividad: act, costo: 0, servicios: 0 };
      map[act].costo += parseFloat(m.costo || '0');
      map[act].servicios += 1;
    });

    return Object.values(map)
      .map(item => ({
        ...item,
        costo: Math.round(item.costo * 100) / 100
      }))
      .sort((a, b) => b.costo - a.costo)
      .slice(0, 6);
  }, [filteredMaintenances]);

  const getFilterText = () => {
    const timeText = timeFilter === 'hoy' ? 'Hoy' 
                   : timeFilter === 'semana' ? 'Esta Semana'
                   : timeFilter === 'mes' ? 'Este Mes'
                   : timeFilter === 'año' ? 'Este Año'
                   : timeFilter === 'custom' ? `Desde ${startDate} hasta ${endDate}`
                   : 'Todo el Histórico';
    
    return `Período: ${timeText} | Vehículo: ${selectedVehicle || 'Todos'} | Conductor: ${selectedConductor || 'Todos'} | Tipo: ${selectedTipoMantenimiento === 'todos' ? 'Todos' : selectedTipoMantenimiento} | Actividad: ${selectedActividad || 'Todas'}`;
  };

  // Exportar PDF limpio (Tablas de datos puras sin gráficas en el PDF)
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129);
    
    const categoryTitle = reportCategory === 'combustible' ? 'Reporte de Consumo de Combustible'
                        : reportCategory === 'mantenimiento' ? 'Reporte de Mantenimientos Vehiculares'
                        : 'Reporte Consolidado Vehicular (Combustible y Mantenimientos)';
    
    doc.text(categoryTitle, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(getFilterText(), 14, 28);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-EC')}`, 14, 34);

    let currentY = 42;

    // Si incluye Combustible
    if (reportCategory === 'todos' || reportCategory === 'combustible') {
      doc.setFontSize(14);
      doc.setTextColor(6, 78, 59);
      doc.text('1. Consumo de Combustible y Salidas', 14, currentY);
      currentY += 6;

      const fuelTableBody: any[] = filteredTrips.map(t => [
        t.fecha_hora_llegada ? t.fecha_hora_llegada.substring(0, 10) : '-',
        t.vehicle_placa,
        t.conductor_name,
        `${t.km_recorridos} km`,
        `${parseFloat(t.galones_recargados || '0').toFixed(2)} gal`,
        `$${parseFloat(t.costo_combustible_viaje || '0').toLocaleString('es-EC', { minimumFractionDigits: 2 })}`
      ]);

      fuelTableBody.push([
        { content: 'SUBTOTAL COMBUSTIBLE', colSpan: 3, styles: { fillColor: [240, 253, 244], textColor: [6, 78, 59], fontStyle: 'bold', halign: 'right' } },
        { content: `${totalKm} km`, styles: { fillColor: [240, 253, 244], textColor: [6, 78, 59], fontStyle: 'bold' } },
        { content: '-', styles: { fillColor: [240, 253, 244], textColor: [6, 78, 59], fontStyle: 'bold' } },
        { content: `$${totalCostoCombustible.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, styles: { fillColor: [240, 253, 244], textColor: [6, 78, 59], fontStyle: 'bold' } }
      ]);

      applyAutoTable(doc, {
        startY: currentY,
        head: [['Fecha', 'Placa', 'Conductor', 'KM Recorridos', 'Recarga', 'Costo Combustible']],
        body: fuelTableBody,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] },
        styles: { fontSize: 9 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // Si incluye Mantenimiento
    if (reportCategory === 'todos' || reportCategory === 'mantenimiento') {
      if (currentY > 160 && reportCategory === 'todos') {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(6, 78, 59);
      doc.text(reportCategory === 'todos' ? '2. Mantenimientos y Servicios Realizados' : 'Mantenimientos y Servicios Realizados', 14, currentY);
      currentY += 6;

      const maintTableBody: any[] = filteredMaintenances.map(m => {
        const type = m.tipo_mantenimiento || (m.actividad_nombre?.toLowerCase().includes('correctivo') ? 'Correctivo' : 'Preventivo');
        return [
          m.fecha,
          m.vehicle_placa,
          type,
          m.actividad_nombre,
          m.taller,
          m.notas || 'Sin observaciones',
          `$${parseFloat(m.costo || '0').toLocaleString('es-EC', { minimumFractionDigits: 2 })}`
        ];
      });

      maintTableBody.push([
        { content: 'SUBTOTAL MANTENIMIENTOS', colSpan: 6, styles: { fillColor: [254, 243, 199], textColor: [146, 64, 14], fontStyle: 'bold', halign: 'right' } },
        { content: `$${totalCostoMantenimiento.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, styles: { fillColor: [254, 243, 199], textColor: [146, 64, 14], fontStyle: 'bold' } }
      ]);

      applyAutoTable(doc, {
        startY: currentY,
        head: [['Fecha', 'Placa', 'Tipo', 'Actividad / Servicio', 'Taller / Proveedor', 'Notas / Detalles', 'Costo Total']],
        body: maintTableBody,
        theme: 'grid',
        headStyles: { fillColor: [217, 119, 6] },
        styles: { fontSize: 9 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // Gran Total para Consolidado
    if (reportCategory === 'todos') {
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`GASTO TOTAL CONSOLIDADO DEL PERÍODO: $${totalCostoGeneral.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, 14, currentY);
    }

    doc.save(`Reporte_Vehicular_${reportCategory}_${new Date().getTime()}.pdf`);
    toast.success('Reporte PDF exportado exitosamente');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const timeFilters: { value: TimeFilter, label: string }[] = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Esta Semana' },
    { value: 'mes', label: 'Este Mes' },
    { value: 'año', label: 'Este Año' },
    { value: 'todo', label: 'Todo' },
    { value: 'custom', label: 'Personalizado' },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto pb-32 relative">
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none rounded-3xl mix-blend-multiply"></div>
      
      {/* Encabezado */}
      <div className="relative z-10 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <FileBarChart className="w-6 h-6 text-emerald-600" />
            </div>
            Reportes y Consolidado Vehicular
          </h1>
          <p className="text-gray-500 mt-2 text-base font-medium">Análisis dinámico de consumo de combustible y mantenimientos con gráficas interactiva en pantalla.</p>
        </div>
        <button 
          onClick={handleExportPDF}
          disabled={filteredTrips.length === 0 && filteredMaintenances.length === 0 && filteredFuelLogs.length === 0}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 w-full md:w-auto"
        >
          <Download className="w-5 h-5" />
          Exportar PDF
        </button>
      </div>

      {/* Tabs de Selección de Tipo de Reporte */}
      <div className="relative z-10 flex flex-wrap gap-3 mb-6 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
        <button
          onClick={() => setReportCategory('todos')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            reportCategory === 'todos'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          Reporte Consolidado (Todos)
        </button>
        <button
          onClick={() => setReportCategory('combustible')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            reportCategory === 'combustible'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Solo Combustible y Viajes
        </button>
        <button
          onClick={() => setReportCategory('mantenimiento')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            reportCategory === 'mantenimiento'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Solo Mantenimientos
        </button>
      </div>

      {/* Panel de Filtros */}
      <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8 space-y-6">
        <div className="flex items-center gap-2 text-gray-900 font-bold border-b border-gray-100 pb-3">
          <Filter className="w-5 h-5 text-emerald-600" />
          Filtros de Búsqueda
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Vehículo */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Truck className="w-4 h-4" /> Vehículo
            </label>
            <select
              value={selectedVehicle}
              onChange={e => setSelectedVehicle(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
            >
              <option value="">Todos los vehículos</option>
              {uniqueVehicles.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Conductor (para Combustible) */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <User className="w-4 h-4" /> Conductor
            </label>
            <select
              value={selectedConductor}
              onChange={e => setSelectedConductor(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
            >
              <option value="">Todos los conductores</option>
              {uniqueConductors.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Tipo de Mantenimiento */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Wrench className="w-4 h-4 text-emerald-600" /> Tipo Mantenimiento
            </label>
            <select
              value={selectedTipoMantenimiento}
              onChange={e => setSelectedTipoMantenimiento(e.target.value as 'todos' | 'Preventivo' | 'Correctivo')}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
            >
              <option value="todos">Todos los tipos</option>
              <option value="Preventivo">Preventivo</option>
              <option value="Correctivo">Correctivo</option>
            </select>
          </div>

          {/* Actividad de Mantenimiento */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Wrench className="w-4 h-4 text-amber-600" /> Actividad Mantenimiento
            </label>
            <select
              value={selectedActividad}
              onChange={e => setSelectedActividad(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 text-sm font-medium"
            >
              <option value="">Todas las actividades</option>
              {uniqueActividades.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          {/* Filtro Rápido de Tiempo */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Período
            </label>
            <select
              value={timeFilter}
              onChange={e => setTimeFilter(e.target.value as TimeFilter)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
            >
              {timeFilters.map(filter => (
                <option key={filter.value} value={filter.value}>{filter.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Período Personalizado */}
        {timeFilter === 'custom' && (
          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 mb-1">Fecha Desde</label>
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 mb-1">Fecha Hasta</label>
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tarjetas de Totales */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {(reportCategory === 'todos' || reportCategory === 'combustible') && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 z-10">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div className="z-10">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Combustible Total</p>
              <p className="text-2xl font-black text-gray-900">${totalCostoCombustible.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{totalKm.toLocaleString('es-EC')} KM Recorridos</p>
            </div>
          </div>
        )}

        {(reportCategory === 'todos' || reportCategory === 'mantenimiento') && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-100 flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 z-10">
              <Wrench className="w-7 h-7" />
            </div>
            <div className="z-10">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Mantenimientos Total</p>
              <p className="text-2xl font-black text-gray-900">${totalCostoMantenimiento.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{filteredMaintenances.length} Servicios Realizados</p>
            </div>
          </div>
        )}

        {reportCategory === 'todos' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 flex items-center gap-4 relative overflow-hidden group md:col-span-1">
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 z-10">
              <DollarSign className="w-7 h-7" />
            </div>
            <div className="z-10">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Gasto Consolidado Total</p>
              <p className="text-2xl font-black text-gray-900">${totalCostoGeneral.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Combustible + Mantenimiento</p>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN DE GRÁFICAS DINÁMICAS SEGÚN PESTAÑA ACTIVA */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* GRÁFICA PASTEL DE LA PESTAÑA ACTIVA */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-emerald-600" />
              {reportCategory === 'todos' && 'Distribución General de Gastos ($)'}
              {reportCategory === 'combustible' && 'Desglose por Tipo de Combustible'}
              {reportCategory === 'mantenimiento' && 'Preventivos vs. Correctivos'}
            </h2>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
              Gráfica Pastel
            </span>
          </div>

          <div className="h-[280px] w-full flex items-center justify-center">
            {reportCategory === 'todos' && pieConsolidadoData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieConsolidadoData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={(props: any) => `${props.name || ''}: ${((props.percent || 0) * 100).toFixed(0)}%`}
                  >
                    {pieConsolidadoData.map((entry, idx) => (
                      <Cell key={`cpie-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`$${parseFloat(val).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, 'Total']}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}

            {reportCategory === 'combustible' && pieFuelTypeData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieFuelTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={(props: any) => `${props.name || ''}: ${((props.percent || 0) * 100).toFixed(0)}%`}
                  >
                    {pieFuelTypeData.map((entry, idx) => (
                      <Cell key={`fpie-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`$${parseFloat(val).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, 'Combustible']}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}

            {reportCategory === 'mantenimiento' && pieMaintTypeData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieMaintTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={(props: any) => `${(props.name || '').split(' ')[1] || props.name}: ${((props.percent || 0) * 100).toFixed(0)}%`}
                  >
                    {pieMaintTypeData.map((entry, idx) => (
                      <Cell key={`mpie-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`$${parseFloat(val).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, 'Mantenimiento']}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}

            {((reportCategory === 'todos' && pieConsolidadoData.length === 0) ||
              (reportCategory === 'combustible' && pieFuelTypeData.length === 0) ||
              (reportCategory === 'mantenimiento' && pieMaintTypeData.length === 0)) && (
              <div className="text-gray-400 font-medium text-xs">Sin datos registrados para graficar</div>
            )}
          </div>
        </div>

        {/* GRÁFICA DE BARRAS DE LA PESTAÑA ACTIVA */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-emerald-600" />
              {reportCategory === 'todos' && 'Gastos por Vehículo ($)'}
              {reportCategory === 'combustible' && 'Costo de Combustible por Vehículo ($)'}
              {reportCategory === 'mantenimiento' && 'Gastos por Actividad de Servicio ($)'}
            </h2>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
              Gráfica Barras
            </span>
          </div>

          <div className="h-[280px] w-full">
            {reportCategory === 'todos' && barConsolidadoVehicles.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barConsolidadoVehicles} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="placa" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip
                    cursor={{ fill: '#f0fdf4' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any, name: any) => [
                      `$${parseFloat(value || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`,
                      name === 'combustible' ? 'Combustible' : 'Mantenimiento'
                    ]}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="combustible" name="Combustible" fill="#059669" radius={[8, 8, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="mantenimiento" name="Mantenimiento" fill="#d97706" radius={[8, 8, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {reportCategory === 'combustible' && barFuelByVehicle.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barFuelByVehicle} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="placa" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip
                    cursor={{ fill: '#f0fdf4' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => [`$${parseFloat(val || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, 'Costo Combustible']}
                  />
                  <Bar dataKey="costo" name="Costo Combustible" fill="#059669" radius={[8, 8, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {reportCategory === 'mantenimiento' && barMaintByActivity.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barMaintByActivity} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="actividad" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip
                    cursor={{ fill: '#fffbeb' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => [`$${parseFloat(val || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, 'Gasto Mantenimiento']}
                  />
                  <Bar dataKey="costo" name="Costo Servicio" fill="#d97706" radius={[8, 8, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {((reportCategory === 'todos' && barConsolidadoVehicles.length === 0) ||
              (reportCategory === 'combustible' && barFuelByVehicle.length === 0) ||
              (reportCategory === 'mantenimiento' && barMaintByActivity.length === 0)) && (
              <div className="h-full flex items-center justify-center text-gray-400 font-medium text-xs">Sin datos para graficar</div>
            )}
          </div>
        </div>

      </div>

      {/* SECCIÓN 1: Tabla de Combustible */}
      {(reportCategory === 'todos' || reportCategory === 'combustible') && (
        <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="bg-emerald-50/70 p-4 border-b border-emerald-100 flex items-center justify-between">
            <h2 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Consumo de Combustible y Salidas ({filteredTrips.length})
            </h2>
            <span className="text-xs font-bold text-emerald-700 uppercase">Subtotal: ${totalCostoCombustible.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span>
          </div>
          
          {filteredTrips.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No se encontraron registros de viajes en el período seleccionado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Fecha</th>
                    <th className="py-3 px-6">Placa</th>
                    <th className="py-3 px-6">Conductor</th>
                    <th className="py-3 px-6 text-right">KM Recorridos</th>
                    <th className="py-3 px-6 text-right">Recarga</th>
                    <th className="py-3 px-6 text-right">Costo Combustible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredTrips.map(trip => (
                    <tr key={trip.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-6 text-gray-600">{trip.fecha_hora_llegada ? trip.fecha_hora_llegada.substring(0, 10) : '-'}</td>
                      <td className="py-3 px-6 font-bold text-gray-900">{trip.vehicle_placa}</td>
                      <td className="py-3 px-6 text-gray-700">{trip.conductor_name}</td>
                      <td className="py-3 px-6 text-right font-medium text-gray-700">{trip.km_recorridos} km</td>
                      <td className="py-3 px-6 text-right font-medium text-gray-700">{parseFloat(trip.galones_recargados || '0').toFixed(2)} gal</td>
                      <td className="py-3 px-6 text-right font-bold text-emerald-600">${parseFloat(trip.costo_combustible_viaje || '0').toLocaleString('es-EC', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 2: Tabla de Mantenimientos */}
      {(reportCategory === 'todos' || reportCategory === 'mantenimiento') && (
        <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-amber-50/70 p-4 border-b border-amber-100 flex items-center justify-between">
            <h2 className="font-bold text-amber-900 text-sm flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              Mantenimientos y Servicios Realizados ({filteredMaintenances.length})
            </h2>
            <span className="text-xs font-bold text-amber-800 uppercase">Subtotal: ${totalCostoMantenimiento.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span>
          </div>
          
          {filteredMaintenances.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No se encontraron registros de mantenimientos en el período seleccionado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Fecha</th>
                    <th className="py-3 px-6">Placa</th>
                    <th className="py-3 px-6">Tipo</th>
                    <th className="py-3 px-6">Actividad / Servicio</th>
                    <th className="py-3 px-6">Taller / Proveedor</th>
                    <th className="py-3 px-6">Notas / Detalles</th>
                    <th className="py-3 px-6 text-right">Costo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredMaintenances.map(record => {
                    const type = record.tipo_mantenimiento || (record.actividad_nombre?.toLowerCase().includes('correctivo') ? 'Correctivo' : 'Preventivo');
                    const isCorrective = type === 'Correctivo';
                    return (
                      <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-6 text-gray-600">{record.fecha}</td>
                        <td className="py-3 px-6 font-bold text-gray-900">{record.vehicle_placa}</td>
                        <td className="py-3 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isCorrective ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {type}
                          </span>
                        </td>
                        <td className="py-3 px-6 font-semibold text-gray-800">{record.actividad_nombre}</td>
                        <td className="py-3 px-6 text-gray-600">{record.taller}</td>
                        <td className="py-3 px-6 text-gray-500 text-xs italic">{record.notas || 'Sin observaciones'}</td>
                        <td className="py-3 px-6 text-right font-bold text-amber-600">${parseFloat(record.costo || '0').toLocaleString('es-EC', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VehicleReports;
