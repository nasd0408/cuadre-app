// stores/offlineCacheStore.ts
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LEGACY_CACHE_KEYS = {
  clientes: "@offline_cache_clientes",
  empleados: "@offline_cache_empleados",
  servicios: "@offline_cache_servicios",
  planConfig: "@offline_cache_plan",
};
const cacheKey = (key: keyof typeof LEGACY_CACHE_KEYS, scope: string | null) =>
  scope ? `${LEGACY_CACHE_KEYS[key]}:${scope}` : LEGACY_CACHE_KEYS[key];

interface CachedItem {
  id: number;
  nombre: string;
  /** Opcional a propósito: el caché ya guardado en los teléfonos no lo trae. */
  telefono?: string;
}

interface CachedServicio extends CachedItem {
  precio: number;
}

interface CachedPlanConfig {
  maxCitasOffline: number; // -1 = ilimitado
  planNombre: string;
}

interface OfflineCacheStore {
  clientes: CachedItem[];
  empleados: CachedItem[];
  servicios: CachedServicio[];
  planConfig: CachedPlanConfig;
  loaded: boolean;
  scope: string | null;

  loadCache: (scope?: string) => Promise<void>;
  updateClientes: (items: CachedItem[]) => Promise<void>;
  updateEmpleados: (items: CachedItem[]) => Promise<void>;
  updateServicios: (items: CachedServicio[]) => Promise<void>;
  updatePlanConfig: (config: CachedPlanConfig) => Promise<void>;
  reset: () => void;
}

const DEFAULT_PLAN: CachedPlanConfig = {
  maxCitasOffline: 5, // fallback conservador si no se ha cargado
  planNombre: "Gratis", // plan de entrada desde que se eliminó el trial
};

export const useOfflineCacheStore = create<OfflineCacheStore>((set, get) => ({
  clientes: [],
  empleados: [],
  servicios: [],
  planConfig: DEFAULT_PLAN,
  loaded: false,
  scope: null,

  loadCache: async (nextScope) => {
    const scope = nextScope ?? get().scope;

    // Mismo motivo que en offlineQueueStore.loadQueue: sin scope se leeria la
    // clave legacy, que es de otra cuenta o esta vacia. Quien fija el scope es
    // useOfflineSync, y hay carrera con las pantallas que cargan al montarse.
    if (!scope) return;

    // No se vacian clientes/empleados/servicios antes de leer: dejarlos vacios
    // hace que la pantalla offline crea que el cache no esta listo y bloquee el
    // alta de citas, que es justo lo unico que se puede hacer sin red.
    set({ loaded: false, scope });
    try {
      let [rawC, rawE, rawS, rawP] = await Promise.all([
        AsyncStorage.getItem(cacheKey("clientes", scope)),
        AsyncStorage.getItem(cacheKey("empleados", scope)),
        AsyncStorage.getItem(cacheKey("servicios", scope)),
        AsyncStorage.getItem(cacheKey("planConfig", scope)),
      ]);

      if (scope && !rawC && !rawE && !rawS) {
        [rawC, rawE, rawS, rawP] = await Promise.all([
          AsyncStorage.getItem(LEGACY_CACHE_KEYS.clientes),
          AsyncStorage.getItem(LEGACY_CACHE_KEYS.empleados),
          AsyncStorage.getItem(LEGACY_CACHE_KEYS.servicios),
          AsyncStorage.getItem(LEGACY_CACHE_KEYS.planConfig),
        ]);
        await Promise.all(
          ([
            ["clientes", rawC],
            ["empleados", rawE],
            ["servicios", rawS],
            ["planConfig", rawP],
          ] as const).map(([key, value]) =>
            value
              ? AsyncStorage.setItem(cacheKey(key, scope), value)
              : Promise.resolve(),
          ),
        );
        await Promise.all(
          Object.values(LEGACY_CACHE_KEYS).map((key) =>
            AsyncStorage.removeItem(key),
          ),
        );
      }
      set({
        clientes: rawC ? JSON.parse(rawC) : [],
        empleados: rawE ? JSON.parse(rawE) : [],
        servicios: rawS ? JSON.parse(rawS) : [],
        planConfig: rawP ? JSON.parse(rawP) : DEFAULT_PLAN,
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },

  updateClientes: async (items) => {
    set({ clientes: items });
    await AsyncStorage.setItem(
      cacheKey("clientes", get().scope),
      JSON.stringify(items),
    );
  },

  updateEmpleados: async (items) => {
    set({ empleados: items });
    await AsyncStorage.setItem(
      cacheKey("empleados", get().scope),
      JSON.stringify(items),
    );
  },

  updateServicios: async (items) => {
    set({ servicios: items });
    await AsyncStorage.setItem(
      cacheKey("servicios", get().scope),
      JSON.stringify(items),
    );
  },

  updatePlanConfig: async (config) => {
    set({ planConfig: config });
    await AsyncStorage.setItem(
      cacheKey("planConfig", get().scope),
      JSON.stringify(config),
    );
  },
  reset: () =>
    set({
      clientes: [],
      empleados: [],
      servicios: [],
      planConfig: DEFAULT_PLAN,
      loaded: false,
      scope: null,
    }),
}));
