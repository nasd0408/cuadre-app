// stores/offlineQueueStore.ts
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LEGACY_QUEUE_KEY = "@offline_queue";
const queueKey = (scope: string | null) =>
  scope ? `${LEGACY_QUEUE_KEY}:${scope}` : LEGACY_QUEUE_KEY;

export type OfflineCitaTipo = "pagada" | "pendiente";

export interface OfflineCita {
  id: string; // uuid local
  tipo: OfflineCitaTipo;

  // Cliente existente (uno u otro)
  clienteId?: number;
  // Cliente nuevo
  clienteNombre: string;
  clienteTelefono?: string;
  esClienteNuevo: boolean;

  empleadoId: number;
  empleadoNombre: string;
  fecha: string; // ISO string
  servicios: {
    servicioId: number;
    servicioNombre: string;
    precio: number;
    cantidad: number;
  }[];
  observacionesPago?: string;
  creadoEn: string;
  sincronizado: boolean;
  error?: string;
}

interface OfflineQueueStore {
  queue: OfflineCita[];
  loading: boolean;
  scope: string | null;
  syncing: boolean;
  syncMessage: string;

  loadQueue: (scope?: string) => Promise<void>;
  addCita: (cita: Omit<OfflineCita, "id" | "creadoEn" | "sincronizado">) => Promise<void>;
  markSynced: (id: string) => Promise<void>;
  markError: (id: string, error: string) => Promise<void>;
  removeCita: (id: string) => Promise<void>;
  clearSynced: () => Promise<void>;
  getPending: () => OfflineCita[];
  setSyncing: (syncing: boolean) => void;
  setSyncMessage: (message: string) => void;
  clearSyncMessage: () => void;
  reset: () => void;
}

const persist = async (queue: OfflineCita[], scope: string | null) => {
  await AsyncStorage.setItem(queueKey(scope), JSON.stringify(queue));
};

export const useOfflineQueueStore = create<OfflineQueueStore>((set, get) => ({
  queue: [],
  loading: false,
  scope: null,
  syncing: false,
  syncMessage: "",

  loadQueue: async (nextScope) => {
    const scope = nextScope ?? get().scope;

    // Sin scope NO se toca nada.
    //
    // queueKey(null) devuelve la clave legacy "@offline_queue". Si esto corria
    // antes de que useOfflineSync fijara el scope -una carrera real: la pantalla
    // offline lo llamaba al montarse-, se leia la clave equivocada y, peor, las
    // citas creadas a continuacion se guardaban ahi. La migracion a la clave con
    // scope solo corre si esa clave esta VACIA, asi que esas citas quedaban
    // huerfanas y no se sincronizaban nunca.
    //
    // Son el unico dato de la app que no se puede recuperar del servidor.
    if (!scope) return;

    // El estado no se vacia antes de leer: si la lectura falla, es preferible
    // seguir mostrando lo que ya habia a ensenar una cola vacia que no lo esta.
    set({ loading: true, scope });
    try {
      let raw = await AsyncStorage.getItem(queueKey(scope));

      // Migración única de instalaciones anteriores, cuando la cola no tenía
      // separación por cuenta.
      if (!raw && scope) {
        raw = await AsyncStorage.getItem(LEGACY_QUEUE_KEY);
        if (raw) {
          await AsyncStorage.setItem(queueKey(scope), raw);
          await AsyncStorage.removeItem(LEGACY_QUEUE_KEY);
        }
      }

      const queue: OfflineCita[] = raw ? JSON.parse(raw) : [];
      set({ queue });
    } catch {
      set({ queue: [] });
    } finally {
      set({ loading: false });
    }
  },

  addCita: async (data) => {
    const nueva: OfflineCita = {
      ...data,
      id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      creadoEn: new Date().toISOString(),
      sincronizado: false,
    };
    const updated = [...get().queue, nueva];
    set({ queue: updated });
    await persist(updated, get().scope);
  },

  markSynced: async (id) => {
    const updated = get().queue.map((c) =>
      c.id === id ? { ...c, sincronizado: true, error: undefined } : c
    );
    set({ queue: updated });
    await persist(updated, get().scope);
  },

  markError: async (id, error) => {
    const updated = get().queue.map((c) =>
      c.id === id ? { ...c, error } : c
    );
    set({ queue: updated });
    await persist(updated, get().scope);
  },

  removeCita: async (id) => {
    const updated = get().queue.filter((c) => c.id !== id);
    set({ queue: updated });
    await persist(updated, get().scope);
  },

  clearSynced: async () => {
    const updated = get().queue.filter((c) => !c.sincronizado);
    set({ queue: updated });
    await persist(updated, get().scope);
  },

  getPending: () => get().queue.filter((c) => !c.sincronizado),
  setSyncing: (syncing) => set({ syncing }),
  setSyncMessage: (syncMessage) => set({ syncMessage }),
  clearSyncMessage: () => set({ syncMessage: "" }),
  reset: () =>
    set({
      queue: [],
      loading: false,
      scope: null,
      syncing: false,
      syncMessage: "",
    }),
}));
