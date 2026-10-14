import React, { useCallback, useEffect, useState, useMemo } from "react";
import { AppState, Platform, ScrollView, StyleSheet, View } from "react-native";
import * as Notifications from "expo-notifications";
import {
  ActivityIndicator,
  Button,
  Card,
  List,
  Snackbar,
  Surface,
  Switch,
  Text,
  useTheme,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { registerForPushNotifications } from "../../notifications/push";
import {
  notificacionesApi,
  PreferenciasNotificacion,
} from "../../api/notificaciones";
import { useAuthStore } from "../../stores/authStore";
import { useFocusEffect } from "@react-navigation/native";

type PermissionState =
  | "loading"
  | "granted"
  | "denied"
  | "undetermined"
  | "unavailable";
type RegistrationState = "idle" | "syncing" | "registered" | "error";

export default function NotificacionesScreen() {
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { isAdmin } = useAuthStore();
  const [permission, setPermission] = useState<PermissionState>("loading");
  const [registration, setRegistration] =
    useState<RegistrationState>("idle");
  const [activating, setActivating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [prefs, setPrefs] = useState<PreferenciasNotificacion | null>(null);

  const loadPermission = useCallback(async () => {
    if (Platform.OS === "web") {
      setPermission("unavailable");
      return;
    }

    try {
      const result = await Notifications.getPermissionsAsync();
      if (result.status === "granted") {
        setPermission("granted");
        setRegistration("syncing");
        const token = await registerForPushNotifications(false);
        setRegistration(token ? "registered" : "error");
      } else {
        setPermission(
          result.status === "denied" ? "denied" : "undetermined",
        );
        setRegistration("idle");
      }
    } catch {
      setPermission("unavailable");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPermission();
      if (isAdmin) {
        notificacionesApi
          .getPreferencias()
          .then(setPrefs)
          .catch(() => {});
      }
    }, [loadPermission, isAdmin]),
  );

  const togglePref = async (key: keyof PreferenciasNotificacion) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated); // optimista
    try {
      await notificacionesApi.updatePreferencias(updated);
    } catch {
      setPrefs(prefs); // revertir
      setMessage("No se pudo guardar la preferencia. Intenta de nuevo.");
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") loadPermission();
    });

    return () => subscription.remove();
  }, [loadPermission]);

  const activate = async () => {
    setActivating(true);
    try {
      const token = await registerForPushNotifications(true);
      if (token) {
        setPermission("granted");
        setRegistration("registered");
      } else {
        await loadPermission();
      }
      setMessage(
        token
          ? "Notificaciones activadas en este dispositivo."
          : "No pudimos registrar este dispositivo. Revisa el permiso del sistema o usa la app instalada.",
      );
    } finally {
      setActivating(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const result = await notificacionesApi.testNotification();
      setMessage(result.mensaje);
    } catch {
      setMessage(
        "No pudimos enviar la prueba. Comprueba que las notificaciones estén activadas en la app instalada.",
      );
    } finally {
      setTesting(false);
    }
  };

  const granted = permission === "granted";
  const ready = granted && registration === "registered";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Surface elevation={0} style={styles.hero}>
        <View
          style={[
            styles.heroIcon,
            {
              backgroundColor: ready
                ? theme.colors.primaryContainer
                : theme.colors.surfaceVariant,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={ready ? "bell-check" : "bell-outline"}
            size={38}
            color={
              ready ? theme.colors.primary : theme.colors.onSurfaceVariant
            }
          />
        </View>
        <Text variant="headlineSmall" style={styles.heroTitle}>
          Tu negocio te avisa
        </Text>
        <Text variant="bodyMedium" style={styles.heroText}>
          Recibe un resumen útil del día sin tener que abrir CuadreAPP para
          revisar cada pendiente.
        </Text>
      </Surface>

      <Card mode="outlined" style={styles.statusCard}>
        <Card.Content style={styles.statusContent}>
          <View style={styles.statusCopy}>
            <Text variant="labelMedium" style={styles.overline}>
              ESTADO EN ESTE DISPOSITIVO
            </Text>
            {permission === "loading" ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text variant="titleMedium" style={styles.statusTitle}>
                {ready
                  ? "Notificaciones activadas"
                  : granted && registration === "syncing"
                    ? "Conectando este dispositivo"
                    : granted && registration === "error"
                      ? "Falta conectar este dispositivo"
                  : permission === "unavailable"
                    ? "Disponible en la app móvil"
                    : "Notificaciones desactivadas"}
              </Text>
            )}
            <Text variant="bodySmall" style={styles.statusDescription}>
              {ready
                ? "Este dispositivo está preparado para recibir el resumen diario."
                : granted && registration === "error"
                  ? "El permiso está activo, pero no pudimos registrar el dispositivo. Reintenta con conexión."
                : permission === "unavailable"
                  ? "La versión web no recibe notificaciones push. Actívalas desde Android."
                  : "Actívalas para no perder cobros, recordatorios y el resumen de tu jornada."}
            </Text>
          </View>
          <View
            style={[styles.statusDot, ready && styles.statusDotActive]}
          />
        </Card.Content>
        {!ready &&
          permission !== "unavailable" &&
          registration !== "syncing" && (
          <Card.Actions>
            <Button
              mode="contained"
              icon="bell-plus-outline"
              onPress={activate}
              loading={activating}
            >
              {granted ? "Reintentar conexión" : "Activar notificaciones"}
            </Button>
          </Card.Actions>
        )}
      </Card>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Qué recibirás
      </Text>
      <Surface elevation={0} style={styles.list}>
        <List.Item
          title="Cobros pendientes"
          description="Cuántos clientes tienen saldo y el total por cobrar."
          left={(props) => (
            <List.Icon
              {...props}
              icon="account-cash-outline"
              color={theme.colors.warn}
            />
          )}
        />
        <List.Item
          title="Clientes por recordar"
          description="A quién conviene escribir para recuperar una visita."
          left={(props) => (
            <List.Icon
              {...props}
              icon="message-text-clock-outline"
              color={theme.colors.secondary}
            />
          )}
        />
        <List.Item
          title="Citas de hoy"
          description="Cuántas citas tienes en agenda para empezar el día preparado."
          left={(props) => (
            <List.Icon
              {...props}
              icon="calendar-today"
              color={theme.colors.primary}
            />
          )}
        />
        <List.Item
          title="Resumen de la jornada"
          description="Servicios e ingresos registrados el día anterior."
          left={(props) => (
            <List.Icon
              {...props}
              icon="chart-box-outline"
              color={theme.colors.tertiary}
            />
          )}
        />
        <List.Item
          title="Nómina del equipo"
          description="Clientes que llevan tiempo sin volver y aviso cuando generas una nómina."
          left={(props) => (
            <List.Icon
              {...props}
              icon="cash-multiple"
              color={theme.colors.cuarto}
            />
          )}
        />
      </Surface>

      <Card mode="contained" style={styles.quietCard}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.quietTitle}>
            Solo cuando hay algo importante
          </Text>
          <Text variant="bodySmall" style={styles.quietText}>
            Si no tienes pendientes ni actividad que resumir, no enviamos una
            notificación vacía.
          </Text>
        </Card.Content>
      </Card>

      {isAdmin && prefs && (
        <>
          <Text variant="titleMedium" style={[styles.sectionTitle, styles.prefsTitle]}>
            Preferencias
          </Text>
          <Surface elevation={0} style={styles.list}>
            <List.Item
              title="Resumen diario"
              description="Cobros, recordatorios y jornada, cada mañana."
              left={(props) => (
                <List.Icon {...props} icon="weather-sunny" color={theme.colors.primary} />
              )}
              right={() => (
                <Switch
                  value={prefs.digestDiario}
                  onValueChange={() => togglePref("digestDiario")}
                />
              )}
            />
            <List.Item
              title="Aviso de nómina"
              description="Cuando toca pagar a tu equipo."
              left={(props) => (
                <List.Icon {...props} icon="cash-multiple" color={theme.colors.cuarto} />
              )}
              right={() => (
                <Switch
                  value={prefs.avisoNomina}
                  onValueChange={() => togglePref("avisoNomina")}
                />
              )}
            />
            <List.Item
              title="Avisos de suscripción"
              description="Vencimientos y renovación de tu plan."
              left={(props) => (
                <List.Icon {...props} icon="credit-card-clock-outline" color={theme.colors.warn} />
              )}
              right={() => (
                <Switch
                  value={prefs.avisoSuscripcion}
                  onValueChange={() => togglePref("avisoSuscripcion")}
                />
              )}
            />
            <List.Item
              title="Anuncios de Cuadre"
              description="Novedades y mejoras de la app."
              left={(props) => (
                <List.Icon {...props} icon="bullhorn-outline" color={theme.colors.secondary} />
              )}
              right={() => (
                <Switch
                  value={prefs.anuncios}
                  onValueChange={() => togglePref("anuncios")}
                />
              )}
            />
          </Surface>
        </>
      )}

      {isAdmin && ready && (
        <Button
          mode="outlined"
          icon="send-outline"
          onPress={sendTest}
          loading={testing}
          disabled={testing}
          style={styles.testButton}
        >
          Enviar notificación de prueba
        </Button>
      )}

      <View style={styles.bottomSpace} />
      <Snackbar
        visible={!!message}
        onDismiss={() => setMessage("")}
        duration={5000}
      >
        {message}
      </Snackbar>
    </ScrollView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
      width: "100%",
      maxWidth: 720,
      alignSelf: "center",
    },
    hero: {
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 24,
      backgroundColor: theme.colors.background,
    },
    heroIcon: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    heroTitle: {
      color: theme.colors.onBackground,
      fontWeight: "bold",
      textAlign: "center",
    },
    heroText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
      lineHeight: 21,
      marginTop: 8,
      maxWidth: 440,
    },
    statusCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
      marginBottom: 24,
      borderRadius: 8,
    },
    statusContent: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 16,
    },
    statusCopy: {
      flex: 1,
      gap: 6,
    },
    overline: {
      color: theme.colors.primary,
      fontWeight: "bold",
    },
    statusTitle: {
      color: theme.colors.onSurface,
      fontWeight: "bold",
    },
    statusDescription: {
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
    },
    statusDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginTop: 4,
      backgroundColor: theme.colors.outlineVariant,
    },
    statusDotActive: {
      backgroundColor: theme.colors.primary,
    },
    sectionTitle: {
      color: theme.colors.onBackground,
      fontWeight: "bold",
      marginBottom: 10,
    },
    list: {
      overflow: "hidden",
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outlineVariant,
    },
    quietCard: {
      marginTop: 16,
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: 8,
    },
    quietTitle: {
      color: theme.colors.onPrimaryContainer,
      fontWeight: "bold",
    },
    quietText: {
      color: theme.colors.onPrimaryContainer,
      lineHeight: 18,
      marginTop: 4,
      opacity: 0.8,
    },
    prefsTitle: {
      marginTop: 20,
    },
    testButton: {
      marginTop: 20,
      borderRadius: 8,
    },
    bottomSpace: {
      height: 24,
    },
  });
