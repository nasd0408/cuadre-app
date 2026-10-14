import React, { useEffect, useState, useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Text,
  TextInput,
  SegmentedButtons,
  Button,
  Chip,
  Card,
  useTheme,
  Surface,
  Snackbar,
  HelperText,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMensajeriaStore } from "../../stores/mensajeriaStore";
import { ConfiguracionMensajeria } from "../../api/mensajeria";
import { WhatsAppApp, renderTemplate } from "../../utils/whatsapp";
import { LoadingScreen } from "../../components";

// Variables disponibles por tipo de plantilla + datos de ejemplo para el preview
const SAMPLE = {
  cliente: "María",
  negocio: "Tu Negocio",
  servicio: "servicio",
  saldo: "$15,00",
  fecha: "vie 10, 3:00 pm",
};

const VARS: Record<keyof Pick<ConfiguracionMensajeria,
  "plantillaRecordatorio" | "plantillaDeudor" | "plantillaConfirmacion">, string[]> = {
  plantillaRecordatorio: ["cliente", "servicio", "negocio"],
  plantillaDeudor: ["cliente", "saldo", "negocio"],
  plantillaConfirmacion: ["cliente", "fecha", "negocio"],
};

export default function MensajeriaConfigScreen() {
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { config, fetch, save } = useMensajeriaStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState("");
  const [form, setForm] = useState<ConfiguracionMensajeria | null>(null);

  useEffect(() => {
    (async () => {
      const c = await fetch(true);
      if (c) setForm(c);
      setLoading(false);
    })();
  }, [fetch]);

  if (loading || !form) return <LoadingScreen message="Cargando configuración..." />;

  const set = (patch: Partial<ConfiguracionMensajeria>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  const appendVar = (field: keyof typeof VARS, variable: string) =>
    set({ [field]: `${form[field]}{${variable}}` } as any);

  const onSave = async () => {
    setSaving(true);
    try {
      await save(form);
      setSnack("Configuración guardada ✅");
    } catch {
      setSnack("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const renderPlantilla = (
    field: keyof typeof VARS,
    label: string,
    descripcion: string,
  ) => (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleSmall" style={styles.cardTitle}>{label}</Text>
        <Text variant="bodySmall" style={styles.cardDesc}>{descripcion}</Text>

        <View style={styles.chipsRow}>
          {VARS[field].map((v) => (
            <Chip
              key={v}
              compact
              style={styles.chip}
              onPress={() => appendVar(field, v)}
              icon="plus"
            >
              {`{${v}}`}
            </Chip>
          ))}
        </View>

        <TextInput
          mode="outlined"
          multiline
          numberOfLines={3}
          value={form[field]}
          onChangeText={(t) => set({ [field]: t } as any)}
          style={styles.textArea}
        />

        <Surface elevation={0} style={styles.preview}>
          <Text variant="labelSmall" style={styles.previewLabel}>Vista previa</Text>
          <Text variant="bodyMedium">{renderTemplate(form[field], SAMPLE)}</Text>
        </Surface>
      </Card.Content>
    </Card>
  );

  return (
    <Surface style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="bodyMedium" style={styles.intro}>
          Personaliza los mensajes de WhatsApp que envías a tus clientes y cómo se abren.
        </Text>

        {/* Código de país */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.cardTitle}>Código de país</Text>
            <Text variant="bodySmall" style={styles.cardDesc}>
              Se antepone a los números de tus clientes (Venezuela = 58).
            </Text>
            <View style={styles.ccRow}>
              <Text variant="titleMedium" style={styles.plus}>+</Text>
              <TextInput
                mode="outlined"
                keyboardType="number-pad"
                value={form.codigoPais}
                onChangeText={(t) => set({ codigoPais: t.replace(/\D/g, "") })}
                style={styles.ccInput}
                maxLength={5}
              />
            </View>
            <HelperText type="info" visible>
              Ej: si guardas "0412-1234567", enviaremos a +{form.codigoPais}4121234567
            </HelperText>
          </Card.Content>
        </Card>

        {/* App destino */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.cardTitle}>¿Qué app abrir?</Text>
            <Text variant="bodySmall" style={styles.cardDesc}>
              Si usas WhatsApp Business, elígelo para abrir tus chats de clientes.
            </Text>
            <SegmentedButtons
              value={form.appDestino}
              onValueChange={(v) => set({ appDestino: v as WhatsAppApp })}
              buttons={[
                { value: "business", label: "Business", icon: "briefcase" },
                { value: "personal", label: "Personal", icon: "whatsapp" },
                { value: "ask", label: "Preguntar", icon: "help" },
              ]}
              style={styles.segmented}
            />
            <HelperText type="info" visible>
              En Android abrimos la app elegida directamente. En iPhone se abre WhatsApp.
            </HelperText>
          </Card.Content>
        </Card>

        {renderPlantilla(
          "plantillaRecordatorio",
          "Recordatorio de cita",
          "Para invitar al cliente a volver (pantalla Recordatorios).",
        )}
        {renderPlantilla(
          "plantillaDeudor",
          "Cobro de saldo",
          "Para recordar un saldo pendiente (pantalla Deudores).",
        )}
        {renderPlantilla(
          "plantillaConfirmacion",
          "Confirmación de cita",
          "Para confirmar una cita agendada.",
        )}

        <Button
          mode="contained"
          icon="content-save"
          onPress={onSave}
          loading={saving}
          disabled={saving}
          style={styles.saveBtn}
        >
          Guardar cambios
        </Button>
        <View style={{ height: 24 }} />
      </ScrollView>

      <Snackbar visible={!!snack} onDismiss={() => setSnack("")} duration={3000}>
        {snack}
      </Snackbar>
    </Surface>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1 },
    container: { padding: 16 },
    intro: { color: theme.colors.onSurfaceVariant, marginBottom: 12 },
    card: {
      marginBottom: 12,
      backgroundColor: theme.colors.surface,
    },
    cardTitle: { fontWeight: "bold" },
    cardDesc: { color: theme.colors.onSurfaceVariant, marginTop: 2, marginBottom: 10 },
    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
    chip: { backgroundColor: theme.colors.secondaryContainer },
    textArea: { backgroundColor: theme.colors.surface },
    preview: {
      marginTop: 10,
      padding: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.elevation?.level2 ?? theme.colors.surfaceVariant,
    },
    previewLabel: { color: theme.colors.onSurfaceVariant, marginBottom: 4 },
    ccRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    plus: { color: theme.colors.onSurfaceVariant },
    ccInput: { width: 100 },
    segmented: { marginTop: 4 },
    saveBtn: { marginTop: 8, backgroundColor: theme.colors.primary },
  });
