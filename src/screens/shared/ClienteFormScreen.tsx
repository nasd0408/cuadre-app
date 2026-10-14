import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Snackbar, Surface, useTheme } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { clientesApi } from '../../api/clientes';
import { Cliente } from '../../types';
import { contactosDisponibles, ContactoDelTelefono } from '../../contactos';
import ContactoPickerModal from '../../components/ContactoPickerModal';
import { useConfirmDialog } from '../../components/ConfirmDialog';
import { analytics, AnalyticsEvent } from '../../analytics';
import { mensajeDeError } from '../../utils/alert';

type RouteParams = {
  ClienteForm: {
    cliente?: Cliente;
  };
};

export default function ClienteFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'ClienteForm'>>();
  const clienteExistente = route.params?.cliente;
  const isEditing = !!clienteExistente;

  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [nombre, setNombre] = useState(clienteExistente?.nombre || '');
  const [telefono, setTelefono] = useState(clienteExistente?.telefono || '');
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [error, setError] = useState('');
  const { showAlert } = useConfirmDialog();

  const handleContactoElegido = (
    contacto: ContactoDelTelefono,
    yaEsCliente: boolean,
  ) => {
    setNombre(contacto.nombre);
    setTelefono(contacto.telefono);
    analytics.track(AnalyticsEvent.ClienteDesdeContacto);

    // Avisar de duplicado sin bloquear: puede ser un homónimo o un número
    // reutilizado, y el dueño del negocio sabe mejor que nosotros.
    if (yaEsCliente) {
      showAlert(
        'Ese teléfono ya está registrado',
        `${contacto.nombre} coincide con un cliente que ya tienes en tu lista.\n\nPuedes guardarlo igual si de verdad es otra persona.`,
        [{ text: 'Entendido', style: 'cancel' }],
      );
    }
  };

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Editar Cliente' : 'Nuevo Cliente',
    });
  }, [navigation, isEditing]);

  const handleSave = async () => {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isEditing) {
        await clientesApi.update(clienteExistente.id, {
          nombre: nombre.trim(),
          telefono: telefono.trim() || undefined,
        });
      } else {
        await clientesApi.create({
          nombre: nombre.trim(),
          telefono: telefono.trim() || undefined,
        });
      }
      navigation.goBack();
    } catch (err: any) {
      setError(mensajeDeError(err, 'No pudimos guardar el cliente'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="bodyMedium" style={styles.hint}>
          {isEditing
            ? 'Modifica los datos del cliente'
            : 'Ingresa los datos del nuevo cliente'}
        </Text>

        {/* Solo al crear: al editar, importar de la agenda no tiene sentido y
            arriesga pisar datos ya guardados. */}
        {!isEditing && contactosDisponibles() && (
          <Button
            mode="outlined"
            icon="account-box-outline"
            onPress={() => setPickerVisible(true)}
            disabled={loading}
            style={styles.contactoButton}
          >
            Elegir de mis contactos
          </Button>
        )}

        <TextInput
          label="Nombre *"
          value={nombre}
          onChangeText={setNombre}
          mode="outlined"
          style={styles.input}
          autoFocus={!isEditing}
        />

        <TextInput
          label="Teléfono (opcional)"
          value={telefono}
          onChangeText={setTelefono}
          mode="outlined"
          keyboardType="phone-pad"
          style={styles.input}
          left={<TextInput.Icon icon="phone" />}
        />

        <Surface elevation={0} style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.button}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.button}
            loading={loading}
            disabled={loading || !nombre.trim()}
          >
            {isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
          </Button>
        </Surface>
      </ScrollView>

      <ContactoPickerModal
        visible={pickerVisible}
        onDismiss={() => setPickerVisible(false)}
        onSeleccionar={handleContactoElegido}
      />

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={3000}
        action={{ label: 'OK', onPress: () => setError('') }}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({  
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
  },
  hint: {
    color: theme.colors.onBackground,
    marginBottom: 24,
  },
  contactoButton: {
    marginBottom: 20,
    borderRadius: 8,
  },
  input: {
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
  },
});
