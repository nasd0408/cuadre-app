// API pública de analítica. Todo el resto de la app importa desde aquí,
// no del cliente concreto, por si luego cambiamos de proveedor.
//
// Esa decisión ya se cobró su valor: migrar de PostHog a Firebase solo cambió
// esta línea y el cliente detrás, sin tocar los 13 archivos que llaman a track().
import { cliente } from './firebaseClient';

// Nombres de evento centralizados = funnel consistente en el dashboard.
// Reglas de GA4: máximo 40 caracteres, letras/números/guion bajo, empezando por letra.
export const AnalyticsEvent = {
  AppOpened: 'app_opened',
  SignupSubmitted: 'signup_submitted',
  EmailConfirmed: 'email_confirmed',
  LoginSucceeded: 'login_succeeded',
  ServicioCreated: 'servicio_created',
  CitaCreated: 'cita_created',
  SubscriptionPaymentSubmitted: 'subscription_payment_submitted',
  ScreenView: 'screen_view',
  AppError: 'app_error',

  // Monetización del plan Gratis. Sirven para responder la pregunta que decide
  // si los anuncios se quedan: ¿ayudan a convertir o hunden la retención?
  AdImpression: 'ad_impression',
  AdInterstitialShown: 'ad_interstitial_shown',
  AdAppOpenShown: 'ad_app_open_shown',
  UpgradePromptShown: 'upgrade_prompt_shown',
  UpgradeCtaClicked: 'upgrade_cta_clicked',

  /** Cierra el embudo: sin esto solo se sabe quién mostró interés, no quién pagó. */
  PlanChanged: 'plan_changed',

  // Integraciones con el teléfono. Sirven para saber si se usan de verdad o si
  // el permiso que pedimos no valió la pena.
  ClienteDesdeContacto: 'cliente_desde_contacto',
  CitaEnCalendario: 'cita_en_calendario',
} as const;

export const analytics = {
  track(event: string, props: Record<string, any> = {}): void {
    cliente.capture(event, props);
  },

  screen(name: string): void {
    // No se usa track(): el cliente debe añadir los parámetros reservados
    // screen_name y screen_class que GA4 requiere para poblar el informe.
    cliente.screen(name);
  },

  /**
   * OJO: GA4 prohíbe enviar información personal identificable. Pasar solo
   * identificadores y segmentos (empresaId, rol, plan), nunca nombre ni correo.
   */
  identify(userId: string, props: Record<string, any> = {}): void {
    cliente.identify(userId, props);
  },

  /**
   * Marca el plan del usuario como propiedad, para poder segmentar todos los
   * informes entre Gratis y pago sin tener que filtrar evento por evento.
   */
  setUserPlan(planNombre: string): void {
    cliente.setUserProperties({ plan: planNombre });
  },

  reset(): void {
    cliente.reset();
  },

  captureError(error: unknown, context: Record<string, any> = {}): void {
    cliente.recordError(error, context);
  },
};

// Instala manejadores globales de errores JS (la mayoría de "crashes" de RN).
// Los crashes NATIVOS los captura Crashlytics por su cuenta, sin necesitar esto.
export function initErrorTracking(): void {
  const globalAny = global as any;

  // Errores no capturados en el hilo JS
  if (globalAny.ErrorUtils?.setGlobalHandler) {
    const previous = globalAny.ErrorUtils.getGlobalHandler?.();
    globalAny.ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      analytics.captureError(error, { isFatal: !!isFatal, source: 'global' });
      previous?.(error, isFatal);
    });
  }

  // Promesas rechazadas sin catch (web / algunos entornos)
  if (typeof globalAny.addEventListener === 'function') {
    globalAny.addEventListener('unhandledrejection', (e: any) => {
      analytics.captureError(e?.reason ?? e, { source: 'unhandledrejection' });
    });
  }
}
