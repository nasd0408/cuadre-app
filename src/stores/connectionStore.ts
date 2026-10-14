// stores/connectionStore.ts
import { create } from "zustand";

type ConnectionError = "no_internet" | "server_error" | "db_error" | null;

interface ConnectionStore {
  connectionError: ConnectionError;
  isOfflineMode: boolean;
  setConnectionError: (error: ConnectionError) => void;
  clearConnectionError: () => void;
  enterOfflineMode: () => void;
  exitOfflineMode: () => void;
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  connectionError: null,
  isOfflineMode: false,

  setConnectionError: (error) => set({ connectionError: error }),

  /**
   * Solo escribe si HABIA error.
   *
   * El interceptor de axios llama a esto en cada respuesta correcta. Zustand
   * crea un objeto de estado nuevo en cada `set`, aunque el valor no cambie, y
   * App.tsx se suscribe a este store: el resultado era que CADA peticion HTTP
   * correcta re-renderizaba la aplicacion entera, reconstruia el tema y con el
   * las 40 hojas de estilo. Un dashboard con tres peticiones lo hacia tres
   * veces.
   */
  clearConnectionError: () => {
    if (get().connectionError === null) return;
    set({ connectionError: null });
  },

  enterOfflineMode: () =>
    set({ isOfflineMode: true, connectionError: null }),

  exitOfflineMode: () => set({ isOfflineMode: false }),
}));
