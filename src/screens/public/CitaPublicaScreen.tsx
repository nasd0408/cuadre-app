import React, { useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Dialog, HelperText, Portal, Text, useTheme } from 'react-native-paper';
import { isAxiosError } from 'axios';
import { ConfirmacionReserva, reservasPublicasApi } from '../../api/reservasPublicas';
import { fechaReserva } from '../../utils/reservasPublicas';
import { mensajeDeError } from '../../utils/alert';

export default function CitaPublicaScreen({ token }: { token: string }) {
  const theme = useTheme();
  const [cita, setCita] = useState<ConfirmacionReserva | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noDisponible, setNoDisponible] = useState(false);
  const [retry, setRetry] = useState(0);
  const [dialog, setDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true); setError(''); setNoDisponible(false);
    reservasPublicasApi.cita(token, abort.signal).then(result => { if (!abort.signal.aborted) setCita(result); })
      .catch(err => { if (!abort.signal.aborted) {
        if (isAxiosError(err) && err.response?.status === 404) setNoDisponible(true);
        else setError('No pudimos consultar tu cita. Comprueba tu conexión y reintenta.');
      } }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [token, retry]);
  async function cancelar() {
    if (busy.current) return;
    busy.current = true; setSaving(true); setMensaje(''); setDialog(false);
    try { const result = await reservasPublicasApi.cancelar(token); if (mounted.current) setCita(result); }
    catch (err) { if (mounted.current) { setMensaje(mensajeDeError(err, 'No pudimos cancelar la cita. Reintenta.')); setRetry(n => n + 1); } }
    finally { busy.current = false; if (mounted.current) setSaving(false); }
  }
  return <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content}>
    <Text variant="titleLarge">CuadreAPP</Text>
    {loading ? <View style={styles.state}><ActivityIndicator /><Text>Consultando tu cita…</Text></View>
      : error ? <View style={styles.state}><Text accessibilityRole="alert">{error}</Text><Button onPress={() => setRetry(n => n + 1)}>Reintentar</Button></View>
        : noDisponible || !cita ? <View style={styles.state}><Text variant="headlineSmall">No encontramos la reserva</Text><Text>Si acabas de reservar y hubo un problema de conexión, vuelve al formulario y reintenta con los mismos datos.</Text><Button onPress={() => window.history.back()}>Volver</Button></View>
          : <Card mode="contained"><Card.Content style={styles.fields}>
            <Text variant="headlineMedium" accessibilityRole="header">{cita.estado === 'Cancelada' ? 'Cita cancelada' : cita.estado === 'Pendiente' ? 'Tu cita está reservada' : 'Tu cita'}</Text>
            <Text variant="titleLarge">{cita.negocio}</Text><Text>{cita.nombreCliente}, esta es tu cita con {cita.profesional}.</Text>
            <Text variant="titleMedium">{fechaReserva(cita.inicioUtc, cita.zonaHoraria)}</Text><Text>Hora del negocio ({cita.zonaHoraria}).</Text>
            {cita.servicios.map((s, index) => <Text key={`${s.id}-${index}`}>{s.nombre} · {s.duracionMinutos} minutos · {s.precio.toFixed(2)}</Text>)}
            <Text>{cita.local}</Text>{!!cita.direccion && <Text selectable>{cita.direccion}</Text>}
            <Text>Estado: {({ Pendiente: 'Reservada', PagoPendiente: 'Atendida', Pagada: 'Pagada', Cerrada: 'Finalizada', Cancelada: 'Cancelada' } as Record<string, string>)[cita.estado] ?? cita.estado}</Text>
            <Text>Guarda este enlace privado para consultar o cancelar tu cita. Quien tenga el enlace puede gestionarla.</Text>
            <Text selectable style={styles.link}>{window.location.href}</Text>
            <Button icon="content-copy" onPress={async () => {
              try { await navigator.clipboard.writeText(window.location.href); setMensaje('Enlace copiado.'); }
              catch { setMensaje('Selecciona y copia el enlace que aparece arriba.'); }
            }}>Copiar enlace de mi cita</Button>
            {cita.puedeCancelar && <Button mode="outlined" loading={saving} disabled={saving} onPress={() => setDialog(true)}>Cancelar cita</Button>}
            {!!cita.telefonoNegocio && <Button icon="phone" onPress={async () => {
              try { await Linking.openURL(`tel:${cita.telefonoNegocio!.replace(/[^+\d]/g, '')}`); }
              catch { setMensaje('No pudimos abrir el teléfono.'); }
            }}>Contactar con el negocio</Button>}
          </Card.Content></Card>}
    {!!mensaje && <HelperText type="info" accessibilityRole="alert">{mensaje}</HelperText>}
    <Portal><Dialog visible={dialog} onDismiss={() => setDialog(false)}>
      <Dialog.Title>Cancelar tu cita</Dialog.Title><Dialog.Content><Text>Se liberará el horario para otra persona. Para volver a reservar tendrás que elegir un horario disponible.</Text></Dialog.Content>
      <Dialog.Actions><Button onPress={() => setDialog(false)}>Mantener cita</Button><Button onPress={cancelar}>Confirmar cancelación</Button></Dialog.Actions>
    </Dialog></Portal>
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 60, gap: 20 },
  state: { gap: 20, paddingVertical: 50 }, fields: { gap: 18, paddingVertical: 24 }, link: { fontSize: 12 },
});
