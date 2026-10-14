import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import {
  Text,
  Card,
  List,
  TextInput,
  Button,
  Divider,
  Snackbar,
  Portal,
  Modal,
  Surface,
  Switch,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ajustesApi, PerfilUsuario, AjustesEmpresa, InfoSuscripcion } from '../../api/ajustes';
import { useAuthStore } from '../../stores/authStore';
import { LoadingScreen } from '../../components';
import ThemeToggleButton from '../../components/ThemeToggle';
import CalendarioPickerModal from '../../components/CalendarioPickerModal';
import { usePlanStore } from '../../stores/planStore';
import { useUpgradePrompt } from '../../hooks/useUpgradePrompt';
import { mensajeDeError } from '../../utils/alert';
import { analytics } from '../../analytics';
import {
  activar as activarCalendario,
  calendarioDisponible,
  estaActivo as calendarioEstaActivo,
  pedirPermiso as pedirPermisoCalendario,
  describirDestino,
  CalendarioDestino,
} from '../../calendario';

export default function AjustesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { isAdmin } = useAuthStore();
  const modCalendario = usePlanStore(
    (state) => state.plan?.moduloCalendario === true,
  );
  const { pedirUpgrade } = useUpgradePrompt();

  /**
   * El permiso se pide SOLO al activar, nunca al abrir la pantalla: pedirlo sin
   * que el usuario haya mostrado intención es la forma más rápida de que lo
   * niegue para siempre.
   */
  const toggleCalendario = async (valor: boolean) => {
    if (!valor) {
      await activarCalendario(false);
      setCalendarioActivo(false);
      setDestino(null);
      return;
    }

    if (!modCalendario) {
      pedirUpgrade({
        tipo: 'modulo',
        modulo: 'calendario',
        nombre: 'Calendario',
      });
      return;
    }

    const concedido = await pedirPermisoCalendario();
    if (!concedido) {
      setCalendarioActivo(false);
      Alert.alert(
        'Sin acceso al calendario',
        'Para guardar tus citas en el calendario necesitamos permiso. Puedes concederlo desde los ajustes del teléfono.',
      );
      return;
    }

    await activarCalendario(true);
    setCalendarioActivo(true);
    setDestino(await describirDestino());
  };

  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [empresa, setEmpresa] = useState<AjustesEmpresa | null>(null);
  const [suscripcion, setSuscripcion] = useState<InfoSuscripcion | null>(null);

  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarioActivo, setCalendarioActivo] = useState(false);
  const [destino, setDestino] = useState<CalendarioDestino | null>(null);
  const [calendarioPickerVisible, setCalendarioPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [perfilModalVisible, setPerfilModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [empresaModalVisible, setEmpresaModalVisible] = useState(false);

  // Form states
  const [editNombre, setEditNombre] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [editEmpresaNombre, setEditEmpresaNombre] = useState('');
  const [editEmpresaTelefono, setEditEmpresaTelefono] = useState('');
  const [editEmpresaDireccion, setEditEmpresaDireccion] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const perfilData = await ajustesApi.getPerfil();
      setPerfil(perfilData);

      if (isAdmin) {
        const [empresaData, suscripcionData] = await Promise.all([
          ajustesApi.getEmpresa(),
          ajustesApi.getSuscripcion(),
        ]);
        setEmpresa(empresaData);
        setSuscripcion(suscripcionData);
      }
    } catch (err) {
      analytics.captureError(err, { origen: 'AjustesScreen' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Solo lee la preferencia guardada. No pide permisos.
  useEffect(() => {
    calendarioEstaActivo().then(async (activo) => {
      setCalendarioActivo(activo);
      // describirDestino no pide permiso: si no lo hay, devuelve null.
      if (activo) setDestino(await describirDestino());
    });
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSavePerfil = async () => {
    setSaving(true);
    try {
      await ajustesApi.updatePerfil({
        nombreCompleto: editNombre,
        telefono: editTelefono || undefined,
      });
      setSuccess('Perfil actualizado');
      setPerfilModalVisible(false);
      fetchData();
    } catch (err: any) {
      setError(mensajeDeError(err, 'No pudimos guardar el perfil'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordNuevo !== passwordConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (passwordNuevo.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setSaving(true);
    try {
      await ajustesApi.cambiarPassword(passwordActual, passwordNuevo);
      setSuccess('Contraseña actualizada');
      setPasswordModalVisible(false);
      setPasswordActual('');
      setPasswordNuevo('');
      setPasswordConfirm('');
    } catch (err: any) {
      setError(mensajeDeError(err, 'No pudimos cambiar la contraseña'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmpresa = async () => {
    setSaving(true);
    try {
      await ajustesApi.updateEmpresa({
        nombre: editEmpresaNombre,
        telefono: editEmpresaTelefono || undefined,
        direccion: editEmpresaDireccion || undefined,
      });
      setSuccess('Empresa actualizada');
      setEmpresaModalVisible(false);
      fetchData();
    } catch (err: any) {
      setError(mensajeDeError(err, 'No pudimos guardar la empresa'));
    } finally {
      setSaving(false);
    }
  };

  const openPerfilModal = () => {
    setEditNombre(perfil?.nombreCompleto || '');
    setEditTelefono(perfil?.telefono || '');
    setPerfilModalVisible(true);
  };

  const openEmpresaModal = () => {
    setEditEmpresaNombre(empresa?.nombre || '');
    setEditEmpresaTelefono(empresa?.telefono || '');
    setEditEmpresaDireccion(empresa?.direccion || '');
    setEmpresaModalVisible(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No definida';
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return <LoadingScreen message="Cargando ajustes..." />;
  }

  return (
    <Surface elevation={0} style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Suscripción (solo Admin) */}
        {isAdmin && suscripcion && (
          <Card
            style={[
              styles.suscripcionCard,
              {
                backgroundColor: suscripcion.requierePago ? theme.colors.warnContainer : theme.colors.cuartoContainer,
                borderLeftColor: suscripcion.requierePago ? theme.colors.warn : theme.colors.onCuartoContainer,
              },
            ]}
          >
            <Card.Content>
              <Surface elevation={0} style={styles.suscripcionHeader}>
                <MaterialCommunityIcons
                  name={suscripcion.requierePago ? 'alert-circle' : 'check-circle'}
                  size={24}
                  color={suscripcion.requierePago ? theme.colors.warn : theme.colors.cuarto}
                />
                <Surface elevation={0} style={styles.suscripcionInfo}>
                  <Text style={styles.suscripcionEstado}>{suscripcion.estadoNombre}</Text>
                  <Text style={styles.suscripcionMensaje}>{suscripcion.mensaje}</Text>
                </Surface>
              </Surface>
              <Text style={styles.suscripcionVence}>
                Vence: {formatDate(suscripcion.fechaVencimiento)}
              </Text>
            </Card.Content>
          </Card>
        )}
        {/* Tema*/}
        <ThemeToggleButton />

        {/* Calendario del teléfono. No se ofrece en web ni donde el módulo
            nativo no esté disponible (Expo Go). */}
        {calendarioDisponible() && (
          <Card style={styles.card}>
            <Card.Title title="Calendario" titleVariant="titleMedium" />
            <Card.Content>
              {!modCalendario ? (
                <List.Item
                  title="Calendario y sincronización"
                  description="Disponible desde el plan Profesional"
                  left={(props) => <List.Icon {...props} icon="calendar-lock-outline" />}
                  right={(props) => <List.Icon {...props} icon="chevron-right" />}
                  onPress={() =>
                    pedirUpgrade({
                      tipo: 'modulo',
                      modulo: 'calendario',
                      nombre: 'Calendario',
                    })
                  }
                />
              ) : (
                <>
                  <List.Item
                    title="Agregar mis citas al calendario"
                    description={
                      calendarioActivo
                        ? 'Las citas que agendes aparecerán en el calendario de tu teléfono'
                        : 'Activa para que tus citas agendadas se guarden también en tu teléfono'
                    }
                    left={(props) => <List.Icon {...props} icon="calendar-check-outline" />}
                    right={() => (
                      <Switch value={calendarioActivo} onValueChange={toggleCalendario} />
                    )}
                  />

                  {/* Sin esto no hay forma de saber si las citas llegan a Google o
                      se quedan encerradas en el teléfono. */}
                  {calendarioActivo && (
                    <List.Item
                      title="Calendario de destino"
                      description={
                        destino
                          ? destino.sincronizaConLaNube
                            ? `${destino.cuenta} · ${destino.titulo} · Sincronizado`
                            : `${destino.cuenta} · ${destino.titulo} · Solo en este teléfono`
                          : 'Toca para elegir una cuenta o un calendario local'
                      }
                      titleStyle={styles.destinoTitulo}
                      descriptionNumberOfLines={3}
                      left={(props) => (
                        <List.Icon
                          {...props}
                          icon={
                            destino?.sincronizaConLaNube
                              ? 'cloud-check-outline'
                              : 'cellphone'
                          }
                        />
                      )}
                      right={(props) => <List.Icon {...props} icon="chevron-right" />}
                      onPress={() => setCalendarioPickerVisible(true)}
                    />
                  )}
                </>
              )}
            </Card.Content>
          </Card>
        )}
        {/* Perfil */}
        <Card style={styles.card}>
          <Card.Title title="Mi Perfil" titleVariant="titleMedium" />
          <Card.Content>
            <List.Item
              title={perfil?.nombreCompleto}
              description="Nombre completo"
              left={(props) => <List.Icon {...props} icon="account" />}
            />
            <Divider />
            <List.Item
              title={perfil?.email}
              description="Correo electrónico"
              left={(props) => <List.Icon {...props} icon="email" />}
            />
            <Divider />
            <List.Item
              title={perfil?.telefono || 'No registrado'}
              description="Teléfono"
              left={(props) => <List.Icon {...props} icon="phone" />}
            />
          </Card.Content>
          <Card.Actions>
            <Button onPress={openPerfilModal}>Editar Perfil</Button>
            <Button onPress={() => setPasswordModalVisible(true)}>Cambiar Contraseña</Button>
          </Card.Actions>
        </Card>

        {/* Empresa (solo Admin) */}
        {isAdmin && <Card style={styles.card}>
          <List.Item title="Perfil público y locales" description="Publicación, redes sociales y ubicación de tu negocio"
            left={props => <List.Icon {...props} icon="store-marker-outline" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('PerfilPublico')} />
        </Card>}
        {isAdmin && empresa && (
          <Card style={styles.card}>
            <Card.Title title="Mi Empresa" titleVariant="titleMedium" />
            <Card.Content>
              <List.Item
                title={empresa.nombre}
                description="Nombre del negocio"
                left={(props) => <List.Icon {...props} icon="store" />}
              />
              <Divider />
              <List.Item
                title={empresa.telefono || 'No registrado'}
                description="Teléfono"
                left={(props) => <List.Icon {...props} icon="phone" />}
              />
              <Divider />
              <List.Item
                title={empresa.direccion || 'No registrada'}
                description="Dirección"
                left={(props) => <List.Icon {...props} icon="map-marker" />}
              />
            </Card.Content>
            <Card.Actions>
              <Button onPress={openEmpresaModal}>Editar Empresa</Button>
            </Card.Actions>
          </Card>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Modal Editar Perfil */}
      <Portal>
        <Modal
          visible={perfilModalVisible}
          onDismiss={() => setPerfilModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>Editar Perfil</Text>
          <TextInput
            label="Nombre completo"
            value={editNombre}
            onChangeText={setEditNombre}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Teléfono"
            value={editTelefono}
            onChangeText={setEditTelefono}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
          />
          <Surface elevation={0} style={styles.modalActions}>
            <Button onPress={() => setPerfilModalVisible(false)}>Cancelar</Button>
            <Button mode="contained" onPress={handleSavePerfil} loading={saving}>
              Guardar
            </Button>
          </Surface>
        </Modal>
      </Portal>

      {/* Modal Cambiar Contraseña */}
      <Portal>
        <Modal
          visible={passwordModalVisible}
          onDismiss={() => setPasswordModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
          <TextInput
            label="Contraseña actual"
            value={passwordActual}
            onChangeText={setPasswordActual}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />
          <TextInput
            label="Nueva contraseña"
            value={passwordNuevo}
            onChangeText={setPasswordNuevo}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />
          <TextInput
            label="Confirmar nueva contraseña"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />
          <Surface elevation={0} style={styles.modalActions}>
            <Button onPress={() => setPasswordModalVisible(false)}>Cancelar</Button>
            <Button mode="contained" onPress={handleChangePassword} loading={saving}>
              Cambiar
            </Button>
          </Surface>
        </Modal>
      </Portal>

      {/* Modal Editar Empresa */}
      <Portal>
        <Modal
          visible={empresaModalVisible}
          onDismiss={() => setEmpresaModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>Editar Empresa</Text>
          <TextInput
            label="Nombre del Negocio"
            value={editEmpresaNombre}
            onChangeText={setEditEmpresaNombre}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Teléfono"
            value={editEmpresaTelefono}
            onChangeText={setEditEmpresaTelefono}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
          />
          <TextInput
            label="Dirección"
            value={editEmpresaDireccion}
            onChangeText={setEditEmpresaDireccion}
            mode="outlined"
            multiline
            style={styles.input}
          />
          <Surface elevation={0} style={styles.modalActions}>
            <Button onPress={() => setEmpresaModalVisible(false)}>Cancelar</Button>
            <Button mode="contained" onPress={handleSaveEmpresa} loading={saving}>
              Guardar
            </Button>
          </Surface>
        </Modal>
      </Portal>

      <CalendarioPickerModal
        visible={calendarioPickerVisible}
        onDismiss={() => setCalendarioPickerVisible(false)}
        onGuardado={() => {
          describirDestino().then(setDestino);
        }}
      />

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000}>
        {error}
      </Snackbar>
      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess('')}
        duration={3000}
        style={styles.successSnackbar}
      >
        {success}
      </Snackbar>
    </Surface>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({  
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  suscripcionCard: {
    margin: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  suscripcionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  suscripcionInfo: {
    flex: 1,
  },
  suscripcionEstado: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  suscripcionMensaje: {
    marginTop: 4,
  },
  suscripcionVence: {
    color: theme.colors.onSurface,
    fontSize: 12,
    marginTop: 8,
  },
  destinoTitulo: {
    fontSize: 14,
  },
  card: {
    margin: 16,
    marginTop: 8,
  },
  modal: {
    backgroundColor: theme.colors.surface,
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  bottomPadding: {
    height: 32,
  },
  successSnackbar: {
    backgroundColor: theme.colors.cuarto,
  },
});
