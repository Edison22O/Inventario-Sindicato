import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Wrench, DollarSign, FileText, Filter, X, ExternalLink } from 'lucide-react';

import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { Supplier, Vehicle, VehicleMaintenanceRecord } from '@/shared/types';
import { getImageUrl } from '@/shared/utils/getImageUrl';

const VehicleSupplierProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [records, setRecords] = useState<VehicleMaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Invoice Modal State
  const [selectedFactura, setSelectedFactura] = useState<{ url: string; title: string } | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'todos' | 'Preventivo' | 'Correctivo'>('todos');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');

  useEffect(() => {
    fetchSupplierData();
  }, [id]);

  const fetchSupplierData = async () => {
    try {
      const [recordsRes, vehRes] = await Promise.all([
        api.get('/vehicle-maintenance-records/'),
        api.get('/vehicles/')
      ]);
      setVehicles(vehRes.data || []);

      let supplierData = null;
      try {
        const suppRes = await api.get(`/vehicle-suppliers/${id}/`);
        supplierData = suppRes.data;
      } catch (err) {
        // Respaldo resiliente: buscar por id o public_id en el listado general
        const listRes = await api.get('/vehicle-suppliers/');
        const suppliersList = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.results || []);
        supplierData = suppliersList.find((s: any) => s.id?.toString() === id || s.public_id === id);
      }

      if (!supplierData) {
        setSupplier(null);
        return;
      }

      setSupplier(supplierData);

      // Filtrar registros que pertenecen a este proveedor
      const allRecs: VehicleMaintenanceRecord[] = recordsRes.data || [];
      const supplierId = supplierData.id;
      const supplierName = (supplierData.name || '').toLowerCase();
      const filteredRecs = allRecs.filter(r => {
        if (!r) return false;
        let rSupId: any = null;
        if (typeof r.supplier === 'object' && r.supplier !== null) {
          rSupId = (r.supplier as any).id;
        } else {
          rSupId = r.supplier;
        }
        const matchesId = rSupId && (rSupId === supplierId || rSupId.toString() === supplierId.toString());
        const matchesTaller = r.taller && supplierName && r.taller.toLowerCase().includes(supplierName);
        return matchesId || matchesTaller;
      });
      setRecords(filteredRecs);
    } catch (error) {
      toast.error('Error al cargar perfil del proveedor');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (typeFilter !== 'todos' && r.tipo_mantenimiento !== typeFilter) return false;
      if (selectedVehicle && r.vehicle.toString() !== selectedVehicle) return false;
      return true;
    });
  }, [records, typeFilter, selectedVehicle]);

  // Metrics
  const countPreventivos = records.filter(r => r.tipo_mantenimiento === 'Preventivo').length;
  const countCorrectivos = records.filter(r => r.tipo_mantenimiento === 'Correctivo').length;
  const totalCost = records.reduce((acc, r) => acc + parseFloat(r.costo?.toString() || '0'), 0);
  const totalManoObra = records.reduce((acc, r) => acc + parseFloat(r.subtotal_mano_obra?.toString() || '0'), 0);
  const totalMateriales = records.reduce((acc, r) => acc + parseFloat(r.subtotal_materiales?.toString() || '0'), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Proveedor no encontrado.</p>
        <Link to="/vehicles/suppliers" className="mt-4 inline-block px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold">Volver al catálogo</Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-[1700px] mx-auto pb-32 relative">
      {/* Background Texture */}
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none rounded-3xl mix-blend-multiply" />

      {/* Navigation Back Link */}
      <div className="relative z-10 mb-6">
        <Link
          to="/vehicles/suppliers"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al directorio de proveedores</span>
        </Link>
      </div>

      {/* Profile Header Banner */}
      <div className="relative z-10 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-8 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-emerald-600 text-white flex items-center justify-center font-black text-3xl shadow-lg shadow-emerald-600/20 shrink-0">
              {supplier.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{supplier.name}</h1>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full">
                  Proveedor Registrado
                </span>
              </div>
              <p className="text-gray-500 font-semibold text-sm mt-1">Contacto Principal: {supplier.contact_name || 'No especificado'}</p>
              
              <div className="flex flex-wrap gap-4 mt-3 text-xs font-medium text-gray-600">
                {supplier.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-emerald-600" />
                    <span>{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>{supplier.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stat Badges */}
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center min-w-[130px] flex-1 md:flex-initial">
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total Facturado</p>
              <p className="text-xl font-black text-emerald-900">${totalCost.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-center min-w-[110px] flex-1 md:flex-initial">
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Preventivos</p>
              <p className="text-xl font-black text-amber-900">{countPreventivos}</p>
            </div>
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-center min-w-[110px] flex-1 md:flex-initial">
              <p className="text-[10px] font-bold text-red-800 uppercase tracking-wider">Correctivos</p>
              <p className="text-xl font-black text-red-900">{countCorrectivos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Breakdown Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Subtotal Mano de Obra (Servicios)</p>
            <p className="text-2xl font-black text-gray-900">${totalManoObra.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-teal-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center font-bold">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-teal-800 uppercase">Subtotal Materiales (Repuestos)</p>
            <p className="text-2xl font-black text-gray-900">${totalMateriales.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-blue-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-800 uppercase">Total General Invertido</p>
            <p className="text-2xl font-black text-gray-900">${totalCost.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto flex-1">
          <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>Filtrar Historial del Proveedor:</span>
          </div>

          <select
            value={selectedVehicle}
            onChange={e => setSelectedVehicle(e.target.value)}
            className="w-full sm:w-64 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Todos los vehículos</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id.toString()}>{v.placa} - {v.marca} {v.modelo}</option>
            ))}
          </select>
        </div>

        {/* Preventivo vs Correctivo Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTypeFilter('todos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              typeFilter === 'todos' ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos ({records.length})
          </button>
          <button
            onClick={() => setTypeFilter('Preventivo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              typeFilter === 'Preventivo' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Preventivos ({countPreventivos})
          </button>
          <button
            onClick={() => setTypeFilter('Correctivo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              typeFilter === 'Correctivo' ? 'bg-red-600 text-white shadow-sm' : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Correctivos ({countCorrectivos})
          </button>
        </div>
      </div>

      {/* Main History Table */}
      <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white font-bold uppercase tracking-wider shadow-sm">
                <th className="px-4 py-4 text-center">Nº</th>
                <th className="px-4 py-4">FECHA</th>
                <th className="px-4 py-4">VEHÍCULO / PLACA</th>
                <th className="px-4 py-4">TIPO</th>
                <th className="px-4 py-4">ACTIVIDAD / SERVICIO</th>
                <th className="px-4 py-4 text-right">MANO DE OBRA</th>
                <th className="px-4 py-4 text-right">MATERIALES</th>
                <th className="px-4 py-4 text-right">COSTO TOTAL</th>
                <th className="px-4 py-4">N.º FACTURA</th>
                <th className="px-4 py-4">DETALLE Y SOLUCIÓN</th>
                <th className="px-4 py-4 text-center">COMPROBANTE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-xs">
              {filteredRecords.map((r, index) => {
                const isCorrective = r.tipo_mantenimiento === 'Correctivo';

                return (
                  <tr key={r.id} className={`hover:bg-gray-50/80 transition-colors ${isCorrective ? 'bg-red-50/20' : ''}`}>
                    <td className="px-4 py-3.5 text-center text-gray-400 font-bold">{index + 1}</td>
                    
                    <td className="px-4 py-3.5 text-gray-700 font-semibold">{r.fecha}</td>

                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-gray-900">{r.vehicle_placa}</div>
                      <div className="text-[10px] text-gray-500 font-semibold">{r.vehicle_marca} {r.vehicle_modelo}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isCorrective ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                      }`}>
                        {r.tipo_mantenimiento || 'Preventivo'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-bold text-gray-800">
                      {r.actividad_nombre}
                    </td>

                    <td className="px-4 py-3.5 text-right font-semibold text-gray-700">
                      ${parseFloat(r.subtotal_mano_obra?.toString() || '0').toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-4 py-3.5 text-right font-semibold text-gray-700">
                      ${parseFloat(r.subtotal_materiales?.toString() || '0').toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-4 py-3.5 text-right font-black text-emerald-600">
                      ${parseFloat(r.costo?.toString() || '0').toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-4 py-3.5 text-gray-700 font-bold">
                      {r.numero_factura || '-'}
                    </td>

                    <td className="px-4 py-3.5 max-w-xs text-xs">
                      {isCorrective ? (
                        <div className="space-y-1">
                          {r.fallo_observado && (
                            <p className="text-red-700 font-semibold"><span className="font-bold">Falló:</span> {r.fallo_observado}</p>
                          )}
                          {r.solucion_aplicada && (
                            <p className="text-emerald-800 font-medium"><span className="font-bold">Solución:</span> {r.solucion_aplicada}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-600 italic truncate">{r.notas || 'Sin observaciones'}</p>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {r.factura_foto ? (
                        <button
                          type="button"
                          onClick={() => setSelectedFactura({
                            url: getImageUrl(r.factura_foto),
                            title: `Comprobante Factura ${r.numero_factura ? `Nº ${r.numero_factura}` : ''} - ${r.vehicle_placa}`
                          })}
                          className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Ver Factura</span>
                        </button>
                      ) : (
                        <span className="text-gray-400 font-semibold">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-500 font-medium">
                    No se encontraron intervenciones registradas para este proveedor con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Factura Preview Modal (Estilo Historial de Viajes) */}
      {selectedFactura && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedFactura(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-base">{selectedFactura.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedFactura.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-gray-200 rounded-full transition-colors"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button 
                  onClick={() => setSelectedFactura(null)} 
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                  title="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[75vh] bg-black/5 overflow-auto">
              {selectedFactura.url.toLowerCase().endsWith('.pdf') ? (
                <iframe 
                  src={selectedFactura.url} 
                  title={selectedFactura.title}
                  className="w-full h-[70vh] rounded-xl border border-gray-200" 
                />
              ) : (
                <img 
                  src={selectedFactura.url} 
                  alt={selectedFactura.title} 
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

export default VehicleSupplierProfile;
