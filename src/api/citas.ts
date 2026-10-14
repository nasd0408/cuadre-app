import { apiClient } from './client';
import {
  CitaResponse,
  CitasPagedResponse,
  CitasFiltros,
  CreateCitaBaseDto,
} from '../types';
import { localDayParams } from '../utils/datetime';
import { analytics, AnalyticsEvent } from '../analytics';
import { filtrosRangoCitas } from '../utils/agenda';

export const citasApi = {
  // Lista paginada con filtros
  getAll: async (filtros?: CitasFiltros, signal?: AbortSignal): Promise<CitasPagedResponse> => {
    const params = new URLSearchParams();
    
    if (filtros?.empleadoId) params.append('empleadoId', filtros.empleadoId.toString());
    if (filtros?.clienteId) params.append('clienteId', filtros.clienteId.toString());
    if (filtros?.estado !== undefined) params.append('estado', filtros.estado.toString());
    if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
    if (filtros?.page) params.append('page', filtros.page.toString());
    if (filtros?.pageSize) params.append('pageSize', filtros.pageSize.toString());
    if (filtros?.orderBy) params.append('orderBy', filtros.orderBy);

    const response = await apiClient.get<CitasPagedResponse>(`/citas?${params.toString()}`, { signal });
    return response.data;
  },

  getRangoCalendario: async (from: Date, to: Date, estado?: number, signal?: AbortSignal): Promise<CitaResponse[]> => {
    const filtros = { ...filtrosRangoCitas(from, to), estado, pageSize: 100, orderBy: 'fecha_asc' };
    const primera = await citasApi.getAll({ ...filtros, page: 1 }, signal);
    const citas = new Map(primera.items.map(cita => [cita.id, cita]));
    // La API limita a 100 aunque el cliente solicite 500. Recorrer todas las páginas.
    for (let page = 2; page <= primera.totalPages; page++) {
      const siguiente = await citasApi.getAll({ ...filtros, page }, signal);
      siguiente.items.forEach(cita => citas.set(cita.id, cita));
    }
    return [...citas.values()];
  },

  // Citas de hoy (según la fecha local del dispositivo)
  getHoy: async (empleadoId?: number): Promise<CitaResponse[]> => {
    const params = new URLSearchParams(localDayParams());
    if (empleadoId) params.append('empleadoId', empleadoId.toString());
    const response = await apiClient.get<CitaResponse[]>(`/citas/hoy?${params.toString()}`);
    return response.data;
  },

  // Citas pendientes de pago
  getPendientes: async (): Promise<CitaResponse[]> => {
    const response = await apiClient.get<CitaResponse[]>('/citas/pendientes');
    return response.data;
  },

  // Detalle de una cita
  getById: async (id: number): Promise<CitaResponse> => {
    const response = await apiClient.get<CitaResponse>(`/citas/${id}`);
    return response.data;
  },

  // Crear cita pagada
  createPagada: async (data: CreateCitaBaseDto): Promise<CitaResponse> => {
    const response = await apiClient.post<CitaResponse>('/citas/pagada', data);
    analytics.track(AnalyticsEvent.CitaCreated, { tipo: 'pagada' });
    return response.data;
  },

  // Crear cita pendiente
  createPendiente: async (data: CreateCitaBaseDto): Promise<CitaResponse> => {
    const response = await apiClient.post<CitaResponse>('/citas/pendiente', data);
    analytics.track(AnalyticsEvent.CitaCreated, { tipo: 'pendiente' });
    return response.data;
  },


  agendar: async (data: CreateCitaBaseDto): Promise<CitaResponse> => {
    const response = await apiClient.post<CitaResponse>('/citas/agendar', data);
    analytics.track(AnalyticsEvent.CitaCreated, { tipo: 'agendada' });
    return response.data;
  },
  actualizar: async (
    id: number,
    data: CreateCitaBaseDto,
  ): Promise<CitaResponse> => {
    const response = await apiClient.put<CitaResponse>(`/citas/${id}`, data);
    return response.data;
  },
  // Cobrar cita pendiente
  cobrar: async (id: number, observaciones?: string): Promise<CitaResponse> => {
    const response = await apiClient.post<CitaResponse>(`/citas/${id}/cobrar`, {
      observaciones,
    });
    return response.data;
  },
  marcarAsistida: async (id: number): Promise<CitaResponse> => {
    const response = await apiClient.post(`/citas/${id}/marcar-asistida`);
    return response.data;
  },

  marcarPagada: async (id: number, observaciones?: string): Promise<CitaResponse> => {
    const response = await apiClient.post(`/citas/${id}/marcar-pagada`, {
      observaciones,
    });
    return response.data;
  },

  cerrar: async (id: number): Promise<CitaResponse> => {
    const response = await apiClient.post(`/citas/${id}/cerrar`);
    return response.data;
  },
  // Cancelar cita
  cancelar: async (id: number): Promise<void> => {
    await apiClient.delete(`/citas/${id}`);
  },
};
