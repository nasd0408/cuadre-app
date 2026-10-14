import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, SegmentedButtons, Divider, List, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { reportesApi, ReporteHistorial, FiltrosHistorial } from '../../api/reportes';
import { LoadingScreen, ErrorMessage, SimpleChart, PercentageChange } from '../../components';

import { analytics } from '../../analytics';
type Agrupacion = 'dia' | 'semana' | 'mes';

export default function HistorialIngresosScreen() {
  const [reporte, setReporte] = useState<ReporteHistorial | null>(null);
  const [agrupacion, setAgrupacion] = useState<Agrupacion>('dia');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const getFechas = (agr: Agrupacion): { desde: string; hasta: string } => {
    const hoy = new Date();
    let desde: Date;

    switch (agr) {
      case 'semana':
        desde = new Date(hoy);
        desde.setDate(desde.getDate() - 28);
        break;
      case 'mes':
        desde = new Date(hoy);
        desde.setMonth(desde.getMonth() - 6);
        break;
      default:
        desde = new Date(hoy);
        desde.setDate(desde.getDate() - 14);
    }

    return {
      desde: desde.toISOString().split('T')[0],
      hasta: hoy.toISOString().split('T')[0],
    };
  };

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const { desde, hasta } = getFechas(agrupacion);
      const data = await reportesApi.getHistorial({
        fechaDesde: desde,
        fechaHasta: hasta,
        agrupacion,
      });
      setReporte(data);
    } catch (err) {
      setError('Error al cargar historial');
      analytics.captureError(err, { origen: 'HistorialIngresosScreen' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [agrupacion]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [agrupacion]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
  };

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${amount.toFixed(0)}`;
  };

  if (loading && !reporte) {
    return <LoadingScreen message="Cargando historial..." />;
  }

  if (error && !reporte) {
    return <ErrorMessage message={error} onRetry={fetchData} />;
  }

  const r = reporte!;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Selector de agrupación */}
      <Surface elevation={0} style={styles.filtrosContainer}>
        <SegmentedButtons
          value={agrupacion}
          onValueChange={(v) => setAgrupacion(v as Agrupacion)}
          buttons={[
            { value: 'dia', label: 'Días' },
            { value: 'semana', label: 'Semanas' },
            { value: 'mes', label: 'Meses' },
          ]}
        />
      </Surface>

      {/* ════════════════════════════════════════════
          Resumen principal (Bruto + Nóminas + Neto)
          ════════════════════════════════════════════ */}
      <Surface elevation={0} style={styles.resumenCard}>
        <View>
          {/* Ingresos Brutos */}
          <Surface elevation={0} style={styles.resumenHeader}>
            <Surface elevation={0}>
              <Text style={styles.resumenLabel}>Ingresos Brutos</Text>
              <Text style={styles.resumenValue}>{formatCurrency(r.ingresosTotales)}</Text>
            </Surface>
            <PercentageChange value={r.porcentajeCambio} label="vs anterior" />
          </Surface>

          <Divider style={styles.resumenDivider} />

          {/* Nóminas y Neto */}
          <Surface elevation={0} style={styles.netoRow}>
            <Surface elevation={0} style={styles.netoItem}>
              <Text style={styles.netoLabel}>Nóminas pagadas</Text>
              <Text style={styles.netoValueRed}>-{formatCurrency(r.totalNominas)}</Text>
            </Surface>
            <Surface elevation={0} style={[styles.netoItem, styles.netoItemRight]}>
              <Surface elevation={0} style={styles.netoHeaderRow}>
                <Text style={styles.netoLabel}>Ingreso Neto</Text>
                <PercentageChange value={r.porcentajeCambioNeto} label="" />
              </Surface>
              <Text style={styles.netoValueGreen}>{formatCurrency(r.ingresoNeto)}</Text>
            </Surface>
          </Surface>

          <Divider style={styles.resumenDivider} />

          {/* Stats rápidos */}
          <Surface elevation={0} style={styles.statsRow}>
            <Surface elevation={0} style={styles.statItem}>
              <Text style={styles.statValue}>{r.citasTotales}</Text>
              <Text style={styles.statLabel}>Citas</Text>
            </Surface>
            <Surface elevation={0} style={styles.statItem}>
              <Text style={styles.statValue}>{r.serviciosTotales}</Text>
              <Text style={styles.statLabel}>Servicios</Text>
            </Surface>
            <Surface elevation={0} style={styles.statItem}>
              <Text style={styles.statValue}>{formatCurrency(r.ticketPromedio)}</Text>
              <Text style={styles.statLabel}>Ticket Prom.</Text>
            </Surface>
          </Surface>
        </View>
      </Surface>

      {/* ════════════════════════════════════════════
          Gráfico: Ingresos vs Nóminas vs Neto
          ════════════════════════════════════════════ */}
      <Surface elevation={0} style={styles.trendsPanel}>
        <Text style={styles.sectionEyebrow}>EVOLUCIÓN</Text>
        <Text style={styles.sectionTitle}>Cómo se movió el negocio</Text>
        <View style={styles.chartBlock}>
          <Text style={styles.chartTitle}>Ingresos brutos</Text>
          <SimpleChart
            data={r.periodos.map((p) => ({ etiqueta: p.etiqueta, valor: p.ingresos }))}
            color="#27ae60"
            height={120}
            formatValue={formatCurrencyShort}
          />
        </View>
        <Divider style={styles.chartDivider} />
        <View style={styles.chartBlock}>
          <Text style={styles.chartTitle}>Nóminas pagadas</Text>
          <SimpleChart
            data={r.periodos.map((p) => ({ etiqueta: p.etiqueta, valor: p.nominas }))}
            color="#e74c3c"
            height={120}
            formatValue={formatCurrencyShort}
          />
        </View>
        <Divider style={styles.chartDivider} />
        <View style={styles.chartBlock}>
          <Text style={styles.chartTitle}>Ingreso neto</Text>
          <SimpleChart
            data={r.periodos.map((p) => ({ etiqueta: p.etiqueta, valor: p.neto }))}
            color="#2980b9"
            height={120}
            formatValue={formatCurrencyShort}
          />
        </View>
        <Divider style={styles.chartDivider} />
        <View style={styles.chartBlock}>
          <Text style={styles.chartTitle}>Servicios realizados</Text>
          <SimpleChart
            data={r.periodos.map((p) => ({ etiqueta: p.etiqueta, valor: p.servicios }))}
            color="#3498db"
            height={120}
          />
        </View>
      </Surface>

      {/* ════════════════════════════════════════════
          Desglose de Pagos por Empleado
          ════════════════════════════════════════════ */}
      {r.desglosePagos.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title="Nóminas por Empleado" titleVariant="titleMedium" />
          <Card.Content>
            {r.desglosePagos.map((pago, index) => (
              <React.Fragment key={pago.empleadoId}>
                {index > 0 && <Divider style={styles.listDivider} />}
                <List.Item
                  title={pago.empleadoNombre}
                  description={`${pago.cantidadAbonos} pago${pago.cantidadAbonos !== 1 ? 's' : ''}`}
                  left={() => (
                    <Surface elevation={0} style={styles.pagoIcon}>
                      <MaterialCommunityIcons name="cash-minus" size={24} color="#e74c3c" />
                    </Surface>
                  )}
                  right={() => (
                    <Text style={styles.pagoTotal}>-{formatCurrency(pago.totalPagado)}</Text>
                  )}
                />
              </React.Fragment>
            ))}
            <Divider style={styles.resumenDivider} />
            <Surface elevation={0} style={styles.totalNominasRow}>
              <Text style={styles.totalNominasLabel}>Total nóminas</Text>
              <Text style={styles.totalNominasValue}>-{formatCurrency(r.totalNominas)}</Text>
            </Surface>
          </Card.Content>
        </Card>
      )}

      {/* Clientela: los ingresos dicen cómo fue el período; esto dice si el
          próximo va a tener a quién atender. */}
      {r.clientela && r.clientela.atendidos > 0 && (
        <Card style={styles.card}>
          <Card.Title title="Tu clientela" titleVariant="titleMedium" />
          <Card.Content>
            <View style={styles.clientelaFila}>
              <View style={styles.clientelaItem}>
                <Text style={styles.clientelaValor}>{r.clientela.atendidos}</Text>
                <Text style={styles.clientelaLabel}>Atendidos</Text>
              </View>
              <View style={styles.clientelaItem}>
                <Text style={[styles.clientelaValor, { color: '#27ae60' }]}>
                  {r.clientela.nuevos}
                </Text>
                <Text style={styles.clientelaLabel}>Nuevos</Text>
              </View>
              <View style={styles.clientelaItem}>
                <Text style={styles.clientelaValor}>{r.clientela.recurrentes}</Text>
                <Text style={styles.clientelaLabel}>Repiten</Text>
              </View>
            </View>

            <Divider style={styles.listDivider} />

            <List.Item
              title={`${r.clientela.porcentajeRecurrencia}% de fidelidad`}
              description="Parte de los atendidos que ya te conocía"
              left={(props) => <List.Icon {...props} icon="heart-outline" />}
            />

            {r.clientela.enRiesgo > 0 && (
              <List.Item
                title={`${r.clientela.enRiesgo} ${
                  r.clientela.enRiesgo === 1 ? 'cliente se está perdiendo' : 'clientes se están perdiendo'
                }`}
                description={`Sin volver hace más de ${r.clientela.diasParaRiesgo} días. Escríbeles desde Recordatorios.`}
                titleStyle={{ color: '#c0392b' }}
                left={(props) => <List.Icon {...props} icon="account-clock-outline" color="#c0392b" />}
              />
            )}
          </Card.Content>
        </Card>
      )}

      {/* Top Empleados */}
      {r.topEmpleados.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title="Top Empleados" titleVariant="titleMedium" />
          <Card.Content>
            {r.topEmpleados.map((emp, index) => (
              <React.Fragment key={emp.barberoId}>
                {index > 0 && <Divider style={styles.listDivider} />}
                <List.Item
                  title={emp.nombre}
                  description={`${emp.serviciosCount} servicios`}
                  left={() => (
                    <Surface elevation={0}
                      style={[
                        styles.rankBadge,
                        { backgroundColor: index < 3 ? getTopColor(index) : '#bdc3c7' },
                      ]}
                    >
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </Surface>
                  )}
                  right={() => (
                    <Text style={styles.empTotal}>{formatCurrency(emp.totalGenerado)}</Text>
                  )}
                />
              </React.Fragment>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Top Servicios */}
      {r.topServicios.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title="Top Servicios" titleVariant="titleMedium" />
          <Card.Content>
            {r.topServicios.map((serv, index) => (
              <React.Fragment key={serv.servicioId}>
                {index > 0 && <Divider style={styles.listDivider} />}
                <List.Item
                  title={serv.nombre}
                  description={`${serv.cantidad} realizados`}
                  left={() => (
                    <Surface elevation={0}
                      style={[
                        styles.rankBadge,
                        { backgroundColor: index < 3 ? getTopColor(index) : '#bdc3c7' },
                      ]}
                    >
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </Surface>
                  )}
                  right={() => (
                    <Text style={styles.servIngresos}>{formatCurrency(serv.ingresos)}</Text>
                  )}
                />
              </React.Fragment>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Detalle por período */}
      <Card style={styles.card}>
        <Card.Title title="Detalle por Período" titleVariant="titleMedium" />
        <Card.Content>
          {r.periodos.map((periodo, index) => (
            <React.Fragment key={index}>
              {index > 0 && <Divider style={styles.listDivider} />}
              <Surface elevation={0} style={styles.periodoItem}>
                <Surface elevation={0} style={styles.periodoLeft}>
                  <Text style={styles.periodoEtiqueta}>{periodo.etiqueta}</Text>
                  <Text style={styles.periodoInfo}>
                    {periodo.citas} citas • {periodo.servicios} servicios
                  </Text>
                </Surface>
                <Surface elevation={0} style={styles.periodoRight}>
                  <Text style={styles.periodoIngresos}>{formatCurrency(periodo.ingresos)}</Text>
                  {periodo.nominas > 0 && (
                    <Text style={styles.periodoNominas}>-{formatCurrency(periodo.nominas)}</Text>
                  )}
                  <Text style={styles.periodoNeto}>Neto: {formatCurrency(periodo.neto)}</Text>
                </Surface>
              </Surface>
            </React.Fragment>
          ))}
        </Card.Content>
      </Card>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const getTopColor = (index: number) => {
  const colors = ['#f1c40f', '#95a5a6', '#cd6133'];
  return colors[index] || '#bdc3c7';
};

const makeStyles = (theme: any) => StyleSheet.create({  
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  filtrosContainer: {
    padding: 16,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  resumenCard: {
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
  },
  resumenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resumenLabel: {
    color: theme.colors.onBackground,
    fontSize: 14,
  },
  resumenValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.cuarto,
    marginTop: 4,
  },
  resumenDivider: {
    marginVertical: 16,
  },
  // ── Nóminas y Neto ──
  netoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  netoItem: {
    flex: 1,
  },
  netoItemRight: {
    alignItems: 'flex-end',
  },
  netoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  netoLabel: {
    color: theme.colors.onBackground,
    fontSize: 13,
  },
  netoValueRed: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginTop: 2,
  },
  netoValueGreen: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.cuarto,
    marginTop: 2,
  },
  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: theme.colors.onBackground,
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
  },
  trendsPanel: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
  },
  sectionEyebrow: { color: theme.colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  sectionTitle: { color: theme.colors.onSurface, fontSize: 21, fontWeight: '900', marginTop: 3, marginBottom: 6 },
  chartBlock: { paddingTop: 12 },
  chartTitle: { color: theme.colors.onSurfaceVariant, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  chartDivider: { marginTop: 18 },
  listDivider: {
    marginVertical: 4,
  },
  // ── Clientela ──
  clientelaFila: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  clientelaItem: {
    alignItems: 'center',
    flex: 1,
  },
  clientelaValor: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  clientelaLabel: {
    fontSize: 12,
    marginTop: 2,
    color: theme.colors.onSurfaceVariant,
  },
  // ── Pagos por empleado ──
  pagoIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pagoTotal: {
    fontWeight: 'bold',
    color: theme.colors.error,
    alignSelf: 'center',
  },
  totalNominasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalNominasLabel: {
    fontWeight: '600',
    color: theme.colors.onBackground,
  },
  totalNominasValue: {
    fontWeight: 'bold',
    color: theme.colors.error,
  },
  // ── Rankings ──
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rankText: {
    color: theme.colors.onBackground,
    fontWeight: 'bold',
    fontSize: 12,
  },
  empTotal: {
    fontWeight: 'bold',
    color: theme.colors.cuarto,
    alignSelf: 'center',
  },
  servIngresos: {
    fontWeight: 'bold',
    color: theme.colors.cuarto,
    alignSelf: 'center',
  },
  // ── Detalle períodos ──
  periodoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  periodoLeft: {
    flex: 1,
  },
  periodoEtiqueta: {
    fontWeight: '600',
  },
  periodoInfo: {
    color: theme.colors.onBackground,
    fontSize: 12,
    marginTop: 2,
  },
  periodoRight: {
    alignItems: 'flex-end',
  },
  periodoIngresos: {
    fontWeight: 'bold',
    color: theme.colors.cuarto,
  },
  periodoNominas: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 1,
  },
  periodoNeto: {
    color: theme.colors.secondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  bottomPadding: {
    height: 32,
  },
});
