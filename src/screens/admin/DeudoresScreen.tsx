import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, FlatList, RefreshControl, Linking } from 'react-native';
import { Text, Card, Chip, Button, Divider, List, Searchbar, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { reportesApi, ReporteDeudores, ClienteDeudor } from '../../api/reportes';
import { LoadingScreen, ErrorMessage } from '../../components';
import { useAuthStore } from '../../stores/authStore';
import { useMensajeriaStore } from '../../stores/mensajeriaStore';
import { renderTemplate } from '../../utils/whatsapp';
import { useEnviarWhatsApp } from '../../hooks/useEnviarWhatsApp';
import EmptyState from '../../components/EmptyState';
import { analytics } from '../../analytics';

export default function DeudoresScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { enviar: enviarWhatsApp } = useEnviarWhatsApp();

  const [reporte, setReporte] = useState<ReporteDeudores | null>(null);
  const [filteredDeudores, setFilteredDeudores] = useState<ClienteDeudor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  /**
   * Estable entre renders a proposito: en linea es un TIPO de componente nuevo
   * cada vez, y React desmonta y remonta todos los separadores visibles.
   */
  const Separador = useCallback(() => <View style={styles.separator} />, [styles]);
  const fetchData = useCallback(async () => {
    try {
      setError('');
      const data = await reportesApi.getDeudores();
      setReporte(data);
      setFilteredDeudores(data.deudores);
    } catch (err) {
      setError('Error al cargar deudores');
      analytics.captureError(err, { origen: 'DeudoresScreen' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!reporte) return;

    if (query.trim() === '') {
      setFilteredDeudores(reporte.deudores);
    } else {
      const filtered = reporte.deudores.filter(
        (d) =>
          d.nombre.toLowerCase().includes(query.toLowerCase()) ||
          (d.telefono && d.telefono.includes(query))
      );
      setFilteredDeudores(filtered);
    }
  };

  const handleLlamar = (telefono: string) => {
    Linking.openURL(`tel:${telefono}`);
  };

  const handleWhatsApp = async (telefono: string, nombre: string, deuda: number) => {
    const config = await useMensajeriaStore.getState().fetch();
    const negocio = useAuthStore.getState().user?.empresa ?? '';
    const saldo = `$${deuda.toFixed(2)}`;
    const mensaje = config
      ? renderTemplate(config.plantillaDeudor, { cliente: nombre, saldo, negocio })
      : `Hola ${nombre}, te recordamos que tienes un saldo pendiente de ${saldo}. ¿Cuándo podrías pasar a liquidarlo?`;

    await enviarWhatsApp({
      telefono,
      codigoPais: config?.codigoPais ?? '58',
      mensaje,
      preferencia: config?.appDestino ?? 'business',
    });
    analytics.track('whatsapp_message_sent', { tipo: 'deudor' });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Sin registro';
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDiasDeuda = (fechaPrimeraDeuda?: string) => {
    if (!fechaPrimeraDeuda) return 0;
    const dias = Math.floor(
      (Date.now() - new Date(fechaPrimeraDeuda).getTime()) / (1000 * 60 * 60 * 24)
    );
    return dias;
  };

  const renderDeudor = ({ item }: { item: ClienteDeudor }) => {
    const diasDeuda = getDiasDeuda(item.fechaPrimeraDeuda);
    const isExpanded = expandedId === item.clienteId;


    return (
      <Card style={styles.card}>
        <Card.Content>
          {/* Header */}
          <Surface elevation={0} style={styles.deudorHeader}>
            <Surface elevation={0} style={styles.deudorInfo}>
              <Text style={styles.deudorNombre}>{item.nombre}</Text>
              {item.telefono && (
                <Text style={styles.deudorTelefono}>📞 {item.telefono}</Text>
              )}
            </Surface>
            <Surface elevation={0} style={styles.deudorDeuda}>
              <Text style={styles.deudaValue}>{formatCurrency(item.deuda)}</Text>
              {diasDeuda > 0 && (
                <Chip
                  
                  mode="flat"
                  style={[
                    styles.diasChip,
                    {
                      backgroundColor:
                        diasDeuda > 30 ? '#ffebee' : diasDeuda > 7 ? '#fff3e0' : '#e3f2fd',
                    },
                  ]}
                  textStyle={{
                    color: diasDeuda > 30 ? '#c62828' : diasDeuda > 7 ? '#ef6c00' : '#1565c0',
                    fontSize: 11,
                  }}
                >
                  {diasDeuda} días
                </Chip>
              )}
            </Surface>
          </Surface>

          {/* Info adicional */}
          <Surface elevation={0} style={styles.infoRow}>
            <Text style={styles.infoText}>
              Última visita: {formatDate(item.fechaUltimaVisita)}
            </Text>
            <Text style={styles.infoText}>{item.citasPendientes} cita(s) pendiente(s)</Text>
          </Surface>

          {/* Acciones */}
          <Surface elevation={0} style={styles.actionsRow}>
            {item.telefono && (
              <>
                <Button
                  mode="outlined"
                  compact
                  icon="phone"
                  onPress={() => handleLlamar(item.telefono!)}
                  style={styles.actionButton}
                >
                  Llamar
                </Button>
                <Button
                  mode="outlined"
                  compact
                  icon="whatsapp"
                  onPress={() => handleWhatsApp(item.telefono!, item.nombre, item.deuda)}
                  style={[styles.actionButton, styles.whatsappButton]}
                  textColor="#25D366"
                >
                  WhatsApp
                </Button>
              </>
            )}
            <Button
              mode="text"
              compact
              onPress={() => setExpandedId(isExpanded ? null : item.clienteId)}
            >
              {isExpanded ? 'Ocultar' : 'Ver detalle'}
            </Button>
          </Surface>

          {/* Detalle expandido */}
          {isExpanded && item.detalle.length > 0 && (
            <Surface elevation={0} style={styles.detalleContainer}>
              <Divider style={styles.detalleDivider} />
              <Text style={styles.detalleTitle}>Detalle de deuda:</Text>
              {item.detalle.map((d) => (
                <Surface elevation={0} key={d.citaId} style={styles.detalleItem}>
                  <Surface elevation={0}>
                    <Text style={styles.detalleFecha}>{formatDate(d.fecha)}</Text>
                    <Text style={styles.detalleServicios}>{d.servicios}</Text>
                  </Surface>
                  <Text style={styles.detalleMonto}>{formatCurrency(d.monto)}</Text>
                </Surface>
              ))}
            </Surface>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return <LoadingScreen message="Cargando deudores..." />;
  }

  if (error && !reporte) {
    return <ErrorMessage message={error} onRetry={fetchData} />;
  }

  return (
    <Surface  style={styles.container}>
      {/* Resumen */}
      <Card style={styles.resumenCard}>
        <Card.Content style={styles.resumenContent}>
          <Surface elevation={0} style={styles.resumenItem}>
            <Text style={styles.resumenValue}>{formatCurrency(reporte?.totalDeuda || 0)}</Text>
            <Text style={styles.resumenLabel}>Total por cobrar</Text>
          </Surface>
          <View style={styles.resumenDivider} />
          <Surface elevation={0} style={styles.resumenItem}>
            <Text style={styles.resumenValue}>{reporte?.totalDeudores || 0}</Text>
            <Text style={styles.resumenLabel}>Clientes</Text>
          </Surface>
          <View style={styles.resumenDivider} />
          <Surface elevation={0} style={styles.resumenItem}>
            <Text style={styles.resumenValue}>{formatCurrency(reporte?.deudaPromedio || 0)}</Text>
            <Text style={styles.resumenLabel}>Promedio</Text>
          </Surface>
        </Card.Content>
      </Card>

      {/* Búsqueda */}
      <Searchbar
        placeholder="Buscar cliente..."
        value={searchQuery}
        onChangeText={handleSearch}
        style={styles.searchbar}
      />

      {/* Lista */}
      {filteredDeudores.length === 0 ? (
        <EmptyState
          icon={searchQuery ? 'account-search-outline' : 'check-circle-outline'}
          title={searchQuery ? 'Sin resultados' : '¡Nadie te debe!'}
          subtitle={
            searchQuery
              ? 'Ningún cliente con deuda coincide con esa búsqueda.'
              : 'Todos tus clientes están al día. Aquí aparecerán los saldos pendientes cuando registres un servicio a deber.'
          }
        />
      ) : (
        <FlatList
          data={filteredDeudores}
          renderItem={renderDeudor}
          keyExtractor={(item) => item.clienteId.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={Separador}
        />
      )}
    </Surface>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({  
  container: {
    flex: 1,
  },
  resumenCard: {
    margin: 16,
    marginBottom: 8,
  },
  resumenContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  resumenItem: {
    alignItems: 'center',
  },
  resumenValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  resumenLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  resumenDivider: {
    width: 1,
    backgroundColor: theme.colors.surfaceVariant,
  },
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
  },
  deudorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deudorInfo: {
    flex: 1,
  },
  deudorNombre: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deudorTelefono: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  deudorDeuda: {
    alignItems: 'flex-end',
  },
  deudaValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.error,
  },
  diasChip: {
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  infoText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    borderColor: theme.colors.surfaceVariant,
  },
  whatsappButton: {
    borderColor: '#25D366',
  },
  detalleContainer: {
    marginTop: 12,
  },
  detalleDivider: {
    marginBottom: 12,
  },
  detalleTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  detalleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  detalleFecha: {
    fontWeight: '500',
  },
  detalleServicios: {
    color: theme.colors.onBackground,
    fontSize: 12,
  },
  detalleMonto: {
    fontWeight: 'bold',
    color: theme.colors.error,
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 16,
  },
  emptySubtext: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
});