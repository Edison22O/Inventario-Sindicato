import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Store, Search, Plus, Phone, Mail, MapPin, Wrench, DollarSign, Edit2, Trash2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/services/api';
import type { Supplier, VehicleMaintenanceRecord } from '@/shared/types';
import { confirmDialog } from '@/shared/utils/confirmDialog';
import { useWebSocket } from '@/shared/context/WebSocketContext';


const VehicleSuppliersCatalog = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [maintRecords, setMaintRecords] = useState<VehicleMaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ name: '', contact_name: '', phone: '', email: '', address: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [suppRes, recordsRes] = await Promise.all([
        api.get('/vehicle-suppliers/'),
        api.get('/vehicle-maintenance-records/')
      ]);
      setSuppliers(suppRes.data || []);
      setMaintRecords(recordsRes.data || []);
    } catch (error) {
      toast.error('Error al cargar proveedores vehiculares');
    } finally {
      setLoading(false);
    }
  };

  useWebSocket(fetchData);


  const handleOpenCreateModal = () => {
    setEditingSupplier(null);
    setFormData({ name: '', contact_name: '', phone: '', email: '', address: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_name: supplier.contact_name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingSupplier) {
        const id = editingSupplier.public_id || editingSupplier.id;
        await api.put(`/vehicle-suppliers/${id}/`, formData);
        toast.success('Proveedor vehicular actualizado');
      } else {
        await api.post('/vehicle-suppliers/', formData);
        toast.success('Proveedor vehicular registrado');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Error al guardar el proveedor vehicular');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (await confirmDialog(`¿Eliminar al proveedor "${supplier.name}"?`)) {
      try {
        const id = supplier.public_id || supplier.id;
        await api.delete(`/vehicle-suppliers/${id}/`);
        toast.success('Proveedor vehicular eliminado');
        fetchData();
      } catch (error) {
        toast.error('Error al eliminar proveedor vehicular');
      }
    }
  };


  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const searchLower = searchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(searchLower) ||
        (s.contact_name && s.contact_name.toLowerCase().includes(searchLower)) ||
        (s.phone && s.phone.toLowerCase().includes(searchLower))
      );
    });
  }, [suppliers, searchTerm]);

  // General KPIs
  const totalSuppliers = filteredSuppliers.length;
  const totalMaintRecords = maintRecords.length;
  const totalSpentAll = maintRecords.reduce((acc, r) => acc + parseFloat(r.costo?.toString() || '0'), 0);

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
              <Store className="w-7 h-7" />
            </div>
            Directorio de Proveedores y Talleres
          </h1>
          <p className="text-gray-500 mt-1.5 text-base font-medium">
            Gestión de perfiles de proveedores de mantenimiento vehicular, datos de contacto e historial de intervenciones.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          Nuevo Proveedor
        </button>
      </div>

      {/* KPI Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Proveedores Registrados</p>
            <p className="text-3xl font-black text-gray-900">{totalSuppliers}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Wrench className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Servicios Realizados</p>
            <p className="text-3xl font-black text-gray-900">{totalMaintRecords}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Gasto Total Acumulado</p>
            <p className="text-3xl font-black text-gray-900">${totalSpentAll.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative z-10 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre, contacto, teléfono..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl text-sm font-medium transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map(supplier => {
          const supplierId = supplier.id;
          const records = maintRecords.filter(r => r.supplier === supplierId || (r.taller && r.taller.toLowerCase().includes(supplier.name.toLowerCase())));
          const countServices = records.length;
          const totalSpent = records.reduce((acc, r) => acc + parseFloat(r.costo?.toString() || '0'), 0);

          return (
            <div
              key={supplier.id}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              {/* Card Header */}
              <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50/40 border-b border-emerald-100 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    {supplier.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-lg leading-tight">{supplier.name}</h3>
                    <p className="text-xs font-semibold text-emerald-700">{supplier.contact_name || 'Contacto no especificado'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(supplier)}
                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-xl transition-colors"
                    title="Editar Proveedor"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl transition-colors"
                    title="Eliminar Proveedor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-3 flex-1 text-xs">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-gray-600 font-medium">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-gray-600 font-medium">
                    <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{supplier.address}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Servicios</p>
                    <p className="text-base font-black text-gray-900">{countServices}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Total Facturado</p>
                    <p className="text-base font-black text-emerald-600">${totalSpent.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>

              {/* Card Footer Link */}
              <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <Link
                  to={`/vehicles/suppliers/${supplier.public_id || supplier.id}`}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <span>Ver Perfil e Historial</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}

        {filteredSuppliers.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-gray-100">
            <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900">No hay proveedores registrados</h3>
            <p className="text-gray-500 mt-1 text-sm">Registra proveedores o talleres mecánicos para llevar un control de mantenimientos por proveedor.</p>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar Proveedor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <Store className="w-5 h-5" />
                {editingSupplier ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre / Taller *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Taller Mecánico Los Andes"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Persona de Contacto</label>
                <input
                  type="text"
                  placeholder="Ej. Ing. Juan Pérez"
                  value={formData.contact_name}
                  onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="0991234567"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="taller@ejemplo.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Dirección / Ubicación</label>
                <textarea
                  rows={2}
                  placeholder="Ej. Av. Panamericana Km 2..."
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
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
                  className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-xs disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleSuppliersCatalog;
