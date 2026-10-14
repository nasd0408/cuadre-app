import apiClient from './client';
import { Cliente, CreateClienteDto } from '../types';
import { useOfflineCacheStore } from '../stores/offlineCacheStore';

export const clientesApi = {
  getAll: async (): Promise<Cliente[]> => {
    const response = await apiClient.get<Cliente[]>('/clientes');
    // Se cachea también el teléfono: permite avisar de clientes duplicados al
    // importar desde la agenda sin tener que pedir la lista otra vez.
    useOfflineCacheStore.getState().updateClientes(
      response.data.map(c => ({ id: c.id, nombre: c.nombre, telefono: c.telefono }))
    );
    return response.data;
  },

  getById: async (id: number): Promise<Cliente> => {
    const response = await apiClient.get<Cliente>(`/clientes/${id}`);
    return response.data;
  },

  create: async (data: CreateClienteDto): Promise<Cliente> => {
    const response = await apiClient.post<Cliente>('/clientes', data);
    return response.data;
  },

  update: async (id: number, data: Partial<CreateClienteDto>): Promise<void> => {
    await apiClient.put(`/clientes/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/clientes/${id}`);
  },

  getDeudores: async (): Promise<any[]> => {
    const response = await apiClient.get('/clientes/deudores');
    return response.data;
  },

};