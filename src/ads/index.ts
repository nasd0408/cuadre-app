// Capa nativa de anuncios (Android/iOS). El bundle web usa ./index.web.ts, que
// expone las mismas funciones como no-op: `react-native-google-mobile-ads` no
// tiene build de web y rompería `npm run build:web` si el bundler lo resolviera.
//
// Dos reglas de este módulo:
//  1. El SDK se carga con require diferido (./sdk), nunca con import estático:
//     importarlo arriba haría crashear Expo Go al arrancar la app.
//  2. Un anuncio NUNCA bloquea la app. Si el SDK no está, si no cargó o si falla,
//     la función simplemente devuelve false.
import { analytics, AnalyticsEvent } from "../analytics";
import { APP_OPEN_UNIT_ID, INTERSTITIAL_UNIT_ID } from "./adUnitIds";
import { getAdsSdk } from "./sdk";
import { useAdsStore } from "./adsStore";

export { BANNER_UNIT_ID } from "./adUnitIds";
export { adsSdkDisponible } from "./sdk";

let inicializado = false;
let intersticial: any = null;
let intersticialListo = false;
let intersticialMostrando = false;
let appOpen: any = null;
let appOpenListo = false;
let appOpenMostrando = false;
let appOpenCargadoTs = 0;

// Google indica que los App Open precargados caducan a las cuatro horas.
const APP_OPEN_VIGENCIA_MS = 4 * 60 * 60 * 1000;

/**
 * Pide consentimiento (UMP) e inicializa el SDK. Idempotente.
 *
 * El formulario de consentimiento solo aparece donde Google lo exige (EEE/Reino
 * Unido). En Venezuela no se muestra, pero la app está publicada globalmente y
 * sin este flujo las impresiones de esos usuarios se sirven mal o no se sirven.
 */
export async function initAds(): Promise<void> {
  if (inicializado) return;

  const sdk = getAdsSdk();
  if (!sdk) return; // Expo Go o build sin el módulo nativo

  try {
    await sdk.AdsConsent.gatherConsent();
  } catch (error) {
    // Sin consentimiento resuelto se sigue igual: el SDK servirá anuncios no
    // personalizados donde corresponda.
    analytics.captureError(error, { source: "ads_consent" });
  }

  try {
    await sdk.default().setRequestConfiguration({
      maxAdContentRating: sdk.MaxAdContentRating.PG,
    });
    await sdk.default().initialize();
    inicializado = true;

    precargarIntersticial();
    precargarAppOpen();
  } catch (error) {
    analytics.captureError(error, { source: "ads_init" });
  }
}

// ── Intersticial ──

export function precargarIntersticial(): void {
  const sdk = getAdsSdk();
  if (!sdk || !inicializado || intersticialListo) return;

  intersticial = sdk.InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID);

  intersticial.addAdEventListener(sdk.AdEventType.LOADED, () => {
    intersticialListo = true;
  });

  intersticial.addAdEventListener(sdk.AdEventType.CLOSED, () => {
    intersticialMostrando = false;
    intersticialListo = false;
    intersticial = null;
    precargarIntersticial();
  });

  intersticial.addAdEventListener(sdk.AdEventType.ERROR, () => {
    intersticialMostrando = false;
    intersticialListo = false;
    intersticial = null;
  });

  intersticial.load();
}

/**
 * Muestra un intersticial solo si los topes lo permiten y ya está cargado.
 * Si no hay uno listo se salta y se precarga para la próxima: jamás se hace
 * esperar al usuario por un anuncio.
 */
export async function showInterstitialIfAllowed(
  origen: string,
  opciones: { esAccionRapida?: boolean } = {},
): Promise<boolean> {
  const store = useAdsStore.getState();
  if (!store.puedeMostrarIntersticial(opciones.esAccionRapida)) return false;
  if (intersticialMostrando || appOpenMostrando) return false;

  if (!intersticialListo || !intersticial) {
    precargarIntersticial();
    return false;
  }

  try {
    intersticialMostrando = true;
    await intersticial.show();
    store.registrarIntersticial();
    analytics.track(AnalyticsEvent.AdInterstitialShown, { origen });
    return true;
  } catch (error) {
    intersticialMostrando = false;
    analytics.captureError(error, { source: "ads_interstitial", origen });
    return false;
  }
}

// ── App Open ──

export function precargarAppOpen(): void {
  const sdk = getAdsSdk();
  if (!sdk || !inicializado || appOpenListo) return;

  appOpen = sdk.AppOpenAd.createForAdRequest(APP_OPEN_UNIT_ID);

  appOpen.addAdEventListener(sdk.AdEventType.LOADED, () => {
    appOpenListo = true;
    appOpenCargadoTs = Date.now();
  });

  appOpen.addAdEventListener(sdk.AdEventType.CLOSED, () => {
    appOpenMostrando = false;
    appOpenListo = false;
    appOpenCargadoTs = 0;
    appOpen = null;
    precargarAppOpen();
  });

  appOpen.addAdEventListener(sdk.AdEventType.ERROR, () => {
    appOpenMostrando = false;
    appOpenListo = false;
    appOpenCargadoTs = 0;
    appOpen = null;
  });

  appOpen.load();
}

export async function showAppOpenIfAllowed(): Promise<boolean> {
  const store = useAdsStore.getState();
  if (!store.puedeMostrarAppOpen()) return false;
  if (appOpenMostrando || intersticialMostrando) return false;

  if (appOpenListo && Date.now() - appOpenCargadoTs >= APP_OPEN_VIGENCIA_MS) {
    appOpenListo = false;
    appOpen = null;
    appOpenCargadoTs = 0;
  }

  if (!appOpenListo || !appOpen) {
    precargarAppOpen();
    return false;
  }

  try {
    appOpenMostrando = true;
    await appOpen.show();
    store.registrarAppOpen();
    analytics.track(AnalyticsEvent.AdAppOpenShown);
    return true;
  } catch (error) {
    appOpenMostrando = false;
    analytics.captureError(error, { source: "ads_app_open" });
    return false;
  }
}

export { default as AdBanner } from "./AdBanner";
