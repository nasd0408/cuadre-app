// components/offline/OfflineCitaForm.tsx
import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import {
  Text,
  Button,
  Surface,
  useTheme,
  IconButton,
  Chip,
  TextInput,
  Searchbar,
  Divider,
  Snackbar,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOfflineCacheStore } from "../../stores/offlineCacheStore";
import {
  useOfflineQueueStore,
  OfflineCitaTipo,
} from "../../stores/offlineQueueStore";

interface Props {
  tipo: OfflineCitaTipo;
  onClose: () => void;
  onSaved: () => void;
}

interface ServicioSeleccionado {
  servicioId: number;
  servicioNombre: string;
  precio: number;
  cantidad: number;
}

export default function OfflineCitaForm({ tipo, onClose, onSaved }: Props) {
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { clientes, empleados, servicios, planConfig } = useOfflineCacheStore();
  const { addCita, queue } = useOfflineQueueStore();

  const isPagada = tipo === "pagada";

  // ── Cliente ──
  const [esClienteNuevo, setEsClienteNuevo] = useState(false);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [searchCliente, setSearchCliente] = useState("");
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");

  // ── Empleado ──
  const [empleadoId, setEmpleadoId] = useState<number | null>(
    empleados.length === 1 ? empleados[0].id : null,
  );
  const [empleadoNombre, setEmpleadoNombre] = useState(
    empleados.length === 1 ? empleados[0].nombre : "",
  );
  const [searchEmpleado, setSearchEmpleado] = useState("");

  // ── Servicios ──
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<
    ServicioSeleccionado[]
  >([]);
  const [searchServicio, setSearchServicio] = useState("");

  // ── UI ──
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Derived ──
  const clientesRecientes = useMemo(() => clientes.slice(0, 6), [clientes]);
  const empleadosRecientes = useMemo(() => empleados.slice(0, 6), [empleados]);
  const serviciosRecientes = useMemo(() => servicios.slice(0, 6), [servicios]);

  const clientesFiltered = useMemo(() => {
    if (!searchCliente.trim()) return [];
    const q = searchCliente.toLowerCase();
    return clientes
      .filter((c) => c.nombre.toLowerCase().includes(q))
      .slice(0, 10);
  }, [clientes, searchCliente]);

  const empleadosFiltered = useMemo(() => {
    if (!searchEmpleado.trim()) return [];
    const q = searchEmpleado.toLowerCase();
    return empleados
      .filter((e) => e.nombre.toLowerCase().includes(q))
      .slice(0, 10);
  }, [empleados, searchEmpleado]);

  const serviciosFiltered = useMemo(() => {
    if (!searchServicio.trim()) return [];
    const q = searchServicio.toLowerCase();
    return servicios
      .filter((s) => s.nombre.toLowerCase().includes(q))
      .slice(0, 20);
  }, [servicios, searchServicio]);

  const total = serviciosSeleccionados.reduce(
    (sum, s) => sum + s.precio * s.cantidad,
    0,
  );

  const puedeEnviar =
    (esClienteNuevo ? nuevoNombre.trim().length > 0 : !!clienteId) &&
    !!empleadoId &&
    serviciosSeleccionados.length > 0;

  // ── Handlers ──
  const seleccionarCliente = (c: { id: number; nombre: string }) => {
    setClienteId(c.id);
    setClienteNombre(c.nombre);
    setSearchCliente("");
    setEsClienteNuevo(false);
    setMostrarFormCliente(false);
    Keyboard.dismiss();
  };

  const clearCliente = () => {
    setClienteId(null);
    setClienteNombre("");
    setClienteTelefono("");
    setSearchCliente("");
    setEsClienteNuevo(false);
    setMostrarFormCliente(false);
    setNuevoNombre("");
    setNuevoTelefono("");
  };

  const confirmarNuevoCliente = () => {
    if (!nuevoNombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setEsClienteNuevo(true);
    setClienteNombre(nuevoNombre.trim());
    setClienteTelefono(nuevoTelefono.trim());
    setMostrarFormCliente(false);
    Keyboard.dismiss();
  };

  const seleccionarEmpleado = (e: { id: number; nombre: string }) => {
    setEmpleadoId(e.id);
    setEmpleadoNombre(e.nombre);
    setSearchEmpleado("");
    Keyboard.dismiss();
  };

  const toggleServicio = (svc: (typeof servicios)[0]) => {
    setServiciosSeleccionados((prev) => {
      const exists = prev.find((s) => s.servicioId === svc.id);
      if (exists) return prev.filter((s) => s.servicioId !== svc.id);
      return [
        ...prev,
        {
          servicioId: svc.id,
          servicioNombre: svc.nombre,
          precio: svc.precio,
          cantidad: 1,
        },
      ];
    });
  };

  const isServicioSelected = (id: number) =>
    serviciosSeleccionados.some((s) => s.servicioId === id);

  const handleSave = async () => {
    if (!puedeEnviar) return;
    const pendientes = queue.filter((c) => !c.sincronizado).length;
    if (
      planConfig.maxCitasOffline !== -1 &&
      pendientes >= planConfig.maxCitasOffline
    ) {
      setError(
        `Límite de ${planConfig.maxCitasOffline} citas offline alcanzado. Sincroniza para continuar.`,
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addCita({
        tipo,
        esClienteNuevo,
        ...(esClienteNuevo
          ? {
              clienteNombre: nuevoNombre.trim(),
              clienteTelefono: nuevoTelefono.trim() || undefined,
            }
          : {
              clienteId: clienteId!,
              clienteNombre,
            }),
        empleadoId: empleadoId!,
        empleadoNombre,
        fecha: new Date().toISOString(),
        servicios: serviciosSeleccionados,
      });
      onSaved();
    } catch {
      setError("No se pudo guardar la cita.");
    } finally {
      setSaving(false);
    }
  };

  const accentColor = isPagada ? theme.colors.primary : theme.colors.warn;
  const onAccentColor = isPagada ? theme.colors.onPrimary : theme.colors.onWarn;

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* ═══════════════ HEADER ═══════════════ */}
        <Surface
          elevation={0}
          style={[styles.header, { backgroundColor: accentColor }]}
        >
          <IconButton
            icon="close"
            iconColor={onAccentColor}
            size={24}
            onPress={onClose}
          />
          <Surface elevation={0} style={styles.headerTitleContainer}>
            <MaterialCommunityIcons
              name={isPagada ? "cash-check" : "clock-outline"}
              size={24}
              color={onAccentColor}
            />
            <Text style={[styles.headerTitle, { color: onAccentColor }]}>
              {isPagada ? "Servicio + Pago" : "Servicio a Deber"}
            </Text>
          </Surface>
          <Chip
            compact
            style={styles.offlineChip}
            textStyle={{ fontSize: 10, color: theme.colors.onSurfaceVariant }}
          >
            Offline
          </Chip>
        </Surface>

        <ScrollView
          style={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ═══════════════ 1. CLIENTE ═══════════════ */}
          <Surface elevation={0} style={styles.section}>
            <Text style={styles.sectionTitle}>1. Cliente</Text>

            {clienteId || esClienteNuevo ? (
              <Surface
                elevation={0}
                style={[styles.seleccionado, { backgroundColor: accentColor }]}
              >
                <Surface elevation={0} style={styles.seleccionadoInfo}>
                  <MaterialCommunityIcons
                    name={esClienteNuevo ? "account-plus" : "account-check"}
                    size={24}
                    color={onAccentColor}
                  />
                  <Surface elevation={0} style={styles.seleccionadoTexto}>
                    <Text
                      style={[
                        styles.seleccionadoNombre,
                        { color: onAccentColor },
                      ]}
                    >
                      {esClienteNuevo ? nuevoNombre : clienteNombre}
                    </Text>
                    {esClienteNuevo && nuevoTelefono ? (
                      <Text
                        style={[
                          styles.seleccionadoSubtexto,
                          { color: onAccentColor },
                        ]}
                      >
                        {nuevoTelefono}
                      </Text>
                    ) : null}
                    {esClienteNuevo && (
                      <Text
                        style={[
                          styles.seleccionadoSubtexto,
                          { color: onAccentColor, fontStyle: "italic" },
                        ]}
                      >
                        Se creará al sincronizar
                      </Text>
                    )}
                  </Surface>
                </Surface>
                <Button
                  textColor={onAccentColor}
                  mode="text"
                  compact
                  onPress={clearCliente}
                >
                  Cambiar
                </Button>
              </Surface>
            ) : (
              <>
                <Searchbar
                  placeholder="Buscar cliente..."
                  value={searchCliente}
                  onChangeText={setSearchCliente}
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

                {searchCliente.length > 0 && clientesFiltered.length === 0 && (
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
                    onPress={() => {
                      setMostrarFormCliente(true);
                      if (searchCliente.trim()) {
                        setNuevoNombre(searchCliente.trim());
                        setSearchCliente("");
                      }
                    }}
                    style={styles.crearBtn}
                  >
                    Nuevo Cliente
                  </Button>
                ) : (
                  <Surface elevation={0} style={styles.formNuevo}>
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
                        onPress={confirmarNuevoCliente}
                        disabled={!nuevoNombre.trim()}
                        icon="check"
                      >
                        Usar cliente
                      </Button>
                    </Surface>
                  </Surface>
                )}
              </>
            )}
          </Surface>

          <Divider />

          {/* ═══════════════ 2. EMPLEADO ═══════════════ */}
          {empleados.length > 1 && (
            <>
              <Surface elevation={0} style={styles.section}>
                <Text style={styles.sectionTitle}>2. ¿Quién atendió?</Text>

                {empleadoId ? (
                  <Surface
                    elevation={0}
                    style={[
                      styles.seleccionado,
                      { backgroundColor: accentColor },
                    ]}
                  >
                    <Surface elevation={0} style={styles.seleccionadoInfo}>
                      <MaterialCommunityIcons
                        name="content-cut"
                        size={24}
                        color={onAccentColor}
                      />
                      <Surface elevation={0} style={styles.seleccionadoTexto}>
                        <Text
                          style={[
                            styles.seleccionadoNombre,
                            { color: onAccentColor },
                          ]}
                        >
                          {empleadoNombre}
                        </Text>
                      </Surface>
                    </Surface>
                    <Button
                      textColor={onAccentColor}
                      mode="text"
                      compact
                      onPress={() => {
                        setEmpleadoId(null);
                        setEmpleadoNombre("");
                      }}
                    >
                      Cambiar
                    </Button>
                  </Surface>
                ) : (
                  <>
                    <Searchbar
                      placeholder="Buscar empleado..."
                      value={searchEmpleado}
                      onChangeText={setSearchEmpleado}
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
              <Divider />
            </>
          )}

          {/* ═══════════════ 3. SERVICIOS ═══════════════ */}
          <Surface elevation={0} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {empleados.length > 1 ? "3" : "2"}. Servicios
            </Text>

            <Searchbar
              placeholder="Buscar servicio..."
              value={searchServicio}
              onChangeText={setSearchServicio}
              style={styles.searchbar}
            />

            {searchServicio.length > 0 ? (
              <Surface elevation={0} style={styles.chipsGrid}>
                {serviciosFiltered.map((s) => (
                  <Chip
                    key={s.id}
                    selected={isServicioSelected(s.id)}
                    onPress={() => toggleServicio(s)}
                    style={styles.chip}
                    showSelectedOverlay
                  >
                    {s.nombre} - ${s.precio}
                  </Chip>
                ))}
              </Surface>
            ) : (
              <>
                <Text style={styles.subLabel}>Populares:</Text>
                <Surface elevation={0} style={styles.chipsGrid}>
                  {serviciosRecientes.map((s) => (
                    <Chip
                      key={s.id}
                      selected={isServicioSelected(s.id)}
                      onPress={() => toggleServicio(s)}
                      style={styles.chip}
                      showSelectedOverlay
                    >
                      {s.nombre} - ${s.precio}
                    </Chip>
                  ))}
                </Surface>
              </>
            )}
          </Surface>

          {/* ═══════════════ TOTAL ═══════════════ */}
          {serviciosSeleccionados.length > 0 && (
            <Surface elevation={0} style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>
                ${total.toLocaleString("es-MX")}
              </Text>
            </Surface>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* ═══════════════ FOOTER ═══════════════ */}
        <Surface elevation={0} style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving || !puedeEnviar}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
            icon={isPagada ? "cash-check" : "clock-plus"}
            buttonColor={
              puedeEnviar ? accentColor : theme.colors.surfaceDisabled
            }
            textColor={
              puedeEnviar ? onAccentColor : theme.colors.onSurfaceDisabled
            }
          >
            {isPagada ? "Guardar Pagada" : "Guardar a Deber"}
          </Button>
        </Surface>
      </KeyboardAvoidingView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={3000}
        action={{ label: "OK", onPress: () => setError("") }}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: Platform.OS === "ios" ? 4 : 10,
      paddingBottom: 10,
      paddingHorizontal: 4,
    },
    headerTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "bold",
    },
    offlineChip: {
      backgroundColor: "rgba(255,255,255,0.25)",
      marginRight: 8,
    },
    scrollContent: {
      flex: 1,
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
    },
    seleccionadoSubtexto: {
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
  });
