// screens/shared/ConnectionErrorScreen.tsx
import { useState, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import {
  Text,
  Button,
  ActivityIndicator,
  useTheme,
  Surface,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useConnectionStore } from "../../stores/connectionStore";
import NetInfo from "@react-native-community/netinfo";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CONFIG = {
  no_internet: {
    icon: "wifi-off" as const,
    title: "Sin conexión a internet",
    description: "Revisa tu WiFi o datos móviles.",
  },
  server_error: {
    icon: "server-network-off" as const,
    title: "Sin conexión al servidor",
    description:
      "No pudimos contactar el servidor.\nVerifica tu conexión a internet.",
  },
  db_error: {
    icon: "database-off" as const,
    title: "Error en el servidor",
    description:
      "El servidor está en línea pero no\npuede acceder a la base de datos.",
  },
};

const HEALTH_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/api\/?$/, "");

export default function ConnectionErrorScreen() {
  const { connectionError, clearConnectionError, enterOfflineMode } =
    useConnectionStore();
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);

  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  if (!connectionError) return null;

  const { icon, title, description } = CONFIG[connectionError];

  const handleRetry = async () => {
    setRetrying(true);
    setRetryFailed(false);

    const minDelay = new Promise((resolve) => setTimeout(resolve, 2000));

    if (connectionError === "no_internet") {
      const [state] = await Promise.all([NetInfo.fetch(), minDelay]);
      if (
        state.isConnected &&
        state.isInternetReachable !== false
      ) {
        clearConnectionError();
      } else {
        setRetryFailed(true);
      }
      setRetrying(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const [res] = await Promise.all([
        fetch(`${HEALTH_URL}/health`, { signal: controller.signal }),
        minDelay,
      ]);
      clearTimeout(timeoutId);

      if (res.ok) {
        clearConnectionError();
      } else {
        setRetryFailed(true);
      }
    } catch {
      await minDelay;
      setRetryFailed(true);
    }

    setRetrying(false);
  };

  return (
    <Surface
      style={[
        styles.overlay,
        {
          paddingTop: 32 + insets.top,
          paddingBottom: 32 + insets.bottom,
          paddingLeft: 32 + insets.left,
          paddingRight: 32 + insets.right,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={64}
        color={theme.colors.error}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {retrying ? (
        <ActivityIndicator
          animating
          size="large"
          color={theme.colors.primary}
          style={styles.spinner}
        />
      ) : (
        <>
          {retryFailed && (
            <Text style={styles.retryFailed}>
              Sigue sin conexión, intenta de nuevo
            </Text>
          )}

          <Button mode="contained" onPress={handleRetry} style={styles.button}>
            Reintentar
          </Button>

          {/* ── Botón modo offline ── */}
          <Button
            mode="outlined"
            onPress={enterOfflineMode}
            style={styles.offlineButton}
            icon="content-cut"
          >
            Continuar en modo offline
          </Button>

          <Text style={styles.offlineHint}>
            Podrás registrar servicios y se sincronizarán{"\n"}cuando vuelva la
            conexión.
          </Text>
        </>
      )}
    </Surface>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.background,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      marginTop: 16,
      textAlign: "center",
    },
    description: {
      marginTop: 8,
      textAlign: "center",
      color: theme.colors.onBackground,
      lineHeight: 22,
    },
    spinner: {
      marginTop: 32,
    },
    retryFailed: {
      color: theme.colors.error,
      textAlign: "center",
      marginTop: 16,
      marginBottom: 4,
    },
    button: {
      marginTop: 32,
      minWidth: 200,
    },
    offlineButton: {
      marginTop: 16,
      minWidth: 200,
      borderColor: theme.colors.outline,
    },
    offlineHint: {
      marginTop: 12,
      textAlign: "center",
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
    },
  });
