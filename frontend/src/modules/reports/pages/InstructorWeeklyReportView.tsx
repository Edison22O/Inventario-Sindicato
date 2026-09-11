import React, { useState, useEffect } from 'react';
import api from '@/shared/services/api';
import { 
  FileText, Download, Printer, Calendar, User, Truck, CheckCircle2, ShieldCheck, Award
} from 'lucide-react';
import type { WeeklyInstructorReport, Vehicle } from '@/shared/types';

interface UserItem {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
}

export const InstructorWeeklyReportView: React.FC = () => {
  const [reports, setReports] = useState<WeeklyInstructorReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyInstructorReport | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [instructors, setInstructors] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State for new report
  const [instructorId, setInstructorId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [semanaNum, setSemanaNum] = useState(1);
  const [fechaInicio, setFechaInicio] = useState('2026-02-01');
  const [fechaFin, setFechaFin] = useState('2026-02-08');
  const [periodo, setPeriodo] = useState('2025-2026');
  const [submitting, setSubmitting] = useState(false);

  // Sample activities rows based on informe semanal.docx
  const [reportRows, setReportRows] = useState([
    { fecha: '01-02-2026', dia: 'Domingo', actividad: 'Incorporación a la circulación 2 Conducción en zona Urbana', ruta: 'Circuito 10 / Circuito 11', observacion: 'Práctica realizada con normalidad' },
    { fecha: '03-02-2026', dia: 'Martes', actividad: 'Incorporación a la circulación 2 Conducción en zona Urbana', ruta: 'Circuito 10 / Circuito 11', observacion: 'Práctica realizada con normalidad' },
    { fecha: '05-02-2026', dia: 'Jueves', actividad: 'Incorporación a la circulación 2 Técnica de conducción en autovías', ruta: 'Circuito 11', observacion: 'Excelente desenvolvimiento' },
    { fecha: '06-02-2026', dia: 'Viernes', actividad: 'Incorporación a la circulación 2 Técnica de conducción en autovías', ruta: 'Circuito 11', observacion: 'Práctica realizada con normalidad' },
    { fecha: '07-02-2026', dia: 'Sábado', actividad: 'Incorporación a la circulación 2 Técnica de ubicación y condición', ruta: 'Circuito 11', observacion: 'Práctica realizada con normalidad' },
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [repRes, vehRes, usersRes] = await Promise.all([
        api.get('/weekly-instructor-reports/'),
        api.get('/vehicles/'),
        api.get('/users/')
      ]);
      const list: WeeklyInstructorReport[] = repRes.data || [];
      setReports(list);
      setVehicles(vehRes.data || []);
      setInstructors(usersRes.data || []);

      if (list.length > 0) {
        setSelectedReport(list[0]);
      }
      if (usersRes.data && usersRes.data.length > 0) {
        setInstructorId(usersRes.data[0].id.toString());
      }
      if (vehRes.data && vehRes.data.length > 0) {
        setVehicleId(vehRes.data[0].id.toString());
      }
    } catch (e) {
      console.error('Error al cargar informes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const instObj = instructors.find(u => u.id.toString() === instructorId);
      const instName = instObj ? `${instObj.first_name} ${instObj.last_name}`.strip() || instObj.username : 'Instructor';

      const res = await api.post('/weekly-instructor-reports/', {
        instructor: parseInt(instructorId),
        vehicle: vehicleId ? parseInt(vehicleId) : null,
        semana_numero: semanaNum,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        periodo_academico: periodo,
        elaborado_por_nombre: instName,
        revisado_por_nombre: 'Javier Godoy - INSPECTOR GENERAL',
        aprobado_por_nombre: 'Germania Paguay - DIRECTOR PEDAGÓGICO'
      });
      fetchData();
      setSelectedReport(res.data);
    } catch (e) {
      console.error('Error al crear reporte:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto pb-32 font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs tracking-wider uppercase mb-1">
            <FileText className="w-4 h-4" /> Módulo de Informes Automatizados
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Informe Semanal del Instructor
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Generación oficial de reportes con actividades, rutas y las 3 firmas para trámite de pago.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
          >
            <Printer className="w-4 h-4" /> Imprimir / Exportar PDF
          </button>
        </div>
      </div>

      {/* Generator Form */}
      <div className="mb-8 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 print:hidden">
        <h3 className="text-xs font-black text-gray-700 uppercase mb-3">Generar Nuevo Reporte Semanal:</h3>
        <form onSubmit={handleCreateReport} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Instructor</label>
            <select
              value={instructorId}
              onChange={e => setInstructorId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
            >
              {instructors.map(u => (
                <option key={u.id} value={u.id}>{u.first_name || u.username} {u.last_name || ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Vehículo (Placa)</label>
            <select
              value={vehicleId}
              onChange={e => setVehicleId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
            >
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.placa} - {v.modelo || v.marca}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Nº Semana</label>
            <input
              type="number"
              value={semanaNum}
              onChange={e => setSemanaNum(parseInt(e.target.value || '1'))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md hover:bg-emerald-900 transition-all"
            >
              {submitting ? 'Generando...' : '+ Crear Reporte'}
            </button>
          </div>
        </form>
      </div>

      {/* Official Document Paper Preview (Matching informe semanal.docx) */}
      <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-gray-200 max-w-4xl mx-auto print:shadow-none print:border-none print:p-0">
        {/* Document Header */}
        <div className="text-center mb-6 pb-4 border-b-2 border-gray-900">
          <h2 className="text-base font-black tracking-wide uppercase text-gray-900">
            SINDICATO DE CHOFERES PROFESIONALES
          </h2>
          <h3 className="text-sm font-extrabold uppercase text-gray-700 mt-1">
            INFORME DE ACTIVIDADES SEMANALES DEL INSTRUCTOR DE PRÁCTICAS DE CONDUCCIÓN
          </h3>
        </div>

        {/* Datos Informativos Table */}
        <div className="mb-6 border-2 border-gray-900 text-xs font-bold text-gray-900">
          <div className="grid grid-cols-2 border-b border-gray-900 p-2.5 bg-gray-50">
            <div><span className="font-extrabold">Nombre del Instructor:</span> {selectedReport ? selectedReport.elaborado_por_nombre : 'Edwin Chandi'}</div>
            <div><span className="font-extrabold">Período académico:</span> {selectedReport ? selectedReport.periodo_academico : '2025-2026'}</div>
          </div>
          <div className="grid grid-cols-2 p-2.5">
            <div><span className="font-extrabold">Licencia profesional tipo:</span> C - E</div>
            <div>
              <span className="font-extrabold">Semana Nº {selectedReport ? selectedReport.semana_numero : 1}:</span> del {selectedReport ? selectedReport.fecha_inicio : '01/02/2026'} al {selectedReport ? selectedReport.fecha_fin : '08/02/2026'}
            </div>
          </div>
          <div className="border-t border-gray-900 p-2.5 bg-gray-50">
            <span className="font-extrabold">Placa del vehículo:</span> {selectedReport?.vehicle_placa || 'IBD 6067'}
          </div>
        </div>

        {/* Table 2: Daily Activities */}
        <div className="mb-8 overflow-x-auto">
          <table className="w-full text-xs border-2 border-gray-900 text-left">
            <thead>
              <tr className="bg-gray-200 border-b-2 border-gray-900 text-gray-900 font-black uppercase text-[11px]">
                <th className="p-2 border-r border-gray-900 w-24">Fecha</th>
                <th className="p-2 border-r border-gray-900 w-20">Día</th>
                <th className="p-2 border-r border-gray-900">Actividades Desarrolladas</th>
                <th className="p-2 border-r border-gray-900 w-36">Ruta / Lugar</th>
                <th className="p-2 w-44">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y border-gray-900 font-semibold text-gray-800">
              {reportRows.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-900 hover:bg-gray-50">
                  <td className="p-2 border-r border-gray-900 font-bold">{row.fecha}</td>
                  <td className="p-2 border-r border-gray-900">{row.dia}</td>
                  <td className="p-2 border-r border-gray-900">{row.actividad}</td>
                  <td className="p-2 border-r border-gray-900 font-bold text-emerald-800">{row.ruta}</td>
                  <td className="p-2">{row.observacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures Section (3 Signatures matching informe semanal.docx) */}
        <div className="pt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs font-bold text-gray-900">
          <div className="border-t border-gray-900 pt-3">
            <p className="font-extrabold uppercase">Elaborado por:</p>
            <p className="text-[11px] text-gray-600 mt-1">{selectedReport ? selectedReport.elaborado_por_nombre : 'Edwin Chandi'}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">INSTRUCTOR DE CONDUCCIÓN</p>
            <p className="text-[9px] text-gray-400 mt-4">Firma: ………………………………………………………</p>
          </div>

          <div className="border-t border-gray-900 pt-3">
            <p className="font-extrabold uppercase">Revisado por:</p>
            <p className="text-[11px] text-gray-600 mt-1">Javier Godoy</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">INSPECTOR GENERAL</p>
            <p className="text-[9px] text-gray-400 mt-4">Firma: ………………………………………………………</p>
          </div>

          <div className="border-t border-gray-900 pt-3">
            <p className="font-extrabold uppercase">Aprobado por:</p>
            <p className="text-[11px] text-gray-600 mt-1">Germania Paguay</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">DIRECTOR PEDAGÓGICO</p>
            <p className="text-[9px] text-gray-400 mt-4">Firma: ………………………………………………………</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorWeeklyReportView;
