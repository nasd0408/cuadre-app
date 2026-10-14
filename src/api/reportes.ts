import apiClient from './client';

// =============== DEUDORES ===============
export interface ClienteDeudor {
  clienteId: number;
  nombre: string;
  telefono?: string;
  deuda: number;
  fechaPrimeraDeuda?: string;
  fechaUltimaVisita?: string;
  citasPendientes: number;
  detalle: DeudaDetalle[];
}

export interface DeudaDetalle {
  citaId: number;
  fecha: string;
  monto: number;
  servicios: string;
}

export interface ReporteDeudores {
  totalDeuda: number;
  totalDeudores: number;
  deudaPromedio: number;
  deudores: ClienteDeudor[];
}

// =============== HISTORIAL ===============
export interface FiltrosHistorial {
  fechaDesde?: string;
  fechaHasta?: string;
  agrupacion?: 'dia' | 'semana' | 'mes';
  empleadoId?: number;
}

export interface ResumenPeriodo {
  etiqueta: string;
  fechaInicio: string;
  fechaFin: string;
  ingresos: number;
  servicios: number;
  citas: number;
  ticketPromedio: number;
  nominas: number;
  neto: number;
}

export interface DesglosePagoEmpleado {
  empleadoId: number;
  empleadoNombre: string;
  totalPagado: number;
  cantidadAbonos: number;
}

export interface Clientela {
  atendidos: number;
  nuevos: number;
  recurrentes: number;
  /** % de atendidos que ya eran clientes. Es la métrica de fidelidad. */
  porcentajeRecurrencia: number;
  /** Clientes con historial que llevan demasiado sin volver. */
  enRiesgo: number;
  diasParaRiesgo: number;
}

export interface ReporteHistorial {
  fechaDesde: string;
  fechaHasta: string;
  agrupacion: string;
  // Bruto
  ingresosTotales: number;
  serviciosTotales: number;
  citasTotales: number;
  ticketPromedio: number;
  ingresosPeriodoAnterior: number;
  porcentajeCambio: number;
  // Nóminas
  totalNominas: number;
  nominasPeriodoAnterior: number;
  // Neto
  ingresoNeto: number;
  porcentajeCambioNeto: number;
  // Clientela
  clientela: Clientela;
  // Detalle
  periodos: ResumenPeriodo[];
  topEmpleados: {
    barberoId: number;
    nombre: string;
    serviciosCount: number;
    totalGenerado: number;
    comisionGenerada: number;
  }[];
  topServicios: {
    servicioId: number;
    nombre: string;
    cantidad: number;
    ingresos: number;
  }[];
  desglosePagos: DesglosePagoEmpleado[];
}

export const reportesApi = {
  getDeudores: async (): Promise<ReporteDeudores> => {
    const response = await apiClient.get<ReporteDeudores>('/reportes/deudores');
    return response.data;
  },

  getHistorial: async (filtros?: FiltrosHistorial): Promise<ReporteHistorial> => {
    const params = new URLSearchParams();
    if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
    if (filtros?.agrupacion) params.append('agrupacion', filtros.agrupacion);
    if (filtros?.empleadoId) params.append('empleadoId', filtros.empleadoId.toString());

    const response = await apiClient.get<ReporteHistorial>(`/reportes/historial?${params.toString()}`);
    return response.data;
  },
};