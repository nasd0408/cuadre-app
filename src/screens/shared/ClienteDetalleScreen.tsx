import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, Divider, List, Chip, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Cliente } from '../../types';
import { LoadingScreen } from '../../components';
import apiClient from '../../api/client';

import { analytics } from '../../analytics';
type RouteParams = {
  ClienteDetalle: {
    cliente: Cliente;
  };
};

interface Movimiento {
  id: number;
  monto: number;
  tipo: number; // 0 = Cargo, 1 = Abono
  observaciones: string;
  fechaCreacion: string;
  citaId?: number;
}

export default function ClienteDetalleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'ClienteDetalle'>>();
  const { cliente } = route.params;

  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [saldo, setSaldo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [movRes, saldoRes] = await Promise.all([
        apiClient.get(`/cuentas-cliente/cliente/${cliente.id}`),
        apiClient.get(`/cuentas-cliente/cliente/${cliente.id}/saldo`),
      ]);
      setMovimientos(movRes.data);
      setSaldo(saldoRes.data.saldo);
    } catch (err) {
      analytics.captureError(err, { origen: 'ClienteDetalleScreen' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cliente.id]);

  useEffect(() => {
    navigation.setOptions({
      title: cliente.nombre,
    });
    fetchData();
  }, [navigation, cliente.nombre, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return <LoadingScreen message="Cargando información..." />;
  }

  const tieneDeuda = saldo < 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Información del cliente */}
      <Card style={styles.card}>
        <Card.Content>
          <Surface elevation={0} style={styles.clienteHeader}>
            <Surface elevation={0} style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={40} color={theme.colors.onPrimary} />
            </Surface>
            <Surface elevation={0} style={styles.clienteInfo}>
              <Text variant="headlineSmall" style={styles.nombre}>
                {cliente.nombre}
              </Text>
              {cliente.telefono && (
                <Text variant="bodyMedium" style={styles.telefono}>
                  📞 {cliente.telefono}
                </Text>
              )}
            </Surface>
          </Surface>

          <Divider style={styles.divider} />

          <Surface elevation={0} style={styles.statsRow}>
            <Surface elevation={0} style={styles.stat}>
              <Text variant="bodySmall" style={styles.statLabel}>
                Última visita
              </Text>
              <Text variant="bodyLarge" style={styles.statValue}>
                {cliente.fechaUltimoCorte
                  ? new Date(cliente.fechaUltimoCorte).toLocaleDateString('es-MX')
                  : 'Sin registro'}
              </Text>
            </Surface>
            <Surface elevation={0} style={styles.stat}>
              <Text variant="bodySmall" style={styles.statLabel}>
                Estado
              </Text>
              <Chip
                mode="flat"
                style={[
                  styles.statusChip,
                  { backgroundColor: tieneDeuda ? theme.colors.errorContainer : theme.colors.cuartoContainer },
                ]}
                textStyle={{ color: tieneDeuda ? theme.colors.error : theme.colors.cuarto }}
              >
                {tieneDeuda ? 'Debe' : 'Al día'}
              </Chip>
            </Surface>
          </Surface>
        </Card.Content>
      </Card>

      {/* Saldo */}
      <Card style={[styles.card, styles.saldoCard]}>
        <Card.Content style={styles.saldoContent}>
          <Text variant="bodyMedium" style={styles.saldoLabel}>
            Saldo actual
          </Text>
          <Text
            variant="displaySmall"
            style={[styles.saldoValue, { color: tieneDeuda ? theme.colors.error : theme.colors.cuarto }]}
          >
            {tieneDeuda ? '-' : ''}
            {formatCurrency(saldo)}
          </Text>
          {tieneDeuda && (
            <Text variant="bodySmall" style={styles.saldoHint}>
              El cliente tiene un saldo pendiente
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Acciones rápidas */}
      <Surface elevation={0} style={styles.actionsRow}>
        <Button
          mode="contained"
          icon="pencil"
          onPress={() => navigation.navigate('ClienteForm', { cliente })}
          style={styles.actionButton}
        >
          Editar
        </Button>
        {/* Aqui habia un boton "Registrar Abono" que solo hacia console.log.
            Aparecia justo cuando el cliente DEBE dinero, o sea en el momento de
            mas intencion, y no pasaba nada al pulsarlo. Un boton muerto ahi
            ensena al usuario que la app no funciona.

            No se implementa el abono porque no existe ni pantalla ni endpoint
            de alta: la deuda se salda hoy cobrando la cita pendiente. Cuando se
            construya el flujo, este es el sitio donde va. */}
      </Surface>

      {/* Historial de movimientos */}
      <Card style={styles.card}>
        <Card.Title title="Historial de Movimientos" titleVariant="titleMedium" />
        <Card.Content>
          {movimientos.length === 0 ? (
            <Text style={styles.emptyText}>Sin movimientos registrados</Text>
          ) : (
            movimientos.map((mov, index) => (
              <React.Fragment key={mov.id}>
                {index > 0 && <Divider style={styles.movDivider} />}
                <List.Item
                  title={mov.observaciones || (mov.tipo === 0 ? 'Cargo' : 'Abono')}
                  description={formatDate(mov.fechaCreacion)}
                  left={() => (
                    <Surface elevation={0}
                      style={[
                        styles.movIcon,
                        { backgroundColor: mov.tipo === 0 ? '#ffebee' : '#e8f5e9' },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={mov.tipo === 0 ? 'arrow-up' : 'arrow-down'}
                        size={20}
                        color={mov.tipo === 0 ? '#c62828' : '#2e7d32'}
                      />
                    </Surface>
                  )}
                  right={() => (
                    <Text
                      style={[
                        styles.movMonto,
                        { color: mov.tipo === 0 ? '#c62828' : '#2e7d32' },
                      ]}
                    >
                      {mov.tipo === 0 ? '-' : '+'}
                      {formatCurrency(mov.monto)}
                    </Text>
                  )}
                />
              </React.Fragment>
            ))
          )}
        </Card.Content>
      </Card>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({  
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  card: {
    margin: 16,
    marginBottom: 0,
  },
  clienteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  clienteInfo: {
    flex: 1,
  },
  nombre: {
    fontWeight: 'bold',
  },
  telefono: {
    color: theme.colors.onSurface,
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  statValue: {
    fontWeight: '600',
  },
  statusChip: {
    marginTop: 4,
  },
  saldoCard: {
    marginTop: 16,
  },
  saldoContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  saldoLabel: {
    color: theme.colors.onSurface,
  },
  saldoValue: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  saldoHint: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.secondary,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    paddingVertical: 16,
  },
  movDivider: {
    marginVertical: 4,
  },
  movIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  movMonto: {
    fontWeight: 'bold',
    alignSelf: 'center',
  },
  bottomPadding: {
    height: 32,
  },
});