// stores de anuncios: decide SI se puede mostrar un anuncio, no CÓMO se muestra.
//
// No importa nada nativo a propósito, así que este archivo también compila en el
// bundle web. La carga del SDK vive en ./index.ts (con su stub ./index.web.ts).
import { create } from "zustand";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePlanStore } from "../stores/planStore";
import { useAuthStore } from "../stores/authStore";
import { localDateString } from "../utils/datetime";

const ADS_CACHE_KEY = "@ads_state";

/** Nunca mostrar un App Open a menos de este margen de un intersticial. */
const MARGEN_ENTRE_FORMATOS_MS = 60 * 1000;

interface AdsPersisted {
  ultimoIntersticialTs: number;
  ultimoAppOpenTs: number;
  intersticialesHoy: number;
  appOpensHoy: number;
  fechaContador: string;
  primerArranqueHecho: boolean;
}

interface AdsStore extends AdsPersisted {
  /** Acciones de negocio completadas desde el último anuncio (no se persiste: es por sesión). */
  accionesDesdeUltimoAd: number;

  hydrate: () => Promise<void>;
  clear: () => Promise<void>;

  registrarAccion: () => void;
  registrarIntersticial: () => void;
  registrarAppOpen: () => void;
  marcarPrimerArranque: () => Promise<void>;

  puedeMostrarBanner: () => boolean;
  /** @param esAccionRapida registro de servicio cobrado o a deber (flujo principal). */
  puedeMostrarIntersticial: (esAccionRapida?: boolean) => boolean;
  puedeMostrarAppOpen: () => boolean;
}

const ESTADO_INICIAL: AdsPersisted = {
  ultimoIntersticialTs: 0,
  ultimoAppOpenTs: 0,
  intersticialesHoy: 0,
  appOpensHoy: 0,
  fechaContador: localDateString(),
  primerArranqueHecho: false,
};

/**
 * Base común a todos los formatos.
 *
 * Falla CERRADO: si el plan todavía no cargó (cache frío, sin red) no se muestra
 * nada. Es lo contrario a `planStore.tieneModulo`, que falla abierto para no
 * bloquear funciones: aquí un falso positivo significa mostrarle publicidad a
 * alguien que paga por no verla.
 */
function anunciosActivos(): boolean {
  if (Platform.OS === "web") return false;
  if (!useAuthStore.getState().isAuthenticated) return false;

  const { plan } = usePlanStore.getState();
  if (!plan) return false;
  if (!plan.mostrarAnuncios) return false;

  return plan.anuncios?.habilitado === true;
}

export const useAdsStore = create<AdsStore>((set, get) => ({
  ...ESTADO_INICIAL,
  accionesDesdeUltimoAd: 0,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(ADS_CACHE_KEY);
      if (!raw) return;

      const guardado = JSON.parse(raw) as Partial<AdsPersisted>;
      const hoy = localDateString();

      set({
        ...ESTADO_INICIAL,
        ...guardado,
        // Los topes son diarios: si el guardado es de otro día, se reinician.
        ...(guardado.fechaContador === hoy
          ? {}
          : { intersticialesHoy: 0, appOpensHoy: 0, fechaContador: hoy }),
      });
    } catch {}
  },

  clear: async () => {
    set({ ...ESTADO_INICIAL, accionesDesdeUltimoAd: 0 });
    await AsyncStorage.removeItem(ADS_CACHE_KEY);
  },

  registrarAccion: () => {
    set({ accionesDesdeUltimoAd: get().accionesDesdeUltimoAd + 1 });
  },

  registrarIntersticial: () => {
    const actual = get();
    const hoy = localDateString();
    const mismoDia = actual.fechaContador === hoy;
    const estado = {
      ...persistible(actual),
      ultimoIntersticialTs: Date.now(),
      intersticialesHoy: (mismoDia ? actual.intersticialesHoy : 0) + 1,
      appOpensHoy: mismoDia ? actual.appOpensHoy : 0,
      fechaContador: hoy,
    };
    set({ ...estado, accionesDesdeUltimoAd: 0 });
    persistir(estado);
  },

  registrarAppOpen: () => {
    const actual = get();
    const hoy = localDateString();
    const mismoDia = actual.fechaContador === hoy;
    const estado = {
      ...persistible(actual),
      ultimoAppOpenTs: Date.now(),
      intersticialesHoy: mismoDia ? actual.intersticialesHoy : 0,
      appOpensHoy: (mismoDia ? actual.appOpensHoy : 0) + 1,
      fechaContador: hoy,
    };
    set(estado);
    persistir(estado);
  },

  marcarPrimerArranque: async () => {
    const estado = { ...persistible(get()), primerArranqueHecho: true };
    set(estado);
    await persistir(estado);
  },

  // ── Reglas por formato ──

  puedeMostrarBanner: () => {
    if (!anunciosActivos()) return false;
    return usePlanStore.getState().plan?.anuncios?.bannerHabilitado === true;
  },

  puedeMostrarIntersticial: (esAccionRapida = false) => {
    if (!anunciosActivos()) return false;

    const cfg = usePlanStore.getState().plan!.anuncios;
    if (!cfg.intersticialHabilitado) return false;

    const s = get();

    // El tope diario aplica SIEMPRE, incluso a las acciones rápidas: es el único
    // freno que queda cuando estas se muestran una a una.
    if (s.fechaContador === localDateString() && s.intersticialesHoy >= cfg.intersticialMaxPorDia)
      return false;

    // Registrar un servicio (cobrado o a deber) es el flujo principal del negocio
    // y la palanca de ingresos más fuerte: se salta el contador de acciones y la
    // cadencia de minutos.
    if (esAccionRapida && cfg.intersticialSiempreEnAccionRapida) return true;

    if (s.accionesDesdeUltimoAd < cfg.accionesAntesDeIntersticial) return false;

    const msDesdeUltimo = Date.now() - s.ultimoIntersticialTs;
    return msDesdeUltimo >= cfg.intersticialMinutosEntre * 60 * 1000;
  },

  puedeMostrarAppOpen: () => {
    if (!anunciosActivos()) return false;

    const cfg = usePlanStore.getState().plan!.anuncios;
    if (!cfg.appOpenHabilitado) return false;

    const s = get();
    // Nunca en el primer arranque tras instalar: choca con el onboarding y es
    // motivo de rechazo en la revisión de Play.
    if (!s.primerArranqueHecho) return false;
    if (s.fechaContador === localDateString() && s.appOpensHoy >= cfg.appOpenMaxPorDia) return false;

    return Date.now() - s.ultimoIntersticialTs >= MARGEN_ENTRE_FORMATOS_MS;
  },
}));

// ── Helpers de persistencia ──

function persistible(s: AdsStore): AdsPersisted {
  return {
    ultimoIntersticialTs: s.ultimoIntersticialTs,
    ultimoAppOpenTs: s.ultimoAppOpenTs,
    intersticialesHoy: s.intersticialesHoy,
    appOpensHoy: s.appOpensHoy,
    fechaContador: s.fechaContador,
    primerArranqueHecho: s.primerArranqueHecho,
  };
}

async function persistir(estado: AdsPersisted): Promise<void> {
  try {
    await AsyncStorage.setItem(ADS_CACHE_KEY, JSON.stringify(estado));
  } catch {}
}
