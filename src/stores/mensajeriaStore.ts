import { create } from 'zustand';
import { mensajeriaApi, ConfiguracionMensajeria } from '../api/mensajeria';

interface MensajeriaState {
  config: ConfiguracionMensajeria | null;
  loading: boolean;
  fetch: (force?: boolean) => Promise<ConfiguracionMensajeria | null>;
  save: (data: ConfiguracionMensajeria) => Promise<void>;
  clear: () => void;
}

/**
 * Cachea la config de mensajería para que los flujos (Recordatorios, Deudores)
 * la lean sin pedirla cada vez. Se refresca al entrar a la pantalla de ajustes.
 */
export const useMensajeriaStore = create<MensajeriaState>((set, get) => ({
  config: null,
  loading: false,

  fetch: async (force = false) => {
    const current = get().config;
    if (current && !force) return current;

    set({ loading: true });
    try {
      const config = await mensajeriaApi.getConfig();
      set({ config, loading: false });
      return config;
    } catch {
      set({ loading: false });
      return get().config;
    }
  },

  save: async (data) => {
    const config = await mensajeriaApi.updateConfig(data);
    set({ config });
  },

  clear: () => set({ config: null }),
}));
