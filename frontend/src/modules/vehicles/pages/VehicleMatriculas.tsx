import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Search, RefreshCw, X, CheckCircle, AlertTriangle, ShieldAlert, Clock, Upload, Eye, Edit2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { Vehicle, VehicleRegistrationRecord } from '@/shared/types';
import { getImageUrl } from '@/shared/utils/getImageUrl';
import { useWebSocket } from '@/shared/context/WebSocketContext';


const VehicleMatriculas = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [registrations, setRegistrations] = useState<VehicleRegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isObserveModalOpen, setIsObserveModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<VehicleRegistrationRecord | null>(null);
  const [historyVehicle, setHistoryVehicle] = useState<Vehicle | null>(null);

  // Formulario para Crear / Editar Matrícula
  const [formData, setFormData] = useState({
    fecha_pago: new Date().toISOString().split('T')[0],
    año_matriculado: new Date().getFullYear().toString(),
    costo: '',
    lugar_tramite: '',
    nueva_fecha_vencimiento: '',
    observaciones_pendientes: '',
    notas: ''
  });

  // Archivos PDF para subida / reemplazo (máximo 3)
  const [pdfFile1, setPdfFile1] = useState<File | null>(null);
  const [pdfFile2, setPdfFile2] = useState<File | null>(null);
  const [pdfFile3, setPdfFile3] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vehRes, regRes] = await Promise.all([
        api.get('/vehicles/'),
        api.get('/vehicle-registrations/')
      ]);
      setVehicles(vehRes.data || []);
      setRegistrations(regRes.data || []);
    } catch (error) {
      toast.error('Error al cargar la flota vehicular y matrículas');
    } finally {
      setLoading(false);
    }
  };

  useWebSocket(fetchData);


  // Abrir Modal Renovar
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
      observaciones_pendientes: '',
      notas: ''
    });
    setPdfFile1(null);
    setPdfFile2(null);
    setPdfFile3(null);

    setIsRenewModalOpen(true);
  };

  // Abrir Modal Editar
  const handleOpenEditModal = (record: VehicleRegistrationRecord) => {
    setSelectedRecord(record);
    const veh = vehicles.find(v => v.id === record.vehicle);
    setSelectedVehicle(veh || null);

    setFormData({
      fecha_pago: record.fecha_pago || '',
      año_matriculado: record.año_matriculado?.toString() || new Date().getFullYear().toString(),
      costo: record.costo?.toString() || '',
      lugar_tramite: record.lugar_tramite || '',
      nueva_fecha_vencimiento: record.nueva_fecha_vencimiento || '',
      observaciones_pendientes: record.observaciones_pendientes || '',
      notas: record.notas || ''
    });
    setPdfFile1(null);
    setPdfFile2(null);
    setPdfFile3(null);

    setIsEditModalOpen(true);
  };

  // Abrir Modal Observar / Ver Detalle
  const handleOpenObserveModal = (record: VehicleRegistrationRecord) => {
    setSelectedRecord(record);
    const veh = vehicles.find(v => v.id === record.vehicle);
    setSelectedVehicle(veh || null);
    setPdfFile1(null);
    setPdfFile2(null);
    setPdfFile3(null);
    setIsObserveModalOpen(true);
  };

  const handleOpenHistoryModal = (vehicle: Vehicle) => {
    setHistoryVehicle(vehicle);
    setIsHistoryModalOpen(true);
  };

  // Guardar Nueva Renovación
  const handleSubmitRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    setSubmitting(true);
    try {
      const postData = new FormData();
      postData.append('vehicle', selectedVehicle.id.toString());
      postData.append('fecha_pago', formData.fecha_pago);
      postData.append('año_matriculado', formData.año_matriculado);
      postData.append('costo', (parseFloat(formData.costo || '0')).toString());
      if (formData.lugar_tramite) postData.append('lugar_tramite', formData.lugar_tramite);
      postData.append('nueva_fecha_vencimiento', formData.nueva_fecha_vencimiento);
      if (formData.observaciones_pendientes) postData.append('observaciones_pendientes', formData.observaciones_pendientes);
      if (formData.notas) postData.append('notas', formData.notas);

      if (pdfFile1) postData.append('documento_pdf_1', pdfFile1);
      if (pdfFile2) postData.append('documento_pdf_2', pdfFile2);
      if (pdfFile3) postData.append('documento_pdf_3', pdfFile3);

      await api.post('/vehicle-registrations/', postData);

      toast.success('Renovación de matrícula registrada exitosamente');
      setIsRenewModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Error al registrar la renovación');
    } finally {
      setSubmitting(false);
    }
  };

  // Actualizar / Editar Matrícula Existente
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setSubmitting(true);
    try {
      const patchData = new FormData();
      patchData.append('fecha_pago', formData.fecha_pago);
      patchData.append('año_matriculado', formData.año_matriculado);
      patchData.append('costo', (parseFloat(formData.costo || '0')).toString());
      patchData.append('lugar_tramite', formData.lugar_tramite || '');
      patchData.append('nueva_fecha_vencimiento', formData.nueva_fecha_vencimiento);
      patchData.append('observaciones_pendientes', formData.observaciones_pendientes || '');
      patchData.append('notas', formData.notas || '');

      // Reemplazo opcional de documentos PDF
      if (pdfFile1) patchData.append('documento_pdf_1', pdfFile1);
      if (pdfFile2) patchData.append('documento_pdf_2', pdfFile2);
      if (pdfFile3) patchData.append('documento_pdf_3', pdfFile3);

      await api.patch(`/vehicle-registrations/${selectedRecord.id}/`, patchData);

      toast.success('Registro de matrícula y documentos actualizados exitosamente');
      setIsEditModalOpen(false);
      setIsObserveModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar el registro de matrícula');
    } finally {
      setSubmitting(false);
    }
  };

  // Reemplazar un archivo PDF específico directamente desde la vista de Observar
  const handleReplaceSinglePdf = async (pdfSlot: 1 | 2 | 3, file: File) => {
    if (!selectedRecord) return;
    setSubmitting(true);
    try {
      const patchData = new FormData();
      patchData.append(`documento_pdf_${pdfSlot}`, file);
      await api.patch(`/vehicle-registrations/${selectedRecord.id}/`, patchData);
      toast.success(`Documento PDF ${pdfSlot} reemplazado correctamente`);
      fetchData();
      
      const updatedRes = await api.get(`/vehicle-registrations/${selectedRecord.id}/`);
      setSelectedRecord(updatedRes.data);
    } catch (error) {
      toast.error(`Error al reemplazar el PDF ${pdfSlot}`);
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
    <div className="p-4 sm:p-8 max-w-[1700px] mx-auto pb-32 relative">
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
          Listado general de vigencia de matrículas, visualización, descarga y reemplazo de documentos PDF y control de observaciones.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vehículos Totales</p>
            <p className="text-3xl font-black text-gray-900">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Matrículas Vigentes</p>
            <p className="text-3xl font-black text-emerald-600">{vigentesCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-100 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Próximas a Vencer</p>
            <p className="text-3xl font-black text-amber-600">{proximosCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-red-100 flex items-center gap-4 relative overflow-hidden group">
          <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Matrículas Vencidas</p>
            <p className="text-3xl font-black text-red-600">{vencidosCount}</p>
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
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl text-sm font-medium transition-all outline-none"
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
                <th className="py-4 px-4 border-r border-emerald-600/30">VENCIMIENTO</th>
                <th className="py-4 px-4 border-r border-emerald-600/30">ESTADO Y VIGENCIA</th>
                <th className="py-4 px-4 border-r border-emerald-600/30">DOCUMENTOS PDF</th>
                <th className="py-4 px-4 text-center">ACCIONES</th>
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

                // Buscar documentos de este vehículo
                const vehicleRegs = registrations.filter(r => r.vehicle === vehicle.id);
                const latestReg = vehicleRegs[0];

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

                    <td className="py-3 px-4 border-r border-gray-100 font-extrabold text-gray-900">
                      {info.vencimiento}
                    </td>
                    
                    <td className="py-3 px-4 border-r border-gray-100">
                      <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow-sm ${info.color}`}>
                        {info.estado_texto === 'VENCIDO' && <AlertTriangle className="w-3 h-3" />}
                        {info.dias_texto}
                      </span>
                    </td>

                    {/* Documentos PDF (Estilo uniforme Esmeralda) */}
                    <td className="py-3 px-4 border-r border-gray-100">
                      {latestReg && (latestReg.documento_pdf_1 || latestReg.documento_pdf_2 || latestReg.documento_pdf_3) ? (
                        <div className="flex justify-center items-center gap-1">
                          {latestReg.documento_pdf_1 && (
                            <a href={getImageUrl(latestReg.documento_pdf_1)} target="_blank" rel="noopener noreferrer" className="p-1 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-md font-bold text-[10px] flex items-center gap-0.5" title="Abrir PDF 1">
                              <FileText className="w-3 h-3 text-emerald-600" /> PDF 1
                            </a>
                          )}
                          {latestReg.documento_pdf_2 && (
                            <a href={getImageUrl(latestReg.documento_pdf_2)} target="_blank" rel="noopener noreferrer" className="p-1 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-md font-bold text-[10px] flex items-center gap-0.5" title="Abrir PDF 2">
                              <FileText className="w-3 h-3 text-emerald-600" /> PDF 2
                            </a>
                          )}
                          {latestReg.documento_pdf_3 && (
                            <a href={getImageUrl(latestReg.documento_pdf_3)} target="_blank" rel="noopener noreferrer" className="p-1 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-md font-bold text-[10px] flex items-center gap-0.5" title="Abrir PDF 3">
                              <FileText className="w-3 h-3 text-emerald-600" /> PDF 3
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[10px] font-semibold">Sin PDFs</span>
                      )}
                    </td>
                    
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Botón Observar (Estilo Verde Teal) */}
                        {latestReg ? (
                          <button
                            onClick={() => handleOpenObserveModal(latestReg)}
                            title="Observar Matrícula y PDFs"
                            className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all shadow-sm font-bold text-xs flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Observar</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenRenewModal(vehicle)}
                            title="Observar Matrícula"
                            className="px-2.5 py-1.5 bg-gray-100 text-gray-400 rounded-xl font-bold text-xs flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Observar</span>
                          </button>
                        )}

                        {/* Botón Editar (Estilo Esmeralda suave) */}
                        {latestReg ? (
                          <button
                            onClick={() => handleOpenEditModal(latestReg)}
                            title="Editar Registro de Matrícula"
                            className="px-2.5 py-1.5 bg-emerald-100 text-emerald-900 border border-emerald-200 hover:bg-emerald-200 rounded-xl transition-all font-bold text-xs flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Editar</span>
                          </button>
                        ) : null}

                        {/* Botón Renovar (Estilo Esmeralda Primario) */}
                        <button
                          onClick={() => handleOpenRenewModal(vehicle)}
                          title="Renovar Matrícula"
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-600/20 font-bold text-xs flex items-center gap-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Renovar</span>
                        </button>

                        {/* Botón Historial */}
                        <button
                          onClick={() => handleOpenHistoryModal(vehicle)}
                          title="Historial de Matrículas"
                          className="p-1.5 bg-gray-100 text-gray-700 hover:bg-emerald-100 hover:text-emerald-800 rounded-xl transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
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

      {/* Modal RENOVAR Matrícula */}
      {isRenewModalOpen && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5" />
                <h2 className="text-lg font-extrabold">Renovar Matrícula Vehicular</h2>
              </div>
              <button onClick={() => setIsRenewModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitRenew} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="bg-emerald-50 text-emerald-900 p-4 rounded-2xl text-xs font-medium border border-emerald-200">
                Renovación de matrícula del vehículo <b>{selectedVehicle.placa}</b> ({selectedVehicle.marca} {selectedVehicle.modelo}).
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

              {/* Subida de hasta 3 Documentos PDF */}
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
                <p className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                  <Upload className="w-4 h-4 text-emerald-600" /> Documentos PDF de la Matrícula (Máximo 3)
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Documento PDF 1</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => setPdfFile1(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Documento PDF 2 (Opcional)</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => setPdfFile2(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Documento PDF 3 (Opcional)</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => setPdfFile3(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Observaciones / Pendientes de Revisión</label>
                <textarea
                  rows={2}
                  value={formData.observaciones_pendientes}
                  onChange={e => setFormData({...formData, observaciones_pendientes: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none resize-none"
                  placeholder="Registrar novedades o arreglos pendientes detectados en la revisión..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Notas Generales</label>
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

      {/* Modal EDITAR Matrícula (Estilo Uniforme Esmeralda) */}
      {isEditModalOpen && selectedRecord && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white">
              <div className="flex items-center gap-2.5">
                <Edit2 className="w-5 h-5" />
                <h2 className="text-lg font-extrabold">Editar Matrícula y Documentos</h2>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="bg-emerald-50 text-emerald-900 p-4 rounded-2xl text-xs font-medium border border-emerald-200">
                Modificando registro de matrícula del vehículo <b>{selectedVehicle.placa}</b> ({selectedVehicle.marca} {selectedVehicle.modelo}).
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

              {/* Reemplazo de Documentos PDF */}
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
                <p className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                  <Upload className="w-4 h-4 text-emerald-600" /> Reemplazar Documentos PDF (Si hubo error)
                </p>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-bold text-gray-700">Reemplazar PDF 1</label>
                    {selectedRecord.documento_pdf_1 && (
                      <a href={getImageUrl(selectedRecord.documento_pdf_1)} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5">
                        <FileText className="w-3 h-3 text-emerald-600" /> Ver Actual
                      </a>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => setPdfFile1(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-bold text-gray-700">Reemplazar PDF 2</label>
                    {selectedRecord.documento_pdf_2 && (
                      <a href={getImageUrl(selectedRecord.documento_pdf_2)} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5">
                        <FileText className="w-3 h-3 text-emerald-600" /> Ver Actual
                      </a>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => setPdfFile2(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-bold text-gray-700">Reemplazar PDF 3</label>
                    {selectedRecord.documento_pdf_3 && (
                      <a href={getImageUrl(selectedRecord.documento_pdf_3)} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5">
                        <FileText className="w-3 h-3 text-emerald-600" /> Ver Actual
                      </a>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => setPdfFile3(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Observaciones / Pendientes de Revisión</label>
                <textarea
                  rows={2}
                  value={formData.observaciones_pendientes}
                  onChange={e => setFormData({...formData, observaciones_pendientes: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Notas Generales</label>
                <textarea rows={2} value={formData.notas} onChange={e => setFormData({...formData, notas: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none resize-none" />
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
                  className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  {submitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal OBSERVAR Matrícula (Estilo Uniforme Esmeralda) */}
      {isObserveModalOpen && selectedRecord && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Observación y Documentos de Matrícula</h2>
                  <p className="text-xs text-emerald-200 font-semibold">Vehículo Placa: {selectedVehicle.placa} ({selectedVehicle.marca} {selectedVehicle.modelo})</p>
                </div>
              </div>
              <button onClick={() => setIsObserveModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar bg-gray-50/50 flex-1">
              {/* Información General */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Año Matriculado</p>
                  <p className="text-base font-black text-gray-900">{selectedRecord.año_matriculado}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fecha de Pago</p>
                  <p className="text-sm font-extrabold text-gray-800">{selectedRecord.fecha_pago}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nueva Fecha Vencimiento</p>
                  <p className="text-sm font-extrabold text-emerald-600">{selectedRecord.nueva_fecha_vencimiento}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Costo Total ($)</p>
                  <p className="text-base font-black text-emerald-600">${parseFloat(selectedRecord.costo?.toString() || '0').toLocaleString('es-EC', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lugar de Trámite</p>
                  <p className="text-xs font-bold text-gray-800">{selectedRecord.lugar_tramite || 'No especificado'}</p>
                </div>
              </div>

              {/* Observaciones Pendientes y Novedades */}
              {selectedRecord.observaciones_pendientes ? (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-1">
                  <p className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Observaciones Pendientes Detectadas
                  </p>
                  <p className="text-xs font-semibold text-amber-800 leading-relaxed">{selectedRecord.observaciones_pendientes}</p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Sin observaciones o arreglos pendientes registrados en la revisión.
                </div>
              )}

              {/* Documentos PDF Subidos - Visualización, Descarga y Reemplazo Rápido */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" /> Documentos PDF Adjuntos de la Matrícula
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Slot PDF 1 */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col justify-between space-y-3">
                    <div>
                      <p className="text-xs font-black text-gray-700">Documento PDF 1</p>
                      {selectedRecord.documento_pdf_1 ? (
                        <p className="text-[10px] text-emerald-600 font-extrabold mt-0.5">✔ Archivo Subido</p>
                      ) : (
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Sin archivo</p>
                      )}
                    </div>
                    {selectedRecord.documento_pdf_1 && (
                      <a
                        href={getImageUrl(selectedRecord.documento_pdf_1)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Abrir / Descargar
                      </a>
                    )}
                    <label className="cursor-pointer px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all">
                      <Upload className="w-3 h-3 text-emerald-600" />
                      <span>{selectedRecord.documento_pdf_1 ? 'Reemplazar PDF 1' : 'Subir PDF 1'}</span>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            handleReplaceSinglePdf(1, e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Slot PDF 2 */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col justify-between space-y-3">
                    <div>
                      <p className="text-xs font-black text-gray-700">Documento PDF 2</p>
                      {selectedRecord.documento_pdf_2 ? (
                        <p className="text-[10px] text-emerald-600 font-extrabold mt-0.5">✔ Archivo Subido</p>
                      ) : (
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Sin archivo</p>
                      )}
                    </div>
                    {selectedRecord.documento_pdf_2 && (
                      <a
                        href={getImageUrl(selectedRecord.documento_pdf_2)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Abrir / Descargar
                      </a>
                    )}
                    <label className="cursor-pointer px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all">
                      <Upload className="w-3 h-3 text-emerald-600" />
                      <span>{selectedRecord.documento_pdf_2 ? 'Reemplazar PDF 2' : 'Subir PDF 2'}</span>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            handleReplaceSinglePdf(2, e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Slot PDF 3 */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col justify-between space-y-3">
                    <div>
                      <p className="text-xs font-black text-gray-700">Documento PDF 3</p>
                      {selectedRecord.documento_pdf_3 ? (
                        <p className="text-[10px] text-emerald-600 font-extrabold mt-0.5">✔ Archivo Subido</p>
                      ) : (
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Sin archivo</p>
                      )}
                    </div>
                    {selectedRecord.documento_pdf_3 && (
                      <a
                        href={getImageUrl(selectedRecord.documento_pdf_3)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Abrir / Descargar
                      </a>
                    )}
                    <label className="cursor-pointer px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all">
                      <Upload className="w-3 h-3 text-emerald-600" />
                      <span>{selectedRecord.documento_pdf_3 ? 'Reemplazar PDF 3' : 'Subir PDF 3'}</span>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            handleReplaceSinglePdf(3, e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Notas Adicionales */}
              {selectedRecord.notas && (
                <div className="bg-white p-4 rounded-2xl border border-gray-200">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notas Generales</p>
                  <p className="text-xs font-medium text-gray-700 leading-relaxed">{selectedRecord.notas}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-gray-100 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsObserveModalOpen(false);
                  handleOpenEditModal(selectedRecord);
                }}
                className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-4 h-4 text-emerald-600" /> Editar Datos y Documentos
              </button>

              <button
                type="button"
                onClick={() => setIsObserveModalOpen(false)}
                className="px-5 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-xl text-xs font-bold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial de Matrículas por Vehículo */}
      {isHistoryModalOpen && historyVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-6 h-6" />
                <div>
                  <h2 className="text-lg font-extrabold">Historial de Matrículas y PDFs</h2>
                  <p className="text-xs font-semibold text-emerald-200">Vehículo: {historyVehicle.placa} ({historyVehicle.marca} {historyVehicle.modelo})</p>
                </div>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 custom-scrollbar">
              {registrations.filter(r => r.vehicle === historyVehicle.id).length === 0 ? (
                <div className="text-center py-12 text-gray-500">No hay registradas renovaciones históricas para este vehículo.</div>
              ) : (
                registrations.filter(r => r.vehicle === historyVehicle.id).map(r => (
                  <div key={r.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-black text-xs">Año {r.año_matriculado}</span>
                        <p className="text-xs text-gray-500 mt-1 font-semibold">Pago: {r.fecha_pago} | Vence: {r.nueva_fecha_vencimiento}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-emerald-600">${parseFloat(r.costo?.toString() || '0').toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span>
                        
                        {/* Botones Observar y Editar en Historial (Estilos Esmeralda / Teal Uniformes) */}
                        <button
                          onClick={() => {
                            setIsHistoryModalOpen(false);
                            handleOpenObserveModal(r);
                          }}
                          className="px-2.5 py-1 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" /> Observar
                        </button>

                        <button
                          onClick={() => {
                            setIsHistoryModalOpen(false);
                            handleOpenEditModal(r);
                          }}
                          className="p-1 bg-emerald-100 text-emerald-900 border border-emerald-200 hover:bg-emerald-200 rounded-lg text-xs font-bold"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
                        </button>
                      </div>
                    </div>

                    {r.observaciones_pendientes && (
                      <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900 border border-amber-200 font-medium">
                        <b>Pendientes/Novedades:</b> {r.observaciones_pendientes}
                      </div>
                    )}

                    {/* PDF Buttons (Estilo Esmeralda) */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      {r.documento_pdf_1 && (
                        <a href={getImageUrl(r.documento_pdf_1)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-emerald-600" /> PDF 1
                        </a>
                      )}
                      {r.documento_pdf_2 && (
                        <a href={getImageUrl(r.documento_pdf_2)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-emerald-600" /> PDF 2
                        </a>
                      )}
                      {r.documento_pdf_3 && (
                        <a href={getImageUrl(r.documento_pdf_3)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-emerald-600" /> PDF 3
                        </a>
                      )}
                      {!r.documento_pdf_1 && !r.documento_pdf_2 && !r.documento_pdf_3 && (
                        <span className="text-xs text-gray-400 italic">Sin documentos PDF adjuntos</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleMatriculas;
