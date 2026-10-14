import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, HelperText, IconButton, Snackbar, Switch, Text, TextInput } from 'react-native-paper';
import { RouteProp, useNavigation, usePreventRemove, useRoute } from '@react-navigation/native';
import { Horario, Disponibilidad, horariosApi } from '../../api/horarios';
import { fechaValida, horaAMinutos, minutosAHora } from '../../utils/horarios';
import { mensajeDeError } from '../../utils/alert';
import { useConfirmDialog } from '../../components/ConfirmDialog';
import AusenciasEmpleado from '../../components/AusenciasEmpleado';

type Params = { HorarioEmpleado: { empleadoId: number } };
const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
type TramoForm = { diaSemana: number; inicio: string; fin: string };

export default function HorarioEmpleadoScreen() {
  const { params: { empleadoId } } = useRoute<RouteProp<Params, 'HorarioEmpleado'>>();
  const navigation = useNavigation();
  const { showAlert } = useConfirmDialog();
  const [horario, setHorario] = useState<Horario | null>(null);
  const [activo, setActivo] = useState(false);
  const [zona, setZona] = useState('UTC');
  const [tramos, setTramos] = useState<TramoForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fecha, setFecha] = useState('');
  const [duracion, setDuracion] = useState('30');
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
  const [consultando, setConsultando] = useState(false);
  usePreventRemove(dirty || saving, ({ data }) => {
    if (saving) return;
    showAlert('Cambios sin guardar', '¿Quieres salir sin guardar el horario?', [
      { text: 'Seguir editando', style: 'cancel' }, { text: 'Salir', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
  const aplicar = (h: Horario) => {
    setHorario(h); setActivo(h.activo); setZona(h.zonaHoraria);
    setTramos(h.tramos.map(t => ({ diaSemana: t.diaSemana, inicio: minutosAHora(t.inicioMinuto), fin: minutosAHora(t.finMinuto) })));
    setDirty(false); setDisponibilidad(null);
  };
  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    try { aplicar(await horariosApi.get(empleadoId)); }
    catch (e) { setError(mensajeDeError(e, 'No pudimos cargar el horario.')); }
    finally { setLoading(false); }
  }, [empleadoId]);
  useEffect(() => { void cargar(); }, [cargar]);

  async function guardar() {
    setError('');
    try {
      const parsed = tramos.map(t => ({ diaSemana: t.diaSemana, inicioMinuto: horaAMinutos(t.inicio), finMinuto: horaAMinutos(t.fin) }));
      for (let dia = 0; dia < 7; dia++) {
        let fin = -1;
        for (const t of parsed.filter(t => t.diaSemana === dia).sort((a, b) => a.inicioMinuto - b.inicioMinuto)) {
          if (t.inicioMinuto >= t.finMinuto || t.inicioMinuto < fin) throw new Error(`Revisa los turnos del ${dias[dia].toLowerCase()}: no pueden superponerse ni terminar antes de empezar.`);
          fin = t.finMinuto;
        }
      }
      if (!zona.trim()) throw new Error('Indica la zona horaria del profesional.');
      setSaving(true);
      aplicar(await horariosApi.save(empleadoId, { activo, zonaHoraria: zona.trim(), tramos: parsed }));
      setMessage('Horario guardado.');
    } catch (e) { setError(mensajeDeError(e, 'No pudimos guardar el horario.')); }
    finally { setSaving(false); }
  }

  async function consultar() {
    setError(''); setDisponibilidad(null);
    if (!fechaValida(fecha) || !/^\d+$/.test(duracion) || +duracion < 1 || +duracion > 600) {
      setError('Introduce una fecha AAAA-MM-DD y una duración entre 1 y 600 minutos.'); return;
    }
    setConsultando(true);
    try { setDisponibilidad(await horariosApi.disponibilidad(empleadoId, fecha, +duracion)); }
    catch (e) { setError(mensajeDeError(e, 'No pudimos consultar la disponibilidad.')); }
    finally { setConsultando(false); }
  }

  if (loading) return <ActivityIndicator style={styles.loading} />;
  if (!horario) return <View style={styles.loading}><Text>{error}</Text><Button onPress={cargar}>Reintentar</Button></View>;
  return <View style={styles.root}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text variant="headlineSmall">Horario semanal</Text>
    <Text style={styles.note}>Añade varios turnos en un día para separar los descansos. Los días sin turnos quedan cerrados cuando el horario está activo.</Text>
    <View style={styles.row}><Text style={styles.flex}>Limitar reservas a este horario</Text><Switch accessibilityLabel="Activar horario laboral" disabled={saving} value={activo} onValueChange={v => { setActivo(v); setDirty(true); }} /></View>
    <TextInput label="Zona horaria" mode="outlined" value={zona} disabled={saving} autoCapitalize="none" onChangeText={v => { setZona(v); setDirty(true); }} />
    <Text style={styles.note}>Ejemplos: Atlantic/Canary, Europe/Madrid, America/Caracas. Las horas corresponden a esta zona, no a la del teléfono.</Text>
    {[1, 2, 3, 4, 5, 6, 0].map(dia => <Card key={dia} style={styles.card} mode="outlined">
      <Card.Title title={dias[dia]} /><Card.Content>
        {!tramos.some(t => t.diaSemana === dia) && <Text>Sin turnos</Text>}
        {tramos.map((t, index) => t.diaSemana !== dia ? null : <View key={index} style={styles.row}>
          <TextInput style={styles.flex} mode="outlined" label="Inicio" accessibilityLabel={`${dias[dia]} inicio turno ${index + 1}`} value={t.inicio} maxLength={5} disabled={saving} onChangeText={inicio => { setTramos(prev => prev.map((x, i) => i === index ? { ...x, inicio } : x)); setDirty(true); }} />
          <TextInput style={styles.flex} mode="outlined" label="Fin" accessibilityLabel={`${dias[dia]} fin turno ${index + 1}`} value={t.fin} maxLength={5} disabled={saving} onChangeText={fin => { setTramos(prev => prev.map((x, i) => i === index ? { ...x, fin } : x)); setDirty(true); }} />
          <IconButton icon="delete-outline" accessibilityLabel={`Quitar turno de ${dias[dia]}`} disabled={saving} onPress={() => { setTramos(prev => prev.filter((_, i) => i !== index)); setDirty(true); }} />
        </View>)}
        <Button icon="plus" disabled={saving || tramos.length >= 28} onPress={() => { setTramos(prev => [...prev, { diaSemana: dia, inicio: '09:00', fin: '18:00' }]); setDirty(true); }}>Añadir turno</Button>
      </Card.Content>
    </Card>)}
    <Button mode="contained" loading={saving} disabled={saving || consultando} onPress={guardar}>Guardar horario</Button>
    <AusenciasEmpleado empleadoId={empleadoId} disabled={dirty || saving || consultando} onChanged={() => setDisponibilidad(null)} />
    <Text variant="titleLarge" style={styles.note}>Consultar huecos libres</Text>
    <Text>Se consulta el horario guardado y se descuentan las citas pendientes. Los resultados son orientativos; no reservan el hueco.</Text>
    <TextInput style={styles.note} mode="outlined" label="Fecha (AAAA-MM-DD)" value={fecha} onChangeText={v => { setFecha(v); setDisponibilidad(null); }} disabled={consultando} />
    <TextInput mode="outlined" label="Duración en minutos" value={duracion} keyboardType="number-pad" onChangeText={v => { setDuracion(v); setDisponibilidad(null); }} disabled={consultando} />
    <Button loading={consultando} disabled={dirty || saving || consultando} onPress={consultar}>Consultar disponibilidad</Button>
    {dirty && <Text>Guarda los cambios antes de consultar.</Text>}
    {disponibilidad && <View style={styles.slots}>
      <Text>{!disponibilidad.horarioConfigurado ? 'Activa y guarda un horario para calcular disponibilidad.' : disponibilidad.iniciosUtc.length === 0 ? 'No hay huecos libres para esa fecha y duración.' : `Horas en ${disponibilidad.zonaHoraria}`}</Text>
      <View style={styles.wrap}>{disponibilidad.iniciosUtc.map(inicio => <Chip key={inicio}>{new Date(inicio).toLocaleTimeString('es', { timeZone: disponibilidad.zonaHoraria, hour: '2-digit', minute: '2-digit', hour12: false })}</Chip>)}</View>
    </View>}
    {!!error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
  </ScrollView><Snackbar visible={!!message} onDismiss={() => setMessage('')}>{message}</Snackbar></View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, loading: { padding: 40 }, content: { padding: 16, paddingBottom: 64, width: '100%', maxWidth: 820, alignSelf: 'center' }, note: { marginVertical: 16 }, card: { marginBottom: 12 }, row: { flexDirection: 'row', gap: 8, alignItems: 'center', marginVertical: 8 }, flex: { flex: 1 }, slots: { gap: 12 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
