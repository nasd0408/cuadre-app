import React, { useCallback, useEffect, useState, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Text,
  List,
  ProgressBar,
  Snackbar,
  useTheme,
  Surface,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { serviciosApi } from "../api/servicios";
import { citasApi } from "../api/citas";
import { empleadosApi } from "../api/empleados";
import { analytics } from "../analytics";
import { usePlanStore } from "../stores/planStore";

interface OnboardingChecklistProps {
  /** Abre el modal para registrar el primer servicio cobrado. */
  onRegistrarVenta: () => void;
  /** Navega a crear un servicio. */
  onCrearServicio: () => void;
  /** Navega a agregar un empleado. */
  onAgregarEmpleado: () => void;
  /** Se dispara cuando cambia el estado de completado (para refrescos). */
  refreshKey?: number;
}

/**
 * Checklist de "Primeros pasos" que guía al negocio nuevo hasta su primer cobro.
 * Solo 7 de 53 negocios registraron alguna cita: este es el momento donde se pierden.
 * Se oculta solo una vez que hay al menos un servicio Y una venta registrada.
 */
export default function OnboardingChecklist({
  onRegistrarVenta,
  onCrearServicio,
  onAgregarEmpleado,
  refreshKey,
}: OnboardingChecklistProps) {
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [tieneServicio, setTieneServicio] = useState(false);
  const [tieneVenta, setTieneVenta] = useState(false);
  const [tieneEmpleado, setTieneEmpleado] = useState(false);
  const [shownTracked, setShownTracked] = useState(false);
  const [creatingPreset, setCreatingPreset] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const [servicios, citas, empleados] = await Promise.all([
        serviciosApi.getAll().catch(() => []),
        citasApi.getAll({ pageSize: 1 }).catch(() => ({ totalItems: 0 } as any)),
        empleadosApi.getAll().catch(() => []),
      ]);
      setTieneServicio(servicios.length > 0);
      setTieneVenta((citas?.totalItems ?? 0) > 0);
      // El dueño se crea como empleado al registrarse; "agregar empleado" = más de 1
      setTieneEmpleado(empleados.length > 1);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-consultar cada vez que el Dashboard recupera el foco (al volver de crear
  // un servicio/empleado en otra pantalla). Cubre el caso donde el paso 1 no se
  // marcaba tras crear el primer servicio.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  // Además, refrescar cuando se registra una venta desde el modal del Dashboard
  // (mismo screen, no dispara foco). Se salta el montaje inicial (refreshKey 0).
  useEffect(() => {
    if (refreshKey) cargar();
  }, [refreshKey, cargar]);

  const completado = tieneServicio && tieneVenta;

  useEffect(() => {
    if (!loading && !completado && !shownTracked) {
      analytics.track("onboarding_shown");
      setShownTracked(true);
    }
  }, [loading, completado, shownTracked]);

  // Oculto mientras carga o una vez activado el negocio
  if (loading || completado) return null;

  const pasosCore = 2;
  const hechosCore = (tieneServicio ? 1 : 0) + (tieneVenta ? 1 : 0);
  const progreso = hechosCore / pasosCore;

  const handle = (evento: string, fn: () => void) => {
    analytics.track("onboarding_step_tap", { paso: evento });
    fn();
  };

  const createPresetService = async () => {
    setCreatingPreset(true);
    setError("");
    analytics.track("onboarding_step_tap", { paso: "servicio_predefinido" });

    try {
      // Servicio de arranque neutral: el nicho es belleza en general, así que un
      // "corte de pelo" no le sirve a un salón de uñas o a un spa.
      await serviciosApi.create({
        nombre: "Servicio básico",
        descripcion: "Tu servicio más frecuente",
        precio: 15,
        duracionMinutos: 30,
        intervaloDias: 30,
        categoria: "Otro",
        colorHex: "#356F1C",
        enPromocion: false,
      });
      setTieneServicio(true);
      await usePlanStore.getState().fetchPlan();
    } catch (err: any) {
      setError(
        typeof err.response?.data === "string"
          ? err.response.data
          : "No pudimos crear el servicio. Inténtalo de nuevo.",
      );
    } finally {
      setCreatingPreset(false);
    }
  };

  const renderIcon = (done: boolean) => (
    <MaterialCommunityIcons
      name={done ? "check-circle" : "circle-outline"}
      size={26}
      color={done ? theme.colors.cuarto : theme.colors.outline}
    />
  );

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.headerRow}>
          <MaterialCommunityIcons name="rocket-launch-outline" size={22} color={theme.colors.primary} />
          <Text variant="titleMedium" style={styles.title}>
            Primeros pasos
          </Text>
          <Text variant="labelLarge" style={styles.counter}>
            {hechosCore}/{pasosCore}
          </Text>
        </View>
        <Text variant="bodySmall" style={styles.subtitle}>
          Prepara tu espacio de trabajo y registra tu primer servicio.
        </Text>

        <ProgressBar progress={progreso} color={theme.colors.cuarto} style={styles.progress} />

        <List.Item
          title="1. Crea tu primer servicio"
          description={tieneServicio ? "¡Listo!" : "Puedes empezar con un ejemplo y editarlo después"}
          left={() => <Surface elevation={0} style={styles.iconWrap}>{renderIcon(tieneServicio)}</Surface>}
          titleStyle={tieneServicio ? styles.doneText : undefined}
        />
        {!tieneServicio && (
          <Surface elevation={0} style={styles.presetPanel}>
            <View style={styles.presetInfo}>
              <MaterialCommunityIcons
                name="tag-outline"
                size={20}
                color={theme.colors.primary}
              />
              <View style={styles.presetCopy}>
                <Text variant="labelLarge">Servicio básico · $15</Text>
                <Text variant="bodySmall" style={styles.presetDescription}>
                  30 min · recordar al cliente cada 30 días
                </Text>
              </View>
            </View>
            <View style={styles.presetActions}>
              <Button
                mode="contained"
                icon="check"
                loading={creatingPreset}
                disabled={creatingPreset}
                onPress={createPresetService}
                style={styles.presetButton}
              >
                Usar este
              </Button>
              <Button
                mode="text"
                disabled={creatingPreset}
                onPress={() => handle("servicio_personalizado", onCrearServicio)}
              >
                Personalizar
              </Button>
            </View>
          </Surface>
        )}

        <List.Item
          title="2. Registra tu primer cobro"
          description={tieneVenta ? "¡Listo!" : "Elige cliente, profesional y servicio"}
          left={() => <Surface elevation={0} style={styles.iconWrap}>{renderIcon(tieneVenta)}</Surface>}
          right={() =>
            !tieneVenta ? (
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} style={styles.chevron} />
            ) : null
          }
          onPress={tieneVenta ? undefined : () => handle("venta", onRegistrarVenta)}
          titleStyle={tieneVenta ? styles.doneText : undefined}
          disabled={!tieneServicio}
        />

        <List.Item
          title="3. Agrega un empleado (opcional)"
          description={tieneEmpleado ? "¡Listo!" : "Si trabajas con más personas"}
          left={() => <Surface elevation={0} style={styles.iconWrap}>{renderIcon(tieneEmpleado)}</Surface>}
          right={() =>
            !tieneEmpleado ? (
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} style={styles.chevron} />
            ) : null
          }
          onPress={tieneEmpleado ? undefined : () => handle("empleado", onAgregarEmpleado)}
          titleStyle={tieneEmpleado ? styles.doneText : undefined}
        />
      </Card.Content>
      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={4000}
      >
        {error}
      </Snackbar>
    </Card>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: theme.colors.surface,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    title: {
      flex: 1,
      fontWeight: "bold",
    },
    counter: {
      color: theme.colors.primary,
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
      marginBottom: 12,
    },
    progress: {
      height: 6,
      borderRadius: 3,
      marginBottom: 4,
    },
    iconWrap: {
      justifyContent: "center",
      alignItems: "center",
      paddingLeft: 8,
      backgroundColor: "transparent",
    },
    chevron: {
      alignSelf: "center",
    },
    presetPanel: {
      marginHorizontal: 12,
      marginBottom: 8,
      padding: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.primaryContainer,
    },
    presetInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    presetCopy: {
      flex: 1,
    },
    presetDescription: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    presetActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 12,
    },
    presetButton: {
      borderRadius: 8,
    },
    doneText: {
      color: theme.colors.onSurfaceVariant,
      textDecorationLine: "line-through",
    },
  });
