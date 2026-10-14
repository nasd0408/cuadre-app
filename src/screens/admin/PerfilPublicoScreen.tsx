import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, HelperText, List, Snackbar, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { perfilPublicoApi, PerfilPublico, Sucursal } from '../../api/perfilPublico';
import { useAuthStore } from '../../stores/authStore';
import { mensajeDeError } from '../../utils/alert';
import { parseCoordenadas, validarPerfil } from '../../utils/perfilPublico';
import { useConfirmDialog } from '../../components/ConfirmDialog';
import { enlaceEmpresa } from '../../utils/enlacesPublicos';
import ReservasPublicasConfig from '../../components/ReservasPublicasConfig';

const perfilVacio: PerfilPublico = {
  nombre: '', categoria: '', descripcion: null, telefonoPublico: null,
  instagram: null, facebook: null, tikTok: null, publicado: false,
};
const localVacio = { nombre: '', direccionPublica: '', latitud: '', longitud: '', publicada: false };
type LocalForm = typeof localVacio & { id?: number };

export default function PerfilPublicoScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { showAlert } = useConfirmDialog();
  const isAdmin = useAuthStore(s => s.isAdmin);
  const empresaId = useAuthStore(s => s.user?.empresaId);
  const urlPublica = empresaId ? enlaceEmpresa(empresaId,
    process.env.EXPO_PUBLIC_WEB_URL || (Platform.OS === 'web' ? window.location.href : undefined),
    process.env.EXPO_PUBLIC_API_URL) : null;
  const [perfil, setPerfil] = useState<PerfilPublico>(perfilVacio);
  const [guardado, setGuardado] = useState<PerfilPublico | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [local, setLocal] = useState<LocalForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [localError, setLocalError] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [message, setMessage] = useState('');

  const hayCambios = !loading && !loadError &&
    (JSON.stringify(perfil) !== JSON.stringify(guardado ?? perfilVacio) || local !== null);
  usePreventRemove(Boolean(hayCambios) || saving, ({ data }) => {
    if (saving) return;
    showAlert('Cambios sin guardar', 'Si sales ahora, perderás los cambios pendientes.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Salir', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const cargar = useCallback(async () => {
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true);
    setLoadError('');
    try {
      const [p, s] = await Promise.all([perfilPublicoApi.getPerfil(), perfilPublicoApi.getSucursales()]);
      setPerfil(p ?? perfilVacio);
      setGuardado(p);
      setSucursales(s);
    } catch (error) {
      setLoadError(mensajeDeError(error, 'No pudimos cargar el perfil y los locales.'));
    } finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { void cargar(); }, [cargar]);

  async function guardarPerfil() {
    if (busy.current) return;
    const error = validarPerfil(perfil);
    setFormError(error ?? '');
    if (error) return;
    busy.current = true;
    setSaving(true);
    try {
      const resultado = await perfilPublicoApi.savePerfil(perfil);
      setPerfil(resultado);
      setGuardado(resultado);
      setMessage(resultado.publicado ? 'Perfil público guardado.' : 'Perfil guardado como privado.');
    } catch (err) { setFormError(mensajeDeError(err, 'No pudimos guardar el perfil.')); }
    finally { busy.current = false; setSaving(false); }
  }

  async function guardarLocal() {
    if (!local || busy.current) return;
    setLocalError('');
    if (!local.nombre.trim()) { setLocalError('Escribe el nombre del local.'); return; }
    busy.current = true;
    setSaving(true);
    try {
      const coordenadas = parseCoordenadas(local.latitud, local.longitud);
      const resultado = await perfilPublicoApi.saveSucursal({
        nombre: local.nombre.trim(), direccionPublica: local.direccionPublica.trim() || null,
        publicada: local.publicada, ...coordenadas,
      }, local.id);
      setSucursales(prev => local.id === undefined
        ? [...prev, resultado] : prev.map(s => s.id === resultado.id ? resultado : s));
      setLocal(null);
      setMessage('Local guardado.');
    } catch (err) { setLocalError(mensajeDeError(err, 'No pudimos guardar el local.')); }
    finally { busy.current = false; setSaving(false); }
  }

  function editarLocal(s: Sucursal) {
    setLocalError('');
    setLocal({ ...s, direccionPublica: s.direccionPublica ?? '',
      latitud: s.latitud?.toString() ?? '', longitud: s.longitud?.toString() ?? '' });
  }

  const field = (key: keyof Omit<PerfilPublico, 'publicado'>, label: string, maxLength: number, multiline = false) => (
    <TextInput key={key} mode="outlined" label={label} value={perfil[key] ?? ''}
      onChangeText={value => setPerfil(p => ({ ...p, [key]: key === 'nombre' || key === 'categoria' ? value : value || null }))}
      maxLength={maxLength} multiline={multiline} disabled={saving}
      autoCapitalize={['instagram', 'facebook', 'tikTok'].includes(key) ? 'none' : 'sentences'}
      keyboardType={key === 'telefonoPublico' ? 'phone-pad' : 'default'} style={styles.input} />
  );

  if (!isAdmin) return <Text style={styles.center}>Solo los administradores pueden gestionar el perfil público.</Text>;
  if (loading) return <View style={styles.center}><ActivityIndicator /><Text>Cargando perfil y locales…</Text></View>;
  if (loadError) return <View style={styles.center}><Text accessibilityRole="alert">{loadError}</Text><Button onPress={cargar}>Reintentar</Button></View>;

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text variant="headlineSmall">Tu negocio, de cara al público</Text>
        <Text style={styles.intro}>Elige qué información podrán consultar tus clientes. Los cambios se publican al guardar.</Text>
        <Card mode="outlined" style={styles.card}>
          <Card.Title title="Perfil del negocio" subtitle={guardado?.publicado ? 'Estado actual: público' : 'Estado actual: privado'} />
          <Card.Content>
            {field('nombre', 'Nombre público *', 150)}
            {field('categoria', 'Categoría * (barbería, estética…)', 80)}
            {field('descripcion', 'Descripción', 2000, true)}
            {field('telefonoPublico', 'Teléfono público', 30)}
            <Text variant="titleMedium" style={styles.section}>Redes sociales</Text>
            <Text>Escribe el usuario, con o sin @. No pegues el enlace completo.</Text>
            {field('instagram', 'Instagram', 100)}
            {field('facebook', 'Facebook', 100)}
            {field('tikTok', 'TikTok', 100)}
            <View style={styles.toggle}>
              <View style={styles.flex}><Text variant="titleMedium">Publicar perfil</Text><Text>Si lo desactivas, también se ocultarán todos los locales.</Text></View>
              <Switch accessibilityLabel="Publicar perfil" value={perfil.publicado} disabled={saving} onValueChange={publicado => setPerfil(p => ({ ...p, publicado }))} />
            </View>
            {!!formError && <HelperText type="error" accessibilityRole="alert">{formError}</HelperText>}
            <Button mode="contained" onPress={guardarPerfil} loading={saving && !local} disabled={saving || local !== null}>Guardar perfil</Button>
            {guardado?.publicado && urlPublica && <View style={styles.editor}>
              <Text variant="titleMedium">Enlace público</Text>
              <Text selectable style={styles.intro}>{urlPublica}</Text>
              <Button icon="open-in-new" disabled={saving} onPress={async () => {
                try { await Linking.openURL(urlPublica); }
                catch { setMessage('No pudimos abrir el perfil.'); }
              }}>Ver perfil publicado</Button>
              {Platform.OS !== 'web' && <Button icon="share-variant" disabled={saving} onPress={async () => {
                try { await Share.share({ message: `${guardado.nombre}: ${urlPublica}` }); }
                catch { setMessage('No pudimos compartir el enlace.'); }
              }}>Compartir perfil</Button>}
            </View>}
          </Card.Content>
        </Card>

        <Card mode="outlined" style={styles.card}>
          <Card.Title title="Locales" subtitle="Cada local decide qué dirección y ubicación mostrar" />
          <Card.Content>
            {!guardado?.publicado && <Text style={styles.intro}>Tu perfil está privado. Los locales no serán visibles hasta que lo publiques.</Text>}
            {sucursales.length === 0 && <Text style={styles.intro}>Todavía no tienes locales. Puedes añadir uno sin coordenadas GPS.</Text>}
            {sucursales.map(s => <View key={s.id} style={styles.localRow}>
              <List.Item title={s.nombre} description={s.direccionPublica || 'Sin dirección pública'}
                left={props => <List.Icon {...props} icon="store-marker-outline" />} />
              <View style={styles.row}>
                <Chip>{s.publicada && guardado?.publicado ? 'Público' : s.publicada ? 'Oculto por perfil privado' : 'Privado'}</Chip>
                <Button accessibilityLabel={`Editar ${s.nombre}`} disabled={saving || local !== null} onPress={() => editarLocal(s)}>Editar</Button>
              </View>
            </View>)}
            {!local && <Button icon="plus" mode="outlined" disabled={saving} onPress={() => { setLocal({ ...localVacio }); setLocalError(''); }}>Añadir local</Button>}
            {local && <View style={styles.editor}>
              <Text variant="titleMedium">{local.id === undefined ? 'Nuevo local' : 'Editar local'}</Text>
              <TextInput mode="outlined" label="Nombre del local *" maxLength={150} value={local.nombre} disabled={saving} style={styles.input} onChangeText={nombre => setLocal({ ...local, nombre })} />
              <TextInput mode="outlined" label="Dirección pública" maxLength={500} value={local.direccionPublica} disabled={saving} style={styles.input} onChangeText={direccionPublica => setLocal({ ...local, direccionPublica })} />
              <Text style={styles.section}>Ubicación GPS opcional. Introduce ambas coordenadas o deja las dos vacías.</Text>
              <TextInput mode="outlined" label="Latitud (ej. 28,4636)" value={local.latitud} disabled={saving} style={styles.input} onChangeText={latitud => setLocal({ ...local, latitud })} />
              <TextInput mode="outlined" label="Longitud (ej. −16,2518)" value={local.longitud} disabled={saving} style={styles.input} onChangeText={longitud => setLocal({ ...local, longitud })} />
              <View style={styles.toggle}><Text style={styles.flex}>Mostrar este local en el perfil público</Text><Switch accessibilityLabel="Publicar local" value={local.publicada} disabled={saving} onValueChange={publicada => setLocal({ ...local, publicada })} /></View>
              {!!localError && <HelperText type="error" accessibilityRole="alert">{localError}</HelperText>}
              <View style={styles.row}><Button disabled={saving} onPress={() => setLocal(null)}>Cancelar</Button><Button mode="contained" loading={saving} disabled={saving} onPress={guardarLocal}>Guardar local</Button></View>
            </View>}
          </Card.Content>
        </Card>
        <ReservasPublicasConfig key={empresaId} publicado={guardado?.publicado ?? false} sucursales={sucursales} disabled={saving || hayCambios} />
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage('')}>{message}</Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { padding: 16, paddingBottom: 64, width: '100%', maxWidth: 820, alignSelf: 'center' },
  center: { padding: 32, gap: 16, alignItems: 'center' }, intro: { marginVertical: 12 },
  card: { marginBottom: 20 }, input: { marginTop: 12 }, section: { marginTop: 20, marginBottom: 8 },
  flex: { flex: 1 }, toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  localRow: { marginBottom: 16 }, editor: { marginTop: 20 },
});
