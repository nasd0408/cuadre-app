import React, { useEffect, useRef, useState, useMemo } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Button, Card, IconButton, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePlanStore } from "../stores/planStore";
import { useAuthStore } from "../stores/authStore";
import { analytics, AnalyticsEvent } from "../analytics";
import { LANDING_PLANES_URL } from "../hooks/useUpgradePrompt";

// Por usuario, no global: en un teléfono compartido el descarte de uno no debe
// ocultarle la tarjeta al siguiente (mismo patrón que el flag del WelcomeTour).
const dismissKey = (userId: string) => `@upgrade_card_dismissed_at:${userId}`;

/** Días que se oculta la tarjeta tras cerrarla. */
const DIAS_OCULTA = 7;

/**
 * Tarjeta de mejora en el Dashboard, solo para planes con anuncios.
 *
 * Es el único recordatorio proactivo de que existe un plan pago: el resto de la
 * app solo lo menciona cuando el usuario choca con un bloqueo, y hay usuarios que
 * nunca chocan con ninguno.
 *
 * Se puede cerrar y vuelve a los {DIAS_OCULTA} días. Un banner de upsell que no se
 * puede quitar se convierte en ruido que la gente aprende a ignorar (o motivo de
 * reseña de una estrella).
 */
export default function UpgradeCard() {
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const plan = usePlanStore((s) => s.plan);
  const userId = useAuthStore((s) => s.user?.id);

  const [visible, setVisible] = useState(false);
  const trackeado = useRef(false);

  // Falla cerrado igual que los anuncios: sin plan cargado no se muestra nada.
  const aplica = plan?.mostrarAnuncios === true && !!userId;

  useEffect(() => {
    if (!aplica || !userId) {
      setVisible(false);
      return;
    }

    let cancelado = false;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(dismissKey(userId));
        const ocultaHasta = raw ? Number(raw) + DIAS_OCULTA * 24 * 60 * 60 * 1000 : 0;
        if (!cancelado) setVisible(Date.now() >= ocultaHasta);
      } catch {
        if (!cancelado) setVisible(true);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [aplica, userId]);

  useEffect(() => {
    if (!visible || trackeado.current) return;
    trackeado.current = true;
    analytics.track(AnalyticsEvent.UpgradePromptShown, {
      origen: "dashboard_card",
      plan: plan?.planNombre,
    });
  }, [visible]);

  if (!visible || !plan) return null;

  // Si ya topó un límite, ese es el argumento más convincente que existe:
  // habla de algo que el usuario acaba de vivir, no de una lista de features.
  const serviciosAlTope =
    plan.maxServicios !== -1 && plan.serviciosActuales >= plan.maxServicios;
  const empleadosAlTope =
    plan.maxEmpleados !== -1 && plan.empleadosActuales >= plan.maxEmpleados;

  const mensaje = serviciosAlTope
    ? `Ya usas los ${plan.maxServicios} servicios de tu plan. Con un plan pago agregas todos los que necesites.`
    : empleadosAlTope
      ? `Tu plan permite ${plan.maxEmpleados} empleado(s). Suma a tu equipo con un plan pago.`
      : "Quita los anuncios, suma servicios y usa CuadreAPP también desde la web.";

  const handleVerPlanes = () => {
    analytics.track(AnalyticsEvent.UpgradeCtaClicked, {
      origen: "dashboard_card",
      plan: plan.planNombre,
      motivo: serviciosAlTope ? "tope_servicios" : empleadosAlTope ? "tope_empleados" : "generico",
    });
    Linking.openURL(LANDING_PLANES_URL);
  };

  const handleCerrar = async () => {
    setVisible(false);
    if (!userId) return;
    try {
      await AsyncStorage.setItem(dismissKey(userId), String(Date.now()));
    } catch {}
  };

  return (
    <Card style={styles.card} mode="contained">
      <Card.Content style={styles.contenido}>
        <View style={styles.encabezado}>
          <View style={styles.iconoWrap}>
            <MaterialCommunityIcons
              name="rocket-launch-outline"
              size={22}
              color={theme.colors.onPrimaryContainer}
            />
          </View>

          <View style={styles.textos}>
            <Text variant="titleSmall" style={styles.titulo}>
              Estás en el plan {plan.planNombre}
            </Text>
            <Text variant="bodySmall" style={styles.mensaje}>
              {mensaje}
            </Text>
          </View>

          <IconButton
            icon="close"
            size={18}
            onPress={handleCerrar}
            accessibilityLabel="Ocultar sugerencia de plan"
            iconColor={theme.colors.onSurfaceVariant}
            style={styles.cerrar}
          />
        </View>

        <Button
          mode="contained"
          onPress={handleVerPlanes}
          style={styles.boton}
          buttonColor={theme.colors.primary}
          textColor={theme.colors.onPrimary}
          compact
        >
          Ver planes
        </Button>
      </Card.Content>
    </Card>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: theme.colors.primaryContainer,
    },
    contenido: { paddingVertical: 14 },
    encabezado: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    iconoWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
    },
    textos: { flex: 1 },
    titulo: { fontWeight: "700", color: theme.colors.onPrimaryContainer },
    mensaje: {
      marginTop: 3,
      color: theme.colors.onPrimaryContainer,
      opacity: 0.85,
      lineHeight: 18,
    },
    cerrar: { margin: 0, marginTop: -6, marginRight: -8 },
    boton: { alignSelf: "flex-start", marginTop: 12, marginLeft: 52 },
  });
