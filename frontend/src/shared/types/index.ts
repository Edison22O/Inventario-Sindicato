export interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  role?: number | null;
  role_name?: string;
  is_active?: boolean;
  last_login?: string | null;
}

export interface LoginCredentials {
  username: string;
  password?: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
}

export interface Department {
  id: number;
  public_id?: string;
  name: string;
}

export interface Category {
  id: number;
  public_id?: string;
  name: string;
}

export interface Supplier {
  id: number;
  public_id?: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface Product {
  id: number;
  public_id?: string;
  codigo: string;
  cantidad: number;
  nombre: string;
  color?: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  material?: string;
  dimensiones?: string;
  department: number;
  department_name?: string;
  estado?: string;
  caracteristicas?: string;
  costo: string;
  category?: number;
  category_name?: string;
  fecha_ingreso?: string;
  fecha_compra?: string;
  fecha_ultimo_mantenimiento?: string;
  supplier?: number;
  supplier_name?: string;
  media_url?: string;
  image?: string | null;
}

export interface MaintenanceLog {
  id: number;
  product: number;
  product_codigo?: string;
  product_nombre?: string;
  fecha: string;
  realizado_por: string;
  descripcion: string;
  costo: string | number;
  estado_resultante: string;
  created_at?: string;
}

export interface Vehicle {
  id: number;
  public_id?: string;
  placa: string;
  marca: string;
  modelo: string;
  año: number;
  color: string;
  chasis?: string;
  motor?: string;
  clase?: string;
  tipo?: string;
  observacion?: string;
  estado_actual: 'En Sindicato' | 'Fuera del Sindicato' | 'En Taller';
  foto_vehiculo?: string;
  
  // Nuevos campos
  mes_matricula?: string;
  fecha_vencimiento_matricula?: string;
  tipo_combustible?: string;
  capacidad_tanque_galones?: string | number;
  rendimiento_km_por_galon?: string | number;
  odometro_actual?: number;
  combustible_actual_galones?: string | number;
  dias_para_vencimiento_matricula?: number | null;
  alerta_matricula?: string;
  proximo_mantenimiento?: string;
  
  created_at?: string;
}

export interface VehicleTrip {
  id: number;
  vehicle: number;
  vehicle_placa?: string;
  vehicle_marca?: string;
  vehicle_modelo?: string;
  conductor: number;
  conductor_name?: string;
  estado_viaje: string;
  
  descripcion_salida: string;
  fecha_hora_salida?: string;
  kilometraje_salida: number;
  gasolina_salida?: number;
  foto_evidencia_salida?: string;
  
  fecha_hora_llegada?: string;
  kilometraje_llegada?: number;
  gasolina_llegada?: number;
  foto_evidencia_llegada?: string;
  novedades_observaciones?: string;
  
  galones_recargados?: string | number;
  km_recorridos?: number;
  costo_combustible_viaje?: string | number;
}

export interface VehicleMaintenance {
  id: number;
  public_id?: string;
  vehicle: number;
  vehicle_placa?: string;
  vehicle_marca?: string;
  vehicle_modelo?: string;
  tipo_mantenimiento?: 'Preventivo' | 'Correctivo';
  actividad: string;
  fecha_ultimo_cambio: string;
  fecha_proximo_cambio?: string | null;
  km_ultimo_cambio: number;
  frecuencia_km?: number | null;
  fallo_observado?: string;
  solucion_aplicada?: string;
  km_proximo_cambio: number;
  km_recorridos_desde_cambio: number;
  dias_transcurridos: number;
  dias_restantes: number | null;
  km_restantes_para_proximo_cambio: number;
  estado_alerta: string;
  notas?: string;
}

export interface VehicleMaintenanceRecord {
  id: number;
  vehicle: number;
  vehicle_placa?: string;
  vehicle_marca?: string;
  vehicle_modelo?: string;
  maintenance_rule?: number | null;
  supplier?: number | null;
  supplier_name?: string | null;
  tipo_mantenimiento?: 'Preventivo' | 'Correctivo';
  fecha: string;
  taller: string;
  subtotal_mano_obra?: string | number;
  subtotal_materiales?: string | number;
  costo: string | number;
  numero_factura?: string;
  factura_foto?: string | null;
  fallo_observado?: string;
  solucion_aplicada?: string;
  notas?: string;
  actividad_nombre?: string;
  created_at?: string;
}

export interface VehicleRegistrationRecord {
  id: number;
  vehicle: number;
  vehicle_placa?: string;
  vehicle_marca?: string;
  vehicle_modelo?: string;
  fecha_pago: string;
  año_matriculado: number;
  costo: string | number;
  lugar_tramite?: string;
  nueva_fecha_vencimiento: string;
  observaciones_pendientes?: string;
  documento_pdf_1?: string | null;
  documento_pdf_2?: string | null;
  documento_pdf_3?: string | null;
  notas?: string;
  created_at?: string;
}

export interface VehicleFuelLog {
  id: number;
  vehicle: number;
  vehicle_placa?: string;
  vehicle_marca?: string;
  vehicle_modelo?: string;
  conductor?: number | null;
  conductor_name?: string;
  responsable?: string;
  supervisado_por?: string;
  fecha_vale: string;
  numero_vale: string;
  galones: string | number;
  precio_por_galon?: string | number;
  costo_total: string | number;
  odometro_recarga: number;
  tipo_combustible: 'EXTRA' | 'DIESEL';

  tipo_transaccion?: string;
  concepto?: string;
  foto_vale?: string | null;
  created_at?: string;
}




export interface DriverProfile {
  id: number;
  public_id?: string;
  user: number;
  licencia: string;
  tipo_licencia: string;
  estado: string;
  fecha_emision_licencia?: string;
  fecha_vencimiento_licencia?: string;
  foto?: string | null;
  telefono?: string;
  direccion?: string;
  tipo_sangre?: string;
  contacto_emergencia?: string;
}

// Trick to force Vite to treat this as a module with at least one export
export const __vite_types_fix = true;
