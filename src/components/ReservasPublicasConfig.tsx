import React, { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Share, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, HelperText, Switch, Text } from 'react-native-paper';
import { ConfiguracionReservas, perfilPublicoApi, Sucursal } from '../api/perfilPublico';
import { enlaceReserva } from '../utils/reservasPublicas';
import { mensajeDeError } from '../utils/alert';

export default function ReservasPublicasConfig({ publicado, sucursales, disabled = false }: { publicado: boolean; sucursales: Sucursal[]; disabled?: boolean }) {
  const [config, setConfig] = useState<ConfiguracionReservas | null>(null);
  const [activas, setActivas] = useState(false);
  const [sucursalId, setSucursalId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    perfilPublicoApi.getReservas().then(result => {
      if (!active) return;
      setConfig(result); setActivas(result.activas); setSucursalId(result.sucursalId);
    }).catch(err => { if (active) setError(mensajeDeError(err, 'No pudimos cargar la configuración de reservas.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [publicado, retry]);
  async function guardar() {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError(''); setMensaje('');
    try {
      const result = await perfilPublicoApi.saveReservas(activas, sucursalId);
      if (!mounted.current) return;
      setConfig(result); setActivas(result.activas); setSucursalId(result.sucursalId);
      setMensaje(result.activas ? 'Ya puedes compartir los enlaces para reservar.' : 'Reservas públicas desactivadas. Las citas existentes se mantienen.');
    } catch (err) { if (mounted.current) setError(mensajeDeError(err, 'No pudimos guardar la configuración.')); }
    finally { busy.current = false; if (mounted.current) setSaving(false); }
  }
  const webUrl = process.env.EXPO_PUBLIC_WEB_URL || (Platform.OS === 'web' ? window.location.href : undefined);
  const url = (empleadoId?: number) => config?.token ? enlaceReserva(config.token, empleadoId, webUrl, process.env.EXPO_PUBLIC_API_URL) : null;
  async function compartir(link: string) {
    try {
      if (Platform.OS === 'web') { await navigator.clipboard.writeText(link); setMensaje('Enlace copiado.'); }
      else await Share.share({ message: `Reserva tu cita: ${link}` });
    } catch { setMensaje('Selecciona y copia el enlace que aparece en pantalla.'); }
  }
  async function abrir(link: string) {
    try { await Linking.openURL(link); } catch { setMensaje('No pudimos abrir el enlace.'); }
  }
  const bloqueado = disabled || saving;
  const locales = sucursales.filter(s => s.publicada);
  const enlaceActivo = config?.activas && publicado && locales.some(s => s.id === config.sucursalId);
  function enlaces(label: string, link: string | null) {
    return link ? <View key={label} style={styles.link}>
      <Text variant="titleMedium">{label}</Text><Text selectable style={{ fontSize: 12 }}>{link}</Text>
      <View style={styles.row}><Button disabled={bloqueado} icon="open-in-new" onPress={() => abrir(link)}>Abrir</Button>
        <Button disabled={bloqueado} icon={Platform.OS === 'web' ? 'content-copy' : 'share-variant'} onPress={() => compartir(link)}>{Platform.OS === 'web' ? 'Copiar enlace' : 'Compartir enlace'}</Button></View>
    </View> : null;
  }
  return <Card mode="outlined" style={styles.card}>
    <Card.Title title="Reservas sin cuenta" subtitle="Un enlace para poner en Instagram, Google Maps o WhatsApp" />
    <Card.Content style={styles.fields}>
      {loading ? <ActivityIndicator /> : <>
        {!config ? <Button onPress={() => setRetry(n => n + 1)}>Reintentar configuración</Button> : <>
          <Text>Los clientes eligen un servicio y un horario libre, y reservan con nombre y teléfono. Aparecerán en tu agenda.</Text>
          {!publicado && <Text>Publica y guarda el perfil del negocio para activar las reservas.</Text>}
          <View style={styles.row}><Text style={{ flex: 1 }}>Aceptar reservas públicas</Text>
            <Switch accessibilityLabel="Aceptar reservas públicas" value={activas} disabled={bloqueado || (!publicado && !activas)} onValueChange={setActivas} /></View>
          <Text variant="titleMedium">Local donde se atenderán las citas</Text>
          {locales.length === 0 && <Text>Añade y publica un local primero. La ubicación GPS es opcional.</Text>}
          <View style={styles.row}>{locales.map(s => <Button key={s.id} mode={sucursalId === s.id ? 'contained-tonal' : 'outlined'} disabled={bloqueado}
            accessibilityState={{ selected: sucursalId === s.id }} onPress={() => setSucursalId(s.id)}>{s.nombre}</Button>)}</View>
          <Text>Estarán disponibles los profesionales activos que tengan un horario semanal configurado.</Text>
          {config.profesionales.length === 0 && <Text>Configura el horario de un empleado en Administración → Empleados.</Text>}
          <Button mode="contained" loading={saving} disabled={bloqueado || (activas && (!publicado || !sucursalId || !locales.some(s => s.id === sucursalId) || config.profesionales.length === 0))} onPress={guardar}>Guardar reservas</Button>
          {enlaceActivo && <>
            {enlaces('Enlace del negocio', url())}
            {config.profesionales.map(p => enlaces(`Enlace de ${p.nombre}`, url(p.id)))}
          </>}
        </>}
      </>}
      {!!error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
      {!!mensaje && <HelperText type="info" accessibilityRole="alert">{mensaje}</HelperText>}
    </Card.Content>
  </Card>;
}
const styles = StyleSheet.create({ card: { marginBottom: 20 }, fields: { gap: 16 }, row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }, link: { gap: 10 } });
