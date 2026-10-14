import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
} from "react-native";
import { Text, Card, Surface, Button, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { useSubscriptionStore } from "../../stores/subscriptionStore";

const LANDING_URL = "https://cuadreapp.duckdns.org";

const CONTACT = {
  phone: "+584145202186",
  phoneDisplay: "+58 414 520 2186",
  email: "Cuadreapp@gmail.com",
};

export default function GestionarCuentaScreen() {
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const logout = useAuthStore((state) => state.logout);
  const { status, clearStatus } = useSubscriptionStore();

  const isRestricted = status?.estado === "Suspendido";

  const handleLogout = async () => {
    clearStatus();
    await logout();
  };

  const handleGoToLanding = () => {
    Linking.openURL(LANDING_URL);
  };

  const handleWhatsApp = () => {
    Linking.openURL(
      `https://wa.me/${CONTACT.phone.replace("+", "")}?text=${encodeURIComponent(
        "Hola, necesito ayuda con mi cuenta de CuadreAPP.",
      )}`,
    );
  };

  return (
    <Surface elevation={0} style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Hero */}
        <Surface elevation={0} style={styles.heroSection}>
          {isRestricted && (
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <MaterialCommunityIcons
                name="logout"
                size={18}
                color={theme.colors.onPrimary}
              />
              <Text style={styles.logoutText}>Salir</Text>
            </TouchableOpacity>
          )}

          <Surface elevation={0} style={styles.heroIconContainer}>
            <MaterialCommunityIcons
              name={isRestricted ? "lock-alert" : "shield-check"}
              size={44}
              color={theme.colors.onPrimaryContainer}
            />
          </Surface>

          <Text variant="headlineSmall" style={styles.heroTitle}>
            {isRestricted ? "Acceso restringido" : "Gestionar cuenta"}
          </Text>

          <Text variant="bodyMedium" style={styles.heroSubtitle}>
            {isRestricted
              ? "El acceso a esta cuenta se encuentra temporalmente restringido."
              : "Para gestionar tu cuenta y acceder a más opciones visita nuestra página web."}
          </Text>
        </Surface>

        {/* Banner estado */}
        {isRestricted && status?.empresaNombre && (
          <Card style={styles.suspendedBanner}>
            <Card.Content style={styles.suspendedContent}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={22}
                color="#c62828"
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text
                  variant="titleSmall"
                  style={{ fontWeight: "bold", color: "#c62828" }}
                >
                  {status.empresaNombre}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: "#b71c1c", marginTop: 2 }}
                >
                  Para restaurar el acceso visita nuestra página web.
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* CTA web */}
        <Card style={styles.ctaCard} onPress={handleGoToLanding}>
          <Card.Content style={styles.ctaContent}>
            <Surface
              elevation={0}
              style={[
                styles.ctaIconContainer,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <MaterialCommunityIcons
                name="web"
                size={28}
                color={theme.colors.onPrimary}
              />
            </Surface>

            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={styles.ctaTitle}>
                Abrir página web de CuadreAPP
              </Text>

              <Text variant="bodySmall" style={styles.ctaSubtitle}>
                Gestiona tu cuenta y encuentra más información
              </Text>
            </View>

            <MaterialCommunityIcons
              name="open-in-new"
              size={22}
              color={theme.colors.primary}
            />
          </Card.Content>
        </Card>

        {/* Soporte */}
        <Card style={styles.supportCard} onPress={handleWhatsApp}>
          <Card.Content style={styles.supportContent}>
            <Surface
              elevation={0}
              style={[
                styles.supportIconContainer,
                { backgroundColor: "#25D366" },
              ]}
            >
              <MaterialCommunityIcons
                name="whatsapp"
                size={24}
                color="#fff"
              />
            </Surface>

            <View style={{ flex: 1 }}>
              <Text variant="titleSmall" style={styles.supportTitle}>
                ¿Necesitas ayuda?
              </Text>

              <Text variant="bodySmall" style={styles.supportSubtitle}>
                Escríbenos por WhatsApp
              </Text>
            </View>

            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color="#ccc"
            />
          </Card.Content>
        </Card>

        {/* Info */}
        <Card style={styles.infoCard}>
          <Card.Content style={styles.infoContent}>
            <MaterialCommunityIcons
              name="information-outline"
              size={20}
              color={theme.colors.primary}
            />

            <Text variant="bodySmall" style={styles.infoText}>
              En nuestra página web encontrarás más información sobre tu cuenta
              y las opciones disponibles para continuar utilizando CuadreAPP.
            </Text>
          </Card.Content>
        </Card>

        {/* Logout inferior */}
        {isRestricted && (
          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.bottomLogoutBtn}
            icon="logout"
            textColor={theme.colors.error}
          >
            Cerrar sesión
          </Button>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </Surface>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentContainer: {
      paddingBottom: 16,
    },
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
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    heroTitle: {
      color: theme.colors.onPrimary,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 8,
    },
    heroSubtitle: {
      color: theme.colors.onPrimary,
      textAlign: "center",
      lineHeight: 20,
      opacity: 0.9,
    },
    logoutButton: {
      position: "absolute",
      top: 12,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.15)",
      gap: 4,
    },
    logoutText: {
      color: theme.colors.onPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    suspendedBanner: {
      marginHorizontal: 16,
      marginTop: -20,
      marginBottom: 8,
      borderRadius: 12,
      backgroundColor: "#ffebee",
      borderLeftWidth: 4,
      borderLeftColor: "#c62828",
      elevation: 3,
    },
    suspendedContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
    },
    ctaCard: {
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 14,
      elevation: 3,
    },
    ctaContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
    },
    ctaIconContainer: {
      width: 52,
      height: 52,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    ctaTitle: {
      fontWeight: "bold",
      color: theme.colors.onSurface,
    },
    ctaSubtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    supportCard: {
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 14,
      elevation: 2,
    },
    supportContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
    },
    supportIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    supportTitle: {
      fontWeight: "bold",
      color: theme.colors.onSurface,
    },
    supportSubtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    infoCard: {
      marginHorizontal: 16,
      marginTop: 16,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 14,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
    },
    infoContent: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingVertical: 12,
    },
    infoText: {
      flex: 1,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
    },
    bottomLogoutBtn: {
      marginHorizontal: 16,
      marginTop: 20,
      borderRadius: 12,
      borderColor: theme.colors.error,
    },
  });