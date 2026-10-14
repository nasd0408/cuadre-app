// hooks/useOfflineSync.ts
import { useEffect, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useOfflineQueueStore } from "../stores/offlineQueueStore";
import { useOfflineCacheStore } from "../stores/offlineCacheStore";
import { useConnectionStore } from "../stores/connectionStore";
import { syncOfflineQueue } from "../Services/offlineSyncService";
import { useAuthStore } from "../stores/authStore";

/**
 * Escucha cambios de red. Cuando vuelve la conexión y hay citas en cola,
 * intenta sincronizarlas automáticamente.
 */
export function useOfflineSync() {
  const syncing = useRef(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.id) {
      useOfflineQueueStore.getState().reset();
      useOfflineCacheStore.getState().reset();
      return;
    }

    const scope = `${user.empresaId ?? "empresa"}:${user.id}`;
    let mounted = true;

    const initialize = async () => {
      await Promise.all([
        useOfflineQueueStore.getState().loadQueue(scope),
        useOfflineCacheStore.getState().loadCache(scope),
      ]);
      if (!mounted) return;
      const state = await NetInfo.fetch();
      if (state.isConnected && state.isInternetReachable !== false) {
        await synchronize();
      }
    };

    const synchronize = async () => {
      if (syncing.current) return;
      const queueStore = useOfflineQueueStore.getState();
      if (queueStore.getPending().length === 0) return;

      syncing.current = true;
      queueStore.setSyncing(true);
      try {
        const result = await syncOfflineQueue();
        const latestStore = useOfflineQueueStore.getState();

        if (result.connectionError) {
          latestStore.setSyncMessage(
            "Volvió internet, pero aún no pudimos sincronizar. Reintentaremos automáticamente.",
          );
          return;
        }

        if (result.failed > 0) {
          latestStore.setSyncMessage(
            `${result.synced} sincronizada(s) y ${result.failed} requieren revisión.`,
          );
        } else if (result.synced > 0) {
          latestStore.setSyncMessage(
            `${result.synced} cita(s) offline sincronizada(s).`,
          );
        }

        const { isOfflineMode, exitOfflineMode } =
          useConnectionStore.getState();
        if (isOfflineMode && result.pending === 0) exitOfflineMode();
      } finally {
        syncing.current = false;
        useOfflineQueueStore.getState().setSyncing(false);
      }
    };

    initialize();

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (!state.isConnected || state.isInternetReachable === false) return;
      await synchronize();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user?.id, user?.empresaId]);
}
