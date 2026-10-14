import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  TextInput,
  Button,
  Text,
  Snackbar,
  SegmentedButtons,
  Surface,
  useTheme,
} from "react-native-paper";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { empleadosApi } from "../../api/empleados";
import { Empleado } from "../../types";
import { usePlanStore } from "../../stores/planStore";
import { mensajeDeError } from "../../utils/alert";

type RouteParams = {
  EmpleadoForm: {
    empleado?: Empleado;
  };
};

const PERIODICIDADES = [
  { value: "0", label: "Semanal" },
  { value: "1", label: "Quincenal" },
  { value: "2", label: "Mensual" },
];

export default function EmpleadoFormScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, "EmpleadoForm">>();
  const empleadoExistente = route.params?.empleado;
  const isEditing = !!empleadoExistente;

  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [nombre, setNombre] = useState(empleadoExistente?.nombre || "");
  const [porcentaje, setPorcentaje] = useState(
    empleadoExistente?.porcentajeComision?.toString() || "50",
  );
  const [periodicidad, setPeriodicidad] = useState(
    empleadoExistente?.periodicidad?.toString() || "0", // 0 = Semanal por defecto
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? "Editar Empleado" : "Nuevo Empleado",
    });
  }, [navigation, isEditing]);

  const handleSave = async () => {
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    const porcentajeNum = parseFloat(porcentaje);
    if (isNaN(porcentajeNum) || porcentajeNum < 0 || porcentajeNum > 100) {
      setError("El porcentaje debe estar entre 0 y 100");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = {
        nombre: nombre.trim(),
        porcentajeComision: porcentajeNum,
        periodicidad: parseInt(periodicidad),
      };

      if (isEditing) {
        await empleadosApi.update(empleadoExistente.id, {
          ...data,
          activo: true,
        });
      } else {
        await empleadosApi.create(data);
      }
      await usePlanStore.getState().fetchPlan();
      navigation.goBack();
    } catch (err: unknown) {
      setError(mensajeDeError(err, "Error al guardar"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{isEditing ? "EDITAR PERFIL" : "NUEVO EN EL EQUIPO"}</Text>
        <Text style={styles.title}>{isEditing ? "Ajusta sus condiciones" : "Define cómo trabajará"}</Text>
        <Text style={styles.hint}>El porcentaje se aplicará automáticamente al cerrar cada servicio.</Text>

        <TextInput
          label="Nombre completo *"
          value={nombre}
          onChangeText={setNombre}
          mode="outlined"
          style={styles.input}
          autoFocus={!isEditing}
        />

        <TextInput
          label="Porcentaje de comisión *"
          value={porcentaje}
          onChangeText={setPorcentaje}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          right={<TextInput.Affix text="%" />}
        />

        <Text style={styles.label}>Frecuencia habitual de pago</Text>
        <SegmentedButtons
          value={periodicidad}
          onValueChange={setPeriodicidad}
          buttons={PERIODICIDADES}
          style={styles.segmented}
        />

        <Surface style={styles.preview} elevation={0}>
          <Text style={styles.previewEyebrow}>EJEMPLO RÁPIDO</Text>
          <View style={styles.previewRow}>
            <Text style={styles.previewBase}>Servicio de $100</Text>
            <Text style={styles.previewResult}>
              {nombre.trim() || "Empleado"} recibe ${Number(porcentaje) || 0}
            </Text>
          </View>
        </Surface>

        <Surface style={styles.infoBox} elevation={0}>
          <Text style={styles.infoTitle}>Qué ocurre después</Text>
          <Text style={styles.infoText}>1. Las citas cerradas acumulan su comisión.</Text>
          <Text style={styles.infoText}>2. Preparas una nómina cuando quieras hacer el corte.</Text>
          <Text style={styles.infoText}>3. Registras el pago completo o por partes.</Text>
          <Text style={styles.frequencyNote}>La frecuencia {PERIODICIDADES.find((p) => p.value === periodicidad)?.label.toLowerCase()} sirve como recordatorio, no genera pagos sola.</Text>
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
            {isEditing ? "Guardar" : "Crear"}
          </Button>
        </Surface>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={3000}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
    },
    eyebrow: { color: theme.colors.primary, fontWeight: "800", fontSize: 11, letterSpacing: 1.5 },
    title: { color: theme.colors.onBackground, fontWeight: "900", fontSize: 25, marginTop: 3 },
    hint: { color: theme.colors.onSurfaceVariant, marginTop: 6, marginBottom: 24, lineHeight: 20 },
    input: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
      color: theme.colors.onBackground,
    },
    segmented: {
      marginBottom: 16,
    },
    preview: {
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
    },
    previewEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.3, color: theme.colors.onPrimaryContainer },
    previewRow: { marginTop: 9 },
    previewBase: { color: theme.colors.onPrimaryContainer, opacity: 0.75, fontSize: 13 },
    previewResult: { color: theme.colors.onPrimaryContainer, fontSize: 18, fontWeight: "900", marginTop: 2 },
    frequencyNote: { color: theme.colors.onSurfaceVariant, fontSize: 12, lineHeight: 17, marginTop: 8, fontStyle: "italic" },
    infoBox: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderRadius: 18,
      marginBottom: 24,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outlineVariant,
    },
    infoTitle: {
      fontWeight: "bold",
      marginBottom: 8,
    },
    infoText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 13,
      marginBottom: 6,
      lineHeight: 18,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
      gap: 12,
    },
    button: {
      flex: 1,
    },
  });
