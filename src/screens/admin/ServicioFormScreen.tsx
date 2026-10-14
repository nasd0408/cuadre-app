import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
  Pressable,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Snackbar,
  Switch,
  Surface,
  Chip,
  useTheme,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { serviciosApi } from '../../api/servicios';
import { Servicio } from '../../types';
import { usePlanStore } from '../../stores/planStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { mensajeDeError } from '../../utils/alert';

type RouteParams = {
  ServicioForm: {
    servicio?: Servicio;
  };
};

// 'Corte' y 'Barba' se conservan aunque el nicho sea belleza en general: los
// servicios ya guardados traen esos valores y quitarlos dejaría el chip sin
// seleccionar al editarlos.
const CATEGORIAS = ['Corte', 'Barba', 'Uñas', 'Cabello', 'Estética', 'Combo', 'Tratamiento', 'Otro'];
const COLORES = ['#2f6f19', '#a8df45', '#a93563', '#ac480f', '#123d06', '#e94560', '#9b59b6', '#3498db'];

export default function ServicioFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'ServicioForm'>>();
  const servicioExistente = route.params?.servicio;
  const isEditing = !!servicioExistente;
  
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [nombre, setNombre] = useState(servicioExistente?.nombre || '');
  const [descripcion, setDescripcion] = useState(servicioExistente?.descripcion || '');
  const [precio, setPrecio] = useState(servicioExistente?.precio?.toString() || '');
  const [duracion, setDuracion] = useState(servicioExistente?.duracionMinutos?.toString() || '30');
  const [categoria, setCategoria] = useState(servicioExistente?.categoria || 'Corte');
  const [colorHex, setColorHex] = useState(servicioExistente?.colorHex || '#2f6f19');
  const [enPromocion, setEnPromocion] = useState(servicioExistente?.enPromocion || false);
  const [intervaloDias, setIntervaloDias] = useState(servicioExistente?.intervaloDias?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Editar Servicio' : 'Nuevo Servicio',
    });
  }, [navigation, isEditing]);

  const handleSave = async () => {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    const precioNum = parseFloat(precio);
    if (isNaN(precioNum) || precioNum <= 0) {
      setError('Ingresa un precio válido');
      return;
    }

    const duracionNum = parseInt(duracion);
    if (isNaN(duracionNum) || duracionNum <= 0) {
      setError('Ingresa una duración válida');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        precio: precioNum,
        duracionMinutos: duracionNum,
        intervaloDias: intervaloDias ? parseInt(intervaloDias) : undefined,
        categoria,
        colorHex,
        enPromocion,
      };

      if (isEditing) {
        await serviciosApi.update(servicioExistente.id, data);
      } else {
        await serviciosApi.create(data);
      }      
      await usePlanStore.getState().fetchPlan(); 
      navigation.goBack();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al guardar el servicio'));
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
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>{isEditing ? 'EDITAR SERVICIO' : 'NUEVO SERVICIO'}</Text>
          <Text style={styles.introText}>
            El color aparecerá al elegir este servicio dentro de una cita.
          </Text>
        </View>

        <Surface elevation={0} style={styles.preview}>
          <View style={[styles.previewMark, { backgroundColor: colorHex }]}>
            <MaterialCommunityIcons name="content-cut" size={22} color="#fff" />
          </View>
          <View style={styles.previewCopy}>
            <Text style={styles.previewName}>{nombre.trim() || 'Nombre del servicio'}</Text>
            <Text style={styles.previewMeta}>
              {categoria} · {duracion || '0'} min
            </Text>
          </View>
          <Text style={styles.previewPrice}>${precio || '0'}</Text>
        </Surface>

        <TextInput
          label="Nombre del servicio *"
          value={nombre}
          onChangeText={setNombre}
          mode="outlined"
          style={styles.input}
          autoFocus={!isEditing}
        />

        <TextInput
          label="Descripción (opcional)"
          value={descripcion}
          onChangeText={setDescripcion}
          mode="outlined"
          style={styles.input}
          multiline
          numberOfLines={2}
        />

        <Surface elevation={0} style={styles.row}>
          <TextInput
            label="Precio *"
            value={precio}
            onChangeText={setPrecio}
            mode="outlined"
            keyboardType="numeric"
            style={[styles.input, styles.halfInput]}
            left={<TextInput.Affix text="$" />}
          />

          <TextInput
            label="Duración *"
            value={duracion}
            onChangeText={setDuracion}
            mode="outlined"
            keyboardType="numeric"
            style={[styles.input, styles.halfInput]}
            right={<TextInput.Affix text="min" />}
          />
        </Surface>  
          <TextInput
            label="Recordar cliente cada (opcional)"
            value={intervaloDias}
            onChangeText={(v) => setIntervaloDias(v.replace(/[^0-9]/g, ''))}
            mode="outlined"
            keyboardType="number-pad"
            style={styles.input}
            right={<TextInput.Affix text="días" />}
            placeholder="Ej: 15"
          />


        <Text style={styles.label}>Categoría</Text>
        <Surface elevation={0} style={styles.chipRow}>
          {CATEGORIAS.map((cat) => (
            <Chip
              key={cat}
              selected={categoria === cat}
              onPress={() => setCategoria(cat)}
              showSelectedOverlay
              style={styles.chip}
            >
              {cat}
            </Chip>
          ))}
        </Surface>

        <Text style={styles.label}>Color en la agenda</Text>
        <Text style={styles.helper}>Úsalo para reconocer el servicio rápidamente al crear una cita.</Text>
        <Surface elevation={0} style={styles.coloresRow}>
          {COLORES.map((color) => (
            <Pressable
              key={color}
              onPress={() => setColorHex(color)}
              style={[
                styles.colorButton,
                { backgroundColor: color },
                colorHex === color && styles.colorButtonSelected,
              ]}
            >
              {colorHex === color && (
                <MaterialCommunityIcons name="check" size={19} color="#fff" />
              )}
            </Pressable>
          ))}
        </Surface>

        <Surface elevation={0} style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={styles.switchTitle}>En promoción</Text>
            <Text style={styles.switchHint}>Destácalo en tu catálogo</Text>
          </View>
          <Switch value={enPromocion} onValueChange={setEnPromocion} />
        </Surface>

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
            disabled={loading}
          >
            {isEditing ? 'Guardar' : 'Crear'}
          </Button>
        </Surface>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={3000}
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
    paddingBottom: 32,
  },
  intro: {
    marginBottom: 14,
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  introText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
    marginTop: 3,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 20,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
  },
  previewMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  previewCopy: { flex: 1 },
  previewName: {
    color: theme.colors.onSurface,
    fontSize: 15,
    fontWeight: '800',
  },
  previewMeta: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 3,
  },
  previewPrice: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  input: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.onBackground,
  },
  helper: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: -4,
    marginBottom: 10,
  },
  segmented: {
    marginBottom: 16,
  },
  coloresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  colorButton: {
    width: 40,
    height: 40,
    minWidth: 40,
    borderRadius: 20,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorButtonSelected: {
    borderWidth: 3,
    borderColor: theme.colors.surface,
    transform: [{ scale: 1.12 }],
    elevation: 3,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
  },
  switchCopy: { flex: 1 },
  switchTitle: {
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  switchHint: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 2,
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
  chipRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},
chip: {
  marginBottom: 4,
},
});
