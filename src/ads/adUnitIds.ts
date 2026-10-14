// IDs de bloque de anuncio.
//
// No importa el SDK a propósito, ni siquiera para leer `TestIds`: el paquete
// resuelve su módulo nativo con `TurboModuleRegistry.getEnforcing()` al
// importarse, lo que revienta la app entera en Expo Go. Los IDs de prueba de
// Google son constantes públicas y estables, así que se copian aquí.
// https://developers.google.com/admob/android/test-ads

const TEST_ADAPTIVE_BANNER = "ca-app-pub-3940256099942544/9214589741";
const TEST_INTERSTITIAL = "ca-app-pub-3940256099942544/1033173712";
const TEST_APP_OPEN = "ca-app-pub-3940256099942544/9257395921";

// En desarrollo se usan SIEMPRE los IDs de prueba de Google: pedir anuncios
// reales desde una build de debug es causa habitual de baneo de la cuenta AdMob.
const unitId = (envVar: string | undefined, testId: string): string =>
  __DEV__ || !envVar ? testId : envVar;

export const BANNER_UNIT_ID = unitId(
  process.env.EXPO_PUBLIC_ADMOB_BANNER_ID,
  TEST_ADAPTIVE_BANNER,
);

export const INTERSTITIAL_UNIT_ID = unitId(
  process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID,
  TEST_INTERSTITIAL,
);

export const APP_OPEN_UNIT_ID = unitId(
  process.env.EXPO_PUBLIC_ADMOB_APPOPEN_ID,
  TEST_APP_OPEN,
);
