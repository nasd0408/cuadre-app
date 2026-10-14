import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../api/client';
import { secureStorage } from '../utils/secureStorage';

// Las notificaciones invalidan lecturas; la API sigue siendo la fuente de datos.
export function useAgendaRealtime(onChanged: () => void, enabled = true) {
  const callback = useRef(onChanged);
  callback.current = onChanged;
  const userId = useAuthStore(s => s.user?.id);
  const empresaId = useAuthStore(s => s.user?.empresaId);
  const authenticated = useAuthStore(s => s.isAuthenticated);

  useEffect(() => {
    const base = process.env.EXPO_PUBLIC_API_URL;
    if (!enabled || !authenticated || !userId || !empresaId || !base) return;
    return conectarAgendaRealtime(base, userId, empresaId, () => callback.current());
  }, [authenticated, userId, empresaId, enabled]);
}

// Cada pantalla posee su conexión y su limpieza, también al cambiar de sesión.
export function conectarAgendaRealtime(base: string, userId: string, empresaId: number, onChanged: () => void) {
  let disposed = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const invalidate = () => {
    if (disposed) return;
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => { if (!disposed) onChanged(); }, 200);
  };
  const connection = new HubConnectionBuilder()
    .withUrl(`${base.replace(/\/$/, '')}/hubs/agenda`, {
      withCredentials: false,
      accessTokenFactory: async () => {
        // Reutiliza la renovación y el single-flight del cliente HTTP al recibir 401.
        await apiClient.get('/ajustes/perfil');
        const token = await secureStorage.getItem('auth_token');
        const session = useAuthStore.getState();
        if (disposed || !session.isAuthenticated || session.user?.id !== userId || session.user?.empresaId !== empresaId) return '';
        return token ?? '';
      },
    })
    .configureLogging(LogLevel.None)
    .withAutomaticReconnect([0, 2000, 10000, 30000])
    .build();

  const scheduleRetry = () => {
    if (disposed) return;
    if (retry) clearTimeout(retry);
    retry = setTimeout(start, 15000);
  };
  const start = async () => {
    if (disposed || connection.state !== HubConnectionState.Disconnected) return;
    if (retry) { clearTimeout(retry); retry = undefined; }
    try {
      await connection.start();
      if (disposed) { await connection.stop(); return; }
      invalidate(); // Recupera cambios perdidos mientras estaba desconectado.
    } catch {
      scheduleRetry();
    }
  };
  connection.on('AgendaChanged', invalidate);
  connection.onreconnected(invalidate);
  connection.onclose(scheduleRetry);
  const foreground = AppState.addEventListener('change', state => {
    if (state !== 'active' || disposed) return;
    invalidate();
    void start();
  });
  void start();
  return () => {
    disposed = true;
    if (retry) clearTimeout(retry);
    if (debounce) clearTimeout(debounce);
    foreground.remove();
    connection.off('AgendaChanged', invalidate);
    void connection.stop().catch(() => {});
  };
}
