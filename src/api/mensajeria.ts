import apiClient from './client';
import { WhatsAppApp } from '../utils/whatsapp';

export interface ConfiguracionMensajeria {
  codigoPais: string;
  appDestino: WhatsAppApp;
  plantillaRecordatorio: string;
  plantillaDeudor: string;
  plantillaConfirmacion: string;
}

export const mensajeriaApi = {
  getConfig: async (): Promise<ConfiguracionMensajeria> => {
    const response = await apiClient.get<ConfiguracionMensajeria>('/mensajeria/config');
    return response.data;
  },

  updateConfig: async (data: ConfiguracionMensajeria): Promise<ConfiguracionMensajeria> => {
    const response = await apiClient.put<ConfiguracionMensajeria>('/mensajeria/config', data);
    return response.data;
  },
};
