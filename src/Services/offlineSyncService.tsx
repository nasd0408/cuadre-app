// services/offlineSyncService.ts
import { apiClient } from "../api";
import { useOfflineQueueStore } from "../stores/offlineQueueStore";

interface SyncResultado {
  offlineId: string;
  ok: boolean;
  citaId?: number;
  error?: string;
  clienteCreado: boolean;
  clienteId?: number;
}

interface SyncResponse {
  total: number;
  exitosas: number;
  fallidas: number;
  resultados: SyncResultado[];
}

export interface OfflineSyncSummary {
  synced: number;
  failed: number;
  pending: number;
  connectionError?: string;
}

let activeSync: Promise<OfflineSyncSummary> | null = null;

/**
 * Sincroniza todas las citas pendientes en UNA sola llamada al API.
 */
export function syncOfflineQueue(): Promise<OfflineSyncSummary> {
  if (activeSync) return activeSync;
  activeSync = runSync().finally(() => {
    activeSync = null;
  });
  return activeSync;
}

async function runSync(): Promise<OfflineSyncSummary> {
  const store = useOfflineQueueStore.getState();
  const pending = store.getPending();

  if (pending.length === 0) return { synced: 0, failed: 0, pending: 0 };

  // Armar el payload del batch
  const payload = {
    citas: pending.map((cita) => ({
      offlineId: cita.id,
      tipo: cita.tipo,
      // Cliente existente o nuevo
      ...(cita.esClienteNuevo
        ? {
            clienteNombre: cita.clienteNombre,
            clienteTelefono: cita.clienteTelefono,
          }
        : {
            clienteId: cita.clienteId,
          }),
      empleadoId: cita.empleadoId,
      fecha: cita.fecha,
      servicios: cita.servicios.map((s) => ({
        servicioId: s.servicioId,
        precio: s.precio,
        cantidad: s.cantidad,
      })),
      ...(cita.tipo === "pagada" && cita.observacionesPago
        ? { observacionesPago: cita.observacionesPago }
        : {}),
    })),
  };

  try {
    const response = await apiClient.post<SyncResponse>("/sync/citas", payload);
    const { resultados } = response.data;

    // Marcar cada cita según su resultado
    for (const resultado of resultados) {
      if (resultado.ok) {
        await store.markSynced(resultado.offlineId);
      } else {
        await store.markError(resultado.offlineId, resultado.error ?? "Error desconocido");
      }
    }

    // Limpiar las sincronizadas
    await store.clearSynced();

    return {
      synced: resultados.filter((r) => r.ok).length,
      failed: resultados.filter((r) => !r.ok).length,
      pending: store.getPending().length,
    };
  } catch (err: any) {
    // Un fallo global no significa que cada registro sea inválido. Conservamos
    // la cola intacta para reintentar sin llenar cada cita de falsos errores.
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Error de conexión al sincronizar";

    return {
      synced: 0,
      failed: 0,
      pending: pending.length,
      connectionError: message,
    };
  }
}
