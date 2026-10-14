import React, { useEffect, useMemo } from "react";
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from "react-native-paper";
import RootNavigator from "./src/navigation/RootNavigator";
import { useAuthStore } from "./src/stores/authStore";
import { ConfirmDialogProvider } from "./src/components/ConfirmDialog";
import ErrorBoundary from "./src/components/ErrorBoundary";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ConnectionErrorScreen from "./src/screens/shared/ConnectionErrorScreen";
import { useNetworkListener } from "./src/hooks/useNetworkListener";
import { useThemeStore } from "./src/stores/themeStore";
import { useColorScheme } from "react-native";
import { useConnectionStore } from "./src/stores/connectionStore";
import { useOfflineSync } from "./src/hooks/useOfflineSync";
import OfflineScreen from "./src/screens/shared/OfflineScreen";
import { analytics, AnalyticsEvent, initErrorTracking } from "./src/analytics";
import {
  registerForPushNotifications,
  setupNotificationTapHandling,
} from "./src/notifications/push";
import { StatusBar } from "expo-status-bar";
import OfflineSyncStatus from "./src/components/OfflineSyncStatus";
import { useAds } from "./src/ads/useAds";
import { BRAND } from "./src/theme/brand";
import { useHashPublico } from "./src/hooks/useHashPublico";
import { empresaDesdeHash } from "./src/utils/enlacesPublicos";
import { reservaDesdeHash } from "./src/utils/reservasPublicas";

// Oscuro "vibrante": fondo verde-negro más profundo, superficies más separadas
// para dar relieve a las tarjetas, y lima con más punch como acento de marca.
const CustomDarkTheme = {
  roundness: 5,
  colors: {
    primary: "#B0E84F",
    onPrimary: "#173600",
    primaryContainer: "#2F5A1E",
    onPrimaryContainer: "#CDEE9A",
    secondary: "#F5A9C4",
    onSecondary: "#4D1028",
    secondaryContainer: "#6A2A44",
    onSecondaryContainer: "#FFD9E7",
    tertiary: "#FFB690",
    onTertiary: "#582000",
    tertiaryContainer: "#7A3818",
    onTertiaryContainer: "#FFE1D2",
    error: "#FFB4AB",
    onError: "#690005",
    errorContainer: "#93000A",
    onErrorContainer: "#FFDAD6",
    background: "#0F140C",
    onBackground: "#EAF0E2",
    surface: "#1A2117",
    onSurface: "#EAF0E2",
    surfaceVariant: "#2C3626",
    onSurfaceVariant: "#C6D0BD",
    outline: "#909A85",
    outlineVariant: "#3F4A38",
    shadow: "#000000",
    scrim: "#000000",
    inverseSurface: "#EAF0E2",
    inverseOnSurface: "#2A3125",
    inversePrimary: "#356F1C",
    elevation: {
      level0: "transparent",
      level1: "#1E2619",
      level2: "#222C1C",
      level3: "#28331F",
      level4: "#2A3621",
      level5: "#2F3D25",
    },
    surfaceDisabled: "rgba(234, 240, 226, 0.12)",
    onSurfaceDisabled: "rgba(234, 240, 226, 0.38)",
    backdrop: "rgba(6, 10, 4, 0.75)",
    cuarto: "#C2F05A",
    onCuarto: "#1E2E00",
    cuartoContainer: "#3C560C",
    onCuartoContainer: "#E0F5A6",
    warn: "#FFB690",
    onWarn: "#582000",
    warnContainer: "#7A3818",
    onWarnContainer: "#FFE1D2",
    brandDeep: "#123D06",
    brandLime: "#C2F05A",
    schedule: "#F5A9C4",
    scheduleContainer: "#6A2A44",
    attention: "#FFB690",
    attentionContainer: "#7A3818",
  },
};

const CustomLightTheme = {
  roundness: 5,
  colors: {
    primary: BRAND.green,
    onPrimary: "#FFFFFF",
    primaryContainer: "#E0F1D2",
    onPrimaryContainer: "#153606",
    secondary: BRAND.pink,
    onSecondary: "#FFFFFF",
    secondaryContainer: "#FCE1EB",
    onSecondaryContainer: "#491126",
    tertiary: BRAND.orange,
    onTertiary: "#FFFFFF",
    tertiaryContainer: BRAND.orangeSoft,
    onTertiaryContainer: "#421300",
    error: "#BA1A1A",
    onError: "#FFFFFF",
    errorContainer: "#FFDAD6",
    onErrorContainer: "#410002",
    background: BRAND.paper,
    onBackground: "#1A1D18",
    surface: BRAND.white,
    onSurface: "#1A1D18",
    surfaceVariant: "#ECEFE6",
    onSurfaceVariant: "#474D43",
    outline: "#747B70",
    outlineVariant: "#CAD2C5",
    shadow: "#000000",
    scrim: "#000000",
    inverseSurface: "#2E322C",
    inverseOnSurface: "#F1F3ED",
    inversePrimary: "#A8D97A",
    elevation: {
      level0: "transparent",
      level1: "#F1F5EC",
      level2: "#EBF1E5",
      level3: "#E5EDDE",
      level4: "#E2EADB",
      level5: "#DDE7D6",
    },
    surfaceDisabled: "rgba(26, 29, 24, 0.12)",
    onSurfaceDisabled: "rgba(26, 29, 24, 0.38)",
    backdrop: "rgba(19, 25, 17, 0.52)",
    cuarto: "#668A1F",
    onCuarto: "#FFFFFF",
    cuartoContainer: "#E5F2BE",
    onCuartoContainer: "#273500",
    warn: BRAND.orange,
    onWarn: "#FFFFFF",
    warnContainer: BRAND.orangeSoft,
    onWarnContainer: "#421300",
    brandDeep: BRAND.greenDeep,
    brandLime: BRAND.lime,
    schedule: BRAND.pink,
    scheduleContainer: BRAND.pinkSoft,
    attention: BRAND.orange,
    attentionContainer: BRAND.orangeSoft,
  },
};
export default function App() {
  const hashPublico = useHashPublico();
  const esPaginaPublica = empresaDesdeHash(hashPublico) !== null || reservaDesdeHash(hashPublico) !== null;
  // Selectores, no el store entero.
  //
  // Desestructurar `useAuthStore()` suscribe a TODO el estado, asi que cualquier
  // `set` en cualquier parte del store re-renderiza la raiz de la app y con ella
  // el arbol completo. Con selector, solo re-renderiza si cambia lo que se usa.
  const loadStoredAuth = useAuthStore((s) => s.loadStoredAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mode = useThemeStore((s) => s.mode);
  const loadTheme = useThemeStore((s) => s.loadTheme);
  const isOfflineMode = useConnectionStore((s) => s.isOfflineMode);
  const systemScheme = useColorScheme();
  useNetworkListener();
  useOfflineSync();
  useAds();

  useEffect(() => {
    initErrorTracking();
    analytics.track(AnalyticsEvent.AppOpened);
    loadStoredAuth();
    loadTheme();
    const unsubscribe = setupNotificationTapHandling();
    return unsubscribe;
  }, []);

  // Registrar el token push una vez que el usuario está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications().catch(() => {});
    }
  }, [isAuthenticated]);

  const resolvedMode = mode === "system" ? (systemScheme ?? "light") : mode;

  // useMemo obligatorio: PaperProvider pasa `theme` por contexto, asi que un
  // objeto nuevo en cada render invalida el contexto y obliga a re-renderizar a
  // TODOS los useTheme() de la app, que a su vez reconstruyen sus StyleSheet.
  const theme = useMemo(
    () =>
      resolvedMode === "dark"
        ? { ...MD3DarkTheme, ...CustomDarkTheme, colors: { ...CustomDarkTheme.colors } }
        : { ...MD3LightTheme, ...CustomLightTheme, colors: { ...CustomLightTheme.colors } },
    [resolvedMode],
  );

  return (
    // El limite exterior va POR ENCIMA del proveedor de tema: si lo que falla es
    // el tema, un limite interior no llegaria a renderizarse nunca.
    <ErrorBoundary ambito="raiz">
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <StatusBar
          style={resolvedMode === "dark" ? "light" : "dark"}
          backgroundColor="transparent"
          translucent
        />
        <ConfirmDialogProvider>
          {/* ── Si está en modo offline, mostrar solo OfflineScreen ── */}
          {/* Limite interior: que un fallo dentro de una pantalla no tumbe
              tambien el aviso de sincronizacion ni el de conexion. */}
          <ErrorBoundary ambito="navegacion">
            {isOfflineMode && !esPaginaPublica ? <OfflineScreen /> : <RootNavigator hashPublico={hashPublico} />}
          </ErrorBoundary>
          {!esPaginaPublica && <OfflineSyncStatus />}
          {/* ── ConnectionErrorScreen se muestra encima de todo cuando hay error ── */}
          {!esPaginaPublica && <ConnectionErrorScreen />}
        </ConfirmDialogProvider>
      </SafeAreaProvider>
    </PaperProvider>
    </ErrorBoundary>
  );
}
