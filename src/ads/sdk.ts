// Carga perezosa del SDK de AdMob.
//
// `react-native-google-mobile-ads` resuelve sus módulos nativos con
// `TurboModuleRegistry.getEnforcing()` en el momento del import, y eso LANZA si el
// binario nativo no está presente. Importarlo arriba de un archivo que la app
// carga siempre haría que Expo Go crashee al arrancar, no solo que fallen los
// anuncios.
//
// Con este require diferido y cacheado, en Expo Go simplemente no hay anuncios y
// el resto de la app funciona con normalidad.
let cache: any | null | undefined;

export function getAdsSdk(): any | null {
  if (cache !== undefined) return cache;
  try {
    cache = require("react-native-google-mobile-ads");
  } catch {
    cache = null;
  }
  return cache;
}

/** true solo en builds nativas con el SDK enlazado (no en Expo Go ni en web). */
export function adsSdkDisponible(): boolean {
  return getAdsSdk() != null;
}
