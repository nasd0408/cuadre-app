import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

function leerHash() { return Platform.OS === 'web' ? window.location.hash : ''; }
function suscribir(actualizar: () => void) {
  if (Platform.OS !== 'web') return () => {};
  window.addEventListener('hashchange', actualizar);
  return () => window.removeEventListener('hashchange', actualizar);
}
export function useHashPublico(): string { return useSyncExternalStore(suscribir, leerHash, () => ''); }
