import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, FlatList, RefreshControl, Linking } from 'react-native';
import { Text, Card, Chip, Button, Searchbar, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LoadingScreen, ErrorMessage } from '../../components';
import { recordatoriosApi, Recordatorio, EstadoRecordatorio } from '../../api/recordatorios';
import { useAuthStore } from '../../stores/authStore';
import { useMensajeriaStore } from '../../stores/mensajeriaStore';
import { renderTemplate } from '../../utils/whatsapp';
import { useEnviarWhatsApp } from '../../hooks/useEnviarWhatsApp';
import EmptyState from '../../components/EmptyState';
import { analytics } from '../../analytics';

export default function RecordatoriosScreen() {
  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  /**
   * Estable entre renders a proposito: en linea es un TIPO de componente nuevo
   * cada vez, y React desmonta y remonta todos los separadores visibles.
   */
  const Separador = useCallback(() => <View style={styles.separator} />, [styles]);
  const { enviar: enviarWhatsApp } = useEnviarWhatsApp();

  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [filtered, setFiltered] = useState<Recordatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const data = await recordatoriosApi.getAll();
      setRecordatorios(data);
      setFiltered(data);
    } catch (err) {
      setError('Error al cargar recordatorios');
      analytics.captureError(err, { origen: 'RecordatoriosScreen' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFiltered(recordatorios);
    } else {
      setFiltered(
        recordatorios.filter((r) =>
          r.clienteNombre.toLowerCase().includes(query.toLowerCase()) ||
          (r.clienteTelefono && r.clienteTelefono.includes(query))
        )
      );
    }
  };

  const handleCambiarEstado = async (id: number, estado: EstadoRecordatorio, nota?: string) => {
    try {
      await recordatoriosApi.cambiarEstado(id, { estado, nota });
      // Remover de la lista local si fue contactado (desaparece de vista)
      if (estado === EstadoRecordatorio.Contactado) {
        setRecordatorios((prev) => prev.filter((r) => r.id !== id));
        setFiltered((prev) => prev.filter((r) => r.id !== id));
      } else {
        // NoContestó: actualizar estado localmente
        const update = (list: Recordatorio[]) =>
          list.map((r) => r.id === id ? { ...r, estado } : r);
        setRecordatorios(update);
        setFiltered(update);
      }
    } catch (err) {
      analytics.captureError(err, { origen: 'RecordatoriosScreen' });
    }
  };

const handleWhatsApp = async (telefono: string, nombre: string, servicio: string) => {
  const config = await useMensajeriaStore.getState().fetch();
  const negocio = useAuthStore.getState().user?.empresa ?? '';
  const mensaje = config
    ? renderTemplate(config.plantillaRecordatorio, {
        cliente: nombre,
        servicio: servicio.toLowerCase(),
        negocio,
      })
    : `Hola ${nombre}, ha pasado un tiempo desde tu último ${servicio.toLowerCase()}. ¿Te gustaría agendar una cita? ✨`;

  await enviarWhatsApp({
    telefono,
    codigoPais: config?.codigoPais ?? '58',
    mensaje,
    preferencia: config?.appDestino ?? 'business',
  });
  analytics.track('whatsapp_message_sent', { tipo: 'recordatorio' });
};

  const handleLlamar = (telefono: string) => {
    Linking.openURL(`tel:${telefono}`);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  const getDiasVencido = (fechaCreacion: string, intervaloDias: number) => {
    const dias = Math.floor((Date.now() - new Date(fechaCreacion).getTime()) / (1000 * 60 * 60 * 24));
    return dias;
  };

  const getUrgencyColor = (diasVencido: number) => {
    if (diasVencido > 14) return { bg: '#ffebee', text: '#c62828' };
    if (diasVencido > 7)  return { bg: '#fff3e0', text: '#ef6c00' };
    return { bg: '#e3f2fd', text: '#1565c0' };
  };

  const renderItem = ({ item }: { item: Recordatorio }) => {
    const diasVencido = getDiasVencido(item.fechaCreacion, item.intervaloDias);
    const urgency = getUrgencyColor(diasVencido);
    const noContesto = item.estado === EstadoRecordatorio.NoContestó;


    return (
      <Card style={[styles.card, noContesto && styles.cardNoContesto]}>
        <Card.Content>
          <Surface elevation={0} style={styles.header}>
            <Surface elevation={0} style={styles.clienteInfo}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name="account" size={24} color={theme.colors.primary} />
              </View>
              <Surface elevation={0} style={styles.clienteTexto}>
                <Text variant="titleMedium" style={styles.nombre}>{item.clienteNombre}</Text>
                {item.clienteTelefono && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    📞 {item.clienteTelefono}
                  </Text>
                )}
              </Surface>
            </Surface>

            <View style={styles.chips}>
              {noContesto && (
                <Chip
                  style={[styles.chipNoContesto, { backgroundColor: theme.colors.errorContainer }]}
                  textStyle={{ color: theme.colors.error, fontSize: 10 }}
                >
                  No contestó
                </Chip>
              )}
              <Chip
                style={{ backgroundColor: urgency.bg }}
                textStyle={{ color: urgency.text, fontSize: 11 }}
              >
                {diasVencido}d vencido
              </Chip>
            </View>
          </Surface>

          <Surface elevation={0} style={styles.infoRow}>
            <Surface elevation={0} style={styles.infoItem}>
              <MaterialCommunityIcons name="content-cut" size={14} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                {item.servicioNombre} · cada {item.intervaloDias} días
              </Text>
            </Surface>
            <Surface elevation={0} style={styles.infoItem}>
              <MaterialCommunityIcons name="calendar" size={14} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                Generado: {formatDate(item.fechaCreacion)}
              </Text>
            </Surface>
          </Surface>

          {/* Acciones de contacto */}
          {item.clienteTelefono && (
            <Surface elevation={0} style={styles.actionsRow}>
              <Button
                mode="outlined"
                compact
                icon="phone"
                onPress={() => handleLlamar(item.clienteTelefono!)}
                style={styles.actionButton}
              >
                Llamar
              </Button>
              <Button
                mode="outlined"
                compact
                icon="whatsapp"
                onPress={() => handleWhatsApp(item.clienteTelefono!, item.clienteNombre, item.servicioNombre)}
                style={[styles.actionButton, styles.whatsappButton]}
                textColor="#25D366"
              >
                WhatsApp
              </Button>
            </Surface>
          )}

          {/* Acciones de gestión */}
          <Surface elevation={0} style={styles.gestionRow}>
            <Button
              mode="contained"
              compact
              icon="check"
              onPress={() => handleCambiarEstado(item.id, EstadoRecordatorio.Contactado, 'Contactado manualmente')}
              style={styles.contactadoButton}
            >
              Contactado
            </Button>
            {!noContesto && (
              <Button
                mode="outlined"
                compact
                icon="phone-off"
                onPress={() => handleCambiarEstado(item.id, EstadoRecordatorio.NoContestó)}
                style={styles.noContesoButton}
                textColor={theme.colors.error}
              >
                No contestó
              </Button>
            )}
          </Surface>
        </Card.Content>
      </Card>
    );
  };

  if (loading) return <LoadingScreen message="Cargando recordatorios..." />;
  if (error && recordatorios.length === 0) return <ErrorMessage message={error} onRetry={fetchData} />;

  const urgentes = recordatorios.filter((r) => getDiasVencido(r.fechaCreacion, r.intervaloDias) > 14);
  const noContestaron = recordatorios.filter((r) => r.estado === EstadoRecordatorio.NoContestó);

  return (
    <Surface elevation={0} style={styles.container}>
      <Card style={styles.resumenCard}>
        <Card.Content style={styles.resumenContent}>
          <Surface elevation={0} style={styles.resumenItem}>
            <Text style={styles.resumenValue}>{recordatorios.length}</Text>
            <Text style={styles.resumenLabel}>Por contactar</Text>
          </Surface>
          <View style={styles.resumenDivider} />
          <Surface elevation={0} style={styles.resumenItem}>
            <Text style={[styles.resumenValue, { color: '#c62828' }]}>{urgentes.length}</Text>
            <Text style={styles.resumenLabel}>Urgentes</Text>
          </Surface>
          <View style={styles.resumenDivider} />
          <Surface elevation={0} style={styles.resumenItem}>
            <Text style={[styles.resumenValue, { color: theme.colors.error }]}>{noContestaron.length}</Text>
            <Text style={styles.resumenLabel}>No contestó</Text>
          </Surface>
        </Card.Content>
      </Card>

      <Searchbar
        placeholder="Buscar cliente..."
        value={searchQuery}
        onChangeText={handleSearch}
        style={styles.searchbar}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={searchQuery ? 'account-search-outline' : 'bell-check-outline'}
          title={searchQuery ? 'Sin resultados' : '¡Todo al día!'}
          subtitle={
            searchQuery
              ? 'Ningún cliente pendiente coincide con esa búsqueda.'
              : 'Aquí aparecerán los clientes que llevan tiempo sin volver, para que les escribas por WhatsApp.'
          }
        />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={Separador}
        />
      )}
    </Surface>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  resumenCard: { margin: 16, marginBottom: 8 },
  resumenContent: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  resumenItem: { alignItems: 'center' },
  resumenValue: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary },
  resumenLabel: { fontSize: 12, marginTop: 4, color: theme.colors.onSurfaceVariant },
  resumenDivider: { width: 1, backgroundColor: theme.colors.surfaceVariant },
  searchbar: { marginHorizontal: 16, marginBottom: 8 },
  listContent: { padding: 16, paddingTop: 8 },
  card: { marginBottom: 4 },
  cardNoContesto: { borderLeftWidth: 3, borderLeftColor: theme.colors.error },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  clienteInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  clienteTexto: { flex: 1 },
  nombre: { fontWeight: 'bold' },
  chips: { gap: 4, alignItems: 'flex-end' },
  chipNoContesto: { marginBottom: 2 },
  infoRow: { gap: 4, marginBottom: 10 },
  infoItem: { flexDirection: 'row', alignItems: 'center' },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  gestionRow: { flexDirection: 'row', gap: 8 },
  actionButton: { borderColor: theme.colors.surfaceVariant },
  whatsappButton: { borderColor: '#25D366' },
  contactadoButton: { flex: 1 },
  noContesoButton: { flex: 1, borderColor: theme.colors.error },
  separator: { height: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary, marginTop: 16 },
  emptySubtext: { color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' },
});