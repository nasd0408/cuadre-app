import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  Text,
  Card,
  Button,
  Divider,
  List,
  Snackbar,
  Portal,
  Dialog,
  useTheme,
  Surface,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CitaResponse, EstadoCita } from "../../types";
import { citasApi } from "../../api/citas";
import { LoadingScreen, ErrorMessage } from "../../components";
import { useConfirmDialog } from "../../components/ConfirmDialog";
import apiClient from "../../api/client";
import { showInterstitialIfAllowed } from "../../ads";
import { borrarEvento } from "../../calendario";
import { useAdsStore } from "../../ads/adsStore";
import DateTimePicker from "@react-native-community/datetimepicker";
import { actualizarEvento } from "../../calendario";
import { mensajeDeError } from "../../utils/alert";

type RouteParams = {
  CitaDetalle: {
    citaId: number;
  };
};

interface Pago {
  id: number;
  monto: number;
  tipo: number; // 0 = Cargo, 1 = Abono
  observaciones: string;
  fechaCreacion: string;
}

export default function CitaDetalleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, "CitaDetalle">>();
  const { citaId } = route.params;

  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [cita, setCita] = useState<CitaResponse | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reprogramarVisible, setReprogramarVisible] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState(new Date());
  const [mostrarFecha, setMostrarFecha] = useState(false);
  const [mostrarHora, setMostrarHora] = useState(false);
  const { showAlert } = useConfirmDialog();

  const ESTADO_CONFIG: Record<
    number,
    { label: string; color: string; containerColor: string; icon: string }
  > = {
    [EstadoCita.Pendiente]: {
      label: "Pendiente",
      color: theme.colors.outline,
      containerColor: theme.colors.primaryContainer,
      icon: "clock-outline",
    },
    [EstadoCita.PagoPendiente]: {
      label: "Por Cobrar",
      color: theme.colors.warn,
      containerColor: theme.colors.warnContainer,
      icon: "cash-clock",
    },
    [EstadoCita.Pagada]: {
      label: "Pagada",
      color: theme.colors.secondary,
      containerColor: theme.colors.secondaryContainer,
      icon: "cash-check",
    },
    [EstadoCita.Cerrada]: {
      label: "Cerrada",
      color: theme.colors.cuarto,
      containerColor: theme.colors.cuartoContainer,
      icon: "check-circle",
    },
    [EstadoCita.Cancelada]: {
      label: "Cancelada",
      color: theme.colors.error,
      containerColor: theme.colors.errorContainer,
      icon: "close-circle",
    },
  };

  const fetchCita = async () => {
    try {
      setError("");
      const data = await citasApi.getById(citaId);
      setCita(data);
    } catch (err) {
      setError("Error al cargar la cita");
    } finally {
      setLoading(false);
    }
  };

  const fetchPagos = async () => {
    try {
      const res = await apiClient.get(`/citas/${citaId}/pagos`);
      setPagos(res.data);
    } catch {
      // No crítico, no bloqueamos la pantalla
    }
  };

  useEffect(() => {
    fetchCita();
    fetchPagos();
  }, [citaId]);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDateShort = (dateString: string) =>
    new Date(dateString).toLocaleString("es-MX", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  // ── Acciones ──────────────────────────────────────────────

  const handleCobrar = async () => {
    if (!cita) return;
    showAlert(
      "Confirmar Cobro",
      `¿Registrar pago de ${formatCurrency(cita.total)}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cobrar",
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await citasApi.cobrar(cita.id);
              setCita(updated);
              await fetchPagos();
              setSuccess("¡Pago registrado exitosamente!");
            } catch (err: any) {
              setError(mensajeDeError(err, "No pudimos registrar el pago"));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleCancelar = async () => {
    if (!cita) return;
    showAlert("Cancelar Cita", "¿Estás seguro de cancelar esta cita?", [
      { text: "No", style: "cancel" },
      {
        text: "Sí, cancelar",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await citasApi.cancelar(cita.id);
            // Si estaba en el calendario del teléfono, quitarlo: dejar un evento
            // de una cita cancelada es peor que no haberlo creado.
            borrarEvento(cita.id);
            navigation.goBack();
          } catch (err: any) {
            setError(mensajeDeError(err, "No pudimos cancelar la cita"));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const abrirReprogramacion = () => {
    if (!cita) return;
    setNuevaFecha(new Date(cita.fecha));
    setMostrarFecha(false);
    setMostrarHora(false);
    setReprogramarVisible(true);
  };

  const handleReprogramar = async () => {
    if (!cita) return;
    if (nuevaFecha <= new Date()) {
      setError("La nueva fecha debe ser futura");
      return;
    }

    setActionLoading(true);
    try {
      const actualizada = await citasApi.actualizar(cita.id, {
        clienteId: cita.clienteId,
        empleadoId: cita.empleadoId,
        fecha: nuevaFecha.toISOString(),
        servicios: cita.servicios.map((servicio) => ({
          servicioId: servicio.servicioId,
          cantidad: servicio.cantidad,
        })),
      });

      setCita(actualizada);
      setReprogramarVisible(false);
      setSuccess("Cita reprogramada");

      await actualizarEvento({
        citaId: actualizada.id,
        fechaISO: actualizada.fecha,
        cliente: actualizada.clienteNombre,
        empleado: actualizada.empleadoNombre,
        servicios: actualizada.servicios.map((servicio) => ({
          nombre: servicio.servicioNombre,
          // Compatibilidad durante un despliegue escalonado: una API anterior
          // todavía no devuelve la duración en el DTO.
          duracionMinutos: (servicio.duracionMinutos ?? 30) * servicio.cantidad,
        })),
        observaciones: actualizada.observaciones,
      });
    } catch (err: unknown) {
      setError(mensajeDeError(err, "No pudimos reprogramar la cita"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarcarAsistida = async () => {
    if (!cita) return;
    showAlert(
      "Marcar como Asistida",
      "¿El cliente asistió a la cita? Esto generará una deuda pendiente de cobro.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await citasApi.marcarAsistida(cita.id);
              setCita(updated);
              await fetchPagos();
              setSuccess("Cita marcada como asistida");

              // Suma para el contador de acciones, pero no dispara anuncio: el
              // usuario suele encadenar esto con "marcar pagada".
              useAdsStore.getState().registrarAccion();
            } catch (err: any) {
              setError(mensajeDeError(err, "No pudimos actualizar la cita"));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleMarcarPagada = async () => {
    if (!cita) return;
    showAlert(
      "Marcar como Pagada",
      `¿Registrar pago de ${formatCurrency(cita.total)}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await citasApi.marcarPagada(cita.id);
              setCita(updated);
              await fetchPagos();
              setSuccess("¡Pago registrado!");

              // Cobrar cierra el ciclo de una cita: otro punto natural de corte.
              useAdsStore.getState().registrarAccion();
              showInterstitialIfAllowed("cita_pagada");
            } catch (err: any) {
              setError(mensajeDeError(err, "No pudimos registrar el pago"));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleCerrar = async () => {
    if (!cita) return;
    showAlert("Cerrar Cita", "¿Marcar esta cita como completamente cerrada?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar",
        onPress: async () => {
          setActionLoading(true);
          try {
            const updated = await citasApi.cerrar(cita.id);
            setCita(updated);
            setSuccess("Cita cerrada");

            // Cierre de tarea: momento natural para un intersticial. Los topes de
            // adsStore deciden si toca o no; si no hay anuncio cargado, se salta.
            useAdsStore.getState().registrarAccion();
            showInterstitialIfAllowed("cita_cerrada");
          } catch (err: any) {
            setError(mensajeDeError(err, "No pudimos cerrar la cita"));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleReabrir = async () => {
    if (!cita) return;
    showAlert(
      "Reabrir Cita",
      "¿Reabrir esta cita para hacer correcciones? Quedará en estado Pagada.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reabrir",
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await apiClient.post(`/citas/${cita.id}/reabrir`, {
                motivo: "Corrección manual",
              });
              setCita(res.data);
              await fetchPagos();
              setSuccess("Cita reabierta");
            } catch (err: any) {
              setError(mensajeDeError(err, "No pudimos reabrir la cita"));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  // ── Render ────────────────────────────────────────────────

  if (loading) return <LoadingScreen message="Cargando cita..." />;
  if (error && !cita) return <ErrorMessage message={error} onRetry={fetchCita} />;
  if (!cita) return <ErrorMessage message="Cita no encontrada" />;

  const estadoConfig = ESTADO_CONFIG[cita.estado] || ESTADO_CONFIG[0];
  const puedeMarcarAsistida = cita.estado === EstadoCita.Pendiente;
  const puedeMarcarPagada =
    cita.estado === EstadoCita.Pendiente || cita.estado === EstadoCita.PagoPendiente;
  const puedeCobrarse = cita.estado === EstadoCita.PagoPendiente;
  const puedeCerrarse = cita.estado === EstadoCita.Pagada;
  const puedeCancelarse =
    cita.estado !== EstadoCita.Cerrada && cita.estado !== EstadoCita.Cancelada;
  // Edición disponible en todos los estados excepto Cancelada
  const puedeEditarse = cita.estado !== EstadoCita.Cancelada;
  const esCerrada = cita.estado === EstadoCita.Cerrada;

  return (
    <ScrollView style={styles.container}>
      {/* Estado */}
      <Card style={styles.card}>
        <Card.Content style={styles.estadoContainer}>
          <Surface
            elevation={0}
            style={[styles.estadoIconContainer, { backgroundColor: estadoConfig.containerColor }]}
          >
            <MaterialCommunityIcons
              name={estadoConfig.icon as any}
              size={32}
              color={estadoConfig.color}
            />
          </Surface>
          <Text variant="titleLarge" style={[styles.estadoText, { color: estadoConfig.color }]}>
            {estadoConfig.label}
          </Text>
          <Text style={styles.citaId}>Cita #{cita.id}</Text>

          
        </Card.Content>
      </Card>

      {/* Info Principal */}
      <Card style={styles.card}>
        <Card.Content>
          <List.Item
            title={cita.clienteNombre}
            description={cita.clienteTelefono ? `📞 ${cita.clienteTelefono}` : "Cliente"}
            left={() => (
              <Surface elevation={0} style={styles.listIcon}>
                <MaterialCommunityIcons name="account" size={24} color={theme.colors.outline} />
              </Surface>
            )}
            style={styles.listItem}
          />
          <Divider />
          <List.Item
            title={cita.empleadoNombre}
            description="Atendido por"
            left={() => (
              <Surface elevation={0} style={styles.listIcon}>
                <MaterialCommunityIcons name="content-cut" size={24} color={theme.colors.outline} />
              </Surface>
            )}
            style={styles.listItem}
          />
          <Divider />
          <List.Item
            title={formatDateTime(cita.fecha)}
            description="Fecha y hora"
            left={() => (
              <Surface elevation={0} style={styles.listIcon}>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={24}
                  color={theme.colors.outline}
                />
              </Surface>
            )}
            style={styles.listItem}
          />
        </Card.Content>
      </Card>

      {/* Servicios */}
      <Card style={styles.card}>
        <Card.Title title="Servicios" titleVariant="titleMedium" />
        <Card.Content>
          {cita.servicios.map((s, index) => (
            <React.Fragment key={index}>
              {index > 0 && <Divider style={styles.servicioDivider} />}
              <Surface elevation={0} style={styles.servicioRow}>
                <Surface elevation={0} style={styles.servicioInfo}>
                  <Text style={styles.servicioNombre}>{s.servicioNombre}</Text>
                  {s.cantidad > 1 && (
                    <Text style={styles.servicioCantidad}>x{s.cantidad}</Text>
                  )}
                </Surface>
                <Text style={styles.servicioPrecio}>{formatCurrency(s.subtotal)}</Text>
              </Surface>
            </React.Fragment>
          ))}
          <Divider style={styles.totalDivider} />
          <Surface elevation={0} style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(cita.total)}</Text>
          </Surface>
        </Card.Content>
      </Card>

      {/* Pagos asociados */}
      {pagos.length > 0 && (
        <Card style={styles.card}>
          <Card.Title
            title="Movimientos asociados"
            titleVariant="titleMedium"
            left={(props) => (
              <MaterialCommunityIcons
                name="receipt"
                size={20}
                color={theme.colors.outline}
                style={{ marginLeft: 4 }}
              />
            )}
          />
          <Card.Content>
            {pagos.map((pago, index) => {
              const esCargo = pago.tipo === 0;
              return (
                <React.Fragment key={pago.id}>
                  {index > 0 && <Divider style={styles.pagoDivider} />}
                  <Surface elevation={0} style={styles.pagoRow}>
                    <Surface
                      elevation={0}
                      style={[
                        styles.pagoIcono,
                        { backgroundColor: esCargo ? "#ffebee" : "#e8f5e9" },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={esCargo ? "arrow-up" : "arrow-down"}
                        size={16}
                        color={esCargo ? "#c62828" : "#2e7d32"}
                      />
                    </Surface>
                    <Surface elevation={0} style={styles.pagoInfo}>
                      <Text style={styles.pagoObservacion} numberOfLines={1}>
                        {pago.observaciones || (esCargo ? "Cargo" : "Abono")}
                      </Text>
                      <Text style={styles.pagoFecha}>{formatDateShort(pago.fechaCreacion)}</Text>
                    </Surface>
                    <Text style={[styles.pagoMonto, { color: esCargo ? "#c62828" : "#2e7d32" }]}>
                      {esCargo ? "-" : "+"}{formatCurrency(pago.monto)}
                    </Text>
                  </Surface>
                </React.Fragment>
              );
            })}
          </Card.Content>
        </Card>
      )}

      {/* Acciones */}
      <Surface elevation={0} style={styles.actionsContainer}>
        {puedeMarcarAsistida && (
          <Button
            mode="contained"
            icon="check"
            onPress={handleMarcarAsistida}
            loading={actionLoading}
            disabled={actionLoading}
            style={styles.asistidaButton}
            textColor={theme.colors.onWarnContainer}
            contentStyle={styles.buttonContent}
          >
            Marcar como Asistida
          </Button>
        )}

        {cita.estado === EstadoCita.Pendiente && (
          <Button
            mode="outlined"
            icon="calendar-edit"
            onPress={abrirReprogramacion}
            disabled={actionLoading}
            contentStyle={styles.buttonContent}
          >
            Reprogramar
          </Button>
        )}

        {puedeMarcarPagada && (
          <Button
            mode="contained"
            icon="cash-check"
            onPress={handleMarcarPagada}
            loading={actionLoading}
            disabled={actionLoading}
            style={styles.pagadaButton}
            textColor={theme.colors.onSecondaryContainer}
            contentStyle={styles.buttonContent}
          >
            Marcar como Pagada
          </Button>
        )}

        {puedeCobrarse && (
          <Button
            mode="contained"
            icon="cash-check"
            onPress={handleCobrar}
            loading={actionLoading}
            disabled={actionLoading}
            style={styles.cobrarButton}
            textColor={theme.colors.onCuartoContainer}
            contentStyle={styles.buttonContent}
          >
            Cobrar y Cerrar
          </Button>
        )}

        {puedeCerrarse && (
          <Button
            mode="contained"
            icon="lock-check"
            onPress={handleCerrar}
            loading={actionLoading}
            disabled={actionLoading}
            style={styles.cerrarButton}
            textColor={theme.colors.onCuartoContainer}
            contentStyle={styles.buttonContent}
          >
            Cerrar Cita
          </Button>
        )}

        {/* Reabrir solo en citas cerradas y sin comisión pagada */}
        {esCerrada && !cita.pagadoAlEmpleado && (
          <Button
            mode="outlined"
            icon="lock-open-variant"
            onPress={handleReabrir}
            loading={actionLoading}
            disabled={actionLoading}
            contentStyle={styles.buttonContent}
            style={styles.reabrirButton}
            textColor={theme.colors.outline}
          >
            Reabrir Cita
          </Button>
        )}

        {puedeCancelarse && (
          <Button
            mode="contained"
            icon="close"
            onPress={handleCancelar}
            disabled={actionLoading}
            loading={actionLoading}
            contentStyle={styles.buttonContent}
            style={styles.cancelarButton}
            textColor={theme.colors.onErrorContainer}
          >
            Cancelar Cita
          </Button>
        )}
      </Surface>

      {/* Info comisión */}
      {cita.estado === EstadoCita.Cerrada && (
        <Card style={[styles.card, styles.infoCard]}>
          <Card.Content style={styles.infoContent}>
            <MaterialCommunityIcons
              name={cita.pagadoAlEmpleado ? "check-circle" : "information"}
              size={20}
              color={cita.pagadoAlEmpleado ? theme.colors.cuarto : theme.colors.warn}
            />
            <Text style={styles.infoText}>
              {cita.pagadoAlEmpleado
                ? "Comisión ya pagada al empleado"
                : "Comisión pendiente de pagar al empleado"}
            </Text>
          </Card.Content>
        </Card>
      )}

      <View style={styles.bottomPadding} />

      <Portal>
        <Dialog
          visible={reprogramarVisible}
          onDismiss={() => setReprogramarVisible(false)}
        >
          <Dialog.Title>Reprogramar cita</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.reprogramarResumen}>
              {formatDateTime(nuevaFecha.toISOString())}
            </Text>
            <View style={styles.reprogramarAcciones}>
              <Button
                mode="outlined"
                icon="calendar"
                onPress={() => setMostrarFecha(true)}
              >
                Cambiar fecha
              </Button>
              <Button
                mode="outlined"
                icon="clock-outline"
                onPress={() => setMostrarHora(true)}
              >
                Cambiar hora
              </Button>
            </View>
            {mostrarFecha && (
              <DateTimePicker
                value={nuevaFecha}
                mode="date"
                minimumDate={new Date()}
                onChange={(_, value) => {
                  setMostrarFecha(false);
                  if (value) {
                    const siguiente = new Date(nuevaFecha);
                    siguiente.setFullYear(
                      value.getFullYear(),
                      value.getMonth(),
                      value.getDate(),
                    );
                    setNuevaFecha(siguiente);
                  }
                }}
              />
            )}
            {mostrarHora && (
              <DateTimePicker
                value={nuevaFecha}
                mode="time"
                onChange={(_, value) => {
                  setMostrarHora(false);
                  if (value) {
                    const siguiente = new Date(nuevaFecha);
                    siguiente.setHours(value.getHours(), value.getMinutes(), 0, 0);
                    setNuevaFecha(siguiente);
                  }
                }}
              />
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setReprogramarVisible(false)}>Cancelar</Button>
            <Button
              mode="contained"
              onPress={handleReprogramar}
              loading={actionLoading}
              disabled={actionLoading}
            >
              Guardar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={3000}>
        {error}
      </Snackbar>
      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess("")}
        duration={3000}
        style={styles.successSnackbar}
      >
        {success}
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
    card: {
      margin: 16,
      marginBottom: 0,
    },
    estadoContainer: {
      alignItems: "center",
      paddingVertical: 24,
    },
    estadoIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    estadoText: {
      fontWeight: "bold",
    },
    citaId: {
      color: theme.colors.outline,
      marginTop: 4,
    },
    editarInlineButton: {
      marginTop: 8,
    },
    listItem: {
      paddingVertical: 8,
    },
    listIcon: {
      width: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    servicioDivider: {
      marginVertical: 8,
    },
    servicioRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
    },
    servicioInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    servicioNombre: {
      fontSize: 15,
    },
    servicioCantidad: {
      color: theme.colors.outline,
      fontSize: 13,
    },
    servicioPrecio: {
      fontSize: 15,
      fontWeight: "500",
    },
    totalDivider: {
      marginTop: 12,
      marginBottom: 12,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: "bold",
    },
    totalValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.cuarto,
    },
    // Pagos asociados
    pagoDivider: {
      marginVertical: 6,
    },
    pagoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 4,
    },
    pagoIcono: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
    },
    pagoInfo: {
      flex: 1,
    },
    pagoObservacion: {
      fontSize: 13,
      color: theme.colors.onSurface,
    },
    pagoFecha: {
      fontSize: 11,
      color: theme.colors.outline,
      marginTop: 1,
    },
    pagoMonto: {
      fontWeight: "bold",
      fontSize: 13,
    },
    // Acciones
    actionsContainer: {
      padding: 16,
      gap: 12,
    },
    cobrarButton: {
      backgroundColor: theme.colors.cuartoContainer,
      borderRadius: 8,
    },
    cancelarButton: {
      backgroundColor: theme.colors.errorContainer,
      borderRadius: 8,
    },
    reabrirButton: {
      borderRadius: 8,
      borderColor: theme.colors.outline,
    },
    buttonContent: {
      paddingVertical: 8,
    },
    infoCard: {
      backgroundColor: theme.colors.background,
    },
    infoContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    infoText: {
      flex: 1,
      color: theme.colors.outline,
      fontSize: 13,
    },
    bottomPadding: {
      height: 32,
    },
    reprogramarResumen: {
      color: theme.colors.onSurface,
      marginBottom: 16,
    },
    reprogramarAcciones: {
      gap: 10,
    },
    successSnackbar: {
      backgroundColor: theme.colors.onCuarto,
    },
    asistidaButton: {
      backgroundColor: theme.colors.warnContainer,
      borderRadius: 8,
    },
    pagadaButton: {
      backgroundColor: theme.colors.secondaryContainer,
      borderRadius: 8,
    },
    cerrarButton: {
      backgroundColor: theme.colors.cuartoContainer,
      borderRadius: 8,
    },
  });
