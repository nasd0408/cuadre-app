// screens/clientes/ClientesHubScreen.tsx
import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Text, Card, Surface, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TouchableOpacity } from "react-native";
import { usePlanStore } from "../../stores/planStore";
import { useUpgradePrompt } from "../../hooks/useUpgradePrompt";

export default function ClientesHubScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { tieneModulo, plan } = usePlanStore();
  const { pedirUpgrade } = useUpgradePrompt();

  const modRecordatorios = tieneModulo("recordatorios");

  const OPCIONES = [
    {
      title: "Todos los clientes",
      description: "Ver y gestionar el listado completo",
      icon: "account-multiple",
      screen: "ClientesList",
      color: theme.colors.primary,
      containerColor: theme.colors.primaryContainer,
    },
    {
      title: "Clientes deudores",
      description: "Clientes con pagos pendientes",
      icon: "account-cash",
      screen: "Deudores",
      color: theme.colors.warn,
      containerColor: theme.colors.warnContainer,
    },
    {
      title: "Recordatorios",
      description: modRecordatorios
        ? "Clientes que no vienen hace tiempo"
        : "Disponible desde el plan Profesional",
      icon: "account-clock",
      screen: "Recordatorios",
      color: theme.colors.secondary,
      containerColor: theme.colors.secondaryContainer,
      locked: !modRecordatorios,
    },
  ];

  const handlePress = (opcion: (typeof OPCIONES)[0]) => {
    if (opcion.locked) {
      pedirUpgrade({
        tipo: "modulo",
        modulo: "recordatorios",
        nombre: "Recordatorios",
      });
      return;
    }
    navigation.navigate(opcion.screen);
  };

  return (
    <Surface elevation={0} style={styles.container}>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Todo lo relacionado con tus clientes, en un solo lugar.
      </Text>

      <View style={styles.grid}>
        {OPCIONES.map((opcion) => (
          <TouchableOpacity
            key={opcion.screen}
            style={styles.cardWrapper}
            onPress={() => handlePress(opcion)}
            activeOpacity={opcion.locked ? 1 : 0.7}
          >
            <Card
              style={[styles.card, opcion.locked && styles.cardDisabled]}
            >
              <Card.Content style={styles.cardContent}>
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: opcion.locked
                        ? theme.colors.surfaceDisabled + "30"
                        : opcion.containerColor,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      opcion.locked
                        ? "lock-outline"
                        : (opcion.icon as any)
                    }
                    size={25}
                    color={
                      opcion.locked
                        ? theme.colors.onSurfaceDisabled
                        : opcion.color
                    }
                  />
                </View>
                <Text
                  variant="titleMedium"
                  style={[
                    styles.cardTitle,
                    opcion.locked && styles.textDisabled,
                  ]}
                >
                  {opcion.title}
                </Text>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.cardDescription,
                    opcion.locked && styles.textDisabledItalic,
                  ]}
                >
                  {opcion.description}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={
                    opcion.locked
                      ? theme.colors.onSurfaceDisabled
                      : theme.colors.onSurfaceVariant
                  }
                  style={styles.chevron}
                />
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </Surface>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.colors.background,
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 16,
    },
    grid: {
      gap: 12,
    },
    cardWrapper: {
      width: "100%",
    },
    card: {
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outlineVariant,
    },
    cardDisabled: {
      opacity: 0.55,
    },
    cardContent: {
      minHeight: 82,
      justifyContent: "center",
      paddingVertical: 12,
      paddingLeft: 76,
      paddingRight: 40,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      position: "absolute",
      left: 12,
      top: 13,
    },
    cardTitle: {
      fontWeight: "bold",
    },
    cardDescription: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 3,
    },
    textDisabled: {
      color: theme.colors.onSurfaceDisabled,
    },
    textDisabledItalic: {
      color: theme.colors.onSurfaceDisabled,
      fontStyle: "italic",
    },
    chevron: {
      position: "absolute",
      right: 12,
      top: 29,
    },
  });
