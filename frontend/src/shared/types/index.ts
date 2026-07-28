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
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface Product {
  id: number;
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
  placa: string;
  marca: string;
  modelo: string;
  año: number;
  color: string;
  estado_actual: string;
  foto_vehiculo?: string;
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
  gasolina_salida: number;
  foto_evidencia_salida?: string;
  fecha_hora_llegada?: string;
  kilometraje_llegada?: number;
  gasolina_llegada?: number;
  foto_evidencia_llegada?: string;
  descripcion_llegada?: string;
}

// Trick to force Vite to treat this as a module with at least one export
export const __vite_types_fix = true;
