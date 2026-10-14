import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import {
  Text,
  Button,
  Chip,
  TextInput,
  Snackbar,
  Divider,
  Searchbar,
  IconButton,
  useTheme,
  Surface,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Cliente, Empleado, Servicio } from "../types";
import { clientesApi } from "../api/clientes";
import { empleadosApi } from "../api/empleados";
import { serviciosApi } from "../api/servicios";
import { citasApi } from "../api/citas";
import { useAdsStore } from "../ads/adsStore";
import { showInterstitialIfAllowed } from "../ads";
import { contactosDisponibles, ContactoDelTelefono } from "../contactos";
import ContactoPickerModal from "./ContactoPickerModal";
import { analytics, AnalyticsEvent } from "../analytics";
import { mensajeDeError } from "../utils/alert";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CommonActions, useNavigation } from "@react-navigation/native";
import ServicioChip from "./ServicioChip";

import {
  calcularTotal as totalDeServicios,
  filtrarClientes,
  filtrarEmpleados,
  filtrarServicios,
} from '../utils/busquedaCita';
export interface QuickCitaModalRef {
  open: (mode: "pagada" | "pendiente") => void;
  close: () => void;
}

interface QuickCitaModalProps {
  onSuccess: () => void;
}

const QuickCitaModal = forwardRef<QuickCitaModalRef, QuickCitaModalProps>(
  ({ onSuccess }, ref) => {
    const [visible, setVisible] = useState(false);
    const [mode, setMode] = useState<"pagada" | "pendiente">("pagada");
    const navigation = useNavigation<NativeStackNavigationProp<any>>();

    //Theme
    const theme = useTheme() as any;
    const styles = useMemo(() => makeStyles(theme), [theme]);
    // Data
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [clientesRecientes, setClientesRecientes] = useState<Cliente[]>([]);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [empleadosRecientes, setEmpleadosRecientes] = useState<Empleado[]>(
      [],
    );
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [serviciosRecientes, setServiciosRecientes] = useState<Servicio[]>(
      [],
    );

    // Búsquedas
    const [searchCliente, setSearchCliente] = useState("");
    const [searchEmpleado, setSearchEmpleado] = useState("");
    const [searchServicio, setSearchServicio] = useState("");

    const [clientesFiltered, setClientesFiltered] = useState<Cliente[]>([]);
    const [empleadosFiltered, setEmpleadosFiltered] = useState<Empleado[]>([]);
    const [serviciosFiltered, setServiciosFiltered] = useState<Servicio[]>([]);

    // Selecciones
    const [clienteSeleccionado, setClienteSeleccionado] =
      useState<Cliente | null>(null);
    const [empleadoId, setEmpleadoId] = useState<number | null>(null);
    const [serviciosSeleccionados, setServiciosSeleccionados] = useState<
      number[]
    >([]);

    // Crear cliente nuevo
    const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState("");
    const [nuevoTelefono, setNuevoTelefono] = useState("");
    const [creandoCliente, setCreandoCliente] = useState(false);
    const [pickerContactos, setPickerContactos] = useState(false);

    /** Rellena el formulario de alta con un contacto de la agenda. */
    const handleContactoElegido = (contacto: ContactoDelTelefono) => {
      setNuevoNombre(contacto.nombre);
      setNuevoTelefono(contacto.telefono);
      analytics.track(AnalyticsEvent.ClienteDesdeContacto, {
        origen: "accion_rapida",
      });
    };

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useImperativeHandle(ref, () => ({
      open: (m: "pagada" | "pendiente") => {
        setMode(m);
        resetForm();
        loadData();
        setVisible(true);
      },
      close: () => {
        setVisible(false);
      },
    }));

    const resetForm = () => {
      setClienteSeleccionado(null);
      setEmpleadoId(null);
      setServiciosSeleccionados([]);
      setSearchCliente("");
      setSearchEmpleado("");
      setSearchServicio("");
      setClientesFiltered([]);
      setEmpleadosFiltered([]);
      setServiciosFiltered([]);
      setMostrarFormCliente(false);
      setNuevoNombre("");
      setNuevoTelefono("");
      setError("");
    };

    const loadData = async () => {
      try {
        const [c, e, s] = await Promise.all([
          clientesApi.getAll(),
          empleadosApi.getAll(),
          serviciosApi.getActivos(),
        ]);

        setClientes(c);
        setClientesRecientes(c.slice(0, 6));

        setEmpleados(e);
        setEmpleadosRecientes(e.slice(0, 6));

        setServicios(s);
        setServiciosRecientes(s.slice(0, 6));

        // Auto-seleccionar si solo hay un empleado
        if (e.length === 1) {
          setEmpleadoId(e[0].id);
        }
      } catch (err) {
        setError("Error al cargar datos");
      }
    };

    // ========== BÚSQUEDA CLIENTE ==========
    const handleSearchCliente = (query: string) => {
      setSearchCliente(query);
      setClientesFiltered(filtrarClientes(clientes, query));
    };

    const seleccionarCliente = (cliente: Cliente) => {
      setClienteSeleccionado(cliente);
      setSearchCliente("");
      setClientesFiltered([]);
      setMostrarFormCliente(false);
      Keyboard.dismiss();
    };

    // ========== BÚSQUEDA EMPLEADO ==========
    const handleSearchEmpleado = (query: string) => {
      setSearchEmpleado(query);
      setEmpleadosFiltered(filtrarEmpleados(empleados, query));
    };

    const seleccionarEmpleado = (emp: Empleado) => {
      setEmpleadoId(emp.id);
      setSearchEmpleado("");
      setEmpleadosFiltered([]);
      Keyboard.dismiss();
    };

    // ========== BÚSQUEDA SERVICIO ==========
    const handleSearchServicio = (query: string) => {
      setSearchServicio(query);
      setServiciosFiltered(filtrarServicios(servicios, query));
    };

    const toggleServicio = (id: number) => {
      setServiciosSeleccionados((prev) =>
        prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
      );
    };

    // ========== CREAR CLIENTE ==========
    const handleCrearCliente = async () => {
      if (!nuevoNombre.trim()) {
        setError("El nombre es obligatorio");
        return;
      }

      setCreandoCliente(true);
      try {
        const nuevo = await clientesApi.create({
          nombre: nuevoNombre.trim(),
          telefono: nuevoTelefono.trim() || undefined,
        });

        setClienteSeleccionado(nuevo);
        setMostrarFormCliente(false);
        setNuevoNombre("");
        setNuevoTelefono("");

        setClientes((prev) => [nuevo, ...prev]);
        setClientesRecientes((prev) => [nuevo, ...prev.slice(0, 5)]);
      } catch (err: any) {
        setError("Error al crear cliente");
      } finally {
        setCreandoCliente(false);
      }
    };

    const calcularTotal = () => totalDeServicios(servicios, serviciosSeleccionados);

    const handleSubmit = async () => {
      if (!clienteSeleccionado) {
        setError("Selecciona o crea un cliente");
        return;
      }

      if (!empleadoId) {
        setError("Selecciona quién atendió");
        return;
      }

      if (serviciosSeleccionados.length === 0) {
        setError("Selecciona al menos un servicio");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const citaData = {
          clienteId: clienteSeleccionado.id,
          empleadoId,
          fecha: new Date().toISOString(),
          servicios: serviciosSeleccionados.map((id) => ({
            servicioId: id,
            cantidad: 1,
          })),
        };

        if (mode === "pagada") {
          await citasApi.createPagada({
            ...citaData,
            observacionesPago: "Pago en efectivo",
          });
        } else {
          await citasApi.createPendiente(citaData);
        }

        setVisible(false);
        onSuccess();

        // Registrar un servicio (cobrado o a deber) es el flujo principal del
        // negocio. Va marcado como acción rápida: con
        // IntersticialSiempreEnAccionRapida activo muestra anuncio una a una,
        // saltándose el contador y la cadencia. Solo lo frena el tope diario.
        useAdsStore.getState().registrarAccion();
        showInterstitialIfAllowed(
          mode === "pagada" ? "cita_rapida_pagada" : "cita_rapida_pendiente",
          { esAccionRapida: true },
        );
      } catch (err: any) {
        setError(mensajeDeError(err, "No pudimos registrar el servicio"));
      } finally {
        setLoading(false);
      }
    };

    const isPagada = mode === "pagada";
    const puedeEnviar =
      clienteSeleccionado && empleadoId && serviciosSeleccionados.length > 0;

    const getEmpleadoNombre = () => {
      const emp = empleados.find((e) => e.id === empleadoId);
      return emp?.nombre || "";
    };

    return (
      <>
        <Modal
          visible={visible}
          animationType="slide"
          presentationStyle="pageSheet"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={() => setVisible(false)}
        >
          <SafeAreaView
            style={styles.safeArea}
            edges={["top", "bottom", "left", "right"]}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.container}
            >
            {/* Header */}
            <Surface
              elevation={0}
              style={[
                styles.header,
                {
                  backgroundColor: isPagada
                    ? theme.colors.primary
                    : theme.colors.warn,
                },
              ]}
            >
              <IconButton
                icon="close"
                accessibilityLabel="Cerrar registro de servicio"
                iconColor={theme.colors.onPrimary}
                size={24}
                onPress={() => setVisible(false)}
              />
              <Surface elevation={0} style={styles.headerTitleContainer}>
                <MaterialCommunityIcons
                  name={isPagada ? "cash-check" : "clock-outline"}
                  size={24}
                  color={
                    isPagada ? theme.colors.onPrimary : theme.colors.onWarn
                  }
                />
                <Text style={styles.headerTitle}>
                  {isPagada ? "Servicio + Pago" : "Servicio a Deber"}
                </Text>
              </Surface>
              <View style={{ width: 48 }} />
            </Surface>

            <ScrollView
              style={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Surface elevation={0} style={styles.progressRow}>
                {[
                  {
                    label: "Cliente",
                    complete: !!clienteSeleccionado,
                    icon: "account-outline",
                  },
                  {
                    label: "Profesional",
                    complete: !!empleadoId,
                    icon: "account-tie-outline",
                  },
                  {
                    label: "Servicios",
                    complete: serviciosSeleccionados.length > 0,
                    icon: "content-cut",
                  },
                ].map((item) => (
                  <View key={item.label} style={styles.progressItem}>
                    <MaterialCommunityIcons
                      name={item.complete ? "check-circle" : (item.icon as any)}
                      size={17}
                      color={
                        item.complete
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant
                      }
                    />
                    <Text
                      style={[
                        styles.progressLabel,
                        item.complete && styles.progressLabelComplete,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                ))}
              </Surface>

              {/* ===================== SECCIÓN CLIENTE ===================== */}
              <Surface elevation={0} style={styles.section}>
                <Text style={styles.sectionTitle}>1. Cliente</Text>

                {clienteSeleccionado ? (
                  <Surface
                    elevation={0}
                    style={{
                      ...styles.seleccionado,
                      backgroundColor: isPagada
                        ? theme.colors.primary
                        : theme.colors.warn,
                    }}
                  >
                    <Surface elevation={0} style={styles.seleccionadoInfo}>
                      <MaterialCommunityIcons
                        name="account-check"
                        size={24}
                        color={
                          isPagada
                            ? theme.colors.onPrimary
                            : theme.colors.onWarn
                        }
                      />
                      <Surface elevation={0} style={styles.seleccionadoTexto}>
                        <Text style={styles.seleccionadoNombre}>
                          {clienteSeleccionado.nombre}
                        </Text>
                        {clienteSeleccionado.telefono && (
                          <Text style={styles.seleccionadoSubtexto}>
                            {clienteSeleccionado.telefono}
                          </Text>
                        )}
                      </Surface>
                    </Surface>
                    <Button
                      textColor={theme.colors.onPrimary}
                      mode="text"
                      compact
                      onPress={() => setClienteSeleccionado(null)}
                    >
                      Cambiar
                    </Button>
                  </Surface>
                ) : (
                  <>
                    <Searchbar
                      placeholder="Buscar cliente..."
                      value={searchCliente}
                      onChangeText={handleSearchCliente}
                      style={styles.searchbar}
                    />

                    {clientesFiltered.length > 0 && (
                      <Surface elevation={0} style={styles.chipsGrid}>
                        {clientesFiltered.map((c) => (
                          <Chip
                            key={c.id}
                            onPress={() => seleccionarCliente(c)}
                            style={styles.chip}
                            icon="account"
                          >
                            {c.nombre}
                          </Chip>
                        ))}
                      </Surface>
                    )}

                    {searchCliente.length > 0 &&
                      clientesFiltered.length === 0 && (
                        <Text style={styles.noResults}>
                          No encontrado. ¿Crear nuevo cliente?
                        </Text>
                      )}

                    {searchCliente.length === 0 && !mostrarFormCliente && (
                      <>
                        <Text style={styles.subLabel}>Recientes:</Text>
                        <Surface elevation={0} style={styles.chipsGrid}>
                          {clientesRecientes.map((c) => (
                            <Chip
                              key={c.id}
                              onPress={() => seleccionarCliente(c)}
                              style={styles.chip}
                            >
                              {c.nombre}
                            </Chip>
                          ))}
                        </Surface>
                      </>
                    )}

                    {!mostrarFormCliente && (
                      <Surface elevation={0} style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>o crear nuevo</Text>
                        <View style={styles.dividerLine} />
                      </Surface>
                    )}

                    {!mostrarFormCliente ? (
                      <Button
                        mode="outlined"
                        icon="account-plus"
                        onPress={() => setMostrarFormCliente(true)}
                        style={styles.crearBtn}
                      >
                        Nuevo Cliente
                      </Button>
                    ) : (
                      <Surface elevation={0} style={styles.formNuevo}>
                        {contactosDisponibles() && (
                          <Button
                            mode="outlined"
                            icon="account-box-outline"
                            onPress={() => {
                              // Sin esto el teclado tapa la lista de contactos.
                              Keyboard.dismiss();
                              setPickerContactos(true);
                            }}
                            style={styles.inputNuevo}
                          >
                            Elegir de mis contactos
                          </Button>
                        )}
                        <TextInput
                          label="Nombre *"
                          value={nuevoNombre}
                          onChangeText={setNuevoNombre}
                          mode="outlined"
                          dense
                          style={styles.inputNuevo}
                          autoFocus
                        />
                        <TextInput
                          label="Teléfono (opcional)"
                          value={nuevoTelefono}
                          onChangeText={setNuevoTelefono}
                          mode="outlined"
                          dense
                          keyboardType="phone-pad"
                          style={styles.inputNuevo}
                        />
                        <Surface elevation={0} style={styles.formButtons}>
                          <Button
                            mode="text"
                            onPress={() => {
                              setMostrarFormCliente(false);
                              setNuevoNombre("");
                              setNuevoTelefono("");
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            mode="contained"
                            onPress={handleCrearCliente}
                            loading={creandoCliente}
                            disabled={creandoCliente || !nuevoNombre.trim()}
                            icon="check"
                          >
                            Guardar y usar
                          </Button>
                        </Surface>
                      </Surface>
                    )}
                  </>
                )}
              </Surface>

              <Divider />

              {/* ===================== SECCIÓN EMPLEADO ===================== */}
              {empleados.length === 0 ? (
                <>
                  <Divider />
                  <Surface elevation={0} style={styles.section}>
                    <Text style={styles.sectionTitle}>2. ¿Quién atendió?</Text>
                    <Surface elevation={0} style={styles.avisoContainer}>
                      <MaterialCommunityIcons
                        name="account-off-outline"
                        size={36}
                        color={theme.colors.onSurfaceVariant}
                      />
                      <Text style={styles.avisoTitle}>
                        No tienes empleados registrados
                      </Text>
                      <Text style={styles.avisoText}>
                        Necesitas al menos un empleado para registrar una cita.
                      </Text>
                      <Button
                        mode="contained"
                        icon="account-plus"
                        onPress={() => {
                          setVisible(false);
                          navigation.dispatch(
                            CommonActions.navigate({
                              name: "Mas",
                              params: {
                                screen: "MasMenu",
                              },
                            }),
                          );
                          setTimeout(() => {
                            navigation.navigate("Mas", {
                              screen: "Empleados",
                            });
                          }, 0);
                        }}
                        style={styles.avisoButton}
                      >
                        Ir a Empleados
                      </Button>
                    </Surface>
                  </Surface>
                </>
              ) : empleados.length > 1 ? (
                <>
                  <Divider />
                  <Surface elevation={0} style={styles.section}>
                    <Text style={styles.sectionTitle}>2. ¿Quién atendió?</Text>

                    {empleadoId ? (
                      <Surface
                        elevation={0}
                        style={{
                          ...styles.seleccionado,
                          backgroundColor: isPagada
                            ? theme.colors.primary
                            : theme.colors.warn,
                        }}
                      >
                        <Surface elevation={0} style={styles.seleccionadoInfo}>
                          <MaterialCommunityIcons
                            name="content-cut"
                            size={24}
                            color={
                              isPagada
                                ? theme.colors.onPrimary
                                : theme.colors.onWarn
                            }
                          />
                          <Surface
                            elevation={0}
                            style={styles.seleccionadoTexto}
                          >
                            <Text style={styles.seleccionadoNombre}>
                              {getEmpleadoNombre()}
                            </Text>
                          </Surface>
                        </Surface>
                        <Button
                          textColor={theme.colors.onPrimary}
                          mode="text"
                          compact
                          onPress={() => setEmpleadoId(null)}
                        >
                          Cambiar
                        </Button>
                      </Surface>
                    ) : (
                      <>
                        <Searchbar
                          placeholder="Buscar empleado..."
                          value={searchEmpleado}
                          onChangeText={handleSearchEmpleado}
                          style={styles.searchbar}
                        />

                        {empleadosFiltered.length > 0 && (
                          <Surface elevation={0} style={styles.chipsGrid}>
                            {empleadosFiltered.map((e) => (
                              <Chip
                                key={e.id}
                                onPress={() => seleccionarEmpleado(e)}
                                style={styles.chip}
                                icon="content-cut"
                              >
                                {e.nombre}
                              </Chip>
                            ))}
                          </Surface>
                        )}

                        {searchEmpleado.length === 0 && (
                          <>
                            <Text style={styles.subLabel}>Recientes:</Text>
                            <Surface elevation={0} style={styles.chipsGrid}>
                              {empleadosRecientes.map((e) => (
                                <Chip
                                  key={e.id}
                                  onPress={() => seleccionarEmpleado(e)}
                                  style={styles.chip}
                                >
                                  {e.nombre}
                                </Chip>
                              ))}
                            </Surface>
                          </>
                        )}
                      </>
                    )}
                  </Surface>
                </>
              ) : null}

              {/* ===================== SECCIÓN SERVICIOS ===================== */}
              <Surface elevation={0} style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {empleados.length > 1 ? "3" : "2"}. Servicios
                </Text>

                {servicios.length === 0 ? (
                  <Surface elevation={0} style={styles.avisoContainer}>
                    <MaterialCommunityIcons
                      name="scissors-cutting"
                      size={36}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <Text style={styles.avisoTitle}>
                      No tienes servicios registrados
                    </Text>
                    <Text style={styles.avisoText}>
                      Crea al menos un servicio antes de registrar una cita.
                    </Text>
                    <Button
                      mode="contained"
                      icon="plus"
                      onPress={() => {
                        setVisible(false);
                        navigation.dispatch(
                          CommonActions.navigate({
                            name: "Mas",
                            params: {
                              screen: "MasMenu",
                            },
                          }),
                        );
                        setTimeout(() => {
                          navigation.navigate("Mas", {
                            screen: "Servicios",
                          });
                        }, 0);
                      }}
                      style={styles.avisoButton}
                    >
                      Ir a Servicios
                    </Button>
                  </Surface>
                ) : (
                  <>
                    <Searchbar
                      placeholder="Buscar servicio..."
                      value={searchServicio}
                      onChangeText={handleSearchServicio}
                      style={styles.searchbar}
                    />

                    {searchServicio.length > 0 ? (
                      <Surface elevation={0} style={styles.chipsGrid}>
                        {serviciosFiltered.map((s) => (
                          <ServicioChip
                            key={s.id}
                            servicio={s}
                            selected={serviciosSeleccionados.includes(s.id)}
                            onPress={() => toggleServicio(s.id)}
                          />
                        ))}
                      </Surface>
                    ) : (
                      <>
                        <Text style={styles.subLabel}>Populares:</Text>
                        <Surface elevation={0} style={styles.chipsGrid}>
                          {serviciosRecientes.map((s) => (
                            <ServicioChip
                              key={s.id}
                              servicio={s}
                              selected={serviciosSeleccionados.includes(s.id)}
                              onPress={() => toggleServicio(s.id)}
                            />
                          ))}
                        </Surface>
                      </>
                    )}
                  </>
                )}
              </Surface>

              {/* ===================== TOTAL ===================== */}
              {serviciosSeleccionados.length > 0 && (
                <Surface elevation={0} style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>
                    ${calcularTotal().toLocaleString("es-MX")}
                  </Text>
                </Surface>
              )}

              <View style={styles.bottomPadding} />
            </ScrollView>

            {/* ===================== FOOTER ===================== */}
            <Surface elevation={0} style={styles.footer}>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading || !puedeEnviar}
                style={styles.submitButton}
                contentStyle={styles.submitButtonContent}
                icon={isPagada ? "cash-check" : "clock-plus"}
                buttonColor={
                  puedeEnviar
                    ? isPagada
                      ? theme.colors.primary
                      : theme.colors.warn
                    : theme.colors.surfaceDisabled
                }
                textColor={
                  puedeEnviar
                    ? isPagada
                      ? theme.colors.onPrimary
                      : theme.colors.onWarn
                    : theme.colors.onSurfaceDisabled
                }
              >
                {isPagada
                  ? `Cobrar $${calcularTotal().toLocaleString("es-MX")}`
                  : `Registrar $${calcularTotal().toLocaleString("es-MX")} a deber`}
              </Button>
            </Surface>
            </KeyboardAvoidingView>
          </SafeAreaView>

          {/* Anidado DENTRO de este Modal a propósito: montado fuera quedaría
              por detrás y el usuario vería la pantalla congelada. */}
          <ContactoPickerModal
            visible={pickerContactos}
            onDismiss={() => setPickerContactos(false)}
            onSeleccionar={handleContactoElegido}
          />
        </Modal>

        <Snackbar
          visible={!!error}
          onDismiss={() => setError("")}
          duration={3000}
          action={{ label: "OK", onPress: () => setError("") }}
        >
          {error}
        </Snackbar>
      </>
    );
  },
);

export default QuickCitaModal;

const makeStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 8,
      paddingBottom: 10,
      paddingHorizontal: 4,
    },
    headerTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    headerTitle: {
      color: theme.colors.onPrimary,
      fontSize: 18,
      fontWeight: "bold",
    },
    scrollContent: {
      flex: 1,
    },
    progressRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outlineVariant,
    },
    progressItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    progressLabel: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 11,
      fontWeight: "600",
    },
    progressLabelComplete: {
      color: theme.colors.primary,
    },
    section: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 12,
      color: theme.colors.onBackground,
    },
    subLabel: {
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 8,
      marginTop: 12,
    },
    searchbar: {
      elevation: 0,
      marginBottom: 8,
    },
    chipsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 8,
    },
    chip: {
      marginBottom: 4,
    },
    noResults: {
      textAlign: "center",
      color: theme.colors.onSurfaceVariant,
      marginTop: 12,
      fontStyle: "italic",
    },
    dividerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 16,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.outline,
    },
    dividerText: {
      marginHorizontal: 12,
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
    },
    crearBtn: {
      borderStyle: "dashed",
    },
    formNuevo: {
      backgroundColor: theme.colors.surface,
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
    },
    inputNuevo: {
      marginBottom: 8,
    },
    formButtons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 8,
    },
    seleccionado: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      borderRadius: 8,
    },
    seleccionadoInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    seleccionadoTexto: {
      gap: 2,
      flex: 1,
    },
    seleccionadoNombre: {
      fontWeight: "bold",
      fontSize: 16,
      color: theme.colors.onPrimary,
    },
    seleccionadoSubtexto: {
      color: theme.colors.onPrimary,
      fontSize: 13,
    },
    totalContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      backgroundColor: theme.colors.surface,
      marginHorizontal: 16,
      borderRadius: 8,
      marginTop: 8,
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: "600",
    },
    totalValue: {
      fontSize: 28,
      fontWeight: "bold",
      color: theme.colors.cuarto,
    },
    bottomPadding: {
      height: 100,
    },
    footer: {
      padding: 16,
      paddingBottom: 32,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline,
      backgroundColor: theme.colors.surface,
    },
    submitButton: {
      borderRadius: 8,
    },
    submitButtonContent: {
      paddingVertical: 8,
    },
    avisoContainer: {
      alignItems: "center",
      padding: 24,
      gap: 10,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 12,
    },
    avisoTitle: {
      fontWeight: "bold",
      fontSize: 15,
      color: theme.colors.onBackground,
      textAlign: "center",
    },
    avisoText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 18,
    },
    avisoButton: {
      marginTop: 4,
      borderRadius: 8,
    },
  });
