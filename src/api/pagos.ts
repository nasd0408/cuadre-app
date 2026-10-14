import apiClient from './client';

export interface ResumenNominaEmpleado {
  empleadoId: number;
  empleadoNombre: string;
  porcentajeComision: number;
  citasPendientes: number;
  comisionPendiente: number;
  ultimoPago?: string;
  nominasPendientes: PagoNomina[];
}

export interface ResumenGeneralNominas {
  totalPendientePagar: number;
  empleadosConPendientes: number;
  empleados: ResumenNominaEmpleado[];
}

export interface PagoNomina {
  id: number;
  empleadoId: number;
  empleadoNombre: string;
  fechaCorte: string;
  montoTotal: number;
  montoPagado: number;
  montoPendiente: number;
  estado: number;
  estadoNombre: string;
  abonos: Abono[];
}

export interface Abono {
  id: number;
  monto: number;
  fechaAbono: string;
}

export interface ComisionesPendientes {
  empleado: string;
  porcentajeComision: number;
  cantidadCitas: number;
  totalComisionAcumulada: number;
  detalle: {
    citaId: number;
    fecha: string;
    clienteNombre: string;
    servicios: string[];
    total: number;
    comision: number;
  }[];
}

export const pagosApi = {
  // Resumen general
  getResumen: async (): Promise<ResumenGeneralNominas> => {
    const response = await apiClient.get<ResumenGeneralNominas>('/pagos/resumen');
    return response.data;
  },

  // Comisiones pendientes de un empleado
  getPendientes: async (empleadoId: number): Promise<ComisionesPendientes> => {
    const response = await apiClient.get<ComisionesPendientes>(`/pagos/pendientes/${empleadoId}`);
    return response.data;
  },

  // Generar nómina
  generarNomina: async (empleadoId: number): Promise<any> => {
    const response = await apiClient.post(`/pagos/generar-nomina/${empleadoId}`);
    return response.data;
  },

  // Abonar a nómina
  abonar: async (pagoNominaId: number, monto: number): Promise<PagoNomina> => {
    const response = await apiClient.post<PagoNomina>('/pagos/abonar', {
      pagoNominaId,
      monto,
    });
    return response.data;
  },

  // Pagar nómina completa
  pagarCompleto: async (nominaId: number): Promise<PagoNomina> => {
    const response = await apiClient.post<PagoNomina>(`/pagos/pagar-completo/${nominaId}`);
    return response.data;
  },

  // Detalle de nómina
  getNomina: async (nominaId: number): Promise<PagoNomina> => {
    const response = await apiClient.get<PagoNomina>(`/pagos/nomina/${nominaId}`);
    return response.data;
  },
};