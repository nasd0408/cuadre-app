// Cliente de Firebase Analytics + Crashlytics.
//
// Los SDK se cargan con require diferido dentro de try/catch, nunca con import
// estático: resuelven módulos nativos al importarse y tumbarían la app entera en
// Expo Go, no solo la analítica. Mismo patrón que src/ads/sdk.ts.
//
// El bundle web usa ./firebaseClient.web.ts, que es un no-op: react-native-firebase
// no tiene build de web.
import { Platform } from "react-native";

interface AnalyticsModular {
  instancia: any;
  logEvent: (instancia: any, evento: string, parametros?: Record<string, any>) => Promise<void>;
  setUserId: (instancia: any, userId: string | null) => Promise<void>;
  setUserProperties: (
    instancia: any,
    propiedades: Record<string, string>,
  ) => Promise<void>;
}

interface CrashlyticsModular {
  instancia: any;
  recordError: (instancia: any, error: Error) => void;
  setAttribute: (
    instancia: any,
    clave: string,
    valor: string,
  ) => Promise<unknown>;
  setUserId: (instancia: any, userId: string) => Promise<unknown>;
}

let cacheAnalytics: AnalyticsModular | null | undefined;
let cacheCrashlytics: CrashlyticsModular | null | undefined;

function obtenerAnalytics(): AnalyticsModular | null {
  if (cacheAnalytics !== undefined) return cacheAnalytics;
  try {
    const mod = require("@react-native-firebase/analytics");
    cacheAnalytics = {
      instancia: mod.getAnalytics(),
      logEvent: mod.logEvent,
      setUserId: mod.setUserId,
      setUserProperties: mod.setUserProperties,
    };
  } catch {
    cacheAnalytics = null;
  }
  return cacheAnalytics;
}

function obtenerCrashlytics(): CrashlyticsModular | null {
  if (cacheCrashlytics !== undefined) return cacheCrashlytics;
  try {
    const mod = require("@react-native-firebase/crashlytics");
    cacheCrashlytics = {
      instancia: mod.getCrashlytics(),
      recordError: mod.recordError,
      setAttribute: mod.setAttribute,
      setUserId: mod.setUserId,
    };
  } catch {
    cacheCrashlytics = null;
  }
  return cacheCrashlytics;
}

/**
 * En desarrollo no se reporta: las pruebas locales ensuciarían los datos con los
 * que se van a tomar decisiones sobre los anuncios y el plan Gratis.
 *
 * Excepción a propósito: poniendo EXPO_PUBLIC_ANALYTICS_DEBUG=1 en .env se activa
 * en desarrollo. Hace falta para poder verificar la instrumentación en DebugView;
 * sin esto no habría forma de comprobar que los eventos salen bien antes de
 * publicar. Quítalo del .env cuando termines de verificar.
 */
const forzarEnDesarrollo = process.env.EXPO_PUBLIC_ANALYTICS_DEBUG === "1";
const habilitado = (!__DEV__ || forzarEnDesarrollo) && Platform.OS !== "web";

// ── Límites de GA4. Lo que los incumple se descarta EN SILENCIO ──
const MAX_LARGO_VALOR = 100; // valores de parámetro
const MAX_LARGO_PROPIEDAD = 36; // valores de propiedad de usuario

function recortar(valor: unknown, max: number): string {
  const texto = typeof valor === "string" ? valor : String(valor);
  return texto.length > max ? texto.slice(0, max) : texto;
}

/**
 * GA4 solo acepta parámetros de tipo string, number o boolean. Cualquier objeto
 * o array se descarta sin avisar, así que se serializa y se recorta.
 */
function normalizarParametros(props: Record<string, any>): Record<string, any> {
  const salida: Record<string, any> = {};

  for (const [clave, valor] of Object.entries(props)) {
    if (valor === undefined || valor === null) continue;

    if (typeof valor === "number" || typeof valor === "boolean") {
      salida[clave] = valor;
    } else {
      salida[clave] = recortar(valor, MAX_LARGO_VALOR);
    }
  }

  return salida;
}

export const cliente = {
  capture(event: string, props: Record<string, any> = {}): void {
    if (!habilitado) return;
    const analytics = obtenerAnalytics();
    if (!analytics) return;

    // Fire-and-forget: la analítica nunca debe bloquear ni romper un flujo.
    analytics
      .logEvent(analytics.instancia, event, normalizarParametros(props))
      .catch(() => {});
  },

  /** RNFirebase deprecó logScreenView; GA4 recibe la vista como evento reservado. */
  screen(name: string): void {
    if (!habilitado) return;
    const analytics = obtenerAnalytics();
    if (!analytics) return;

    analytics
      .logEvent(analytics.instancia, "screen_view", {
        screen_name: name,
        screen_class: name,
      })
      .catch(() => {});
  },

  /**
   * GA4 PROHÍBE enviar información personal identificable. Por eso el llamador
   * solo debe pasar identificadores y segmentos (empresaId, rol, plan), nunca el
   * nombre del negocio ni el correo.
   */
  identify(userId: string, props: Record<string, any> = {}): void {
    if (!habilitado) return;

    const analytics = obtenerAnalytics();
    if (analytics) {
      analytics.setUserId(analytics.instancia, userId).catch(() => {});

      const propiedades: Record<string, string> = {};
      for (const [clave, valor] of Object.entries(props)) {
        if (valor === undefined || valor === null) continue;
        propiedades[clave] = recortar(valor, MAX_LARGO_PROPIEDAD);
      }
      analytics
        .setUserProperties(analytics.instancia, propiedades)
        .catch(() => {});
    }

    // Permite saber a qué cuenta pertenece un crash sin exponer datos personales.
    const crashlytics = obtenerCrashlytics();
    if (crashlytics) {
      crashlytics
        .setUserId(crashlytics.instancia, userId)
        .catch(() => {});
    }
  },

  setUserProperties(props: Record<string, any>): void {
    if (!habilitado) return;
    const analytics = obtenerAnalytics();
    if (!analytics) return;

    const propiedades: Record<string, string> = {};
    for (const [clave, valor] of Object.entries(props)) {
      if (valor === undefined || valor === null) continue;
      propiedades[clave] = recortar(valor, MAX_LARGO_PROPIEDAD);
    }
    analytics
      .setUserProperties(analytics.instancia, propiedades)
      .catch(() => {});
  },

  reset(): void {
    if (!habilitado) return;
    const analytics = obtenerAnalytics();
    analytics?.setUserId(analytics.instancia, null).catch(() => {});
  },

  /**
   * Los errores van a Crashlytics, que agrupa por stack y conserva el histórico.
   * Analytics recibe además un evento contable para poder cruzar tasa de errores
   * con el embudo, pero con el stack recortado: GA4 corta a 100 caracteres.
   */
  recordError(error: unknown, contexto: Record<string, any> = {}): void {
    if (!habilitado) return;

    const esError = error instanceof Error;
    const err = esError ? (error as Error) : new Error(String(error));

    const crashlytics = obtenerCrashlytics();
    if (crashlytics) {
      for (const [clave, valor] of Object.entries(contexto)) {
        crashlytics
          .setAttribute(crashlytics.instancia, clave, String(valor))
          .catch(() => {});
      }
      crashlytics.recordError(crashlytics.instancia, err);
    }

    this.capture("app_error", {
      message: err.message,
      ...contexto,
    });
  },
};
