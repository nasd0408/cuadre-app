import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  Button,
  Divider,
  Chip,
  Dialog,
  Portal,
  TextInput,
  Snackbar,
  ProgressBar,
  useTheme,
  Surface,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  pagosApi,
  PagoNomina,
  ResumenGeneralNominas,
  ResumenNominaEmpleado,
} from '../../api/pagos';
import { LoadingScreen, ErrorMessage } from '../../components';
import EmptyState from '../../components/EmptyState';
import { useConfirmDialog } from '../../components/ConfirmDialog';
import { mensajeDeError } from '../../utils/alert';

import { analytics } from '../../analytics';
export default function NominasScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const theme = useTheme() as any;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [resumen, setResumen] = useState<ResumenGeneralNominas | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentPayroll, setPaymentPayroll] = useState<PagoNomina | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const { showAlert } = useConfirmDialog();
  const fetchResumen = useCallback(async () => {
    try {
      setError('');
      const data = await pagosApi.getResumen();
      setResumen(data);
    } catch (err) {
      setError('Error al cargar nóminas');
      analytics.captureError(err, { origen: 'NominaScreen' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchResumen();
  }, [fetchResumen]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchResumen();
    });
    return unsubscribe;
  }, [navigation, fetchResumen]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchResumen();
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Sin registro';
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
  };

  const handleGenerarNomina = (empleado: ResumenNominaEmpleado) => {
    showAlert(
      'Preparar nómina',
      `Se agruparán ${empleado.citasPendientes} servicios cerrados por ${formatCurrency(empleado.comisionPendiente)} para ${empleado.empleadoNombre}.\n\nEsto todavía no registra el pago.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Preparar',
          onPress: async () => {
            setActionLoading(empleado.empleadoId);
            try {
              await pagosApi.generarNomina(empleado.empleadoId);
              setSuccess('Nómina preparada. Ya puedes registrar el pago.');
              fetchResumen();
            } catch (err: unknown) {
              setError(mensajeDeError(err, 'Error al generar nómina'));
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const openPayment = (nomina: PagoNomina) => {
    setPaymentPayroll(nomina);
    setPaymentAmount(nomina.montoPendiente.toFixed(2));
  };

  const handleRegisterPayment = async () => {
    if (!paymentPayroll) return;

    const amount = Number(paymentAmount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Ingresa un monto válido');
      return;
    }
    if (amount > paymentPayroll.montoPendiente) {
      setError(`El pago máximo es ${formatCurrency(paymentPayroll.montoPendiente)}`);
      return;
    }

    setActionLoading(paymentPayroll.id);
    try {
      await pagosApi.abonar(paymentPayroll.id, amount);
      setSuccess(
        amount === paymentPayroll.montoPendiente
          ? 'Nómina pagada completamente'
          : 'Abono registrado correctamente',
      );
      setPaymentPayroll(null);
      setPaymentAmount('');
      fetchResumen();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al registrar pago'));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <LoadingScreen message="Cargando nóminas..." />;
  }

  if (error && !resumen) {
    return <ErrorMessage message={error} onRetry={fetchResumen} />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Resumen General */}
      <Surface elevation={0} style={styles.resumenCard}>
        <View style={styles.resumenContent}>
          <Text style={styles.resumenEyebrow}>SALDO DEL EQUIPO</Text>
          <Text style={styles.resumenLabel}>Pendiente por pagar</Text>
          <Text style={styles.resumenValue}>
            {formatCurrency(resumen?.totalPendientePagar || 0)}
          </Text>
          <Text style={styles.resumenSubtext}>
            {resumen?.empleadosConPendientes || 0} empleado(s) con pendientes
          </Text>
        </View>
      </Surface>

      <Surface elevation={0} style={styles.flowCard}>
        <Text style={styles.flowEyebrow}>DEL SERVICIO AL PAGO</Text>
        <Text style={styles.flowHeading}>Tres pasos, tú controlas el momento</Text>
        <View style={styles.flowStep}>
          <MaterialCommunityIcons name="content-cut" size={20} color={theme.colors.secondary} />
          <View style={styles.flowCopy}>
            <Text style={styles.flowTitle}>1. Se acumula la comisión</Text>
            <Text style={styles.flowText}>Cada servicio cerrado suma según el porcentaje del empleado.</Text>
          </View>
        </View>
        <View style={styles.flowStep}>
          <MaterialCommunityIcons name="file-document-check-outline" size={20} color={theme.colors.warn} />
          <View style={styles.flowCopy}>
            <Text style={styles.flowTitle}>2. Preparas la nómina</Text>
            <Text style={styles.flowText}>El monto queda congelado y listo para pagar.</Text>
          </View>
        </View>
        <View style={styles.flowStep}>
          <MaterialCommunityIcons name="cash-check" size={20} color={theme.colors.cuarto} />
          <View style={styles.flowCopy}>
            <Text style={styles.flowTitle}>3. Registras el pago</Text>
            <Text style={styles.flowText}>Puedes pagar todo o guardar un abono parcial.</Text>
          </View>
        </View>
      </Surface>

      {/* Lista de empleados */}
      {resumen?.empleados.length === 0 ? (
        <EmptyState
          icon="check-circle-outline"
          title="¡Todo al día!"
          subtitle="No hay comisiones pendientes de pagar. Aparecerán aquí a medida que tu equipo cierre servicios."
        />
      ) : (
        resumen?.empleados.map((empleado) => (
          <Card key={empleado.empleadoId} style={styles.empleadoCard}>
            <Card.Content>
              {/* Header del empleado */}
              <Surface elevation={0} style={styles.empleadoHeader}>
                <Surface elevation={0} style={styles.empleadoInfo}>
                  <Text style={styles.empleadoNombre}>{empleado.empleadoNombre}</Text>
                  <Text style={styles.empleadoComision}>
                    {empleado.porcentajeComision}% comisión
                  </Text>
                </Surface>
                <Text style={styles.ultimoPago}>
                  Último pago: {formatDate(empleado.ultimoPago)}
                </Text>
              </Surface>

              <Divider style={styles.divider} />

              {/* Comisiones sin procesar */}
              {empleado.citasPendientes > 0 && (
                <Surface elevation={0} style={styles.seccion}>
                  <Surface elevation={0} style={styles.seccionHeader}>
                    <Surface elevation={0}>
                      <Text style={styles.seccionTitulo}>Comisiones sin procesar</Text>
                      <Text style={styles.seccionSubtitulo}>
                        {empleado.citasPendientes} citas cerradas
                      </Text>
                    </Surface>
                    <Text style={styles.seccionMonto}>
                      {formatCurrency(empleado.comisionPendiente)}
                    </Text>
                  </Surface>
                  <Button
                    mode="contained"
                    onPress={() => handleGenerarNomina(empleado)}
                    loading={actionLoading === empleado.empleadoId}
                    disabled={actionLoading !== null}
                    style={styles.generarButton}
                    icon="file-document-outline"
                    textColor={theme.colors.onWarnContainer}
                  >
                    Preparar nómina
                  </Button>
                </Surface>
              )}

              {/* Nóminas pendientes de pago */}
              {empleado.nominasPendientes.length > 0 && (
                <Surface elevation={0} style={styles.seccion}>
                  <Text style={styles.seccionTitulo}>Nóminas por pagar</Text>
                  {empleado.nominasPendientes.map((nomina) => (
                    <Surface elevation={0} key={nomina.id} style={styles.nominaItem}>
                      <Surface elevation={0} style={styles.nominaInfo}>
                        <Surface elevation={0} style={styles.nominaHeader}>
                          <Text style={styles.nominaFecha}>
                            Nómina del {formatDate(nomina.fechaCorte)}
                          </Text>
                          <Chip
                        
                            mode="flat"
                            textStyle={{ color: nomina.estado === 1 ? theme.colors.onWarnContainer : theme.colors.onErrorContainer }}
                            style={[
                              styles.estadoChip,
                              {
                                backgroundColor:
                                  nomina.estado === 1 ? theme.colors.warnContainer : theme.colors.errorContainer,
                              },
                            ]}
                          >
                            {nomina.estadoNombre}
                          </Chip>
                        </Surface>
                        <Surface elevation={0} style={styles.nominaMontos}>
                          <Text style={styles.nominaTotal}>
                            Total: {formatCurrency(nomina.montoTotal)}
                          </Text>
                          {nomina.montoPagado > 0 && (
                            <Text style={styles.nominaPagado}>
                              Pagado: {formatCurrency(nomina.montoPagado)}
                            </Text>
                          )}
                          <Text style={styles.nominaPendiente}>
                            Pendiente: {formatCurrency(nomina.montoPendiente)}
                          </Text>
                          <ProgressBar
                            progress={nomina.montoTotal > 0 ? nomina.montoPagado / nomina.montoTotal : 0}
                            color={theme.colors.primary}
                            style={styles.paymentProgress}
                          />
                        </Surface>
                      </Surface>
                      <Button
                        mode="contained"
                        onPress={() => openPayment(nomina)}
                        loading={actionLoading === nomina.id}
                        disabled={actionLoading !== null}
                        style={styles.pagarButton}
                        compact
                      >
                        Registrar abono
                      </Button>
                    </Surface>
                  ))}
                </Surface>
              )}
            </Card.Content>
          </Card>
        ))
      )}

      <View style={styles.bottomPadding} />

      <Portal>
        <Dialog
          visible={!!paymentPayroll}
          onDismiss={() => {
            if (actionLoading === null) setPaymentPayroll(null);
          }}
          style={styles.paymentDialog}
        >
          <Dialog.Title>Registrar pago</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.paymentEmployee}>
              {paymentPayroll?.empleadoNombre}
            </Text>
            <Text style={styles.paymentPending}>
              Pendiente: {formatCurrency(paymentPayroll?.montoPendiente ?? 0)}
            </Text>
            <Text style={styles.paymentHelp}>
              Puedes registrar una parte ahora; el resto seguirá pendiente.
            </Text>
            <TextInput
              mode="outlined"
              label="Monto pagado"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="decimal-pad"
              left={<TextInput.Affix text="$" />}
              autoFocus
              style={styles.paymentInput}
            />
            <Button
              mode="text"
              compact
              onPress={() => setPaymentAmount((paymentPayroll?.montoPendiente ?? 0).toFixed(2))}
              style={styles.fullAmountButton}
            >
              Usar el saldo completo
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setPaymentPayroll(null)}
              disabled={actionLoading !== null}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleRegisterPayment}
              loading={actionLoading === paymentPayroll?.id}
              disabled={actionLoading !== null}
            >
              {paymentPayroll && Number(paymentAmount.replace(',', '.')) === paymentPayroll.montoPendiente
                ? 'Pagar completa'
                : 'Registrar abono'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={3000}>
        {error}
      </Snackbar>

      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess('')}
        duration={3000}
        style={styles.successSnackbar}
      >
        {success}
      </Snackbar>
    </ScrollView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({  
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  resumenCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: 24,
  },
  resumenContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  resumenLabel: {
    color: theme.colors.onPrimaryContainer,
    fontSize: 14,
  },
  resumenEyebrow: {
    color: theme.colors.onPrimaryContainer,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    opacity: 0.75,
  },
  resumenValue: {
    color: theme.colors.onPrimaryContainer,
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 8,
  },
  resumenSubtext: {
    color: theme.colors.onPrimaryContainer,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  flowCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    gap: 12,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.outlineVariant,
  },
  flowEyebrow: { color: theme.colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  flowHeading: { color: theme.colors.onSurface, fontSize: 18, fontWeight: '900', marginBottom: 4 },
  flowStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  flowCopy: {
    flex: 1,
  },
  flowTitle: {
    color: theme.colors.onSurface,
    fontWeight: '700',
    fontSize: 13,
  },
  flowText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: theme.colors.onPrimaryContainer,
  },
  emptySubtext: {
    color: theme.colors.onBackground,
    marginTop: 4,
  },
  empleadoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
  },
  empleadoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  empleadoInfo: {},
  empleadoNombre: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  empleadoComision: {
    color: theme.colors.onBackground,
    marginTop: 2,
  },
  ultimoPago: {
    color: theme.colors.onSurface,
    fontSize: 12,
  },
  divider: {
    marginVertical: 12,
  },
  seccion: {
    marginBottom: 16,
  },
  seccionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seccionTitulo: {
    fontWeight: '600',
    color: theme.colors.onBackground,
  },
  seccionSubtitulo: {
    color: theme.colors.onSurface,
    fontSize: 12,
    marginTop: 2,
  },
  seccionMonto: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.cuarto,
  },
  generarButton: {
    backgroundColor: theme.colors.warnContainer,
  },
  nominaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  nominaInfo: {
    flex: 1,
    marginRight: 12,
  },
  nominaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nominaFecha: {
    fontWeight: '500',
  },
  estadoChip: {
  },
  nominaMontos: {
    marginTop: 4,
  },
  nominaTotal: {
    fontSize: 12,
    color: theme.colors.onSurface,
  },
  nominaPagado: {
    fontSize: 12,
    color: theme.colors.onPrimaryContainer,
  },
  nominaPendiente: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.error,
  },
  paymentProgress: { height: 5, borderRadius: 3, marginTop: 7 },
  pagarButton: {
    backgroundColor: theme.colors.cuarto,
  },
  bottomPadding: {
    height: 32,
  },
  successSnackbar: {
    backgroundColor: theme.colors.cuarto,
  },
  paymentDialog: {
    borderRadius: 8,
  },
  paymentEmployee: {
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  paymentPending: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  paymentHelp: { color: theme.colors.onSurfaceVariant, marginTop: 8, lineHeight: 19 },
  paymentInput: {
    marginTop: 16,
  },
  fullAmountButton: { alignSelf: 'flex-start', marginTop: 4 },
});
