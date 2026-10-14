import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import {
  Text,
  Card,
  Divider,
  List,
  Snackbar,
  SegmentedButtons,
  Chip,
  useTheme,
  Surface,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuthStore } from "../../stores/authStore";
import { dashboardApi, DashboardCompleto, Periodo } from "../../api/dashboard";
import {
  LoadingScreen,
  ErrorMessage,
  QuickActionButton,
  SimpleChart,
} from "../../components";
import QuickCitaModal, {
  QuickCitaModalRef,
} from "../../components/QuickCitaModal";
import QuickAgendarModal, { QuickAgendarModalRef } from "../../components/QuickAgendarModal";
import SubscriptionBanner from "../../components/SubscriptionBanner";
import OnboardingChecklist from "../../components/OnboardingChecklist";
import UpgradeCard from "../../components/UpgradeCard";
import WelcomeTour from "../../components/WelcomeTour";
import { usePlanStore } from "../../stores/planStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWelcomeTourStore } from "../../stores/welcomeTourStore";

import { analytics } from '../../analytics';
const LEGACY_TOUR_FLAG = "welcome_tour_v1_seen";
const tourFlagForUser = (userId: string | number) =>
  `welcome_tour_v2_seen:${userId}`;

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const quickCitaRef = useRef<QuickCitaModalRef>(null);
  const quickAgendarRef = useRef<QuickAgendarModalRef>(null);
  const { plan, tieneModulo } = usePlanStore();

  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [dashboard, setDashboard] = useState<DashboardCompleto | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const modPagos = tieneModulo("pagos");
  const tourRequestId = useWelcomeTourStore((state) => state.requestId);

  const fetchData = useCallback(async () => {
    try {
      setError("");
      const data = await dashboardApi.getDashboard(periodo);
      setDashboard(data);
    } catch (err: any) {
      setError("Error al cargar los datos");
      analytics.captureError(err, { origen: 'DashboardScreen' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periodo]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [periodo]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const [onboardingRefresh, setOnboardingRefresh] = useState(0);
  const [showTour, setShowTour] = useState(false);
  const handledTourRequest = useRef(tourRequestId);

  useEffect(() => {
    if (!user?.id) return;

    let active = true;
    const userFlag = tourFlagForUser(user.id);

    Promise.all([
      AsyncStorage.getItem(userFlag),
      AsyncStorage.getItem(LEGACY_TOUR_FLAG),
    ]).then(async ([seenByUser, legacySeen]) => {
      if (!active || seenByUser) return;
      if (legacySeen) {
        await AsyncStorage.setItem(userFlag, "1");
        return;
      }
      setShowTour(true);
    });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (tourRequestId === handledTourRequest.current) return;
    handledTourRequest.current = tourRequestId;
    setShowTour(true);
  }, [tourRequestId]);

  const finishTour = async () => {
    setShowTour(false);
    if (user?.id) {
      await AsyncStorage.setItem(tourFlagForUser(user.id), "1");
    }
  };

  const handleCitaSuccess = () => {
    setSuccessMessage("¡Servicio registrado exitosamente!");
    setOnboardingRefresh((n) => n + 1);
    fetchData();
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;
  };

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${amount.toFixed(0)}`;
  };

  if (loading && !dashboard) {
    return <LoadingScreen message="Cargando dashboard..." />;
  }

  if (error && !dashboard) {
    return <ErrorMessage message={error} onRetry={fetchData} />;
  }

  const d = dashboard!;

  return (
    <Surface  style={styles.root}>
        <SubscriptionBanner />

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <Surface elevation={0} style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>HOY EN TU NEGOCIO</Text>
            <Text variant="headlineSmall" style={styles.headerTitle}>
              Hola, {user?.nombreCompleto?.split(" ")[0]} 👋
            </Text>
            <Text variant="bodyMedium" style={styles.date}>
              {new Date().toLocaleDateString("es-MX", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Text>
          </View>
          <View style={styles.headerMark}>
            <MaterialCommunityIcons
              name="content-cut"
              size={26}
              color={theme.colors.brandDeep}
            />
          </View>
        </Surface>

        {/* Primeros pasos (se oculta solo una vez activado el negocio) */}
        <OnboardingChecklist
          refreshKey={onboardingRefresh}
          onRegistrarVenta={() => quickCitaRef.current?.open("pagada")}
          onCrearServicio={() => navigation.navigate("ServicioFormModal")}
          onAgregarEmpleado={() => navigation.navigate("EmpleadoFormModal")}
        />

        {/* Va después del onboarding a propósito: a quien todavía no configuró su
            negocio hay que ayudarlo a arrancar, no venderle. */}
        <UpgradeCard />

        {/* CTAs - Acciones Rápidas */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionEyebrow}>ACCIONES RÁPIDAS</Text>
          <Text style={styles.sectionHint}>Lo esencial, a un toque</Text>
        </View>
        <Surface elevation={0} style={styles.ctaSection}>
          <QuickActionButton
            title="Servicio + cobro"
            subtitle="Registra una atención pagada"
            icon="cash-check"
            color={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            onPress={() => quickCitaRef.current?.open("pagada")}
          />
          <View style={styles.ctaPair}>
            <QuickActionButton
              compact
              title="Servicio pendiente"
              subtitle="Guarda el saldo del cliente"
              icon="clock-outline"
              color={theme.colors.attention}
              textColor={theme.colors.onWarn}
              onPress={() => quickCitaRef.current?.open("pendiente")}
            />
            <QuickActionButton
              compact
              title="Agendar cita"
              subtitle="Reserva fecha y profesional"
              icon="calendar-plus"
              color={theme.colors.schedule}
              textColor={theme.colors.onSecondary}
              onPress={() => quickAgendarRef.current?.open()}
            />
          </View>
        </Surface>
        {/* Selector de período */}
        <View style={styles.sectionHeadingCompact}>
          <Text style={styles.sectionEyebrow}>RESUMEN</Text>
          <Text style={styles.sectionHint}>Rendimiento del período</Text>
        </View>
        <Surface elevation={0} style={styles.periodoContainer}>
          <SegmentedButtons
            value={periodo}
            onValueChange={(v) => setPeriodo(v as Periodo)}
            buttons={[
              { value: "dia", label: "Hoy" },
              { value: "semana", label: "Semana" },
              { value: "mes", label: "Mes" },
            ]}
          />
        </Surface>
        {/* Un solo ledger visual: la información se agrupa por relación, no
            porque cada número "necesite" su propia tarjeta. */}
        <Surface elevation={0} style={styles.metricLedger}>
          <View style={styles.metricHeroRow}>
            <View style={styles.metricHero}>
              <View style={styles.metricLabelRow}>
                <MaterialCommunityIcons
                  name="cash"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={styles.metricLabel}>Ingresos</Text>
              </View>
              <Text style={styles.metricHeroValue}>
                {formatCurrency(d.metricasPeriodo.ingresosTotales)}
              </Text>
              {d.comparacion.porcentajeCambioIngresos !== 0 && (
                <Text style={styles.metricDelta}>
                  {d.comparacion.porcentajeCambioIngresos > 0 ? "+" : ""}
                  {d.comparacion.porcentajeCambioIngresos.toFixed(0)}% vs anterior
                </Text>
              )}
            </View>
            <View style={styles.metricTicket}>
              <Text style={styles.metricSmallLabel}>TICKET PROMEDIO</Text>
              <Text style={styles.metricSmallValue}>
                {formatCurrency(d.metricasPeriodo.ticketPromedio)}
              </Text>
            </View>
          </View>

          <Divider style={styles.metricDivider} />

          <View style={styles.metricSupportRow}>
            <View style={styles.metricSupportItem}>
              <Text style={styles.metricSmallLabel}>SERVICIOS</Text>
              <Text style={[styles.metricSupportValue, { color: theme.colors.secondary }]}>
                {d.metricasPeriodo.totalServicios}
              </Text>
              {d.comparacion.porcentajeCambioServicios !== 0 && (
                <Text style={styles.metricSupportHint}>
                  {d.comparacion.porcentajeCambioServicios > 0 ? "+" : ""}
                  {d.comparacion.porcentajeCambioServicios.toFixed(0)}% vs anterior
                </Text>
              )}
            </View>
            <View style={styles.metricSupportSeparator} />
            <View style={styles.metricSupportItem}>
              <Text style={styles.metricSmallLabel}>POR COBRAR</Text>
              <Text style={[styles.metricSupportValue, { color: theme.colors.attention }]}>
                {formatCurrency(d.cuentasPorCobrar)}
              </Text>
              <Text style={styles.metricSupportHint}>
                {d.clientesDeudores} cliente{d.clientesDeudores !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        </Surface>

        {/* Alerta de Nóminas Pendientes */}
        {d.nominas.totalPendiente > 0 && modPagos && (
          <Card
            style={styles.alertCard}
            onPress={() => navigation.navigate("Mas", { screen: "Nominas" })}
          >
            <Card.Content style={styles.alertContent}>
              <Surface elevation={0} style={styles.alertIcon}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={24}
                  color={theme.colors.warn}
                />
              </Surface>
              <Surface elevation={0} style={styles.alertText}>
                <Text style={styles.alertTitle}>Nóminas Pendientes</Text>
                <Text style={styles.alertSubtitle}>
                  {formatCurrency(d.nominas.totalPendiente)} por pagar a{" "}
                  {d.nominas.empleadosConPendiente} empleado(s)
                </Text>
              </Surface>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            </Card.Content>
          </Card>
        )}

        {(d.graficoIngresos.length > 0 || d.graficoServicios.length > 0) && (
          <>
            <View style={styles.sectionHeadingCompact}>
              <Text style={styles.sectionEyebrow}>TENDENCIAS</Text>
              <Text style={styles.sectionHint}>Cómo se está moviendo el negocio</Text>
            </View>
            <Surface elevation={0} style={styles.analyticsPanel}>
              {d.graficoIngresos.length > 0 && (
                <View style={styles.analyticsSection}>
                  <View style={styles.analyticsTitleRow}>
                    <Text style={styles.analyticsTitle}>Ingresos</Text>
                    <Text style={styles.chartTotal}>
                      {formatCurrency(d.metricasPeriodo.ingresosTotales)}
                    </Text>
                  </View>
                  <SimpleChart
                    data={d.graficoIngresos}
                    color={theme.colors.primary}
                    height={100}
                    formatValue={formatCurrencyShort}
                  />
                </View>
              )}

              {d.graficoIngresos.length > 0 && d.graficoServicios.length > 0 && (
                <Divider style={styles.analyticsDivider} />
              )}

              {d.graficoServicios.length > 0 && (
                <View style={styles.analyticsSection}>
                  <View style={styles.analyticsTitleRow}>
                    <Text style={styles.analyticsTitle}>Servicios</Text>
                    <Text style={[styles.chartTotal, { color: theme.colors.secondary }]}>
                      {d.metricasPeriodo.totalServicios}
                    </Text>
                  </View>
                  <SimpleChart
                    data={d.graficoServicios.map((g) => ({
                      ...g,
                      valor: g.cantidad,
                    }))}
                    color={theme.colors.secondary}
                    height={100}
                  />
                </View>
              )}
            </Surface>
          </>
        )}

        <View style={styles.sectionHeadingCompact}>
          <Text style={styles.sectionEyebrow}>OPERACIÓN</Text>
          <Text style={styles.sectionHint}>Equipo, servicios y estado de las citas</Text>
        </View>
        <Surface elevation={0} style={styles.operationsPanel}>
          {d.rendimientoBarberos.length > 0 && (
            <View style={styles.operationSection}>
              <Text style={styles.operationTitle}>Rendimiento del equipo</Text>
              {d.rendimientoBarberos.map((barbero, index) => (
                <React.Fragment key={barbero.barberoId}>
                  {index > 0 && <Divider style={styles.listDivider} />}
                  <List.Item
                    title={barbero.nombre}
                    description={`${barbero.serviciosCount} servicios • ${barbero.porcentajeComision}% comisión`}
                    left={() => (
                      <Text style={styles.rankNumber}>{String(index + 1).padStart(2, "0")}</Text>
                    )}
                    right={() => (
                      <View style={styles.barberoRight}>
                        <Text style={styles.barberoTotal}>
                          {formatCurrency(barbero.totalGenerado)}
                        </Text>
                        <Text style={styles.barberoComision}>
                          Com: {formatCurrency(barbero.comisionGenerada)}
                        </Text>
                      </View>
                    )}
                  />
                </React.Fragment>
              ))}
            </View>
          )}

          {d.rendimientoBarberos.length > 0 && d.topServicios.length > 0 && (
            <Divider style={styles.operationDivider} />
          )}

          {d.topServicios.length > 0 && (
            <View style={styles.operationSection}>
              <Text style={styles.operationTitle}>Servicios más populares</Text>
              {d.topServicios.map((servicio, index) => (
                <React.Fragment key={servicio.servicioId}>
                  {index > 0 && <Divider style={styles.listDivider} />}
                  <List.Item
                    title={servicio.nombre}
                    description={`${servicio.cantidad} realizados`}
                    left={() => (
                      <Text style={[styles.rankNumber, { color: getTopColor(index) }]}>
                        {String(index + 1).padStart(2, "0")}
                      </Text>
                    )}
                    right={() => (
                      <Text style={styles.servicioIngresos}>
                        {formatCurrency(servicio.ingresos)}
                      </Text>
                    )}
                  />
                </React.Fragment>
              ))}
            </View>
          )}

          {(d.rendimientoBarberos.length > 0 || d.topServicios.length > 0) && (
            <Divider style={styles.operationDivider} />
          )}

          <View style={styles.operationSection}>
            <Text style={styles.operationTitle}>Estado de citas</Text>
            <View style={styles.estadoRow}>
              <Chip icon="check-circle" style={styles.estadoChip}>
                {d.metricasPeriodo.citasCerradas} cerradas
              </Chip>
              <Chip icon="clock-outline" style={styles.estadoChipPendiente}>
                {d.metricasPeriodo.citasPendientes} pendientes
              </Chip>
              {d.metricasPeriodo.citasCanceladas > 0 && (
                <Chip icon="close-circle" style={styles.estadoChipCancelada}>
                  {d.metricasPeriodo.citasCanceladas} canceladas
                </Chip>
              )}
            </View>
          </View>
        </Surface>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Tour de bienvenida (una vez por dispositivo) */}
      <WelcomeTour visible={showTour} onFinish={finishTour} />

      {/* Modal para registro rápido */}
      <QuickCitaModal ref={quickCitaRef} onSuccess={handleCitaSuccess} />
      {/* Modal para agendar cita */}
      <QuickAgendarModal ref={quickAgendarRef} onSuccess={handleCitaSuccess} />

      {/* Snackbar de éxito */}
      <Snackbar
        visible={!!successMessage}
        onDismiss={() => setSuccessMessage("")}
        duration={3000}
        style={styles.successSnackbar}
      >
        {successMessage}
      </Snackbar>
    </Surface>
  );
}

const getTopColor = (index: number) => {
  const colors = ["#2F6F19", "#A93563", "#AC480F", "#123D06", "#668A1F"];
  return colors[index] || "#bdc3c7";
};

const makeStyles = (theme: any) => StyleSheet.create({  
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.brandDeep,
    overflow: "hidden",
  },
  headerCopy: {
    flex: 1,
  },
  headerEyebrow: {
    color: theme.colors.brandLime,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  headerTitle: {
    color: "#FFFEF8",
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerMark: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    backgroundColor: theme.colors.brandLime,
  },
  date: {
    color: "rgba(255,254,248,0.72)",
    marginTop: 5,
    textTransform: "capitalize",
  },
  sectionHeading: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionHeadingCompact: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionEyebrow: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  sectionHint: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
    marginTop: 2,
  },
  periodoContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  ctaSection: {
    marginHorizontal: 16,
    gap: 10,
    backgroundColor: "transparent",
  },
  ctaPair: {
    flexDirection: "row",
    gap: 10,
  },
  metricLedger: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 18,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
  },
  metricHeroRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  metricHero: {
    flex: 1,
    paddingRight: 14,
  },
  metricLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  metricLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: "700",
  },
  metricHeroValue: {
    color: theme.colors.onSurface,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: -1.1,
    marginTop: 7,
  },
  metricDelta: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  metricTicket: {
    width: 120,
    justifyContent: "center",
    paddingLeft: 16,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: theme.colors.outlineVariant,
  },
  metricSmallLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  metricSmallValue: {
    color: theme.colors.onSurface,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 5,
  },
  metricDivider: {
    marginVertical: 16,
  },
  metricSupportRow: {
    flexDirection: "row",
  },
  metricSupportItem: {
    flex: 1,
  },
  metricSupportSeparator: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    backgroundColor: theme.colors.outlineVariant,
  },
  metricSupportValue: {
    fontSize: 21,
    fontWeight: "800",
    marginTop: 5,
  },
  metricSupportHint: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 2,
  },
  alertCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: theme.colors.warnContainer,
    borderRadius: 18,
  },
  alertContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  alertIcon: {
    marginRight: 12,
  },
  alertText: {
    backgroundColor: "transparent",
    flex: 1,
    elevation: 4,
  },
  alertTitle: {
    fontWeight: "bold",
    color: theme.colors.onWarnContainer,
  },
  alertSubtitle: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
    marginTop: 2,
  },
  analyticsPanel: {
    marginHorizontal: 16,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
  },
  analyticsSection: {
    paddingVertical: 18,
  },
  analyticsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  analyticsTitle: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: "800",
  },
  analyticsDivider: {
    backgroundColor: theme.colors.outlineVariant,
  },
  operationsPanel: {
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },
  operationSection: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  operationTitle: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: "800",
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  operationDivider: {
    marginHorizontal: 16,
    backgroundColor: theme.colors.outlineVariant,
  },
  chartTotal: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  listDivider: {
    marginVertical: 4,
  },
  rankNumber: {
    width: 34,
    alignSelf: "center",
    color: theme.colors.primary,
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.8,
  },
  barberoRight: {
    alignItems: "flex-end",
  },
  barberoTotal: {
    fontWeight: "bold",
    color: theme.colors.cuarto,
    fontSize: 15,
  },
  barberoComision: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 2,
  },
  servicioIngresos: {
    fontWeight: "bold",
    color: theme.colors.cuarto,
    alignSelf: "center",
  },
  estadoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  estadoChip: {
    backgroundColor: theme.colors.cuartoContainer,
  },
  estadoChipPendiente: {
    backgroundColor: theme.colors.warnContainer,
  },
  estadoChipCancelada: {
    backgroundColor: theme.colors.errorContainer,
  },
  bottomPadding: {
    height: 24,
  },
  successSnackbar: {
    backgroundColor: theme.colors.cuarto,
  },
});
