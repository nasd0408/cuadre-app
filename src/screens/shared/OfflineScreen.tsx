// screens/shared/OfflineScreen.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Text,
  Button,
  Surface,
  useTheme,
  Divider,
  Chip,
  Banner,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useConnectionStore } from "../../stores/connectionStore";
import {
  useOfflineQueueStore,
  OfflineCitaTipo,
} from "../../stores/offlineQueueStore";
import NetInfo from "@react-native-community/netinfo";
import { useOfflineCacheStore } from "../../stores/offlineCacheStore";
import { syncOfflineQueue } from "../../Services/offlineSyncService";
import OfflineCitaForm from "./OfflineCitaForm";
import OfflineQueueList from "./OfflineQueueList";
import { useConfirmDialog } from "../../components/ConfirmDialog";

const HEALTH_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/api\/?$/, "");

export default function OfflineScreen() {
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { clearConnectionError, exitOfflineMode } = useConnectionStore();
  const { queue, loadQueue } = useOfflineQueueStore();
  const {
    loadCache,
    loaded,
    planConfig,
    empleados,
    servicios,
  } = useOfflineCacheStore();
  const [showForm, setShowForm] = useState<OfflineCitaTipo | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { showAlert } = useConfirmDialog();

  const errorCount = queue.filter((c) => !!c.error).length;
  const pendingCount = queue.filter((c) => !c.sincronizado).length;
  const limiteAlcanzado =
    planConfig.maxCitasOffline !== -1 &&
    pendingCount >= planConfig.maxCitasOffline;
  const cacheReady = empleados.length > 0 && servicios.length > 0;
  

  // No se carga aqui: useOfflineSync ya lo hace desde la raiz de la app y CON
  // el scope de la cuenta. Llamarlo sin scope era una carrera que podia dejar
  // citas offline escritas en la clave equivocada y sin sincronizar jamas.

  const handleTryReconnect = async () => {
    setSyncing(true);
    try {
      const netState = await NetInfo.fetch();
      if (
        !netState.isConnected ||
        netState.isInternetReachable === false
      ) {
        showAlert("Sin conexión", "Aún no hay conexión a internet.", [
          { text: "OK", style: "default" },
        ]);
        setSyncing(false);
        return;
      }

      // Verificar servidor
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${HEALTH_URL}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        showAlert("Servidor no disponible", "El servidor aún no responde.", [
          { text: "OK", style: "default" },
        ]);
        setSyncing(false);
        return;
      }

      // Sincronizar cola
      if (pendingCount > 0) {
        const result = await syncOfflineQueue();
        await loadQueue();

        if (result.connectionError) {
          showAlert(
            "No pudimos sincronizar",
            "La conexión volvió, pero el servidor no completó la sincronización. Tus datos siguen guardados y puedes reintentar.",
            [{ text: "Entendido", style: "default" }],
          );
          return;
        }

        if (result.failed > 0 || result.pending > 0) {
          showAlert(
            "Sincronización parcial",
            `${result.synced} sincronizada(s), ${result.failed} requieren revisión.\nTus registros pendientes permanecen en este dispositivo.`,
            [{ text: "OK", style: "default" }],
          );
          return;
        }
      }

      // Todo OK → salir del modo offline
      clearConnectionError();
      exitOfflineMode();
    } catch {
      showAlert("Error", "No se pudo conectar al servidor.", [
        { text: "OK", style: "default" },
      ]);
    } finally {
      setSyncing(false);
    }
  };

  if (showForm) {
    return (
      <OfflineCitaForm
        tipo={showForm}
        onClose={() => setShowForm(null)}
        onSaved={() => {
          setShowForm(null);
          loadQueue();
        }}
      />
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="wifi-off"
            size={28}
            color={theme.colors.warn ?? theme.colors.error}
          />
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Trabajando sin conexión</Text>
            <Text style={styles.headerSubtitle}>
              {pendingCount === 0
                ? "Todo lo nuevo se guardará en este dispositivo"
                : `${pendingCount} registro${pendingCount === 1 ? "" : "s"} esperando sincronización`}
            </Text>
          </View>
        </View>

        <Banner
          visible
          icon="information-outline"
          style={styles.banner}
          actions={[]}
        >
          Puedes seguir registrando servicios. No cierres sesión ni desinstales
          la app hasta que la cola quede sincronizada.
        </Banner>
        {loaded && !cacheReady && (
          <Banner
            visible
            icon="database-alert-outline"
            style={styles.cacheWarning}
            actions={[]}
          >
            No hay empleados o servicios guardados para trabajar offline.
            Reconecta una vez para preparar este dispositivo.
          </Banner>
        )}
        {limiteAlcanzado && (
          <Banner
            visible
            icon="alert-circle-outline"
            style={{
              backgroundColor: theme.colors.errorContainer,
              marginBottom: 4,
            }}
            actions={[]}
          >
            {`Alcanzaste el límite de ${planConfig.maxCitasOffline} citas offline (plan ${planConfig.planNombre}). Sincroniza para liberar espacio.`}
          </Banner>
        )}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Acciones principales ── */}
          <Text style={styles.sectionTitle}>Registrar Servicio</Text>

          <Surface style={styles.actionCard} elevation={1}>
            <View style={styles.actionCardContent}>
              <MaterialCommunityIcons
                name="cash-check"
                size={32}
                color={theme.colors.primary}
              />
              <View style={styles.actionCardText}>
                <Text style={styles.actionCardTitle}>Servicio pagado</Text>
                <Text style={styles.actionCardDesc}>
                  El cliente paga ahora mismo
                </Text>
              </View>
            </View>
            <Button
              mode="contained"
              onPress={() => setShowForm("pagada")}
              style={styles.actionButton}
              disabled={!loaded || !cacheReady || limiteAlcanzado}
            >
              Registrar
            </Button>
          </Surface>

          <Surface style={styles.actionCard} elevation={1}>
            <View style={styles.actionCardContent}>
              <MaterialCommunityIcons
                name="clock-alert-outline"
                size={32}
                color={theme.colors.warn ?? theme.colors.tertiary}
              />
              <View style={styles.actionCardText}>
                <Text style={styles.actionCardTitle}>Servicio pendiente</Text>
                <Text style={styles.actionCardDesc}>
                  El cliente pagará después
                </Text>
              </View>
            </View>
            <Button
              mode="contained-tonal"
              onPress={() => setShowForm("pendiente")}
              style={styles.actionButton}
              disabled={!loaded || !cacheReady || limiteAlcanzado}
            >
              Registrar
            </Button>
          </Surface>

          {/* ── Cola de pendientes ── */}
          {queue.length > 0 && (
            <>
              <Divider style={styles.divider} />

              <View style={styles.queueHeader}>
                <Text style={styles.sectionTitle}>Cola de sincronización</Text>
                <View style={styles.badges}>
                  {pendingCount > 0 && (
                    <Chip
                      icon="clock-outline"
                      compact
                      style={styles.chipPending}
                    >
                      {planConfig.maxCitasOffline === -1
                        ? `${pendingCount} pendiente${pendingCount > 1 ? "s" : ""}`
                        : `${pendingCount}/${planConfig.maxCitasOffline}`}
                    </Chip>
                  )}
                  {errorCount > 0 && (
                    <Chip
                      icon="alert-circle-outline"
                      compact
                      style={styles.chipError}
                      textStyle={{ color: theme.colors.error }}
                    >
                      {errorCount} error{errorCount > 1 ? "es" : ""}
                    </Chip>
                  )}
                </View>
              </View>

              <OfflineQueueList />
            </>
          )}
        </ScrollView>

        {/* ── Footer: reconectar ── */}
        <Surface style={styles.footer} elevation={2}>
          <Button
            mode="contained"
            onPress={handleTryReconnect}
            loading={syncing}
            disabled={syncing}
            icon="wifi-check"
            style={styles.reconnectButton}
          >
            {syncing
              ? "Sincronizando..."
              : pendingCount > 0
                ? `Reconectar y sincronizar (${pendingCount})`
                : "Reconectar"}
          </Button>
        </Surface>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
    },
    headerCopy: {
      flex: 1,
    },
    headerSubtitle: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
      marginTop: 2,
    },
    banner: {
      backgroundColor: theme.colors.elevation?.level1 ?? theme.colors.surface,
      marginBottom: 4,
    },
    cacheWarning: {
      backgroundColor: theme.colors.warnContainer,
      marginBottom: 4,
    },
    content: {
      padding: 16,
      paddingBottom: 100,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 12,
      color: theme.colors.onBackground,
    },
    actionCard: {
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outlineVariant,
    },
    actionCardContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 12,
    },
    actionCardText: {
      flex: 1,
    },
    actionCardTitle: {
      fontSize: 16,
      fontWeight: "600",
    },
    actionCardDesc: {
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    actionButton: {
      alignSelf: "flex-end",
      borderRadius: 8,
    },
    divider: {
      marginVertical: 20,
    },
    queueHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      flexWrap: "wrap",
      gap: 8,
    },
    badges: {
      flexDirection: "row",
      gap: 6,
    },
    chipPending: {
      backgroundColor: theme.colors.primaryContainer,
    },
    chipError: {
      backgroundColor: theme.colors.errorContainer,
    },
    footer: {
      padding: 16,
      paddingBottom: Platform.OS === "ios" ? 24 : 16,
      backgroundColor: theme.colors.elevation?.level2 ?? theme.colors.surface,
    },
    reconnectButton: {
      borderRadius: 8,
    },
  });
