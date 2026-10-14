import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import {
  Text,
  FAB,
  IconButton,
  Menu,
  Divider,
  Chip,
  Searchbar,
  useTheme,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { serviciosApi } from "../../api/servicios";
import { Servicio } from "../../types";
import EmptyState from "../../components/EmptyState";
import { LoadingScreen, ErrorMessage } from "../../components";
import { usePlanStore } from "../../stores/planStore";
import { useConfirmDialog } from "../../components/ConfirmDialog";
import { useUpgradePrompt } from "../../hooks/useUpgradePrompt";

import { analytics } from '../../analytics';
export default function ServiciosScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [filteredServicios, setFilteredServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [menuVisible, setMenuVisible] = useState<number | null>(null);

  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  /**
   * Estable entre renders a proposito: en linea es un TIPO de componente nuevo
   * cada vez, y React desmonta y remonta todos los separadores visibles.
   */
  const Separador = useCallback(() => <View style={styles.separator} />, [styles]);
  const { puedeCrearServicio, plan } = usePlanStore();
  const { showAlert } = useConfirmDialog();
  const { pedirUpgrade } = useUpgradePrompt();

  const abrirNuevoServicio = () => {
    if (!puedeCrearServicio()) {
      pedirUpgrade({
        tipo: "limite",
        recurso: "servicios",
        max: plan?.maxServicios ?? 3,
      });
      return;
    }
    navigation.navigate("ServicioForm", {});
  };

  const fetchServicios = useCallback(async () => {
    try {
      setError("");
      const data = await serviciosApi.getAll();
      setServicios(data);
      setFilteredServicios(data);
    } catch (err) {
      setError("Error al cargar servicios");
      analytics.captureError(err, { origen: 'ServiciosScreen' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchServicios();
  }, [fetchServicios]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchServicios();
    });
    return unsubscribe;
  }, [navigation, fetchServicios]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchServicios();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredServicios(servicios);
    } else {
      const filtered = servicios.filter(
        (s) =>
          s.nombre.toLowerCase().includes(query.toLowerCase()) ||
          (s.categoria &&
            s.categoria.toLowerCase().includes(query.toLowerCase())),
      );
      setFilteredServicios(filtered);
    }
  };

  const handleDelete = (id: number) => {
    showAlert(
      "Eliminar servicio",
      "¿Estás seguro de que deseas eliminar este servicio? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await serviciosApi.delete(id);
              fetchServicios();
              await usePlanStore.getState().fetchPlan();
            } catch (err) {
              analytics.captureError(err, { origen: 'ServiciosScreen' });
            }
          },
        },
      ],
    );

    setMenuVisible(null);
  };
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;
  };

  const renderServicio = ({ item }: { item: Servicio }) => (
    <TouchableOpacity
      style={styles.serviceRow}
      onPress={() => navigation.navigate("ServicioForm", { servicio: item })}
      activeOpacity={0.7}
    >
      <View style={styles.servicioInfo}>
        <View style={styles.colorBadge}>
          <View
            style={[styles.colorDot, { backgroundColor: item.colorHex || theme.colors.primary }]}
          />
        </View>
          <View style={styles.servicioTexto}>
            <View style={styles.nombreRow}>
              <Text variant="titleMedium" style={styles.nombre}>
                {item.nombre}
              </Text>
              {item.enPromocion && (
                <Chip mode="flat" style={styles.promoChip}>
                  Promo
                </Chip>
              )}
            </View>
            {item.descripcion && (
              <Text
                variant="bodySmall"
                style={styles.descripcion}
                numberOfLines={1}
              >
                {item.descripcion}
              </Text>
            )}
            <View style={styles.detallesRow}>
              <Text style={styles.precio}>{formatCurrency(item.precio)}</Text>
              <View style={styles.duracionRow}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={14}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text style={styles.duracion}>{item.duracionMinutos} min</Text>
              </View>
              {item.categoria && <Text style={styles.categoria}>{item.categoria}</Text>}
            </View>
          </View>
      </View>

        <Menu
          visible={menuVisible === item.id}
          onDismiss={() => setMenuVisible(null)}
          anchor={
            <IconButton
              icon="dots-vertical"
              size={20}
              accessibilityLabel={`Opciones de ${item.nombre}`}
              onPress={() => setMenuVisible(item.id)}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(null);
              navigation.navigate("ServicioForm", { servicio: item });
            }}
            title="Editar"
            leadingIcon="pencil"
          />
          <Divider />
          <Menu.Item
            onPress={() => handleDelete(item.id)}
            title="Eliminar"
            leadingIcon="delete"
            titleStyle={{ color: "#e74c3c" }}
          />
        </Menu>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingScreen message="Cargando servicios..." />;
  }

  if (error && servicios.length === 0) {
    return <ErrorMessage message={error} onRetry={fetchServicios} />;
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Buscar servicio..."
        value={searchQuery}
        onChangeText={handleSearch}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
        elevation={0}
      />

      {filteredServicios.length > 0 && (
        <View style={styles.catalogHeading}>
          <View>
            <Text style={styles.catalogEyebrow}>CATÁLOGO</Text>
            <Text style={styles.catalogHint}>El color identifica cada servicio al agendar</Text>
          </View>
          <Text style={styles.catalogCount}>{filteredServicios.length}</Text>
        </View>
      )}

      {filteredServicios.length === 0 ? (
        <EmptyState
          icon="content-cut"
          title={searchQuery ? "Sin resultados" : "Aún no tienes servicios"}
          subtitle={
            searchQuery
              ? "Prueba con otro nombre."
              : "Registra lo que ofreces (corte, uñas, tratamiento…) con su precio para empezar a vender."
          }
          actionLabel={searchQuery ? undefined : "Crear mi primer servicio"}
          onAction={searchQuery ? undefined : abrirNuevoServicio}
        />
      ) : (
        <View style={styles.catalogPanel}>
          <FlatList
            data={filteredServicios}
            renderItem={renderServicio}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ItemSeparatorComponent={Separador}
          />
        </View>
      )}

      {/* El FAB queda siempre activo: deshabilitarlo al llegar al tope dejaba un
          botón gris sin explicar por qué. Ahora el tope abre la oferta de mejora. */}
      <FAB
        icon="plus"
        label="Nuevo servicio"
        accessibilityLabel="Crear nuevo servicio"
        style={styles.fab}
        color={theme.colors.onPrimary}
        onPress={abrirNuevoServicio}
      />
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    searchbar: {
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 18,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outlineVariant,
    },
    searchInput: {
      minHeight: 48,
    },
    listContent: {
      paddingHorizontal: 14,
      paddingBottom: 96,
    },
    catalogPanel: {
      flex: 1,
      marginHorizontal: 16,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      overflow: "hidden",
    },
    serviceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 15,
    },
    servicioInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    colorBadge: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceVariant,
      marginRight: 12,
    },
    colorDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
    },
    servicioTexto: {
      flex: 1,
    },
    nombreRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    nombre: {
      fontWeight: "800",
    },
    promoChip: {
      backgroundColor: theme.colors.warnContainer,
    },
    descripcion: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    detallesRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 6,
      gap: 12,
    },
    precio: {
      fontWeight: "bold",
      color: theme.colors.cuarto,
      fontSize: 16,
    },
    duracion: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 13,
    },
    duracionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    categoria: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 66,
      backgroundColor: theme.colors.outlineVariant,
    },
    catalogHeading: {
      marginHorizontal: 16,
      marginBottom: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    catalogEyebrow: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.1,
    },
    catalogHint: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
      marginTop: 2,
    },
    catalogCount: {
      color: theme.colors.primary,
      backgroundColor: theme.colors.primaryContainer,
      minWidth: 34,
      textAlign: "center",
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 11,
      fontWeight: "800",
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
      backgroundColor: theme.colors.primary,
      borderRadius: 18,
    },
  });
