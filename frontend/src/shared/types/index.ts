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
  
  tipo_motivo?: 'Prácticas' | 'Comisión' | 'Guincha' | 'Otro' | string;
  ruta_practica?: string;
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
  rendimiento_km_por_galon?: number;
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
  kilometraje_falla?: number | null;
  subtipo_correctivo?: 'Urgente' | 'Programado';
  estado_correctivo?: 'Pendiente' | 'Ejecutado';
  numero_factura?: string;
  factura_foto?: string | null;
  fallo_observado?: string;
  solucion_aplicada?: string;
  km_proximo_cambio: number;
  km_recorridos_desde_cambio: number;
  dias_transcurridos: number;
  dias_restantes: number | null;
  km_restantes_para_proximo_cambio: number;
  estado_alerta: string;
  notas?: string;
  supplier?: any;
}

export interface VehicleMaintenanceRecord {
  id: number;
  vehicle: number;
  vehicle_placa?: string;
  vehicle_marca?: string;
  vehicle_modelo?: string;
  maintenance_rule?: number | null;
  supplier?: any;
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

export interface FuelBudget {
  id: number;
  base_gasolina?: string | number;
  base_diesel?: string | number;
  saldo_total: string | number;
  saldo_gasolina: string | number;
  saldo_diesel: string | number;
  limite_alerta: string | number;
  updated_at?: string;
}

export interface DriverVehicleHandover {
  id: number;
  driver: number;
  driver_name?: string;
  vehicle: number;
  vehicle_placa?: string;
  vehicle_marca?: string;
  vehicle_modelo?: string;
  tipo_acta: 'Entrega' | 'Recepción';
  fecha: string;
  kilometraje: number;
  observaciones?: string;
  documento_acta_firmada?: string | null;
  created_at?: string;
}

export interface PhaseActivity {
  id: number;
  phase: number;
  numero: number;
  nombre: string;
  descripcion?: string;
  ejemplo_practico?: string;
}

export interface LearningPhase {
  id: number;
  numero: number;
  nombre: string;
  descripcion?: string;
  duracion_semanas?: string;
  nota_minima_aprobacion: number;
  activities?: PhaseActivity[];
}

export interface GradeTemplate {
  puntuacion: number;
  observacion_predeterminada: string;
  recomendacion_predeterminada: string;
}

export interface StudentEvaluation {
  id?: number;
  student: number;
  student_name?: string;
  instructor: number;
  instructor_name?: string;
  activity: number;
  activity_nombre?: string;
  activity_numero?: number;
  phase_numero?: number;
  phase_nombre?: string;
  puntuacion: number;
  observaciones?: string;
  recomendaciones?: string;
  fecha: string;
  created_at?: string;
}

export interface PracticalAttendance {
  id?: number;
  student: number;
  student_name?: string;
  instructor: number;
  instructor_name?: string;
  fecha: string;
  estado: 'PRESENTE' | 'RETRASO' | 'AUSENTE';
  observacion?: string;
}

export interface InstructorSchedule {
  id: number;
  instructor: number;
  instructor_name?: string;
  student: number;
  student_public_id?: string;
  student_name?: string;
  vehicle: number;
  vehicle_placa?: string;
  vehicle_modelo?: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  tipo_licencia: string;
  circuito_ruta?: string;
  completado: boolean;
}

export interface WeeklyInstructorReport {
  id: number;
  instructor: number;
  instructor_name?: string;
  vehicle?: number | null;
  vehicle_placa?: string;
  semana_numero: number;
  fecha_inicio: string;
  fecha_fin: string;
  periodo_academico: string;
  estado: 'BORRADOR' | 'ENVIADO' | 'REVISADO' | 'APROBADO';
  elaborado_por_nombre: string;
  revisado_por_nombre: string;
  aprobado_por_nombre: string;
  observaciones_generales?: string;
  created_at?: string;
}


export interface Student {
  id: number;
  public_id?: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  tipo_licencia: string;
  tipo_licencia_display?: string;
  telefono?: string;
  email?: string;
  instructor?: number | null;
  instructor_name?: string | null;
  activo: boolean;
  created_at?: string;
}

export interface Instructor {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  email?: string;
  role_name?: string;
  activo: boolean;
  assigned_students_count: number;
  assigned_vehicles?: Vehicle[];
  assigned_vehicle_ids?: number[];
  licencias_habilitadas?: string[];
}


export interface DriverProfile {
  id: number;
  public_id?: string;
  user: number;
  user_name?: string;
  nombres?: string;
  apellidos?: string;
  cedula?: string;
  tipo_licencia?: string;
  licencia?: string;
  numero_licencia?: string;
  fecha_emision_licencia?: string;
  fecha_expiracion_licencia?: string;
  fecha_vencimiento_licencia?: string;
  tipo_sangre?: string;
  contacto_emergencia?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  estado?: string;
  activo?: boolean;
  foto?: string | null;
}

export const __vite_types_fix = true;
