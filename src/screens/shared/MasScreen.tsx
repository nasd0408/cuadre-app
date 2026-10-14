// screens/shared/MasScreen.tsx
import React, { useState, useMemo } from "react";
import { StyleSheet, ScrollView, Linking } from "react-native";
import {
  List,
  Text,
  Avatar,
  Surface,
  useTheme,
  Chip,
  ActivityIndicator,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuthStore } from "../../stores/authStore";
import { usePlanStore } from "../../stores/planStore";
import { useConfirmDialog } from "../../components/ConfirmDialog";
import { ajustesApi } from "../../api/ajustes";
import { useWelcomeTourStore } from "../../stores/welcomeTourStore";
import { useUpgradePrompt, LANDING_PLANES_URL } from "../../hooks/useUpgradePrompt";
import { analytics, AnalyticsEvent } from "../../analytics";
import { BRAND } from "../../theme/brand";

import { mensajeDeError } from '../../utils/alert';
export default function MasScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { logout, user, isAdmin } = useAuthStore();
  const { plan, tieneModulo } = usePlanStore();
  const { showAlert } = useConfirmDialog();
  const { pedirUpgrade } = useUpgradePrompt();
  const [eliminando, setEliminando] = useState(false);
  const openWelcomeTour = useWelcomeTourStore((state) => state.open);
  
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigateOrBlock = (
    screen: string,
    modulo: "pagos" | "reportes" | "recordatorios" | "calendario",
    moduloNombre: string
  ) => {
    if (tieneModulo(modulo)) {
      navigation.navigate(screen);
    } else {
      pedirUpgrade({ tipo: "modulo", modulo, nombre: moduloNombre });
    }
  };

  const modPagos = tieneModulo("pagos");
  const modReportes = tieneModulo("reportes");
  const modRecordatorios = tieneModulo("recordatorios");
  const navigateToClientes = (screen: "Deudores" | "Recordatorios") => {
    navigation.getParent()?.navigate("Clientes", { screen });
  };
const handleEliminarCuenta = () => {
    // Paso 1: Primera confirmación
    showAlert(
      "Eliminar cuenta",
      "Estás a punto de eliminar tu cuenta y TODOS tus datos permanentemente. Esta acción no se puede deshacer.\n\n¿Deseas continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Continuar",
          style: "destructive",
          onPress: () => {
            // Paso 2: Segunda confirmación
            showAlert(
              "⚠️ ¿Estás seguro?",
              "Se eliminarán permanentemente:\n\n• Tu perfil y cuenta\n• Todos los clientes y sus historiales\n• Todas las citas y servicios\n• Registros de pagos y nóminas\n• Datos de tu empresa (si eres el último usuario)\n\nEsta acción es IRREVERSIBLE.",
              [
                { text: "No, volver", style: "cancel" },
                {
                  text: "Sí, eliminar todo",
                  style: "destructive",
                  onPress: () => {
                    // Paso 3: Confirmación final
                    showAlert(
                      "Última confirmación",
                      "Escríbenos si tienes dudas. Una vez eliminada, no podremos recuperar ningún dato.\n\n¿Confirmas la eliminación definitiva?",
                      [
                        { text: "Cancelar", style: "cancel" },
                        {
                          text: "Eliminar mi cuenta",
                          style: "destructive",
                          onPress: async () => {
                            setEliminando(true);
                            try {
                              await ajustesApi.eliminarCuenta();
                              showAlert(
                                "Cuenta eliminada",
                                "Tu cuenta y todos tus datos han sido eliminados correctamente.",
                                [
                                  {
                                    text: "Aceptar",
                                    style: "default",
                                    onPress: logout,
                                  },
                                ]
                              );
                            } catch (error: any) {
                              showAlert(
                                "Error",
                                mensajeDeError(error, "No se pudo eliminar la cuenta. Inténtalo más tarde."),
                                [{ text: "Entendido", style: "default" }]
                              );
                            } finally {
                              setEliminando(false);
                            }
                          },
                        },
                      ]
                    );
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };
  return (
    <ScrollView style={styles.container}>
      {/* Header con info del usuario */}
      <Surface elevation={0} style={styles.header}>
        <Avatar.Icon
          size={64}
          icon="account"
          color={BRAND.greenDeep}
          style={styles.avatar}
        />
        <Text variant="titleLarge" style={styles.userName}>
          {user?.nombreCompleto}
        </Text>
        <Text variant="bodyMedium" style={styles.email}>
          {user?.email}
        </Text>
        <Surface elevation={0} style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.roles.join(", ")}</Text>
        </Surface>
        {plan && (
          // En un plan con anuncios el chip es la puerta de salida al upsell;
          // en un plan pago es solo una etiqueta informativa.
          <Chip
            icon={plan.mostrarAnuncios ? "arrow-up-circle-outline" : "shield-crown-outline"}
            compact
            style={styles.planChip}
            textStyle={styles.planChipText}
            onPress={
              plan.mostrarAnuncios
                ? () => {
                    analytics.track(AnalyticsEvent.UpgradeCtaClicked, {
                      origen: "chip_plan",
                      plan: plan.planNombre,
                    });
                    Linking.openURL(LANDING_PLANES_URL);
                  }
                : undefined
            }
          >
            {plan.mostrarAnuncios
              ? `Plan ${plan.planNombre} · Quitar anuncios`
              : `Plan ${plan.planNombre}`}
          </Chip>
        )}
      </Surface>

      {/* Opciones de Admin */}
      {isAdmin && (
        <>
          <List.Section title="Administración" style={styles.menuSection} titleStyle={styles.sectionTitle}>
            <List.Item
              title="Servicios"
              description="Precios y servicios que ofreces"
              left={(props) => <List.Icon {...props} icon="content-cut" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate("Servicios")}
            />
            <List.Item
              title="Empleados"
              description="Gestiona tu equipo de trabajo"
              left={(props) => <List.Icon {...props} icon="account-group" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate("Empleados")}
            />
            <List.Item
              title="Mensajería WhatsApp"
              description="Tus plantillas y cómo se abre WhatsApp"
              left={(props) => <List.Icon {...props} icon="whatsapp" color="#25D366" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate("MensajeriaConfig")}
            />
            <List.Item
              title="Notificaciones"
              description="Resumen diario y permisos del dispositivo"
              left={(props) => <List.Icon {...props} icon="bell-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() =>
                navigation.getParent()?.getParent()?.navigate("Notificaciones")
              }
            />

            {/* ── Pagos: gated ── */}
            <List.Item
              title="Pagos y Nómina"
              description={
                modPagos
                  ? "Comisiones y pagos a empleados"
                  : "Disponible desde el plan Profesional"
              }
              left={(props) => (
                <List.Icon
                  {...props}
                  icon="cash-multiple"
                  color={modPagos ? undefined : theme.colors.onSurfaceDisabled}
                />
              )}
              right={(props) =>
                modPagos ? (
                  <List.Icon {...props} icon="chevron-right" />
                ) : (
                  <List.Icon
                    {...props}
                    icon="lock-outline"
                    color={theme.colors.onSurfaceDisabled}
                  />
                )
              }
              onPress={() =>
                navigateOrBlock("Nominas", "pagos", "Pagos y Nómina")
              }
              titleStyle={!modPagos ? styles.disabledText : undefined}
              descriptionStyle={!modPagos ? styles.disabledDesc : undefined}
            />

            {/* ── Recordatorios: gated ── */}
            <List.Item
              title="Recordatorios"
              description={
                modRecordatorios
                  ? "Recordatorios automáticos a clientes"
                  : "Disponible desde el plan Profesional"
              }
              left={(props) => (
                <List.Icon
                  {...props}
                  icon="bell-ring-outline"
                  color={
                    modRecordatorios
                      ? undefined
                      : theme.colors.onSurfaceDisabled
                  }
                />
              )}
              right={(props) =>
                modRecordatorios ? (
                  <List.Icon {...props} icon="chevron-right" />
                ) : (
                  <List.Icon
                    {...props}
                    icon="lock-outline"
                    color={theme.colors.onSurfaceDisabled}
                  />
                )
              }
              onPress={() =>
                modRecordatorios
                  ? navigateToClientes("Recordatorios")
                  : navigateOrBlock(
                      "Recordatorios",
                      "recordatorios",
                      "Recordatorios"
                    )
              }
              titleStyle={!modRecordatorios ? styles.disabledText : undefined}
              descriptionStyle={
                !modRecordatorios ? styles.disabledDesc : undefined
              }
            />
          </List.Section>
        </>
      )}

      {/* Reportes */}
      <List.Section title="Reportes" style={styles.menuSection} titleStyle={styles.sectionTitle}>
        <List.Item
          title="Clientes Deudores"
          description="Ver clientes con saldo pendiente"
          left={(props) => <List.Icon {...props} icon="account-cash" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigateToClientes("Deudores")}
        />

        {/* ── Historial: gated ── */}
        <List.Item
          title="Historial de Ingresos"
          description={
            modReportes
              ? "Resumen de ventas por período"
              : "Disponible desde el plan Profesional"
          }
          left={(props) => (
            <List.Icon
              {...props}
              icon="chart-line"
              color={modReportes ? undefined : theme.colors.onSurfaceDisabled}
            />
          )}
          right={(props) =>
            modReportes ? (
              <List.Icon {...props} icon="chevron-right" />
            ) : (
              <List.Icon
                {...props}
                icon="lock-outline"
                color={theme.colors.onSurfaceDisabled}
              />
            )
          }
          onPress={() =>
            navigateOrBlock(
              "HistorialIngresos",
              "reportes",
              "Historial de Ingresos"
            )
          }
          titleStyle={!modReportes ? styles.disabledText : undefined}
          descriptionStyle={!modReportes ? styles.disabledDesc : undefined}
        />
      </List.Section>

      {/* Configuración */}
      <List.Section title="Cuenta" style={styles.menuSection} titleStyle={styles.sectionTitle}>
        <List.Item
          title="Guía rápida"
          description="Repasa cómo empezar a usar Cuadre"
          left={(props) => (
            <List.Icon {...props} icon="compass-outline" />
          )}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            openWelcomeTour();
            navigation.getParent()?.navigate("Dashboard");
          }}
        />
        <List.Item
          title="Información de suscripción"
          description="Contacto con soporte"
          left={(props) => (
            <List.Icon {...props} icon="credit-card-refresh-outline" />
          )}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate("GestionarCuenta")}
        />
        <List.Item
          title="Configuración"
          description="Perfil, empresa y suscripción"
          left={(props) => <List.Icon {...props} icon="cog" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate("Ajustes")}
        />
               <List.Item
          title="Eliminar cuenta"
          description="Elimina tu cuenta y todos tus datos"
          left={(props) => (
            <List.Icon {...props} icon="delete-forever" color="#e74c3c" />
          )}
          right={(props) =>
            eliminando ? (
              <ActivityIndicator size={20} color="#e74c3c" style={{ marginRight: 8 }} />
            ) : (
              <List.Icon {...props} icon="chevron-right" color="#e74c3c" />
            )
          }
          onPress={handleEliminarCuenta}
          disabled={eliminando}
          titleStyle={{ color: "#e74c3c" }}
          descriptionStyle={{ color: "#e74c3c", opacity: 0.7 }}
        />
        <List.Item
          title="Cerrar Sesión"
          left={(props) => (
            <List.Icon {...props} icon="logout" color="#e74c3c" />
          )}
          onPress={() => {
            showAlert(
              "Cerrar Sesión",
              "¿Estás seguro que deseas cerrar sesión?",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Cerrar Sesión",
                  style: "destructive",
                  onPress: logout,
                },
              ]
            );
          }}
          titleStyle={{ color: "#e74c3c" }}
        />
      </List.Section>

      <Surface elevation={0} style={styles.version}>
        <Text style={styles.versionText}>CuadreAPP v1.0.0</Text>
      </Surface>
    </ScrollView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      alignItems: "center",
      padding: 24,
      margin: 16,
      marginBottom: 4,
      borderRadius: 28,
      backgroundColor: BRAND.greenDeep,
    },
    avatar: {
      backgroundColor: BRAND.lime,
    },
    userName: {
      fontWeight: "bold",
      marginTop: 12,
      color: BRAND.white,
    },
    email: {
      color: "rgba(255,254,248,0.72)",
      marginTop: 4,
    },
    roleBadge: {
      marginTop: 8,
      backgroundColor: theme.colors.secondary,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    roleText: {
      color: theme.colors.onSecondary,
      fontSize: 12,
      fontWeight: "600",
    },
    planChip: {
      marginTop: 10,
      backgroundColor: BRAND.lime,
    },
    planChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: BRAND.greenDeep,
    },
    menuSection: {
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 0,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      overflow: "hidden",
      paddingBottom: 6,
    },
    sectionTitle: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.3,
      textTransform: "uppercase",
    },
    disabledText: {
      color: theme.colors.onSurfaceDisabled,
    },
    disabledDesc: {
      color: theme.colors.onSurfaceDisabled,
      fontStyle: "italic",
    },
    version: {
      alignItems: "center",
      padding: 24,
    },
    versionText: {
      color: theme.colors.onBackground,
      fontSize: 12,
    },
  });
