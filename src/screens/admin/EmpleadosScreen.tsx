import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { Text, FAB, Surface, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { empleadosApi } from "../../api/empleados";
import { Empleado } from "../../types";
import { LoadingScreen, ErrorMessage } from "../../components";
import { usePlanStore } from "../../stores/planStore";
import { useUpgradePrompt } from "../../hooks/useUpgradePrompt";
import EmptyState from "../../components/EmptyState";

import { analytics } from '../../analytics';
const PERIODICIDAD_LABELS: Record<number, string> = {
  0: "Semanal",
  1: "Quincenal",
  2: "Mensual",
};
export default function EmpleadosScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const { puedeCrearEmpleado, plan } = usePlanStore();
  const { pedirUpgrade } = useUpgradePrompt();

  const abrirNuevoEmpleado = () => {
    if (!puedeCrearEmpleado()) {
      pedirUpgrade({
        tipo: "limite",
        recurso: "empleados",
        max: plan?.maxEmpleados ?? 1,
      });
      return;
    }
    navigation.navigate("EmpleadoForm", {});
  };

  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  /**
   * Estable entre renders a proposito: en linea es un TIPO de componente nuevo
   * cada vez, y React desmonta y remonta todos los separadores visibles.
   */
  const Separador = useCallback(() => <View style={styles.separator} />, [styles]);
  const fetchEmpleados = useCallback(async () => {
    try {
      setError("");
      const data = await empleadosApi.getAll();
      setEmpleados(data);
    } catch (err) {
      setError("Error al cargar empleados");
      analytics.captureError(err, { origen: 'EmpleadosScreen' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEmpleados();
  }, [fetchEmpleados]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchEmpleados();
    });
    return unsubscribe;
  }, [navigation, fetchEmpleados]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmpleados();
  };

  const handleDelete = async (id: number) => {
    try {
      await empleadosApi.delete(id);
      fetchEmpleados();
    } catch (err) {
      analytics.captureError(err, { origen: 'EmpleadosScreen' });
    }
    await usePlanStore.getState().fetchPlan();
  };

  const initials = (nombre: string) =>
    nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join("")
      .toUpperCase();

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Sin pagos";
    return new Date(dateString).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderEmpleado = ({ item }: { item: Empleado }) => (
    <TouchableOpacity
      style={styles.empleadoRow}
      onPress={() =>
        navigation.navigate("EmpleadoDetalle", { empleadoId: item.id })
      }
      activeOpacity={0.65}
    >
      <Surface elevation={0} style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(item.nombre)}</Text>
      </Surface>
      <Surface elevation={0} style={styles.empleadoTexto}>
        <Text variant="titleMedium" style={styles.nombre}>{item.nombre}</Text>
        <Surface elevation={0} style={styles.detallesRow}>
          <Text style={styles.comision}>{item.porcentajeComision}% comisión</Text>
          <View style={styles.dot} />
          <Text style={styles.periodicidad}>
            {PERIODICIDAD_LABELS[item.periodicidad] || `${item.periodicidad} días`}
          </Text>
        </Surface>
        <Text style={styles.ultimoPago}>Último pago: {formatDate(item.fechaUltimoPago)}</Text>
      </Surface>
      <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.outline} />
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingScreen message="Cargando empleados..." />;
  }

  if (error && empleados.length === 0) {
    return <ErrorMessage message={error} onRetry={fetchEmpleados} />;
  }

  return (
    <Surface style={styles.container}>
      {empleados.length === 0 ? (
        <EmptyState
          icon="account-group"
          title="Aún no tienes tu equipo"
          subtitle="Agrega a quienes atienden para repartir comisiones y ver cuánto produce cada uno."
          actionLabel="Agregar a mi equipo"
          onAction={abrirNuevoEmpleado}
        />
      ) : (
        <View style={styles.listShell}>
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.eyebrow}>EQUIPO</Text>
              <Text style={styles.listTitle}>Personas y comisiones</Text>
            </View>
            <Text style={styles.count}>{empleados.length}</Text>
          </View>
          <FlatList
            data={empleados}
            renderItem={renderEmpleado}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ItemSeparatorComponent={Separador}
          />
        </View>
      )}

      {/* El FAB queda siempre activo: deshabilitarlo al llegar al tope dejaba un
          botón gris sin explicar por qué. Ahora el tope abre la oferta de mejora. */}
      <FAB icon="plus" label="Nuevo empleado" style={styles.fab} onPress={abrirNuevoEmpleado} />
    </Surface>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    listShell: { flex: 1, paddingHorizontal: 16, paddingTop: 18 },
    listHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5, color: theme.colors.primary },
    listTitle: { fontSize: 22, fontWeight: "800", color: theme.colors.onBackground, marginTop: 2 },
    count: { fontSize: 24, fontWeight: "800", color: theme.colors.secondary },
    listContent: { paddingBottom: 96, backgroundColor: theme.colors.surface, borderRadius: 20, overflow: "hidden" },
    empleadoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 13,
    },
    avatarText: { color: theme.colors.onPrimaryContainer, fontWeight: "900", fontSize: 15 },
    empleadoTexto: { flex: 1 },
    nombre: { fontWeight: "800" },
    detallesRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 3,
      gap: 7,
    },
    comision: { color: theme.colors.secondary, fontSize: 13, fontWeight: "700" },
    dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: theme.colors.outline },
    periodicidad: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 13,
    },
    ultimoPago: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
      marginTop: 3,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outlineVariant,
      marginLeft: 75,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      marginTop: 16,
      textAlign: "center",
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      marginTop: 8,
      textAlign: "center",
    },
    fab: {
      position: "absolute",
      margin: 16,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: 18,
    },
  });
