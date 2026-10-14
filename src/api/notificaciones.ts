import apiClient from './client';

export interface PreferenciasNotificacion {
  digestDiario: boolean;
  avisoNomina: boolean;
  avisoSuscripcion: boolean;
  anuncios: boolean;
}

export const notificacionesApi = {
  getPreferencias: async (): Promise<PreferenciasNotificacion> => {
    const response = await apiClient.get<PreferenciasNotificacion>('/notificaciones/preferencias');
    return response.data;
  },

  updatePreferencias: async (prefs: PreferenciasNotificacion): Promise<PreferenciasNotificacion> => {
    const response = await apiClient.put<PreferenciasNotificacion>('/notificaciones/preferencias', prefs);
    return response.data;
  },

  registrarToken: async (token: string, plataforma: string): Promise<void> => {
    await apiClient.post('/notificaciones/registrar-token', { token, plataforma });
  },

  eliminarToken: async (token: string): Promise<void> => {
    await apiClient.delete('/notificaciones/token', { data: { token } });
  },

  // Envía una prueba aunque la empresa no tenga actividad.
  testNotification: async (): Promise<{
    enviado: boolean;
    dispositivos: number;
    mensaje: string;
  }> => {
    const response = await apiClient.post('/notificaciones/test');
    return response.data;
  },
};
