import React, { useMemo } from "react";
import { View, StyleSheet, Linking } from "react-native";
import { Text, Button, Surface, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { useSubscriptionStore } from "../../stores/subscriptionStore";

const LANDING_URL = "https://cuadreapp.duckdns.org";

export default function AccountRestrictedScreen() {
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const logout = useAuthStore((state) => state.logout);
  const { status, clearStatus } = useSubscriptionStore();

  const handleLogout = async () => {
    clearStatus();
    await logout();
  };

  const handleGoToLanding = () => {
    Linking.openURL(LANDING_URL);
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <Surface elevation={0} style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="lock-alert"
            size={40}
            color={theme.colors.error}
          />
        </Surface>

        <Text variant="headlineSmall" style={styles.title}>
          Acceso restringido
        </Text>

        {status?.empresaNombre && (
          <Text variant="bodyLarge" style={styles.empresaName}>
            {status.empresaNombre}
          </Text>
        )}

        <View style={styles.messageContainer}>
          <Text variant="bodyMedium" style={styles.message}>
            El acceso a esta cuenta se encuentra temporalmente restringido.
            Para obtener más información y gestionar tu cuenta, visita nuestra
            página web.
          </Text>
        </View>

        <Button
          mode="contained"
          onPress={handleGoToLanding}
          style={styles.primaryButton}
          contentStyle={styles.primaryButtonContent}
          icon="web"
        >
          Abrir página web de CuadreAPP
        </Button>

        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.logoutButton}
          contentStyle={styles.logoutButtonContent}
          icon="logout"
          textColor={theme.colors.error}
        >
          Cerrar sesión
        </Button>
      </Surface>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: "center",
      padding: 24,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 32,
      alignItems: "center",
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.errorContainer ?? "#fef2f2",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontWeight: "bold",
      color: theme.colors.error,
      marginBottom: 6,
      textAlign: "center",
    },
    empresaName: {
      color: theme.colors.onSurface,
      fontWeight: "600",
      marginBottom: 20,
      textAlign: "center",
    },
    messageContainer: {
      backgroundColor: theme.colors.errorContainer ?? "#fef2f2",
      borderRadius: 14,
      padding: 16,
      marginBottom: 24,
      width: "100%",
    },
    message: {
      color: theme.colors.onErrorContainer ?? "#991b1b",
      textAlign: "center",
      lineHeight: 22,
    },
    primaryButton: {
      width: "100%",
      borderRadius: 12,
      marginBottom: 10,
    },
    primaryButtonContent: {
      paddingVertical: 8,
    },
    logoutButton: {
      width: "100%",
      borderRadius: 12,
      borderColor: theme.colors.error,
    },
    logoutButtonContent: {
      paddingVertical: 6,
    },
  });