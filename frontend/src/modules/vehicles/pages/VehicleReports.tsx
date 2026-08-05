import React, { useState, useEffect, useMemo } from 'react';
import { FileBarChart, Download, Calendar, Truck, TrendingUp, AlertCircle, Filter, User } from 'lucide-react';
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

type TimeFilter = 'hoy' | 'semana' | 'mes' | 'año' | 'todo' | 'custom';

const VehicleReports = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros de estado
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('mes');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedConductor, setSelectedConductor] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await api.get('/vehicle-trips/');
      setTrips(response.data);
    } catch (error) {
      toast.error('Error al cargar datos de viajes');
    } finally {
      setLoading(false);
    }
  };

  const uniqueConductors = Array.from(new Set(trips.map(t => t.conductor_name))).filter(Boolean).sort();
  const uniqueVehicles = Array.from(new Set(trips.map(t => t.vehicle_placa))).filter(Boolean).sort();

  // Helper para obtener YYYY-MM-DD ajustado localmente si es posible, o usar timezone simple
  const getISODate = (d: Date) => {
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  };

  const dateRange = useMemo(() => {
    const today = new Date();
    
    if (timeFilter === 'hoy') {
      return { start: getISODate(today), end: getISODate(today) };
    } else if (timeFilter === 'semana') {
      const first = new Date(today);
      first.setDate(first.getDate() - first.getDay() + (first.getDay() === 0 ? -6 : 1)); // Lunes como primer día
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
    return { start: '', end: '' }; // todo
  }, [timeFilter, startDate, endDate]);

  const dailyData = useMemo(() => {
    const filteredTrips = trips.filter(trip => {
      if (trip.estado_viaje !== 'Finalizado' || !trip.fecha_hora_llegada) return false;
      
      const tripDateStr = trip.fecha_hora_llegada.substring(0, 10);
      
      if (selectedConductor && trip.conductor_name !== selectedConductor) return false;
      if (selectedVehicle && trip.vehicle_placa !== selectedVehicle) return false;
      
      if (dateRange.start && tripDateStr < dateRange.start) return false;
      if (dateRange.end && tripDateStr > dateRange.end) return false;
      
      return true;
    });

    const grouped = filteredTrips.reduce((acc, trip) => {
      const date = trip.fecha_hora_llegada.substring(0, 10);
      if (!acc[date]) {
        acc[date] = {
          date,
          trips: [],
          total_km: 0,
          total_costo: 0,
          total_recarga: 0
        };
      }
      acc[date].trips.push(trip);
      acc[date].total_km += trip.km_recorridos || 0;
      acc[date].total_costo += parseFloat(trip.costo_combustible_viaje || '0');
      acc[date].total_recarga += parseFloat(trip.galones_recargados || '0');
      return acc;
    }, {} as Record<string, { date: string; trips: Trip[]; total_km: number; total_costo: number; total_recarga: number }>);

    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
  }, [trips, dateRange, selectedConductor, selectedVehicle]);

  const totalCosto = dailyData.reduce((acc, day) => acc + day.total_costo, 0);
  const totalKm = dailyData.reduce((acc, day) => acc + day.total_km, 0);

  const getFilterText = () => {
    const timeText = timeFilter === 'hoy' ? 'Hoy' 
                   : timeFilter === 'semana' ? 'Esta Semana'
                   : timeFilter === 'mes' ? 'Este Mes'
                   : timeFilter === 'año' ? 'Este Año'
                   : timeFilter === 'custom' ? `Desde ${startDate} hasta ${endDate}`
                   : 'Todo el Histórico';
    
    return `Período: ${timeText} | Conductor: ${selectedConductor || 'Todos'} | Vehículo: ${selectedVehicle || 'Todos'}`;
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129);
    doc.text('Reporte de Consumo (Vehículos)', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(getFilterText(), 14, 28);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-EC')}`, 14, 34);

    let currentY = 45;

    const tableBody: any[] = [];
    dailyData.forEach(day => {
      tableBody.push([{ content: `Fecha: ${day.date}`, colSpan: 6, styles: { fillColor: [240, 253, 244], textColor: [6, 78, 59], fontStyle: 'bold' } }]);
      
      day.trips.forEach(trip => {
        tableBody.push([
          trip.vehicle_placa,
          trip.conductor_name,
          `${trip.km_recorridos} km`,
          `${parseFloat(trip.galones_recargados).toFixed(2)} gal`,
          `$${parseFloat(trip.costo_combustible_viaje).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`
        ]);
      });
      
      tableBody.push([
        { content: 'SUBTOTAL DÍA', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: `${day.total_km} km`, styles: { fontStyle: 'bold' } },
        { content: `${day.total_recarga.toFixed(2)} gal`, styles: { fontStyle: 'bold' } },
        { content: `$${day.total_costo.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }
      ]);
    });

    tableBody.push([
      { content: 'TOTAL GENERAL', colSpan: 2, styles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' } },
      { content: `${totalKm} km`, styles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' } },
      { content: '-', styles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' } },
      { content: `$${totalCosto.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, styles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' } }
    ]);

    applyAutoTable(doc, {
      startY: currentY,
      head: [['Placa', 'Conductor', 'KM Recorridos', 'Recarga', 'Costo Calculado']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] },
      styles: { fontSize: 10 }
    });

    doc.save(`Reporte_Consumo_${new Date().getTime()}.pdf`);
    toast.success('Reporte exportado exitosamente');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
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
    <div className="p-8 max-w-7xl mx-auto pb-32 relative">
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none rounded-3xl mix-blend-multiply"></div>
      
      <div className="relative z-10 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <FileBarChart className="w-6 h-6 text-emerald-600" />
            </div>
            Reporte de Consumo Vehicular
          </h1>
          <p className="text-gray-500 mt-2 text-base font-medium">Análisis y consolidado de gastos por combustible de la flota vehicular.</p>
        </div>
        <button 
          onClick={handleExportPDF}
          disabled={dailyData.length === 0}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-sm disabled:opacity-50 w-full md:w-auto"
        >
          <Download className="w-5 h-5" />
          Exportar PDF
        </button>
      </div>

      {/* Panel de Filtros */}
      <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold">
          <Filter className="w-5 h-5 text-emerald-600" />
          Filtros Avanzados
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Entidades */}
          <div className="space-y-4">
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
          </div>

          {/* Tiempo */}
          <div className="lg:col-span-2 space-y-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Período de Tiempo
            </label>
            <div className="flex flex-wrap gap-2">
              {timeFilters.map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setTimeFilter(filter.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    timeFilter === filter.value 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {timeFilter === 'custom' && (
              <div className="flex items-center gap-4 mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Desde</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Hasta</label>
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
        </div>
      </div>

      {/* Tarjetas de Totales */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 z-10">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div className="z-10">
            <p className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-1">Gasto Total del Período</p>
            <p className="text-3xl font-black text-gray-900">${totalCosto.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 z-10">
            <Truck className="w-7 h-7" />
          </div>
          <div className="z-10">
            <p className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-1">KM Recorridos del Período</p>
            <p className="text-3xl font-black text-gray-900">{totalKm.toLocaleString('es-EC')} km</p>
          </div>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-700 text-sm flex items-center gap-2">
            <FileBarChart className="w-4 h-4" />
            Desglose Diario
          </h2>
          <span className="text-xs font-bold text-gray-400 uppercase">{dailyData.length} Días con actividad</span>
        </div>
        
        {dailyData.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900">No hay datos para estos filtros</h3>
            <p className="text-gray-500 mt-1">Prueba seleccionando otro período, vehículo o conductor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Vehículo / Placa</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Conductor</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">KM Recorridos</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Recarga</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Costo Combustible</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map((day) => (
                  <React.Fragment key={day.date}>
                    {/* Encabezado del Día */}
                    <tr className="bg-emerald-50/50 border-y border-emerald-100">
                      <td colSpan={5} className="py-3 px-6 text-sm font-bold text-emerald-800 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Fecha: {day.date}
                      </td>
                    </tr>
                    
                    {/* Filas de Viajes del Día */}
                    {day.trips.map((trip) => (
                      <tr key={trip.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-6">
                          <div className="font-bold text-gray-900">{trip.vehicle_placa}</div>
                        </td>
                        <td className="py-3 px-6">
                          <div className="text-sm text-gray-600">{trip.conductor_name}</div>
                        </td>
                        <td className="py-3 px-6 text-right font-medium text-gray-700">
                          {trip.km_recorridos} km
                        </td>
                        <td className="py-3 px-6 text-right font-medium text-gray-700">
                          {parseFloat(trip.galones_recargados).toFixed(2)} gal
                        </td>
                        <td className="py-3 px-6 text-right font-bold text-gray-900">
                          ${parseFloat(trip.costo_combustible_viaje).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Subtotal del Día */}
                    <tr className="bg-gray-50/80 border-b-2 border-gray-200">
                      <td colSpan={2} className="py-3 px-6 text-right text-xs font-bold text-gray-500 uppercase">
                        Subtotal {day.date}
                      </td>
                      <td className="py-3 px-6 text-right font-bold text-emerald-700">
                        {day.total_km} km
                      </td>
                      <td className="py-3 px-6 text-right font-bold text-emerald-700">
                        {day.total_recarga.toFixed(2)} gal
                      </td>
                      <td className="py-3 px-6 text-right font-black text-emerald-700">
                        ${day.total_costo.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleReports;
