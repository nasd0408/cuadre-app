// Stub de web: react-native-firebase no tiene build de web.
//
// Metro resuelve este archivo antes que firebaseClient.ts al exportar para web, así
// que el bundle nunca alcanza los SDK nativos. Consecuencia asumida: no hay
// analítica en la versión web, que además hoy es solo para planes pagos.
export const cliente = {
  capture(_event: string, _props: Record<string, any> = {}): void {},
  screen(_name: string): void {},
  identify(_userId: string, _props: Record<string, any> = {}): void {},
  setUserProperties(_props: Record<string, any>): void {},
  reset(): void {},
  recordError(_error: unknown, _contexto: Record<string, any> = {}): void {},
};
