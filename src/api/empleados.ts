import apiClient from './client';
import { Empleado } from '../types';
import { useOfflineCacheStore } from '../stores/offlineCacheStore';

export interface CreateEmpleadoDto {
  nombre: string;
  porcentajeComision: number;
  periodicidad: number;
}

export interface EmpleadoDetalle {
  id: number;
  nombre: string;
  porcentajeComision: number;
  periodicidad: number;
  periodicidadNombre: string;
  activo: boolean;
  fechaUltimoPago?: string;
  rendimientoHoy: Rendimiento;
  rendimientoSemana: Rendimiento;
  rendimientoMes: Rendimiento;
  comisionPendiente: number;
  citasPendientesPago: number;
  ultimosDias: ResumenDiario[];
}

export interface Rendimiento {
  totalCitas: number;
  citasCerradas: number;
  totalGenerado: number;
  comisionGenerada: number;
}

export interface ResumenDiario {
  fecha: string;
  citas: number;
  total: number;
  comision: number;
}

export const empleadosApi = {
  getAll: async (): Promise<Empleado[]> => {
    const response = await apiClient.get<Empleado[]>('/empleados');
        useOfflineCacheStore.getState().updateEmpleados(
      response.data.map(c => ({ id: c.id, nombre: c.nombre }))
    );
    return response.data;
  },

  getById: async (id: number): Promise<Empleado> => {
    const response = await apiClient.get<Empleado>(`/empleados/${id}`);
    return response.data;
  },

  getDetalle: async (id: number): Promise<EmpleadoDetalle> => {
    const response = await apiClient.get<EmpleadoDetalle>(`/empleados/${id}/detalle`);
    return response.data;
  },
  getHistorial: (id: number, page: number, pageSize: number) =>
  apiClient.get(`/empleados/${id}/historial`, { params: { page, pageSize } }).then(r => r.data),

  create: async (data: CreateEmpleadoDto): Promise<Empleado> => {
    const response = await apiClient.post<Empleado>('/empleados', data);
    return response.data;
  },

  update: async (id: number, data: Partial<CreateEmpleadoDto & { activo: boolean }>): Promise<void> => {
    await apiClient.put(`/empleados/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/empleados/${id}`);
  },
};