// components/offline/OfflineQueueList.tsx
import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Text, Surface, useTheme, IconButton, Chip } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useOfflineQueueStore,
  OfflineCita,
} from "../../stores/offlineQueueStore";
import { useConfirmDialog } from "../../components/ConfirmDialog";

export default function OfflineQueueList() {
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { queue, removeCita } = useOfflineQueueStore();
    const { showAlert } = useConfirmDialog();

  const handleDelete = (item: OfflineCita) => {
    showAlert(
      "Eliminar cita offline",
      `¿Eliminar el servicio de ${item.clienteNombre}? Se perderá este registro local y no se sincronizará.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => removeCita(item.id),
        },
      ]
    );
  };

  const sorted = [...queue].sort((a, b) => {
    if (a.sincronizado !== b.sincronizado) return a.sincronizado ? 1 : -1;
    return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
  });

  return (
    <View style={styles.container}>
      {sorted.map((item) => {
        const total = item.servicios.reduce(
          (s, sv) => s + sv.precio * sv.cantidad,
          0
        );
        const hora = new Date(item.creadoEn).toLocaleTimeString("es", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <Surface key={item.id} style={styles.card} elevation={1}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <MaterialCommunityIcons
                  name={
                    item.sincronizado
                      ? "check-circle"
                      : item.error
                      ? "alert-circle"
                      : "clock-outline"
                  }
                  size={18}
                  color={
                    item.sincronizado
                      ? theme.colors.primary
                      : item.error
                      ? theme.colors.error
                      : theme.colors.onSurfaceVariant
                  }
                />
                <Text style={styles.clienteNombre} numberOfLines={1}>
                  {item.clienteNombre}
                </Text>
                {item.esClienteNuevo && (
                  <Chip
                    compact
                    style={styles.chipNuevo}
                    textStyle={{ fontSize: 9 }}
                    icon="account-plus"
                  >
                    Nuevo
                  </Chip>
                )}
                <Chip
                  compact
                  style={{
                    backgroundColor:
                      item.tipo === "pagada"
                        ? theme.colors.primaryContainer
                        : theme.colors.warnContainer ??
                          theme.colors.tertiaryContainer,
                  }}
                  textStyle={{ fontSize: 10 }}
                >
                  {item.tipo === "pagada" ? "Pagada" : "Pendiente"}
                </Chip>
              </View>

              {!item.sincronizado && (
                <IconButton
                  icon="delete-outline"
                  size={18}
                  onPress={() => handleDelete(item)}
                />
              )}
            </View>

            <View style={styles.cardDetails}>
              <Text style={styles.detailText}>
                {item.empleadoNombre} • {hora}
              </Text>
              <Text style={styles.totalText}>${total.toFixed(2)}</Text>
            </View>

            {item.servicios.length > 0 && (
              <Text style={styles.serviciosText} numberOfLines={1}>
                {item.servicios.map((s) => s.servicioNombre).join(", ")}
              </Text>
            )}

            {item.error && (
              <View style={styles.errorRow}>
                <MaterialCommunityIcons
                  name="alert-outline"
                  size={14}
                  color={theme.colors.error}
                />
                <Text style={styles.errorText} numberOfLines={2}>
                  {item.error}
                </Text>
              </View>
            )}
          </Surface>
        );
      })}
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      gap: 8,
    },
    card: {
      borderRadius: 8,
      padding: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outlineVariant,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    cardHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
    },
    clienteNombre: {
      fontWeight: "600",
      fontSize: 14,
      flexShrink: 1,
    },
    chipNuevo: {
      backgroundColor: theme.colors.tertiaryContainer,
    },
    cardDetails: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
    },
    detailText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
    totalText: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.colors.primary,
    },
    serviciosText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
    },
    errorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 8,
      backgroundColor: theme.colors.errorContainer,
      borderRadius: 6,
      padding: 8,
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.error,
      flex: 1,
    },
  });
