import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from "react-native";
import {
  Text,
  Card,
  Button,
  Surface,
  useTheme,
  Snackbar,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { empleadosApi, EmpleadoDetalle } from "../../api/empleados";
import { LoadingScreen, ErrorMessage, MetricCard } from "../../components";
import { useConfirmDialog } from "../../components/ConfirmDialog";
import { usePlanStore } from "../../stores/planStore";
import { pagosApi } from "../../api/pagos";

import { analytics } from '../../analytics';
type RouteParams = {
  EmpleadoDetalle: {
    empleadoId: number;
  };
};

export default function EmpleadoDetalleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, "EmpleadoDetalle">>();
  const { empleadoId } = route.params;
  const { showAlert } = useConfirmDialog();

  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [detalle, setDetalle] = useState<EmpleadoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [generatingPayroll, setGeneratingPayroll] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    error: boolean;
  }>({
    visible: false,
    message: "",
    error: false,
  });
  const fetchDetalle = useCallback(async () => {
    try {
      setError("");
      const data = await empleadosApi.getDetalle(empleadoId);
      setDetalle(data);
    } catch (err) {
      setError("Error al cargar detalles");
      analytics.captureError(err, { origen: 'EmpleadoDetalleScreen' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [empleadoId]);

  useEffect(() => {
    fetchDetalle();
  }, [fetchDetalle]);

  useEffect(() => {
    if (detalle) {
      navigation.setOptions({ title: detalle.nombre });
    }
  }, [navigation, detalle]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetalle();
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Sin registro";
    return new Date(dateString).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDayName = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-MX", {
      weekday: "short",
    });
  };
  const handleDelete = (id: number) => {
    showAlert(
      "Eliminar empleado",
      "¿Estás seguro de que deseas eliminar este empleado? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await empleadosApi.delete(id);
              await usePlanStore.getState().fetchPlan();
              navigation.goBack();
            } catch (err) {
              setSnackbar({
                visible: true,
                message: "Error al eliminar el empleado",
                error: true,
              });
              analytics.captureError(err, { origen: 'EmpleadoDetalleScreen' });
            }
          },
        },
      ],
    );
  };

  const handleGeneratePayroll = () => {
    if (!detalle) return;

    showAlert(
      "Preparar nómina",
      `Se agruparán ${detalle.citasPendientesPago} servicios cerrados por ${formatCurrency(detalle.comisionPendiente)}.\n\nEsto crea una nómina pendiente; todavía no registra el pago.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Preparar",
          onPress: async () => {
            setGeneratingPayroll(true);
            try {
              await pagosApi.generarNomina(empleadoId);
              setSnackbar({
                visible: true,
                message: "Nómina preparada. Ya puedes registrar el pago.",
                error: false,
              });
              fetchDetalle();
            } catch (err: any) {
              setSnackbar({
                visible: true,
                message:
                  typeof err.response?.data === "string"
                    ? err.response.data
                    : "No se pudo preparar la nómina",
                error: true,
              });
            } finally {
              setGeneratingPayroll(false);
            }
          },
        },
      ],
    );
  };
  if (loading) {
    return <LoadingScreen message="Cargando detalles..." />;
  }

  if (error || !detalle) {
    return (
      <ErrorMessage
        message={error || "Error desconocido"}
        onRetry={fetchDetalle}
      />
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header con info básica */}
        <Card style={styles.card}>
          <Card.Content style={styles.headerContent}>
            <Surface elevation={0} style={styles.avatar}>
              <MaterialCommunityIcons
                name="account"
                size={40}
                color={theme.colors.primary}
              />
            </Surface>
            <Surface elevation={0} style={styles.headerInfo}>
              <Text variant="headlineSmall" style={styles.nombre}>
                {detalle.nombre}
              </Text>
              <Text style={styles.subInfo}>
                {detalle.porcentajeComision}% comisión •{" "}
                {detalle.periodicidadNombre}
              </Text>
              <Text style={styles.ultimoPago}>
                Último pago: {formatDate(detalle.fechaUltimoPago)}
              </Text>
            </Surface>
          </Card.Content>
        </Card>

        {/* Comisión pendiente */}
        {detalle.comisionPendiente > 0 && (
          <Card style={[styles.card, styles.pendienteCard]}>
            <Card.Content style={styles.pendienteContent}>
              <Surface elevation={0}>
                <Text style={styles.pendienteLabel}>Comisión pendiente</Text>
                <Text style={styles.pendienteValue}>
                  {formatCurrency(detalle.comisionPendiente)}
                </Text>
                <Text style={styles.pendienteCitas}>
                  {detalle.citasPendientesPago} citas sin liquidar
                </Text>
              </Surface>
              <Button
                mode="contained"
                onPress={handleGeneratePayroll}
                loading={generatingPayroll}
                disabled={generatingPayroll}
                style={styles.generarButton}
              >
                Preparar nómina
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Rendimiento Hoy */}
        <Text style={styles.sectionTitle}>Rendimiento de Hoy</Text>
        <Surface elevation={0} style={styles.metricsRow}>
          <MetricCard
            title="Citas"
            value={detalle.rendimientoHoy.citasCerradas}
            icon="calendar-check"
            color={theme.colors.secondary}
          />
          <MetricCard
            title="Generado"
            value={formatCurrency(detalle.rendimientoHoy.totalGenerado)}
            icon="cash"
            color={theme.colors.cuarto}
          />
        </Surface>

        {/* Rendimiento Semana */}
        <Text style={styles.sectionTitle}>Esta Semana</Text>
        <Surface elevation={0} style={styles.metricsRow}>
          <MetricCard
            title="Citas"
            value={detalle.rendimientoSemana.citasCerradas}
            icon="calendar-check"
            color={theme.colors.secondary}
          />
          <MetricCard
            title="Generado"
            value={formatCurrency(detalle.rendimientoSemana.totalGenerado)}
            icon="cash"
            color={theme.colors.cuarto}
          />
        </Surface>

        {/* Rendimiento Mes */}
        <Text style={styles.sectionTitle}>Este Mes</Text>
        <Surface elevation={0} style={styles.metricsRow}>
          <MetricCard
            title="Citas"
            value={detalle.rendimientoMes.citasCerradas}
            icon="calendar-check"
            color={theme.colors.secondary}
          />
          <MetricCard
            title="Generado"
            value={formatCurrency(detalle.rendimientoMes.totalGenerado)}
            icon="cash"
            color={theme.colors.cuarto}
          />
        </Surface>

        {/* Gráfico de últimos 7 días */}
        <Card style={styles.card}>
          <Card.Title title="Últimos 7 días" titleVariant="titleMedium" />
          <Card.Content>
            <Surface elevation={0} style={styles.chartContainer}>
              {detalle.ultimosDias.map((dia, index) => {
                const maxTotal = Math.max(
                  ...detalle.ultimosDias.map((d) => d.total),
                  1,
                );
                const height = (dia.total / maxTotal) * 100;

                return (
                  <Surface
                    elevation={0}
                    key={index}
                    style={styles.barContainer}
                  >
                    <Text style={styles.barValue}>
                      {dia.total > 0 ? formatCurrency(dia.total) : "-"}
                    </Text>
                    <Surface elevation={0} style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${Math.max(height, 5)}%`,
                            backgroundColor:
                              dia.total > 0
                                ? theme.colors.cuarto
                                : theme.colors.cuartoContainer,
                          },
                        ]}
                      />
                    </Surface>
                    <Text style={styles.barLabel}>
                      {formatDayName(dia.fecha)}
                    </Text>
                    <Text style={styles.barCitas}>{dia.citas}</Text>
                  </Surface>
                );
              })}
            </Surface>
          </Card.Content>
        </Card>

        {/* Acciones */}
        <Button icon="calendar-clock" mode="outlined" onPress={() => navigation.navigate('HorarioEmpleado', { empleadoId })}>
          Horario y disponibilidad
        </Button>
        <Surface elevation={0} style={styles.actions}>
          <Button
            mode="outlined"
            icon="pencil"
            onPress={() =>
              navigation.navigate("EmpleadoForm", { empleado: detalle })
            }
            style={styles.actionButton}
          >
            Editar
          </Button>
          <Button
            mode="outlined"
            icon="history"
            onPress={() =>
              navigation.navigate("EmpleadoHistorial", {
                empleadoId,
                nombre: detalle.nombre,
              })
            }
            style={styles.actionButton}
          >
            Historial
          </Button>
          <Button
            mode="outlined"
            icon="delete"
            onPress={() => handleDelete(empleadoId)}
            style={styles.actionButton}
          >
            Eliminar
          </Button>
        </Surface>

        <View style={styles.bottomPadding} />
      </ScrollView>
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
        duration={3000}
        style={{
          backgroundColor: snackbar.error
            ? theme.colors.error
            : theme.colors.secondary,
        }}
      >
        {snackbar.message}
      </Snackbar>
    </>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    card: {
      margin: 16,
      marginBottom: 0,
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    headerInfo: {
      flex: 1,
    },
    nombre: {
      fontWeight: "bold",
    },
    subInfo: {
      color: theme.colors.outline,
      marginTop: 4,
    },
    ultimoPago: {
      color: theme.colors.outline,
      fontSize: 12,
      marginTop: 4,
    },
    pendienteCard: {
      backgroundColor: theme.colors.warnContainer,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.warn,
    },
    pendienteContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    pendienteLabel: {
      color: theme.colors.outline,
      fontSize: 13,
    },
    pendienteValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.warn,
    },
    pendienteCitas: {
      color: theme.colors.outline,
      fontSize: 12,
      marginTop: 2,
    },
    generarButton: {
      backgroundColor: theme.colors.warn,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      marginTop: 16,
      marginHorizontal: 16,
      marginBottom: 8,
    },
    metricsRow: {
      flexDirection: "row",
      paddingHorizontal: 12,
    },
    chartContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      height: 150,
      paddingTop: 20,
    },
    barContainer: {
      flex: 1,
      alignItems: "center",
    },
    barValue: {
      fontSize: 9,
      color: theme.colors.outline,
      marginBottom: 4,
    },
    barWrapper: {
      width: 24,
      height: 80,
      justifyContent: "flex-end",
    },
    bar: {
      width: "100%",
      borderRadius: 4,
      minHeight: 4,
    },
    barLabel: {
      fontSize: 11,
      color: theme.colors.outline,
      marginTop: 4,
      textTransform: "capitalize",
    },
    barCitas: {
      fontSize: 10,
      color: theme.colors.outline,
    },
    actions: {
      flexDirection: "row",
      padding: 16,
      gap: 12,
    },
    actionButton: {
      flex: 1,
    },
    bottomPadding: {
      height: 32,
    },
  });
