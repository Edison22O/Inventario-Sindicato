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
  fecha_ingreso: string;
  category?: number;
  category_name?: string;
  fecha_ingreso?: string;
  fecha_compra?: string;
  fecha_ultimo_mantenimiento?: string;
  media_url?: string;
  image?: string | null;
}

// Trick to force Vite to treat this as a module with at least one export
export const __vite_types_fix = true;
