import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  Chip,
  TextInput,
  Snackbar,
  Divider,
  Searchbar,
  IconButton,
  Surface,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Cliente, Empleado, Servicio } from '../types';
import { clientesApi } from '../api/clientes';
import { empleadosApi } from '../api/empleados';
import { serviciosApi } from '../api/servicios';
import { citasApi } from '../api/citas';
import {
  crearEvento,
  activar as activarCalendario,
  pedirPermiso as pedirPermisoCalendario,
  yaSeOfrecio,
  marcarOfrecido,
  DatosCita,
} from '../calendario';
import { contactosDisponibles, ContactoDelTelefono } from '../contactos';
import ContactoPickerModal from './ContactoPickerModal';
import { analytics, AnalyticsEvent } from '../analytics';
import { usePlanStore } from '../stores/planStore';
import { mensajeDeError } from '../utils/alert';
import ServicioChip from './ServicioChip';
import HuecosDisponibles from './HuecosDisponibles';

import {
  calcularTotal as totalDeServicios,
  filtrarClientes,
  filtrarEmpleados,
  filtrarServicios,
} from '../utils/busquedaCita';
export interface QuickAgendarModalRef {
  open: () => void;
  close: () => void;
}

interface QuickAgendarModalProps {
  onSuccess: () => void;
}

const QuickAgendarModal = forwardRef<QuickAgendarModalRef, QuickAgendarModalProps>(
  ({ onSuccess }, ref) => {
    const [visible, setVisible] = useState(false);
    const modCalendario = usePlanStore(
      (state) => state.plan?.moduloCalendario === true,
    );


    //styles
      const theme = useTheme() as any;
      const styles = useMemo(() => makeStyles(theme), [theme]);
    // Data
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [clientesRecientes, setClientesRecientes] = useState<Cliente[]>([]);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [empleadosRecientes, setEmpleadosRecientes] = useState<Empleado[]>([]);
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [serviciosRecientes, setServiciosRecientes] = useState<Servicio[]>([]);

    // Búsquedas
    const [searchCliente, setSearchCliente] = useState('');
    const [searchEmpleado, setSearchEmpleado] = useState('');
    const [searchServicio, setSearchServicio] = useState('');

    const [clientesFiltered, setClientesFiltered] = useState<Cliente[]>([]);
    const [empleadosFiltered, setEmpleadosFiltered] = useState<Empleado[]>([]);
    const [serviciosFiltered, setServiciosFiltered] = useState<Servicio[]>([]);

    // Selecciones
    const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
    const [empleadoId, setEmpleadoId] = useState<number | null>(null);
    const [serviciosSeleccionados, setServiciosSeleccionados] = useState<number[]>([]);

    // Fecha y Hora
    const [fecha, setFecha] = useState(new Date());
    const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
    const [mostrarTimePicker, setMostrarTimePicker] = useState(false);

    // Crear cliente nuevo
    const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoTelefono, setNuevoTelefono] = useState('');
    const [creandoCliente, setCreandoCliente] = useState(false);
    const [pickerContactos, setPickerContactos] = useState(false);

    /**
     * Se ofrece UNA sola vez, y solo después de agendar: en ese momento el
     * usuario ya tiene una cita concreta que llevarse al calendario, así que la
     * pregunta se explica sola. Si dice que no, no se vuelve a preguntar nunca;
     * el interruptor sigue en Ajustes para quien cambie de idea.
     */
    const ofrecerCalendario = async (datos: DatosCita) => {
      if (!modCalendario) return;
      if (await yaSeOfrecio()) return;
      await marcarOfrecido();

      Alert.alert(
        '¿La agregamos a tu calendario?',
        'Podemos guardar las citas que agendes en el calendario de tu teléfono, con un recordatorio una hora antes. Si usas Google Calendar, aparecerán ahí también.',
        [
          { text: 'Ahora no', style: 'cancel' },
          {
            text: 'Sí, activar',
            onPress: async () => {
              const concedido = await pedirPermisoCalendario();
              if (!concedido) {
                Alert.alert(
                  'Sin acceso al calendario',
                  'Puedes darnos permiso más tarde desde Ajustes → Calendario.',
                );
                return;
              }

              await activarCalendario(true);

              // Se crea el evento de ESTA cita: activar y que no pasara nada
              // con la cita que motivó la pregunta sería desconcertante.
              const resultado = await crearEvento(datos);
              if (resultado === 'creado') {
                analytics.track(AnalyticsEvent.CitaEnCalendario);
              }
            },
          },
        ],
      );
    };

    /** Rellena el formulario de alta con un contacto de la agenda. */
    const handleContactoElegido = (contacto: ContactoDelTelefono) => {
      setNuevoNombre(contacto.nombre);
      setNuevoTelefono(contacto.telefono);
      analytics.track(AnalyticsEvent.ClienteDesdeContacto, {
        origen: 'accion_rapida',
      });
    };

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useImperativeHandle(ref, () => ({
      open: () => {
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
      setSearchCliente('');
      setSearchEmpleado('');
      setSearchServicio('');
      setClientesFiltered([]);
      setEmpleadosFiltered([]);
      setServiciosFiltered([]);
      setMostrarFormCliente(false);
      setNuevoNombre('');
      setNuevoTelefono('');
      setError('');
      
      // Inicializar fecha a mañana a las 10:00 AM
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      manana.setHours(10, 0, 0, 0);
      setFecha(manana);
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

        if (e.length === 1) {
          setEmpleadoId(e[0].id);
        }
      } catch (err) {
        setError('Error al cargar datos');
      }
    };

    // ========== BÚSQUEDA CLIENTE ==========
    const handleSearchCliente = (query: string) => {
      setSearchCliente(query);
      setClientesFiltered(filtrarClientes(clientes, query));
    };

    const seleccionarCliente = (cliente: Cliente) => {
      setClienteSeleccionado(cliente);
      setSearchCliente('');
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
      setSearchEmpleado('');
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
        prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
      );
    };

    // ========== CREAR CLIENTE ==========
    const handleCrearCliente = async () => {
      if (!nuevoNombre.trim()) {
        setError('El nombre es obligatorio');
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
        setNuevoNombre('');
        setNuevoTelefono('');

        setClientes((prev) => [nuevo, ...prev]);
        setClientesRecientes((prev) => [nuevo, ...prev.slice(0, 5)]);
      } catch (err: any) {
        setError('Error al crear cliente');
      } finally {
        setCreandoCliente(false);
      }
    };

    // ========== FECHA Y HORA ==========
    const handleDateChange = (event: any, selectedDate?: Date) => {
      setMostrarDatePicker(false);
      if (selectedDate) {
        const nuevaFecha = new Date(fecha);
        nuevaFecha.setFullYear(selectedDate.getFullYear());
        nuevaFecha.setMonth(selectedDate.getMonth());
        nuevaFecha.setDate(selectedDate.getDate());
        setFecha(nuevaFecha);
      }
    };

    const handleTimeChange = (event: any, selectedTime?: Date) => {
      setMostrarTimePicker(false);
      if (selectedTime) {
        const nuevaFecha = new Date(fecha);
        nuevaFecha.setHours(selectedTime.getHours());
        nuevaFecha.setMinutes(selectedTime.getMinutes());
        setFecha(nuevaFecha);
      }
    };

    const formatFecha = () => {
      return fecha.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatHora = () => {
      return fecha.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const calcularTotal = () => totalDeServicios(servicios, serviciosSeleccionados);

    const handleSubmit = async () => {
      if (!clienteSeleccionado) {
        setError('Selecciona o crea un cliente');
        return;
      }

      if (!empleadoId) {
        setError('Selecciona quién atenderá');
        return;
      }

      if (serviciosSeleccionados.length === 0) {
        setError('Selecciona al menos un servicio');
        return;
      }

      if (fecha <= new Date()) {
        setError('La fecha debe ser futura');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const cita = await citasApi.agendar({
          clienteId: clienteSeleccionado.id,
          empleadoId,
          fecha: fecha.toISOString(),
          servicios: serviciosSeleccionados.map((id) => ({ servicioId: id, cantidad: 1 })),
        });

        setVisible(false);
        onSuccess();

        // Solo las citas FUTURAS van al calendario. Los servicios ya realizados
        // que registra QuickCitaModal serían ruido en la agenda del usuario.
        // No se espera el resultado: si el calendario falla, la cita ya quedó
        // guardada y eso es lo que importa.
        const datosCalendario: DatosCita = {
          citaId: cita.id,
          fechaISO: cita.fecha,
          cliente: cita.clienteNombre,
          empleado: cita.empleadoNombre,
          servicios: cita.servicios.map((s) => ({
            nombre: s.servicioNombre,
            duracionMinutos: (s.duracionMinutos ?? 30) * s.cantidad,
          })),
        };

        if (!modCalendario) return;

        crearEvento(datosCalendario).then((resultado) => {
          if (resultado === 'creado') {
            analytics.track(AnalyticsEvent.CitaEnCalendario);
          } else if (resultado === 'desactivado') {
            ofrecerCalendario(datosCalendario);
          }
          // Los demás motivos (sin permiso, sin calendario, error) no se
          // reportan aquí: el usuario acaba de agendar bien y molestarlo con
          // un fallo del calendario sería castigarlo por algo que ya activó
          // a conciencia. Lo ve en Ajustes, donde puede hacer algo al respecto.
        });
      } catch (err: any) {
        setError(mensajeDeError(err, 'No pudimos agendar la cita'));
      } finally {
        setLoading(false);
      }
    };

    const puedeEnviar =
      clienteSeleccionado &&
      empleadoId &&
      serviciosSeleccionados.length > 0 &&
      fecha > new Date();

    const getEmpleadoNombre = () => {
      const emp = empleados.find((e) => e.id === empleadoId);
      return emp?.nombre || '';
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
            edges={['top', 'bottom', 'left', 'right']}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.container}
            >
            {/* Header */}
            <Surface elevation={0} style={styles.header}>
              <IconButton
                icon="close"
                accessibilityLabel="Cerrar agenda de cita"
                iconColor={theme.colors.onSecondary}
                size={24}
                onPress={() => setVisible(false)}
              />
              <Surface elevation={0} style={styles.headerTitleContainer}>
                <MaterialCommunityIcons name="calendar-plus" size={24} color={theme.colors.onSecondary} />
                <Text style={styles.headerTitle}>Agendar Cita</Text>
              </Surface>
              <View style={{ width: 48 }} />
            </Surface>

            <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <Surface elevation={0} style={styles.progressRow}>
                {[
                  {
                    label: "Fecha",
                    complete: fecha > new Date(),
                    icon: "calendar-outline",
                  },
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
                      size={16}
                      color={
                        item.complete
                          ? theme.colors.schedule
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

              {/* ===================== SECCIÓN FECHA Y HORA ===================== */}
              <Surface elevation={0} style={styles.section}>
                <Text style={styles.sectionTitle}>1. ¿Cuándo?</Text>
                <Text>Fecha y hora en la zona de este dispositivo. También puedes elegir un hueco tras seleccionar profesional y servicios.</Text>

                <Surface elevation={0} style={styles.fechaHoraContainer}>
                  <Button
                    mode="outlined"
                    icon="calendar"
                    onPress={() => setMostrarDatePicker(true)}
                    style={styles.fechaHoraButton}
                    contentStyle={styles.fechaHoraButtonContent}
                  >
                    {formatFecha()}
                  </Button>

                  <Button
                    mode="outlined"
                    icon="clock-outline"
                    onPress={() => setMostrarTimePicker(true)}
                    style={styles.fechaHoraButton}
                    contentStyle={styles.fechaHoraButtonContent}
                  >
                    {formatHora()}
                  </Button>
                </Surface>

                {mostrarDatePicker && (
                  <DateTimePicker
                    value={fecha}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}

                {mostrarTimePicker && (
                  <DateTimePicker
                    value={fecha}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </Surface>

              <Divider />

              {/* ===================== SECCIÓN CLIENTE ===================== */}
              <Surface elevation={0} style={styles.section}>
                <Text style={styles.sectionTitle}>2. Cliente</Text>

                {clienteSeleccionado ? (
                  <Surface elevation={0} style={styles.seleccionado}>
                    <Surface elevation={0} style={styles.seleccionadoInfo}>
                      <MaterialCommunityIcons name="account-check" size={24} color="#27ae60" />
                      <Surface elevation={0} style={styles.seleccionadoTexto}>
                        <Text style={styles.seleccionadoNombre}>{clienteSeleccionado.nombre}</Text>
                        {clienteSeleccionado.telefono && (
                          <Text style={styles.seleccionadoSubtexto}>
                            {clienteSeleccionado.telefono}
                          </Text>
                        )}
                      </Surface>
                    </Surface>
                    <Button mode="text" compact onPress={() => setClienteSeleccionado(null)}>
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

                    {searchCliente.length > 0 && clientesFiltered.length === 0 && (
                      <Text style={styles.noResults}>No encontrado. ¿Crear nuevo cliente?</Text>
                    )}

                    {searchCliente.length === 0 && !mostrarFormCliente && (
                      <>
                        <Text style={styles.subLabel}>Recientes:</Text>
                        <Surface elevation={0} style={styles.chipsGrid}>
                          {clientesRecientes.map((c) => (
                            <Chip key={c.id} onPress={() => seleccionarCliente(c)} style={styles.chip}>
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
                              setNuevoNombre('');
                              setNuevoTelefono('');
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
              {empleados.length > 1 && (
                <>
                  <Surface elevation={0} style={styles.section}>
                    <Text style={styles.sectionTitle}>3. ¿Quién atenderá?</Text>

                    {empleadoId ? (
                      <Surface elevation={0} style={styles.seleccionado}>
                        <Surface elevation={0} style={styles.seleccionadoInfo}>
                          <MaterialCommunityIcons name="content-cut" size={24} color="#27ae60" />
                          <Surface elevation={0} style={styles.seleccionadoTexto}>
                            <Text style={styles.seleccionadoNombre}>{getEmpleadoNombre()}</Text>
                          </Surface>
                        </Surface>
                        <Button mode="text" compact onPress={() => setEmpleadoId(null)}>
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
                  <Divider />
                </>
              )}

              {/* ===================== SECCIÓN SERVICIOS ===================== */}
              <Surface elevation={0} style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {empleados.length > 1 ? '4' : '3'}. Servicios
                </Text>

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
              </Surface>

              {/* ===================== TOTAL ===================== */}
              {visible && empleadoId && serviciosSeleccionados.length > 0 && <HuecosDisponibles
                empleadoId={empleadoId}
                duracionMinutos={servicios.filter(s => serviciosSeleccionados.includes(s.id)).reduce((total, s) => total + s.duracionMinutos, 0)}
                seleccionado={fecha.toISOString()} disabled={loading}
                onSeleccionar={inicio => setFecha(new Date(inicio))} />}
              {serviciosSeleccionados.length > 0 && (
                <Surface elevation={0} style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total estimado:</Text>
                  <Text style={styles.totalValue}>
                    ${calcularTotal().toLocaleString('es-MX')}
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
                style={[
                  styles.submitButton,
                  { backgroundColor: puedeEnviar ? theme.colors.schedule : theme.colors.surfaceVariant },
                ]}
                contentStyle={styles.submitButtonContent}
                icon="calendar-check"
                textColor={puedeEnviar ? theme.colors.onSecondary : theme.colors.onSurfaceVariant}
              >
                Agendar por ${calcularTotal().toLocaleString('es-MX')}
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
          onDismiss={() => setError('')}
          duration={3000}
          action={{ label: 'OK', onPress: () => setError('') }}
        >
          {error}
        </Snackbar>
      </>
    );
  }
);

export default QuickAgendarModal;

const makeStyles = (theme: any) => StyleSheet.create({  
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.schedule,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: theme.colors.onSecondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.outlineVariant,
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  progressLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '600',
  },
  progressLabelComplete: {
    color: theme.colors.schedule,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: theme.colors.onBackground,
  },
  subLabel: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 8,
    marginTop: 12,
  },
  fechaHoraContainer: {
    gap: 12,
  },
  fechaHoraButton: {
    borderRadius: 8,
    borderColor: theme.colors.outline,
  },
  fechaHoraButtonContent: {
    paddingVertical: 8,
  },
  searchbar: {
    elevation: 0,
    marginBottom: 8,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    marginBottom: 4,
  },
  noResults: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    marginTop: 12,
    fontStyle: 'italic',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderStyle: 'dashed',
  },
  formNuevo: {
    backgroundColor: theme.colors.surfaceVariant,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  inputNuevo: {
    marginBottom: 8,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  seleccionado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cuartoContainer,
    padding: 12,
    borderRadius: 8,
  },
  seleccionadoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  seleccionadoTexto: {
    gap: 2,
    flex: 1,
  },
  seleccionadoNombre: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  seleccionadoSubtexto: {
    color: theme.colors.onCuartoContainer,
    fontSize: 13,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.schedule,
  },
  bottomPadding: {
    height: 100,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
    backgroundColor: theme.colors.background,
  },
  submitButton: {
    borderRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
});
