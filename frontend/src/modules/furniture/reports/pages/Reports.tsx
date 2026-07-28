import React, { useState, useEffect, useRef } from 'react';
import { FileBarChart, CheckSquare, Square, Download, Package, AlertTriangle, TrendingUp, Hash } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import { applyAutoTable } from '@/shared/utils/pdfHelper';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import { useInventoryWebSocket } from '@/modules/furniture/inventory/hooks/useInventoryWebSocket';
import type { Product, Department, Category } from '@/shared/types';

const Reports = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Selecciones
  const [includeDepMuebles, setIncludeDepMuebles] = useState(true);
  const [includeDepCostos, setIncludeDepCostos] = useState(true);
  const [includeCatMuebles, setIncludeCatMuebles] = useState(true);
  const [includeCatCostos, setIncludeCatCostos] = useState(true);
  const [includeStatus, setIncludeStatus] = useState(true);
  const [includeAlerts, setIncludeAlerts] = useState(true);

  // Refs para capturar gráficos
  const depMueblesChartRef = useRef<HTMLDivElement>(null);
  const depCostosChartRef = useRef<HTMLDivElement>(null);
  const catMueblesChartRef = useRef<HTMLDivElement>(null);
  const catCostosChartRef = useRef<HTMLDivElement>(null);
  const statusChartRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      const [prodRes, depRes, catRes] = await Promise.all([
        api.get('/furniture/products/'),
        api.get('/furniture/departments/'),
        api.get('/furniture/categories/')
      ]);
      setProducts(prodRes.data);
      setDepartments(depRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useInventoryWebSocket(fetchData);

  // Data computations
  const departmentSummary = departments.map((dep) => {
    const depProducts = products.filter(p => p.department === dep.id);
    const totalMuebles = depProducts.reduce((acc, curr) => acc + curr.cantidad, 0);
    const totalCosto = depProducts.reduce((acc, curr) => acc + (Number(curr.costo) * curr.cantidad), 0);
    return {
      ubicacion: dep.name,
      costo: totalCosto,
      muebles: totalMuebles
    };
  }).sort((a, b) => a.ubicacion.localeCompare(b.ubicacion));

  const categorySummary = categories.map((cat) => {
    const catProducts = products.filter(p => p.category === cat.id);
    const totalMuebles = catProducts.reduce((acc, curr) => acc + curr.cantidad, 0);
    const totalCosto = catProducts.reduce((acc, curr) => acc + (Number(curr.costo) * curr.cantidad), 0);
    return {
      categoria: cat.name,
      costo: totalCosto,
      muebles: totalMuebles
    };
  }).filter(c => c.costo > 0 || c.muebles > 0).sort((a, b) => b.costo - a.costo);

  const badStateProducts = products.filter(p => p.estado?.toLowerCase() === 'malo');
  const regularStateProducts = products.filter(p => p.estado?.toLowerCase() === 'regular');
  const alertProducts = [...regularStateProducts, ...badStateProducts];

  const estadoData = [
    { name: 'Bueno', value: products.filter(p => p.estado?.toLowerCase() === 'bueno' || p.estado?.toLowerCase() === 'bueno (resuelto)').length },
    { name: 'Regular', value: regularStateProducts.length },
    { name: 'Malo', value: badStateProducts.length },
    { name: 'De Baja', value: products.filter(p => p.estado?.toLowerCase() === 'de baja').length },
  ].filter(d => d.value > 0);

  const handleExportPDF = async () => {
    if (!includeDepMuebles && !includeDepCostos && !includeCatMuebles && !includeCatCostos && !includeStatus && !includeAlerts) {
      toast.error('Selecciona al menos un reporte');
      return;
    }
    
    if (isExporting) return;
    setIsExporting(true);
    const toastId = toast.loading('Generando PDF consolidado...');

    try {
      const doc = new jsPDF('portrait');
      let currentY = 15;

      const addPageHeader = (title: string, subtitle: string) => {
        doc.setFontSize(16);
        doc.setTextColor(16, 185, 129); // Emerald 600
        doc.text(title, 14, currentY);
        currentY += 8;
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(subtitle, 14, currentY);
        currentY += 15;
      };

      const captureAndAddChart = async (ref: React.RefObject<HTMLDivElement | null>, title: string) => {
        if (ref.current) {
          const canvas = await html2canvas(ref.current, { scale: 2, logging: false, useCORS: true });
          const imgData = canvas.toDataURL('image/png');
          const pdfWidth = doc.internal.pageSize.getWidth() - 28;
          const imgProps = doc.getImageProperties(imgData);
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          
          if (currentY + pdfHeight > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            currentY = 20;
          }

          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          doc.text(title, 14, currentY);
          currentY += 5;
          doc.addImage(imgData, 'PNG', 14, currentY, pdfWidth, pdfHeight);
          currentY += pdfHeight + 10;
        }
      };

      doc.setFontSize(22);
      doc.setTextColor(0, 0, 0);
      doc.text('Reportes Consolidados de Inventario', 14, 20);
      doc.setFontSize(12);
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-EC')}`, 14, 28);
      currentY = 45;

      // 1. Muebles por Ubicación
      if (includeDepMuebles) {
        if (currentY > 200) { doc.addPage(); currentY = 20; }
        addPageHeader('Cantidad de Muebles por Ubicación', 'Desglose de unidades físicas por departamento.');
        await captureAndAddChart(depMueblesChartRef, 'Gráfica de Muebles por Ubicación');
        
        const tableData = departmentSummary.map(d => [
          d.ubicacion,
          d.muebles.toString()
        ]);
        tableData.push(['TOTAL GENERAL', departmentSummary.reduce((acc, curr) => acc + curr.muebles, 0).toString()]);
        
        applyAutoTable(doc, {
          startY: currentY,
          head: [['Ubicación', 'Cantidad Muebles']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [5, 150, 105] },
          styles: { fontSize: 9 },
          columnStyles: { 1: { halign: 'center' } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // 2. Costos por Ubicación
      if (includeDepCostos) {
        if (currentY > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); currentY = 20; }
        addPageHeader('Costos por Ubicación', 'Desglose de inversión monetaria por departamento.');
        await captureAndAddChart(depCostosChartRef, 'Gráfica de Costos por Ubicación');
        
        const tableData = departmentSummary.map(d => [
          d.ubicacion,
          `$${d.costo.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`
        ]);
        tableData.push(['TOTAL GENERAL', `$${departmentSummary.reduce((acc, curr) => acc + curr.costo, 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`]);
        
        applyAutoTable(doc, {
          startY: currentY,
          head: [['Ubicación', 'Costo Total']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [5, 150, 105] },
          styles: { fontSize: 9 },
          columnStyles: { 1: { halign: 'right' } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // 3. Muebles por Categoría
      if (includeCatMuebles) {
        if (currentY > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); currentY = 20; }
        addPageHeader('Cantidad de Muebles por Categoría', 'Desglose de unidades físicas por categoría.');
        await captureAndAddChart(catMueblesChartRef, 'Gráfica de Muebles por Categoría');
        
        const tableData = categorySummary.map(c => [
          c.categoria,
          c.muebles.toString()
        ]);
        tableData.push(['TOTAL GENERAL', categorySummary.reduce((acc, curr) => acc + curr.muebles, 0).toString()]);

        applyAutoTable(doc, {
          startY: currentY,
          head: [['Categoría', 'Cantidad Muebles']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] }, // blue-500
          styles: { fontSize: 9 },
          columnStyles: { 1: { halign: 'center' } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // 4. Costos por Categoría
      if (includeCatCostos) {
        if (currentY > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); currentY = 20; }
        addPageHeader('Costos por Categoría', 'Desglose de inversión monetaria por categoría.');
        await captureAndAddChart(catCostosChartRef, 'Gráfica de Costos por Categoría');
        
        const tableData = categorySummary.map(c => [
          c.categoria,
          `$${c.costo.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`
        ]);
        tableData.push(['TOTAL GENERAL', `$${categorySummary.reduce((acc, curr) => acc + curr.costo, 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`]);

        applyAutoTable(doc, {
          startY: currentY,
          head: [['Categoría', 'Costo Total']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] }, // blue-500
          styles: { fontSize: 9 },
          columnStyles: { 1: { halign: 'right' } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // 5. Estado
      if (includeStatus) {
        if (currentY > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); currentY = 20; }
        addPageHeader('Estado Físico de los Muebles', 'Resumen general de las condiciones actuales.');
        await captureAndAddChart(statusChartRef, 'Gráfica de Estados');
        
        const tableData = estadoData.map(e => [
          e.name,
          e.value,
          `${((e.value / products.length) * 100).toFixed(1)}%`
        ]);
        
        applyAutoTable(doc, {
          startY: currentY,
          head: [['Estado', 'Cantidad', 'Porcentaje']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [107, 114, 128] }, // gray-500
          styles: { fontSize: 9 },
          columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // 6. Alertas
      if (includeAlerts) {
        if (currentY > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); currentY = 20; }
        addPageHeader('Alertas y Muebles que Requieren Atención', 'Listado de muebles en estado Regular y Malo.');
        
        const tableData = alertProducts.map(p => [
          p.codigo,
          p.nombre,
          p.department_name || '',
          p.estado || '',
          p.fecha_ultimo_mantenimiento || 'N/A'
        ]);

        applyAutoTable(doc, {
          startY: currentY,
          head: [['Código', 'Mueble', 'Ubicación', 'Estado', 'Última Revisión']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11] }, // amber-500
          styles: { fontSize: 9 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      doc.save(`Reporte_Consolidado_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Reporte generado exitosamente', { id: toastId });
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error(`Error al generar el reporte: ${error?.message || 'Desconocido'}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const CheckOption = ({ checked, onChange, title, description, icon: Icon, color }: any) => (
    <div 
      className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${checked ? `border-${color}-500 bg-${color}-50` : 'border-gray-100 hover:border-gray-200 bg-white'}`}
      onClick={() => onChange(!checked)}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-1 flex-shrink-0 ${checked ? `text-${color}-600` : 'text-gray-400'}`}>
          {checked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${checked ? `text-${color}-600` : 'text-gray-500'}`} />
            <h3 className={`font-bold text-sm ${checked ? `text-${color}-900` : 'text-gray-900'}`}>{title}</h3>
          </div>
          <p className={`text-xs ${checked ? `text-${color}-700` : 'text-gray-500'}`}>{description}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto pb-32">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <FileBarChart className="w-6 h-6 text-emerald-600" />
            </div>
            Reportes Personalizados
          </h1>
          <p className="text-gray-500 mt-2 text-base font-medium">Selecciona los módulos que deseas incluir y genera tu documento PDF.</p>
        </div>
        <button 
          onClick={handleExportPDF}
          disabled={isExporting || (!includeDepMuebles && !includeDepCostos && !includeCatMuebles && !includeCatCostos && !includeStatus && !includeAlerts)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed text-base w-full md:w-auto"
        >
          <Download className="w-5 h-5" />
          {isExporting ? 'Generando...' : 'Descargar Reporte PDF'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <CheckOption 
          checked={includeDepMuebles} onChange={setIncludeDepMuebles} 
          title="Muebles por Ubicación" 
          description="Cantidad de muebles en cada departamento." 
          icon={Hash} color="emerald" 
        />
        <CheckOption 
          checked={includeDepCostos} onChange={setIncludeDepCostos} 
          title="Costos por Ubicación" 
          description="Inversión total por departamento." 
          icon={TrendingUp} color="emerald" 
        />
        <CheckOption 
          checked={includeCatMuebles} onChange={setIncludeCatMuebles} 
          title="Muebles por Categoría" 
          description="Cantidad de muebles en cada categoría." 
          icon={Hash} color="blue" 
        />
        <CheckOption 
          checked={includeCatCostos} onChange={setIncludeCatCostos} 
          title="Costos por Categoría" 
          description="Inversión total por categoría." 
          icon={TrendingUp} color="blue" 
        />
        <CheckOption 
          checked={includeStatus} onChange={setIncludeStatus} 
          title="Estado Físico" 
          description="Muebles según su estado (Bueno, Malo, etc)." 
          icon={Package} color="gray" 
        />
        <CheckOption 
          checked={includeAlerts} onChange={setIncludeAlerts} 
          title="Alertas (Regular/Malo)" 
          description="Muebles marcados como Regular o Malo." 
          icon={AlertTriangle} color="amber" 
        />
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-4">Vista Previa de Gráficas</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {includeDepMuebles && (
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #f3f4f6' }} ref={depMueblesChartRef}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Muebles por Ubicación
            </h3>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentSummary.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="ubicacion" tick={{ fontSize: 11 }} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <RechartsTooltip 
                    formatter={(value: any) => [value, 'Muebles']}
                    labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="muebles" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {includeDepCostos && (
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #f3f4f6' }} ref={depCostosChartRef}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Costos por Ubicación
            </h3>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentSummary.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="ubicacion" tick={{ fontSize: 11 }} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `$${val}`} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <RechartsTooltip 
                    formatter={(value: any) => [`$${Number(value).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, 'Costo']}
                    labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="costo" fill="#059669" radius={[6, 6, 0, 0]} barSize={40} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {includeCatMuebles && (
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #f3f4f6' }} ref={catMueblesChartRef}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Muebles por Categoría
            </h3>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categorySummary.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="categoria" tick={{ fontSize: 11 }} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <RechartsTooltip 
                    formatter={(value: any) => [value, 'Muebles']}
                    labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="muebles" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {includeCatCostos && (
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #f3f4f6' }} ref={catCostosChartRef}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Costos por Categoría
            </h3>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categorySummary.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="categoria" tick={{ fontSize: 11 }} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `$${val}`} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <RechartsTooltip 
                    formatter={(value: any) => [`$${Number(value).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, 'Costo']}
                    labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="costo" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {includeStatus && (
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #f3f4f6' }} ref={statusChartRef}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Estado de Muebles
            </h3>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={estadoData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    isAnimationActive={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {estadoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        entry.name === 'Bueno' ? '#10b981' : 
                        entry.name === 'Regular' ? '#f59e0b' : 
                        entry.name === 'Malo' ? '#ef4444' : '#6b7280'
                      } />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {includeAlerts && (
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <AlertTriangle style={{ width: '40px', height: '40px', color: '#d97706' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>Reporte de Alertas</h3>
            <p style={{ color: '#6b7280', textAlign: 'center', maxWidth: '300px' }}>
              Se generará una tabla detallada con {alertProducts.length} muebles que requieren atención.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Reports;
