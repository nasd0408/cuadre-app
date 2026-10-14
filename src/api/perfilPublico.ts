import { isAxiosError } from 'axios';
import { apiClient } from './client';

export interface PerfilPublico {
  nombre: string;
  descripcion: string | null;
  categoria: string;
  telefonoPublico: string | null;
  instagram: string | null;
  facebook: string | null;
  tikTok: string | null;
  publicado: boolean;
}

export interface SucursalInput {
  nombre: string;
  direccionPublica: string | null;
  latitud: number | null;
  longitud: number | null;
  publicada: boolean;
}
export interface Sucursal extends SucursalInput { id: number }
export interface ConfiguracionReservas {
  activas: boolean; sucursalId: number | null; token: string | null;
  profesionales: { id: number; nombre: string; zonaHoraria: string }[];
}

export const perfilPublicoApi = {
  async getReservas(): Promise<ConfiguracionReservas> {
    return (await apiClient.get<ConfiguracionReservas>('/empresa/reservas-publicas')).data;
  },
  async saveReservas(activas: boolean, sucursalId: number | null): Promise<ConfiguracionReservas> {
    return (await apiClient.put<ConfiguracionReservas>('/empresa/reservas-publicas', { activas, sucursalId })).data;
  },
  async getPerfil(): Promise<PerfilPublico | null> {
    try {
      return (await apiClient.get<PerfilPublico>('/empresa/perfil-publico')).data;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
  async savePerfil(data: PerfilPublico): Promise<PerfilPublico> {
    return (await apiClient.put<PerfilPublico>('/empresa/perfil-publico', data)).data;
  },
  async getSucursales(): Promise<Sucursal[]> {
    return (await apiClient.get<Sucursal[]>('/empresa/sucursales')).data;
  },
  async saveSucursal(data: SucursalInput, id?: number): Promise<Sucursal> {
    return id === undefined
      ? (await apiClient.post<Sucursal>('/empresa/sucursales', data)).data
      : (await apiClient.put<Sucursal>(`/empresa/sucursales/${id}`, data)).data;
  },
};
