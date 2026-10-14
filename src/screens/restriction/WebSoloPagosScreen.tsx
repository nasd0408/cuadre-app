import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, ScrollView, Linking } from "react-native";
import { Text, Card, Surface, Button, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { usePlanStore } from "../../stores/planStore";
import { analytics, AnalyticsEvent } from "../../analytics";

const LANDING_PLANES_URL = "https://cuadreapp.duckdns.org/#planes";

/**
 * Pantalla que ve un usuario del plan Gratis al entrar por la web.
 *
 * La versión web es un beneficio de los planes pagos; en Gratis la app vive solo
 * en el móvil, que además es donde se muestran los anuncios. El bloqueo es de
 * cliente (evadible por alguien técnico); endurecerlo en el backend implicaría
 * marcar la plataforma en cada request y no compensa el riesgo.
 */
export default function WebSoloPagosScreen() {
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const logout = useAuthStore((state) => state.logout);
  const plan = usePlanStore((state) => state.plan);

  useEffect(() => {
    analytics.track(AnalyticsEvent.UpgradePromptShown, {
      origen: "web_gate",
      plan: plan?.planNombre,
    });
  }, []);

  const handleVerPlanes = () => {
    analytics.track(AnalyticsEvent.UpgradeCtaClicked, { origen: "web_gate" });
    Linking.openURL(LANDING_PLANES_URL);
  };

  return (
    <Surface elevation={0} style={styles.root}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Surface elevation={0} style={styles.heroSection}>
          <Surface elevation={0} style={styles.heroIconContainer}>
            <MaterialCommunityIcons
              name="cellphone-check"
              size={44}
              color={theme.colors.onPrimaryContainer}
            />
          </Surface>

          <Text variant="headlineSmall" style={styles.heroTitle}>
            Sigue desde tu teléfono
          </Text>

          <Text variant="bodyMedium" style={styles.heroSubtitle}>
            La versión web está disponible en los planes pagos. Con el plan Gratis puedes
            usar CuadreAPP completo desde la app móvil.
          </Text>
        </Surface>

        <Card style={styles.ctaCard} onPress={handleVerPlanes}>
          <Card.Content style={styles.ctaContent}>
            <Surface
              elevation={0}
              style={[styles.ctaIconContainer, { backgroundColor: theme.colors.primary }]}
            >
              <MaterialCommunityIcons name="web" size={28} color={theme.colors.onPrimary} />
            </Surface>

            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={styles.ctaTitle}>
                Ver planes
              </Text>
              <Text variant="bodySmall" style={styles.ctaSubtitle}>
                Desbloquea la web y quita los anuncios
              </Text>
            </View>

            <MaterialCommunityIcons
              name="open-in-new"
              size={22}
              color={theme.colors.primary}
            />
          </Card.Content>
        </Card>

        <Card style={styles.infoCard}>
          <Card.Content style={styles.infoContent}>
            <MaterialCommunityIcons
              name="information-outline"
              size={20}
              color={theme.colors.primary}
            />
            <Text variant="bodySmall" style={styles.infoText}>
              Tu información está intacta. Al pasar a un plan pago recuperas el acceso web
              de inmediato, con los mismos datos.
            </Text>
          </Card.Content>
        </Card>

        <Button
          mode="outlined"
          onPress={() => logout()}
          style={styles.bottomLogoutBtn}
          icon="logout"
          textColor={theme.colors.error}
        >
          Cerrar sesión
        </Button>

        <View style={{ height: 32 }} />
      </ScrollView>
    </Surface>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1 },
    container: { flex: 1, backgroundColor: theme.colors.background },
    contentContainer: { paddingBottom: 16 },
    heroSection: {
      backgroundColor: theme.colors.primary,
      paddingTop: 32,
      paddingBottom: 40,
      paddingHorizontal: 24,
      alignItems: "center",
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    heroIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primaryContainer,
    },
    heroTitle: {
      marginTop: 16,
      fontWeight: "bold",
      color: theme.colors.onPrimary,
      textAlign: "center",
    },
    heroSubtitle: {
      marginTop: 8,
      color: theme.colors.onPrimary,
      opacity: 0.9,
      textAlign: "center",
    },
    ctaCard: {
      margin: 16,
      marginBottom: 8,
      backgroundColor: theme.colors.surface,
    },
    ctaContent: { flexDirection: "row", alignItems: "center", gap: 14 },
    ctaIconContainer: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
    },
    ctaTitle: { fontWeight: "bold", color: theme.colors.onSurface },
    ctaSubtitle: { marginTop: 2, color: theme.colors.onSurfaceVariant },
    infoCard: {
      marginHorizontal: 16,
      marginTop: 8,
      backgroundColor: theme.colors.surfaceVariant,
    },
    infoContent: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    infoText: { flex: 1, color: theme.colors.onSurfaceVariant },
    bottomLogoutBtn: { marginHorizontal: 16, marginTop: 24 },
  });
