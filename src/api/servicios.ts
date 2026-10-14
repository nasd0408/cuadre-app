import apiClient from './client';
import { Servicio, CreateServicioDto } from '../types';
import { useOfflineCacheStore } from '../stores/offlineCacheStore';
import { analytics, AnalyticsEvent } from '../analytics';

export const serviciosApi = {
  getAll: async (): Promise<Servicio[]> => {
    const response = await apiClient.get<Servicio[]>('/servicios');
        useOfflineCacheStore.getState().updateServicios (
      response.data.map(c => ({ id: c.id, nombre: c.nombre, precio: c.precio }))
    );
    return response.data;
  },

  getActivos: async (): Promise<Servicio[]> => {
    const response = await apiClient.get<Servicio[]>('/servicios/activos');
    return response.data;
  },

  getById: async (id: number): Promise<Servicio> => {
    const response = await apiClient.get<Servicio>(`/servicios/${id}`);
    return response.data;
  },

  create: async (data: CreateServicioDto): Promise<Servicio> => {
    const response = await apiClient.post<Servicio>('/servicios', data);
    analytics.track(AnalyticsEvent.ServicioCreated);
    return response.data;
  },

  update: async (id: number, data: Partial<CreateServicioDto & { activo: boolean }>): Promise<void> => {
    await apiClient.put(`/servicios/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/servicios/${id}`);
  },
};