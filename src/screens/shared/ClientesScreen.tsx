import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import {
  Text,
  FAB,
  Searchbar,
  IconButton,
  Surface,
  Menu,
  Divider,
  useTheme,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import EmptyState from "../../components/EmptyState";
import { clientesApi } from "../../api/clientes";
import { Cliente } from "../../types";
import { LoadingScreen, ErrorMessage } from "../../components";
import { useConfirmDialog } from "../../components/ConfirmDialog";
import { analytics } from '../../analytics';
import { useCargaCancelable } from '../../hooks/useCargaCancelable';
import { mensajeDeError } from '../../utils/alert';
export default function ClientesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  /**
   * Estable entre renders a proposito: en linea es un TIPO de componente nuevo
   * cada vez, y React desmonta y remonta todos los separadores visibles.
   */
  const Separador = useCallback(() => <View style={styles.separator} />, [styles]);
  const { showAlert } = useConfirmDialog();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [menuVisible, setMenuVisible] = useState<number | null>(null);

  const cargar = useCargaCancelable();

  const fetchClientes = useCallback(async () => {
    setError("");
    // La pantalla recarga al montarse Y al recibir el foco, asi que navegando
    // rapido entre pestanas quedaban respuestas escribiendo sobre una pantalla
    // ya desmontada.
    await cargar(
      () => clientesApi.getAll(),
      (data) => {
        setClientes(data);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        setError(mensajeDeError(err, "No pudimos cargar los clientes"));
        analytics.captureError(err, { origen: 'ClientesScreen' });
        setLoading(false);
        setRefreshing(false);
      },
    );
  }, [cargar]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchClientes();
    });
    return unsubscribe;
  }, [navigation, fetchClientes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClientes();
  };

  /**
   * La lista filtrada se DERIVA; antes era un segundo estado.
   *
   * Ese duplicado causaba un fallo real: al refrescar o al volver el foco,
   * fetchClientes hacia setFilteredClientes(data) sin mirar searchQuery, asi que
   * el buscador seguia con texto y la lista mostraba todos los clientes. Ademas
   * mantenia dos copias del array en memoria.
   */
  const filteredClientes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.telefono && c.telefono.includes(searchQuery.trim())),
    );
  }, [clientes, searchQuery]);

const handleDelete = (id: number) => {
  showAlert(
    "Eliminar cliente",
    "¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.",
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
            await clientesApi.delete(id);
            fetchClientes();
          } catch (err) {
            analytics.captureError(err, { origen: 'ClientesScreen' });
          }
        },
      },
    ]
  );

  setMenuVisible(null);
};

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Sin registro";
    return new Date(dateString).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getInitials = (nombre: string) =>
    nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join("")
      .toUpperCase();

  const renderCliente = ({ item }: { item: Cliente }) => (
    <TouchableOpacity
      style={styles.directoryRow}
      onPress={() => navigation.navigate("ClienteDetalle", { cliente: item })}
      activeOpacity={0.7}
    >
      <View style={styles.clienteInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.nombre)}</Text>
        </View>
        <View style={styles.clienteTexto}>
          <Text variant="titleMedium" style={styles.nombre}>
            {item.nombre}
          </Text>
          {item.telefono && (
            <View style={styles.metaRow}>
              <MaterialCommunityIcons
                name="phone-outline"
                size={14}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodySmall" style={styles.telefono}>
                {item.telefono}
              </Text>
            </View>
          )}
          <Text variant="bodySmall" style={styles.ultimoCorte}>
            Última visita: {formatDate(item.fechaUltimoCorte)}
          </Text>
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
            navigation.navigate("ClienteForm", { cliente: item });
          }}
          title="Editar"
          leadingIcon="pencil"
        />
        <Divider />
        <Menu.Item
          onPress={() => handleDelete(item.id)}
          title="Eliminar"
          leadingIcon="delete"
          titleStyle={{ color: theme.colors.error }}
        />
      </Menu>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingScreen message="Cargando clientes..." />;
  }

  if (error && clientes.length === 0) {
    return <ErrorMessage message={error} onRetry={fetchClientes} />;
  }

  return (
    <Surface elevation={0} style={styles.container}>
      <Searchbar
        placeholder="Buscar por nombre o teléfono..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
        elevation={0}
      />

      {filteredClientes.length > 0 && (
        <View style={styles.directoryHeading}>
          <View>
            <Text style={styles.directoryEyebrow}>DIRECTORIO</Text>
            <Text style={styles.directoryHint}>
              Historial y contacto de tus clientes
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filteredClientes.length}</Text>
          </View>
        </View>
      )}

      {filteredClientes.length === 0 ? (
        <EmptyState
          icon="account-search"
          title={searchQuery ? "Sin resultados" : "Aún no tienes clientes"}
          subtitle={
            searchQuery
              ? "Prueba con otro nombre o teléfono."
              : "Registra a tus clientes para llevar su historial y recordarles su próxima cita."
          }
          actionLabel={searchQuery ? undefined : "Agregar cliente"}
          onAction={searchQuery ? undefined : () => navigation.navigate("ClienteForm", {})}
        />
      ) : (
        <View style={styles.directoryPanel}>
          <FlatList
            data={filteredClientes}
            renderItem={renderCliente}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ItemSeparatorComponent={Separador}
          />
        </View>
      )}

      <FAB
        icon="plus"
        label="Nuevo cliente"
        accessibilityLabel="Agregar nuevo cliente"
        style={styles.fab}
        onPress={() => navigation.navigate("ClienteForm", {})}
      />
    </Surface>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({  
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
  directoryPanel: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },
  directoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
  },
  clienteInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: theme.colors.primary,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.4,
  },
  clienteTexto: {
    flex: 1,
  },
  nombre: {
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  telefono: {
    color: theme.colors.onSurfaceVariant,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  ultimoCorte: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 3,
  },
  directoryHeading: {
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  directoryEyebrow: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  directoryHint: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 2,
  },
  countBadge: {
    minWidth: 34,
    height: 30,
    borderRadius: 11,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primaryContainer,
  },
  countText: {
    color: theme.colors.primary,
    fontWeight: "800",
    fontSize: 13,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
    backgroundColor: theme.colors.outlineVariant,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.onSurface,
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
