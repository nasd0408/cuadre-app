// ============================================
// AUTH TYPES
// ============================================
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterBarberiaDto {
  nombreBarberia: string;
  nombreCompleto: string;
  email: string;
  phoneNumber?: string;
  direccion?: string;
  password: string;
}

export interface ConfirmEmailDto {
  email: string;
  codigo: string;
}

export interface ResendCodeDto {
  email: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  codigo: string;
  newPassword: string;
}

// API Responses
export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiration: string;
  userName: string;
  userId: string;
  userEmail: string;
  empresa: string;
  empresaId: number;
  roles: string[];
}

export interface RegisterResponse {
  message: string;
  email: string;
  requiresEmailConfirmation: boolean;
}

export interface MessageResponse {
  message: string;
}

export interface ErrorResponse {
  message: string;
  requiresEmailConfirmation?: boolean;
  email?: string;
  subscriptionExpired?: boolean;
  errors?: any[];
}

export interface User {
  id: string;
  email: string;
  nombreCompleto: string;
  roles: string[];
  token: string;
  empresa: string;
  empresaId: number;
}

// ============================================
// ENTIDADES DEL NEGOCIO
// ============================================
export interface Cliente {
  id: number;
  nombre: string;
  telefono?: string;
  fechaUltimoCorte?: string;
  activo: boolean;
}

export interface Empleado {
  id: number;
  nombre: string;
  porcentajeComision: number;
  periodicidad: number;
  activo: boolean;
  fechaUltimoPago?: string;
}

export interface Servicio {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  duracionMinutos: number;
  intervaloDias?: number;
  categoria?: string;
  colorHex?: string;
  enPromocion: boolean;
  imagenUrl?: string;
  activo: boolean;
}

export interface CitaServicio {
  servicioId: number;
  precio: number;
  cantidad: number;
  servicio?: Servicio;
}

export interface Cita {
  id: number;
  clienteId: number;
  empleadoId: number;
  fecha: string;
  estado: EstadoCita;
  pagadoAlEmpleado: boolean;
  cliente?: Cliente;
  empleado?: Empleado;
  citaServicios: CitaServicio[];
}

export enum EstadoCita {
  Pendiente = 0,
  PagoPendiente = 1,
  Pagada = 2,
  Cerrada = 3,
  Cancelada = 4
}

export interface DashboardSummary {
  metricasDia: {
    ingresosRealizados: number;
    totalServicios: number;
    citasPendientes: number;
  };
  cuentasPorCobrar: number;
  rendimientoBarberos: {
    barberoId: number;
    nombre: string;
    serviciosCount: number;
    totalGenerado: number;
  }[];
  topServicios: {
    servicioId: number;
    cantidad: number;
  }[];
}

// ============================================
// DTOs PARA CREAR/ACTUALIZAR
// ============================================
export interface CreateClienteDto {
  nombre: string;
  telefono?: string;
  fechaUltimoCorte?: string;
}

export interface CreateServicioDto {
  nombre: string;
  descripcion?: string;
  precio: number;
  duracionMinutos: number;
  intervaloDias?: number;
  categoria?: string;
  colorHex?: string;
  enPromocion?: boolean;
  imagenUrl?: string;
}

export interface CreateCitaServicioDto {
  servicioId: number;
  cantidad: number;
}

export interface CreateCitaBaseDto {
  clienteId: number;
  empleadoId: number;
  fecha: string;
  servicios: CreateCitaServicioDto[];
  observacionesPago?: string;
}



export interface CitaResponse {
  id: number;
  fecha: string;
  estado: number;
  estadoNombre: string;
  pagadoAlEmpleado: boolean;
  clienteId: number;
  clienteNombre: string;
  clienteTelefono?: string;
  empleadoId: number;
  empleadoNombre: string;
  servicios: CitaServicioResponse[];
  total: number;
  observaciones?: string;
}

export interface CitaServicioResponse {
  servicioId: number;
  servicioNombre: string;
  precio: number;
  cantidad: number;
  duracionMinutos: number;
  subtotal: number;
}

export interface CitasPagedResponse {
  items: CitaResponse[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CitasFiltros {
  empleadoId?: number;
  clienteId?: number;
  estado?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
}
// Add these to your existing types file

export type PlanEmpresa = "Basico" | "Profesional" | "Premium";
export type EstadoPago = "Pendiente" | "Aprobado" | "Rechazado";

export interface CreatePagoSuscripcionDto {
  planSolicitado: PlanEmpresa;
  numeroReferencia: string;
  fechaPago: string;
  metodoPago: string;
  monto: number;
  notas?: string | null;
}

export interface PagoSuscripcion {
  id: number;
  planSolicitado: PlanEmpresa;
  numeroReferencia: string;
  fechaPago: string;
  metodoPago: string;
  monto: number;
  notas?: string | null;
  estado: EstadoPago;
  fechaCreacion: string;
  empresaId: number;
}

export interface RegistrarPagoResponse {
  message: string;
  idPago: number;
}
