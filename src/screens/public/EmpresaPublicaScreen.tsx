import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, Chip, Snackbar, Text, useTheme } from 'react-native-paper';
import { EmpresaPublica, getEmpresaPublica } from '../../api/empresasPublicas';
import { enlaceMapa, enlaceRed } from '../../utils/enlacesPublicos';

export default function EmpresaPublicaScreen({ empresaId, onClose }: { empresaId: number; onClose: () => void }) {
  const theme = useTheme();
  const [empresa, setEmpresa] = useState<EmpresaPublica | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setEmpresa(null);
    getEmpresaPublica(empresaId, controller.signal)
      .then(result => { if (!controller.signal.aborted) setEmpresa(result); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [empresaId, retry]);

  async function abrir(url: string) {
    try { await Linking.openURL(url); }
    catch { setMessage('No pudimos abrir el enlace en este dispositivo.'); }
  }

  const p = empresa?.perfil;
  const telefono = p?.telefonoPublico?.replace(/[^+\d]/g, '');
  return <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.top}><Text variant="titleLarge">CuadreAPP</Text><Button onPress={onClose}>Abrir app</Button></View>
      {loading ? <View style={styles.state}><ActivityIndicator /><Text>Cargando negocio…</Text></View>
        : error ? <View style={styles.state}><Text variant="titleLarge">No pudimos cargar el negocio</Text><Text>Comprueba tu conexión y vuelve a intentarlo.</Text><Button mode="contained" onPress={() => setRetry(n => n + 1)}>Reintentar</Button></View>
        : !empresa || !p ? <View style={styles.state}><Text variant="headlineSmall">Perfil no disponible</Text><Text>El negocio todavía no ha publicado su perfil o ha dejado de compartirlo.</Text></View>
        : <>
          <Card mode="contained" style={styles.card}>
            <Card.Content style={styles.hero}>
              <Avatar.Icon size={72} icon="storefront-outline" />
              <Chip style={styles.chip}>{p.categoria}</Chip>
              <Text variant="headlineLarge" accessibilityRole="header">{p.nombre}</Text>
              {!!p.descripcion && <Text variant="bodyLarge">{p.descripcion}</Text>}
              {!!p.telefonoPublico && <Text selectable>{p.telefonoPublico}</Text>}
              {!!empresa.tokenReservas && <Button mode="contained" icon="calendar-check-outline" onPress={() => { window.location.hash = `/reservar/${empresa.tokenReservas}`; }}>Reservar cita</Button>}
              {!!telefono && <Button mode="contained" icon="phone" onPress={() => abrir(`tel:${telefono}`)}>Contactar con el negocio</Button>}
            </Card.Content>
          </Card>
          <View style={styles.social}>
            {(['instagram', 'facebook', 'tikTok'] as const).map(red => {
              const usuario = p[red];
              const url = usuario ? enlaceRed(red, usuario) : null;
              const label = { instagram: 'Instagram', facebook: 'Facebook', tikTok: 'TikTok' }[red];
              return url ? <Button key={red} mode="outlined" accessibilityLabel={`Abrir ${label} de ${p.nombre}`} onPress={() => abrir(url)}>{label}</Button> : null;
            })}
          </View>
          <Text variant="headlineSmall" style={styles.heading}>Dónde encontrarnos</Text>
          {empresa.sucursales.length === 0 && <Text>El negocio aún no ha publicado sus locales.</Text>}
          {empresa.sucursales.map(s => {
            const mapa = enlaceMapa(s.latitud, s.longitud);
            return <Card key={s.id} mode="outlined" style={styles.card}>
              <Card.Title title={s.nombre} titleNumberOfLines={3} left={props => <Avatar.Icon {...props} icon="map-marker-outline" />} />
              <Card.Content><Text selectable>{s.direccionPublica || 'Consulta la dirección con el negocio.'}</Text></Card.Content>
              {mapa && <Card.Actions><Button icon="map-outline" onPress={() => abrir(mapa)}>Ver ubicación</Button></Card.Actions>}
            </Card>;
          })}
        </>}
    </ScrollView>
    <Snackbar visible={!!message} onDismiss={() => setMessage('')}>{message}</Snackbar>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { width: '100%', maxWidth: 860, alignSelf: 'center', padding: 20, paddingBottom: 60 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  state: { paddingVertical: 64, gap: 20, alignItems: 'center' }, card: { marginBottom: 20 },
  hero: { gap: 18, paddingVertical: 24 }, chip: { alignSelf: 'flex-start' },
  social: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, heading: { marginTop: 32, marginBottom: 16 },
});
