// Stub de web: mismas exports que ./index.ts, todas no-op.
//
// Metro resuelve este archivo antes que index.ts al exportar para web, así que el
// bundle nunca alcanza `react-native-google-mobile-ads` (que no tiene build de web).
// Además el plan Gratis no tiene acceso web, así que aquí no hay nada que mostrar.
export const BANNER_UNIT_ID = "";

export async function initAds(): Promise<void> {}

export function precargarIntersticial(): void {}

export async function showInterstitialIfAllowed(
  _origen: string,
  _opciones: { esAccionRapida?: boolean } = {},
): Promise<boolean> {
  return false;
}

export function precargarAppOpen(): void {}

export async function showAppOpenIfAllowed(): Promise<boolean> {
  return false;
}

export { default as AdBanner } from "./AdBanner";
