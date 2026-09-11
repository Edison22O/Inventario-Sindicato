import { useState, useEffect, useMemo } from 'react';
import { FileText, Search, Filter, Plus, Calendar, Gauge, User, Truck, ExternalLink, X, ShieldCheck, AlertCircle, CheckCircle2, Eye, Edit3, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import { authService } from '@/services/authService';
import { getImageUrl } from '@/shared/utils/getImageUrl';
import { confirmDialog } from '@/shared/utils/confirmDialog';
import type { DriverVehicleHandover, Vehicle } from '@/shared/types';
import { useWebSocket } from '@/shared/context/WebSocketContext';


const VehicleHandovers = () => {
  const [handovers, setHandovers] = useState<DriverVehicleHandover[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHandover, setEditingHandover] = useState<DriverVehicleHandover | null>(null);
  const [selectedHandoverForView, setSelectedHandoverForView] = useState<DriverVehicleHandover | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [actaForm, setActaForm] = useState({
    driver: '',
    vehicle: '',
    tipo_acta: 'Entrega' as 'Entrega' | 'Recepción',
    fecha: new Date().toISOString().split('T')[0],
    kilometraje: '0',
    observaciones: ''
  });
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);

  const isGlobalAdmin = authService.isGlobalAdmin();
  const isVehicleAdmin = authService.isVehicleAdmin();
  const isAdmin = isGlobalAdmin || isVehicleAdmin;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [handoversRes, vehRes, driversRes, usersRes] = await Promise.all([
        api.get('/driver-handovers/').catch(err => {
          console.error("Error fetching handovers", err);
          return { data: [] };
        }),
        api.get('/vehicles/').catch(err => {
          console.error("Error fetching vehicles", err);
          return { data: [] };
        }),
        api.get('/driver-profiles/').catch(err => {
          console.error("Error fetching driver profiles", err);
          return { data: [] };
        }),
        api.get('/users/').catch(() => ({ data: [] }))
      ]);

      setHandovers(handoversRes.data || []);
      setVehicles(vehRes.data || []);

      const driverProfiles = driversRes.data || [];
      const allUsers = usersRes.data || [];

      const driverList: any[] = [];
      const addedUserIds = new Set<number>();

      driverProfiles.forEach((dp: any) => {
        const uId = typeof dp.user === 'object' ? dp.user?.id : dp.user;
        if (uId) {
          addedUserIds.add(Number(uId));
          const uObj = allUsers.find((u: any) => u.id === Number(uId));
          const name = dp.user_name ||
            (dp.first_name ? `${dp.first_name} ${dp.last_name || ''}`.trim() : '') ||
            (uObj ? `${uObj.first_name || ''} ${uObj.last_name || ''}`.trim() : '') ||
            dp.username || uObj?.username || `Conductor #${uId}`;
          const username = dp.username || uObj?.username || `ID ${uId}`;

          driverList.push({
            id: dp.id,
            userId: Number(uId),
            name: name,
            username: username
          });
        }
      });

      // Agregar usuarios con rol Conductor que aún no tengan DriverProfile
      allUsers.forEach((u: any) => {
        if (!addedUserIds.has(u.id) && (u.role_name === 'Conductor' || u.role_name === 'Conductores')) {
          const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
          driverList.push({
            id: u.id,
            userId: u.id,
            name: name,
            username: u.username
          });
        }
      });

      setDrivers(driverList);
    } catch (error) {
      toast.error('Error al cargar las actas de entrega');
    } finally {
      setLoading(false);
    }
  };

  useWebSocket(fetchData);


  const handleOpenCreateModal = () => {
    setEditingHandover(null);
    setActaForm({
      driver: '',
      vehicle: '',
      tipo_acta: 'Entrega',
      fecha: new Date().toISOString().split('T')[0],
      kilometraje: '0',
      observaciones: ''
    });
    setDocumentoFile(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (handover: DriverVehicleHandover) => {
    setEditingHandover(handover);
    setActaForm({
      driver: (handover.driver || '').toString(),
      vehicle: (handover.vehicle || '').toString(),
      tipo_acta: handover.tipo_acta,
      fecha: handover.fecha,
      kilometraje: (handover.kilometraje || 0).toString(),
      observaciones: handover.observaciones || ''
    });
    setDocumentoFile(null);
    setIsModalOpen(true);
  };

  const handleSaveHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actaForm.driver || !actaForm.vehicle) {
      toast.error('Debe seleccionar un conductor y un vehículo');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('driver', actaForm.driver);
      formData.append('vehicle', actaForm.vehicle);
      formData.append('tipo_acta', actaForm.tipo_acta);
      formData.append('fecha', actaForm.fecha);
      formData.append('kilometraje', actaForm.kilometraje || '0');
      if (actaForm.observaciones) formData.append('observaciones', actaForm.observaciones);
      if (documentoFile) formData.append('documento_acta_firmada', documentoFile);

      if (editingHandover) {
        await api.patch(`/driver-handovers/${editingHandover.id}/`, formData);
        toast.success(`Acta de ${actaForm.tipo_acta} actualizada exitosamente`);
      } else {
        await api.post('/driver-handovers/', formData);
        toast.success(`Acta de ${actaForm.tipo_acta} registrada exitosamente`);
      }

      setIsModalOpen(false);
      setEditingHandover(null);
      setDocumentoFile(null);
      fetchData();
    } catch (error) {
      toast.error('Error al guardar el acta de entrega');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHandover = async (handover: DriverVehicleHandover) => {
    if (await confirmDialog(`¿Estás seguro de que deseas eliminar la Acta de ${handover.tipo_acta} del vehículo ${handover.vehicle_placa || ''}?`)) {
      try {
        await api.delete(`/driver-handovers/${handover.id}/`);
        toast.success('Acta eliminada correctamente');
        fetchData();
      } catch (error) {
        toast.error('Error al eliminar el acta');
      }
    }
  };

  const filteredHandovers = useMemo(() => {
    return handovers.filter(h => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        (h.vehicle_placa || '').toLowerCase().includes(term) ||
        (h.vehicle_modelo || '').toLowerCase().includes(term) ||
        (h.driver_name || '').toLowerCase().includes(term) ||
        (h.observaciones || '').toLowerCase().includes(term);

      const matchesType = filterType === 'todos' || h.tipo_acta === filterType;

      return matchesSearch && matchesType;
    });
  }, [handovers, searchTerm, filterType]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isAdmin ? 'Gestión de Actas (Administrador)' : 'Modo Conductor (Solo Lectura)'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
              <FileText className="w-7 h-7" />
            </div>
            Actas de Entrega y Recepción
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Registro oficial de asignaciones, estado físico y firmas de entrega/recepción vehicular.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nueva Acta de Entrega / Recepción
          </button>
        )}
      </div>

      {/* Nota informativa para Conductores */}
      {!isAdmin && (
        <div className="bg-emerald-50/80 border border-emerald-200 p-5 rounded-2xl flex gap-3.5 items-start text-emerald-950 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm text-emerald-900">Consulta de Documentos Oficiales de Entrega</p>
            <p className="font-medium text-emerald-800 leading-relaxed">
              Como conductor registrado, tienes acceso completo para revisar tus actas físicas de entrega y recepción. Puedes hacer clic en <b>"Ver Detalle"</b> o en <b>"Ver Documento PDF / Foto"</b> en cualquier registro para visualizar la información y el documento firmado.
            </p>
          </div>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por placa, modelo, conductor u observaciones..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
            <Filter className="w-4 h-4 text-emerald-600" /> Tipo:
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="todos">Todas las Actas</option>
            <option value="Entrega">Actas de Entrega</option>
            <option value="Recepción">Actas de Recepción</option>
          </select>
        </div>
      </div>

      {/* Tarjetas / Listado de Actas */}
      {filteredHandovers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHandovers.map(handover => {
            const isEntrega = handover.tipo_acta === 'Entrega';
            const docUrl = getImageUrl(handover.documento_acta_firmada);

            return (
              <div
                key={handover.id}
                className="bg-white rounded-3xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Badge Tipo de Acta */}
                  <div className="flex justify-between items-start gap-2 mb-4">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                        isEntrega
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Acta de {handover.tipo_acta}
                    </span>

                    <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {handover.fecha}
                    </span>
                  </div>

                  {/* Vehículo e Info */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-gray-900 text-base leading-tight">
                          {handover.vehicle_placa || 'Sin Placa'}
                        </h3>
                        <p className="text-xs text-gray-500 font-semibold">
                          {handover.vehicle_marca} {handover.vehicle_modelo}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-emerald-600" /> Conductor:
                        </span>
                        <span className="font-bold text-gray-900">{handover.driver_name || 'No asignado'}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5 text-blue-600" /> Odómetro Acta:
                        </span>
                        <span className="font-black text-gray-900">
                          {(handover.kilometraje || 0).toLocaleString()} KM
                        </span>
                      </div>
                    </div>

                    {handover.observaciones && (
                      <p className="text-xs text-gray-600 italic bg-amber-50/60 p-3 rounded-xl border border-amber-100/80 leading-relaxed line-clamp-2">
                        "{handover.observaciones}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="pt-4 border-t border-gray-100 space-y-2">
                  {docUrl && (
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ver Documento PDF / Foto
                    </a>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedHandoverForView(handover)}
                      className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-600" />
                      Ver Detalle
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(handover)}
                          className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1 border border-amber-200 transition-colors cursor-pointer"
                          title="Editar Acta"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteHandover(handover)}
                          className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 border border-rose-200 transition-colors cursor-pointer"
                          title="Eliminar Acta"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center flex flex-col items-center gap-3">
          <FileText className="w-12 h-12 text-gray-300" />
          <h3 className="text-base font-black text-gray-800">No se encontraron actas de entrega</h3>
          <p className="text-xs text-gray-500 font-medium max-w-md">
            No existen registros de entrega o recepción que coincidan con la búsqueda.
          </p>
        </div>
      )}

      {/* MODAL VER DETALLE COMPLETO DEL ACTA */}
      {selectedHandoverForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl shadow-sm">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">
                    Detalle de Acta de {selectedHandoverForView.tipo_acta}
                  </h2>
                  <p className="text-xs text-emerald-200">Fecha de Registro: {selectedHandoverForView.fecha}</p>
                </div>
              </div>
              <button onClick={() => setSelectedHandoverForView(null)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Info Vehículo */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Truck className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Vehículo Asignado</p>
                  <p className="text-lg font-black text-gray-900">{selectedHandoverForView.vehicle_placa || 'Sin Placa'}</p>
                  <p className="text-xs font-semibold text-gray-600">{selectedHandoverForView.vehicle_marca} {selectedHandoverForView.vehicle_modelo}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Kilometraje</p>
                  <p className="text-base font-black text-emerald-700">{(selectedHandoverForView.kilometraje || 0).toLocaleString()} KM</p>
                </div>
              </div>

              {/* Conductor */}
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-800 uppercase">Conductor Receptor / Entregante</p>
                  <p className="text-sm font-black text-emerald-950">{selectedHandoverForView.driver_name || 'No especificado'}</p>
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <FileText className="w-4 h-4 text-emerald-600" /> Observaciones y Novedades del Vehículo
                </h4>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-700 leading-relaxed font-medium">
                  {selectedHandoverForView.observaciones ? (
                    <p>{selectedHandoverForView.observaciones}</p>
                  ) : (
                    <p className="text-gray-400 italic">No se registraron observaciones o novedadas específicas en este documento.</p>
                  )}
                </div>
              </div>

              {/* Documento Firmado */}
              {getImageUrl(selectedHandoverForView.documento_acta_firmada) ? (
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <ExternalLink className="w-4 h-4 text-emerald-600" /> Documento Físico Firmado Digitalizado
                  </h4>
                  <a
                    href={getImageUrl(selectedHandoverForView.documento_acta_firmada)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-md"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir Documento PDF / Foto en Nueva Pestaña
                  </a>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 text-amber-900 rounded-2xl border border-amber-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Documento digitalizado no adjunto aún para este registro.</span>
                </div>
              )}

              <div className="pt-4 flex justify-end border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedHandoverForView(null)}
                  className="px-6 py-2.5 rounded-xl font-bold bg-gray-900 text-white hover:bg-gray-800 transition-colors text-xs cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR / EDITAR ACTA (ADMINISTRADOR ÚNICAMENTE) */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl shadow-sm">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">
                    {editingHandover ? 'Editar Acta de Entrega / Recepción' : 'Nueva Acta de Entrega / Recepción'}
                  </h2>
                  <p className="text-xs text-emerald-200">Registro oficial firmado por el conductor</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveHandover} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Tipo de Acta */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Tipo de Acta *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setActaForm(prev => ({ ...prev, tipo_acta: 'Entrega' }))}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      actaForm.tipo_acta === 'Entrega'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Entrega de Vehículo
                  </button>
                  <button
                    type="button"
                    onClick={() => setActaForm(prev => ({ ...prev, tipo_acta: 'Recepción' }))}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      actaForm.tipo_acta === 'Recepción'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Recepción de Vehículo
                  </button>
                </div>
              </div>

              {/* Conductor */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Conductor Asignado *
                </label>
                <select
                  required
                  value={actaForm.driver}
                  onChange={e => setActaForm({ ...actaForm, driver: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                >
                  <option value="">Seleccione conductor...</option>
                  {drivers.map((d, idx) => (
                    <option key={d.userId || idx} value={d.userId?.toString()}>
                      {d.name} ({d.username})
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehículo */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Vehículo de la Flota *
                </label>
                <select
                  required
                  value={actaForm.vehicle}
                  onChange={e => {
                    const vehId = e.target.value;
                    const v = vehicles.find(item => item.id.toString() === vehId || item.public_id === vehId);
                    setActaForm({
                      ...actaForm,
                      vehicle: vehId,
                      kilometraje: v ? (v.odometro_actual || 0).toString() : actaForm.kilometraje
                    });
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                >
                  <option value="">Seleccione vehículo...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id.toString()}>
                      {v.placa} - {v.marca} {v.modelo} (Odómetro: {v.odometro_actual} km)
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha & Odómetro */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Fecha de Acta *
                  </label>
                  <input
                    type="date"
                    required
                    value={actaForm.fecha}
                    onChange={e => setActaForm({ ...actaForm, fecha: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Kilometraje (KM) *
                  </label>
                  <input
                    type="number"
                    required
                    value={actaForm.kilometraje}
                    onChange={e => setActaForm({ ...actaForm, kilometraje: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Documento Acta Firmada (PDF / Foto) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Documento Acta Firmada (PDF o Imagen) {editingHandover && '(Opcional para conservar archivo actual)'}
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={e => setDocumentoFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Observaciones / Estado del Vehículo
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalles sobre rayones, nivel de combustible, llanta de emergencia, botiquín..."
                  value={actaForm.observaciones}
                  onChange={e => setActaForm({ ...actaForm, observaciones: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Guardando...' : editingHandover ? 'Actualizar Acta' : 'Guardar Acta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleHandovers;
