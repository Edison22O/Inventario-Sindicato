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

// Trick to force Vite to treat this as a module with at least one export
export const __vite_types_fix = true;
