import apiClient from './client';
import { useOfflineCacheStore } from "../stores/offlineCacheStore";
import type { PlanInfo } from "../stores/planStore";

export interface PerfilUsuario {
  nombreCompleto: string;
  email: string;
  telefono?: string;
}

export interface AjustesEmpresa {
  nombre: string;
  telefono?: string;
  direccion?: string;
  logoUrl?: string;
}

export interface InfoSuscripcion {
  estado: number;
  estadoNombre: string;
  fechaVencimiento?: string;
  diasRestantes: number;
  requierePago: boolean;
  mensaje: string;
}

export const ajustesApi = {
  // Perfil
  getPerfil: async (): Promise<PerfilUsuario> => {
    const response = await apiClient.get<PerfilUsuario>('/ajustes/perfil');
    return response.data;
  },

  updatePerfil: async (data: Partial<PerfilUsuario>): Promise<void> => {
    await apiClient.put('/ajustes/perfil', data);
  },

  cambiarPassword: async (passwordActual: string, passwordNuevo: string): Promise<void> => {
    await apiClient.post('/ajustes/cambiar-password', { passwordActual, passwordNuevo });
  },

  // Empresa
  getEmpresa: async (): Promise<AjustesEmpresa> => {
    const response = await apiClient.get<AjustesEmpresa>('/ajustes/empresa');
    return response.data;
  },

  updateEmpresa: async (data: Partial<AjustesEmpresa>): Promise<void> => {
    await apiClient.put('/ajustes/empresa', data);
  },

  // Suscripción
  getSuscripcion: async (): Promise<InfoSuscripcion> => {
    const response = await apiClient.get<InfoSuscripcion>('/ajustes/suscripcion');
    return response.data;
  },
  
  getPlanInfo: async (): Promise<PlanInfo> => {
    const response = await apiClient.get<PlanInfo>("/ajustes/plan");

    // Hidratar cache offline con límites del plan
    useOfflineCacheStore.getState().updatePlanConfig({
      maxCitasOffline: response.data.maxCitasOffline,
      planNombre: response.data.planNombre,
    });

    return response.data;
  },
   eliminarCuenta: async (): Promise<{ message: string; empresaEliminada: boolean }> => {
    const response = await apiClient.delete<{ message: string; empresaEliminada: boolean }>('/ajustes/eliminar-cuenta');
    return response.data;
  },
};