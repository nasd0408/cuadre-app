import React, { useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { isAxiosError } from 'axios';
import { CatalogoReservas, reservasPublicasApi } from '../../api/reservasPublicas';
import { mensajeDeError } from '../../utils/alert';
import { fechaEnZona, nuevaSolicitudToken, validarContacto } from '../../utils/reservasPublicas';
import { enlaceMapa } from '../../utils/enlacesPublicos';

export default function ReservarPublicoScreen({ token, empleadoId: preseleccion }: { token: string; empleadoId?: number }) {
  const theme = useTheme();
  const [catalogo, setCatalogo] = useState<CatalogoReservas | null>(null);
  const [loading, setLoading] = useState(true);
  const [noDisponible, setNoDisponible] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [retry, setRetry] = useState(0);
  const [empleadoId, setEmpleadoId] = useState<number | null>(null);
  const [servicioId, setServicioId] = useState<number | null>(null);
  const [fecha, setFecha] = useState('');
  const [horarios, setHorarios] = useState<string[]>([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [errorHorarios, setErrorHorarios] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [inicio, setInicio] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendiente, setPendiente] = useState<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const solicitud = useRef<{ firma: string; token: string } | null>(null);
  const profesional = catalogo?.profesionales.find(p => p.id === empleadoId);
  const servicio = catalogo?.servicios.find(s => s.id === servicioId);
  const zona = profesional?.zonaHoraria ?? 'UTC';
  const hoy = fechaEnZona(new Date(), zona);
  const maxFecha = fechaEnZona(new Date(Date.now() + 89 * 86400000), zona);

  useEffect(() => {
    mounted.current = true;
    try { setPendiente(sessionStorage.getItem(`reserva-pendiente:${token}`)); } catch { /* Almacenamiento opcional. */ }
    return () => { mounted.current = false; };
  }, [token]);

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true); setErrorCarga(''); setNoDisponible(false);
    reservasPublicasApi.catalogo(token, abort.signal).then(result => {
      if (abort.signal.aborted) return;
      if (preseleccion && !result.profesionales.some(p => p.id === preseleccion)) { setNoDisponible(true); return; }
      setCatalogo(result);
      const elegido = result.profesionales.find(p => p.id === preseleccion) ?? result.profesionales[0];
      setEmpleadoId(elegido?.id ?? null);
      setServicioId(result.servicios[0]?.id ?? null);
      setFecha(fechaEnZona(new Date(), elegido?.zonaHoraria ?? 'UTC'));
    }).catch(err => {
      if (abort.signal.aborted) return;
      if (isAxiosError(err) && err.response?.status === 404) setNoDisponible(true);
      else setErrorCarga('No pudimos cargar el negocio. Comprueba tu conexión.');
    }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [token, preseleccion, retry]);

  useEffect(() => {
    const abort = new AbortController();
    setInicio(''); setHorarios([]); setErrorHorarios('');
    if (!empleadoId || !servicioId || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < hoy || fecha > maxFecha) {
      setCargandoHorarios(false); return () => abort.abort();
    }
    setCargandoHorarios(true);
    reservasPublicasApi.disponibilidad(token, empleadoId, servicioId, fecha, abort.signal).then(result => {
      if (!abort.signal.aborted) setHorarios(result.iniciosUtc);
    }).catch(err => {
      if (!abort.signal.aborted) setErrorHorarios(mensajeDeError(err, 'No pudimos consultar los horarios.'));
    }).finally(() => { if (!abort.signal.aborted) setCargandoHorarios(false); });
    return () => abort.abort();
  }, [token, empleadoId, servicioId, fecha, refresh, hoy, maxFecha]);

  async function reservar() {
    if (busy.current || !empleadoId || !servicioId || !inicio || cargandoHorarios) return;
    const invalid = validarContacto(nombre, telefono, email);
    setError(invalid ?? '');
    if (invalid) return;
    busy.current = true; setSaving(true);
    try {
      const datos = { empleadoId, servicioId, inicioUtc: inicio, nombre: nombre.trim(), telefono: telefono.trim(), email: email.trim() || null };
      const firma = JSON.stringify(datos);
      if (solicitud.current?.firma !== firma) solicitud.current = { firma, token: nuevaSolicitudToken() };
      const solicitudToken = solicitud.current.token;
      setPendiente(solicitudToken);
      try { sessionStorage.setItem(`reserva-pendiente:${token}`, solicitudToken); } catch { /* Almacenamiento opcional. */ }
      await reservasPublicasApi.crear(token, { ...datos, solicitudToken });
      if (mounted.current) window.location.hash = `/cita/${solicitudToken}`;
    } catch (err) {
      if (!mounted.current) return;
      setError(mensajeDeError(err, 'No pudimos confirmar la reserva. Puedes comprobar si se guardó o reintentar.'));
      if (isAxiosError(err) && err.response?.status === 409) setRefresh(n => n + 1);
    } finally { busy.current = false; if (mounted.current) setSaving(false); }
  }

  async function abrir(url: string) {
    try { await Linking.openURL(url); } catch { setError('No pudimos abrir el enlace.'); }
  }
  const mapa = catalogo ? enlaceMapa(catalogo.local.latitud, catalogo.local.longitud) : null;
  return <ScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content}>
    <Text variant="titleLarge">CuadreAPP</Text>
    {loading ? <View style={styles.state}><ActivityIndicator /><Text>Cargando agenda…</Text></View>
      : errorCarga ? <View style={styles.state}><Text accessibilityRole="alert">{errorCarga}</Text><Button onPress={() => setRetry(n => n + 1)}>Reintentar</Button></View>
      : noDisponible || !catalogo ? <View style={styles.state}><Text variant="headlineSmall">Reservas no disponibles</Text><Text>El negocio o el profesional ha dejado de aceptar citas desde este enlace. Contacta directamente con el negocio.</Text></View>
      : <>
        <Card mode="contained"><Card.Content style={styles.fields}>
          <Text variant="headlineLarge" accessibilityRole="header">{catalogo.nombre}</Text>
          {!!catalogo.descripcion && <Text>{catalogo.descripcion}</Text>}
          <Text variant="titleMedium">{catalogo.local.nombre}</Text>
          <Text>{catalogo.local.direccionPublica || 'Consulta la dirección con el negocio.'}</Text>
          {mapa && <Button icon="map-marker-outline" onPress={() => abrir(mapa)}>Ver ubicación</Button>}
        </Card.Content></Card>
        {catalogo.profesionales.length === 0 || catalogo.servicios.length === 0 ? <Text>El negocio todavía no tiene horarios o servicios disponibles para reservar.</Text> : <>
          <Text variant="headlineSmall">1. Elige profesional y servicio</Text>
          <View style={styles.choices}>{catalogo.profesionales.map(p => <Button key={p.id} mode={empleadoId === p.id ? 'contained' : 'outlined'} disabled={saving}
            accessibilityState={{ selected: empleadoId === p.id }} onPress={() => { setInicio(''); setEmpleadoId(p.id); }}>{p.nombre}</Button>)}</View>
          <View style={styles.fields}>{catalogo.servicios.map(s => <Button key={s.id} mode={servicioId === s.id ? 'contained-tonal' : 'outlined'} disabled={saving}
            accessibilityState={{ selected: servicioId === s.id }} onPress={() => { setInicio(''); setServicioId(s.id); }}>{s.nombre} · {s.duracionMinutos} min · {s.precio.toFixed(2)}</Button>)}</View>
          <Text variant="headlineSmall">2. Elige día y hora</Text>
          <Text>Horarios del negocio ({zona}).</Text>
          <input aria-label="Día de la cita" type="date" value={fecha} min={hoy} max={maxFecha} disabled={saving}
            onChange={e => { setInicio(''); setFecha(e.target.value); }} style={{ width: '100%', boxSizing: 'border-box', padding: 14, borderRadius: 8,
              fontSize: 18, background: theme.colors.surface, color: theme.colors.onSurface, border: `1px solid ${theme.colors.outline}`, colorScheme: theme.dark ? 'dark' : 'light' }} />
          {cargandoHorarios ? <ActivityIndicator /> : errorHorarios ? <View><Text accessibilityRole="alert">{errorHorarios}</Text><Button onPress={() => setRefresh(n => n + 1)}>Reintentar horarios</Button></View>
            : horarios.length === 0 ? <Text>No quedan horarios para ese día. Prueba otra fecha o profesional.</Text>
              : <View style={styles.choices}>{horarios.map(hora => <Button key={hora} mode={inicio === hora ? 'contained' : 'outlined'} disabled={saving}
                accessibilityState={{ selected: inicio === hora }} onPress={() => setInicio(hora)}>
                {new Intl.DateTimeFormat('es', { timeZone: zona, hour: '2-digit', minute: '2-digit' }).format(new Date(hora))}</Button>)}</View>}
          <Text variant="headlineSmall">3. Tus datos de contacto</Text>
          <TextInput mode="outlined" label="Nombre *" accessibilityLabel="Nombre *" value={nombre} onChangeText={setNombre} disabled={saving} maxLength={150} autoComplete="name" />
          <TextInput mode="outlined" label="Teléfono con prefijo de país *" accessibilityLabel="Teléfono con prefijo de país *" value={telefono} onChangeText={setTelefono} disabled={saving} maxLength={30} keyboardType="phone-pad" autoComplete="tel" />
          <TextInput mode="outlined" label="Correo electrónico (opcional)" accessibilityLabel="Correo electrónico (opcional)" value={email} onChangeText={setEmail} disabled={saving} maxLength={254} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Text>El negocio usará tus datos para gestionar esta cita. No necesitas una cuenta.</Text>
          {inicio && servicio && <Card mode="outlined"><Card.Content style={styles.fields}>
            <Text variant="titleMedium">Revisa tu cita</Text><Text>{profesional?.nombre} · {servicio.nombre}</Text>
            <Text>{new Intl.DateTimeFormat('es', { timeZone: zona, dateStyle: 'full', timeStyle: 'short' }).format(new Date(inicio))}</Text>
            <Text>{catalogo.local.nombre} · {servicio.duracionMinutos} minutos · {servicio.precio.toFixed(2)}</Text>
          </Card.Content></Card>}
          {!!error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
          <Button mode="contained" icon="calendar-check-outline" loading={saving} disabled={saving || !inicio || cargandoHorarios || !!errorHorarios} onPress={reservar}>Reservar cita</Button>
        </>}
        {!!catalogo.telefono && <Button icon="phone" onPress={() => abrir(`tel:${catalogo.telefono!.replace(/[^+\d]/g, '')}`)}>Contactar con el negocio</Button>}
      </>}
    {pendiente && <Button onPress={() => { window.location.hash = `/cita/${pendiente}`; }}>Comprobar mi última reserva</Button>}
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 60, gap: 20 },
  state: { paddingVertical: 50, gap: 20, alignItems: 'center' }, fields: { gap: 12 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
