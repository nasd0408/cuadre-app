// stores/planStore.ts
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ajustesApi } from "../api/ajustes";
import { useOfflineCacheStore } from "./offlineCacheStore";
import { analytics, AnalyticsEvent } from "../analytics";

const PLAN_CACHE_KEY = "@plan_info";

/** Topes y switches de anuncios que sirve el backend (appsettings, recargable en caliente). */
export interface AnunciosConfig {
  habilitado: boolean;
  bannerHabilitado: boolean;
  intersticialHabilitado: boolean;
  appOpenHabilitado: boolean;
  intersticialMinutosEntre: number;
  intersticialMaxPorDia: number;
  appOpenMaxPorDia: number;
  accionesAntesDeIntersticial: number;
  /** Las acciones rápidas (cobro / a deber) muestran anuncio siempre, sin contador ni cadencia. */
  intersticialSiempreEnAccionRapida: boolean;
}

export interface PlanInfo {
  plan: number;
  planNombre: string;

  // Límites
  maxEmpleados: number;
  empleadosActuales: number;
  maxServicios: number;
  serviciosActuales: number;
  maxCitasOffline: number;
  retencionHistorialMeses: number;

  // Módulos
  moduloPagosEmpleados: boolean;
  moduloReportes: boolean;
  moduloRecordatorios: boolean;
  moduloCalendario: boolean;

  // Monetización
  mostrarAnuncios: boolean;
  accesoWeb: boolean;
  anuncios: AnunciosConfig;

  fechaVencimiento: string | null;
}

interface PlanStore {
  plan: PlanInfo | null;
  loading: boolean;

  // Acciones
  fetchPlan: () => Promise<void>;
  loadCached: () => Promise<void>;
  clear: () => Promise<void>;

  // Helpers
  tieneModulo: (modulo: "pagos" | "reportes" | "recordatorios" | "calendario") => boolean;
  puedeCrearEmpleado: () => boolean;
  puedeCrearServicio: () => boolean;
  puedeAgregarCitaOffline: (pendientesActuales: number) => boolean;
  getLimiteTexto: (modulo: string) => string;
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  plan: null,
  loading: false,

  fetchPlan: async () => {
    set({ loading: true });
    try {
      const anterior = get().plan;
      const data = await ajustesApi.getPlanInfo();
      set({ plan: data });
      await AsyncStorage.setItem(PLAN_CACHE_KEY, JSON.stringify(data));

      // Cierra el embudo de conversión. Sin este evento solo se sabe quién mostró
      // interés (upgrade_cta_clicked), no quién terminó pagando.
      if (anterior && anterior.planNombre !== data.planNombre) {
        analytics.track(AnalyticsEvent.PlanChanged, {
          desde: anterior.planNombre,
          hacia: data.planNombre,
          // Lo que de verdad interesa medir: cuántos dejan de ver anuncios.
          quitoAnuncios: anterior.mostrarAnuncios && !data.mostrarAnuncios,
        });
      }

      // El plan como propiedad de usuario permite filtrar CUALQUIER informe por
      // Gratis vs pago, que es la comparación de fondo: ¿los anuncios hunden la
      // retención?
      analytics.setUserPlan(data.planNombre);

      // Sincronizar con offlineCacheStore
      useOfflineCacheStore.getState().updatePlanConfig({
        maxCitasOffline: data.maxCitasOffline,
        planNombre: data.planNombre,
      });
    } catch {
      // Si falla, intentar cargar de cache
      await get().loadCached();
    } finally {
      set({ loading: false });
    }
  },

  loadCached: async () => {
    try {
      const raw = await AsyncStorage.getItem(PLAN_CACHE_KEY);
      if (raw) {
        set({ plan: JSON.parse(raw) });
      }
    } catch {}
  },

  clear: async () => {
    set({ plan: null });
    await AsyncStorage.removeItem(PLAN_CACHE_KEY);
  },

  // ── Helpers ──

  tieneModulo: (modulo) => {
    const { plan } = get();
    if (!plan) return true; // Si no cargó, no bloquear

    switch (modulo) {
      case "pagos":
        return plan.moduloPagosEmpleados;
      case "reportes":
        return plan.moduloReportes;
      case "recordatorios":
        return plan.moduloRecordatorios;
      case "calendario":
        return plan.moduloCalendario;
      default:
        return true;
    }
  },

  puedeCrearEmpleado: () => {
    const { plan } = get();
    if (!plan) return true;
    if (plan.maxEmpleados === -1) return true;
    return plan.empleadosActuales < plan.maxEmpleados;
  },

  puedeCrearServicio: () => {
    const { plan } = get();
    if (!plan) return true;
    if (plan.maxServicios === -1) return true;
    return plan.serviciosActuales < plan.maxServicios;
  },

  puedeAgregarCitaOffline: (pendientesActuales) => {
    const { plan } = get();
    if (!plan) return true;
    if (plan.maxCitasOffline === -1) return true;
    return pendientesActuales < plan.maxCitasOffline;
  },

  getLimiteTexto: (modulo) => {
    // Los defaults del backend habilitan estos módulos desde Profesional.
    return `Disponible desde el plan Profesional`;
  },
}));
