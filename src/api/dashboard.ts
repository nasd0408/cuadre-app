import apiClient from './client';
import { localDayParams } from '../utils/datetime';

export interface DashboardCompleto {
  metricasPeriodo: MetricasPeriodo;
  comparacion: Comparacion;
  graficoServicios: DatoGrafico[];
  graficoIngresos: DatoGrafico[];
  nominas: ResumenNominas;
  cuentasPorCobrar: number;
  clientesDeudores: number;
  rendimientoBarberos: RendimientoBarbero[];
  topServicios: TopServicio[];
  periodoNombre: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface MetricasPeriodo {
  ingresosTotales: number;
  totalServicios: number;
  citasCerradas: number;
  citasPendientes: number;
  citasCanceladas: number;
  ticketPromedio: number;
}

export interface Comparacion {
  ingresosPeriodoAnterior: number;
  serviciosPeriodoAnterior: number;
  porcentajeCambioIngresos: number;
  porcentajeCambioServicios: number;
}

export interface DatoGrafico {
  etiqueta: string;
  fecha: string;
  valor: number;
  cantidad: number;
}

export interface ResumenNominas {
  totalPendiente: number;
  empleadosConPendiente: number;
  comisionesSinProcesar: number;
  citasSinProcesar: number;
}

export interface RendimientoBarbero {
  barberoId: number;
  nombre: string;
  serviciosCount: number;
  totalGenerado: number;
  comisionGenerada: number;
  porcentajeComision: number;
}

export interface TopServicio {
  servicioId: number;
  nombre: string;
  cantidad: number;
  ingresos: number;
}

export type Periodo = 'dia' | 'semana' | 'mes';

export const dashboardApi = {
  getDashboard: async (periodo: Periodo = 'dia'): Promise<DashboardCompleto> => {
    const params = new URLSearchParams({ periodo, ...localDayParams() });
    const response = await apiClient.get<DashboardCompleto>(`/dashboard?${params.toString()}`);
    return response.data;
  },

  // Mantener compatibilidad
  getSummary: async (): Promise<DashboardCompleto> => {
    return dashboardApi.getDashboard('dia');
  },
};