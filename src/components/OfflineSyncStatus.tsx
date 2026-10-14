import React from "react";
import { Snackbar } from "react-native-paper";
import { useOfflineQueueStore } from "../stores/offlineQueueStore";
import { useConnectionStore } from "../stores/connectionStore";

export default function OfflineSyncStatus() {
  const message = useOfflineQueueStore((state) => state.syncMessage);
  const clear = useOfflineQueueStore((state) => state.clearSyncMessage);
  const pending = useOfflineQueueStore(
    (state) => state.queue.filter((item) => !item.sincronizado).length,
  );
  const enterOfflineMode = useConnectionStore(
    (state) => state.enterOfflineMode,
  );

  const handleAction = () => {
    clear();
    if (pending > 0) enterOfflineMode();
  };

  return (
    <Snackbar
      visible={!!message}
      onDismiss={clear}
      duration={5000}
      action={{
        label: pending > 0 ? "Revisar" : "Cerrar",
        onPress: handleAction,
      }}
    >
      {message}
    </Snackbar>
  );
}
