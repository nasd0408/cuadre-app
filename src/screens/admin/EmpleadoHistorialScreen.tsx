import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text, Card, Chip, Divider, useTheme } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';
import { empleadosApi } from '../../api/empleados';
import { ErrorMessage } from '../../components';

type RouteParams = {
  EmpleadoHistorial: { empleadoId: number; nombre: string };
};

interface CitaHistorial {
  id: number;
  fecha: string;
  total: number;
  comision: number;
  pagadoAlEmpleado: boolean;
  numeroServicios: number;
}

const PAGE_SIZE = 20;

export default function EmpleadoHistorialScreen() {
  const route = useRoute<RouteProp<RouteParams, 'EmpleadoHistorial'>>();
  const { empleadoId } = route.params;
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  /**
   * Estable entre renders a proposito: en linea es un TIPO de componente nuevo
   * cada vez, y React desmonta y remonta todos los separadores visibles.
   */
  const Separador = useCallback(() => <View style={{ height: 4 }} />, []);
  const [items, setItems] = useState<CitaHistorial[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const fetchPage = useCallback(async (pageNum: number, replace = false) => {
    try {
      setError('');
      const data = await empleadosApi.getHistorial(empleadoId, pageNum, PAGE_SIZE);
      setTotal(data.total);
      setItems((prev) => replace ? data.items : [...prev, ...data.items]);
      setPage(pageNum);
    } catch (err) {
      setError('Error al cargar el historial');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [empleadoId]);

  useEffect(() => {
    fetchPage(1, true);
  }, [fetchPage]);

  const loadMore = () => {
    const hasMore = items.length < total;
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchPage(page + 1);
  };

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  if (loading) {

    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={() => fetchPage(1, true)} />;
  }

  const renderItem = ({ item }: { item: CitaHistorial }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.row}>
          <View style={styles.dateBlock}>
            <Text variant="bodyMedium" style={styles.fecha}>{formatDate(item.fecha)}</Text>
            <Text variant="bodySmall" style={styles.servicios}>
              {item.numeroServicios} {item.numeroServicios === 1 ? 'servicio' : 'servicios'}
            </Text>
          </View>
          <View style={styles.amountsBlock}>
            <Text variant="titleMedium" style={styles.total}>{formatCurrency(item.total)}</Text>
            <Text variant="bodySmall" style={styles.comision}>
              Comisión: {formatCurrency(item.comision)}
            </Text>
          </View>
        </View>
        <View style={styles.chipRow}>
          <Chip
            compact
            icon={item.pagadoAlEmpleado ? 'check-circle' : 'clock-outline'}
            style={[
              styles.chip,
              { backgroundColor: item.pagadoAlEmpleado
                  ? theme.colors.secondaryContainer
                  : theme.colors.warnContainer }
            ]}
            textStyle={{
              color: item.pagadoAlEmpleado ? theme.colors.secondary : theme.colors.warn,
              fontSize: 11,
            }}
          >
            {item.pagadoAlEmpleado ? 'Liquidado' : 'Pendiente'}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      ItemSeparatorComponent={Separador}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      ListHeaderComponent={
        <Text style={styles.counter}>{total} citas en total</Text>
      }
      ListFooterComponent={
        loadingMore ? <ActivityIndicator style={{ margin: 16 }} /> : null
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Sin citas registradas</Text>
        </View>
      }
    />
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  counter: {
    margin: 16,
    marginBottom: 8,
    color: theme.colors.outline,
    fontSize: 13,
  },
  card: { marginHorizontal: 16, marginVertical: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dateBlock: { flex: 1 },
  amountsBlock: { alignItems: 'flex-end' },
  fecha: { fontWeight: '600' },
  servicios: { color: theme.colors.outline, marginTop: 2 },
  total: { fontWeight: 'bold', color: theme.colors.onSurface },
  comision: { color: theme.colors.outline, marginTop: 2 },
  chipRow: { marginTop: 8 },
  chip: { alignSelf: 'flex-start' },
  emptyText: { color: theme.colors.outline },
});