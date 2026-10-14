import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Button, Card, HelperText, Text, TextInput } from 'react-native-paper';
import { Ausencia, horariosApi } from '../api/horarios';
import { fechaValida } from '../utils/horarios';
import { mensajeDeError } from '../utils/alert';
import { useConfirmDialog } from './ConfirmDialog';

export default function AusenciasEmpleado({ empleadoId, disabled, onChanged }: { empleadoId: number; disabled: boolean; onChanged: () => void }) {
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [motivo, setMotivo] = useState('');
  const { showAlert } = useConfirmDialog();
  const cargar = useCallback(async () => {
    setLoading(true); setLoadError('');
    try { setAusencias(await horariosApi.ausencias(empleadoId)); }
    catch (e) { setLoadError(mensajeDeError(e, 'No pudimos cargar las ausencias.')); }
    finally { setLoading(false); }
  }, [empleadoId]);
  useEffect(() => { void cargar(); }, [cargar]);
  async function crear() {
    setError('');
    if (!fechaValida(desde) || !fechaValida(hasta) || desde > hasta) { setError('Indica un rango válido de fechas AAAA-MM-DD.'); return; }
    setBusy(true);
    try {
      const nueva = await horariosApi.crearAusencia(empleadoId, { desde, hasta, motivo: motivo.trim() || null });
      setAusencias(prev => [...prev, nueva].sort((a, b) => a.desde.localeCompare(b.desde)));
      setDesde(''); setHasta(''); setMotivo(''); onChanged();
    } catch (e) { setError(mensajeDeError(e, 'No pudimos registrar la ausencia.')); }
    finally { setBusy(false); }
  }
  function eliminar(a: Ausencia) {
    showAlert('Quitar ausencia', 'El profesional volverá a estar disponible según su horario en esas fechas.', [
      { text: 'Cancelar', style: 'cancel' }, { text: 'Quitar', onPress: async () => {
        setBusy(true); setError('');
        try { await horariosApi.eliminarAusencia(empleadoId, a.id); setAusencias(prev => prev.filter(x => x.id !== a.id)); onChanged(); }
        catch (e) { setError(mensajeDeError(e, 'No pudimos quitar la ausencia.')); }
        finally { setBusy(false); }
      } },
    ]);
  }
  return <View style={{ gap: 12, marginVertical: 24 }}>
    <Text variant="titleLarge">Ausencias y vacaciones</Text>
    <Text>Días completos en la zona horaria guardada. Ambas fechas están incluidas. Las ausencias se mantienen aunque desactives el horario semanal.</Text>
    {disabled && <Text>Guarda el horario antes de gestionar ausencias.</Text>}
    {loading ? <ActivityIndicator /> : loadError ? <View><HelperText type="error">{loadError}</HelperText><Button onPress={cargar}>Reintentar</Button></View> : <>
      {ausencias.length === 0 && <Text>No hay ausencias próximas.</Text>}
      {ausencias.map(a => <Card key={a.id} mode="outlined"><Card.Content>
        <Text variant="titleMedium">{a.desde} → {a.hasta}</Text><Text>{a.zonaHoraria}</Text>{!!a.motivo && <Text>{a.motivo}</Text>}
      </Card.Content><Card.Actions><Button disabled={busy || disabled} onPress={() => eliminar(a)}>Quitar ausencia</Button></Card.Actions></Card>)}
      <TextInput label="Desde (AAAA-MM-DD)" mode="outlined" value={desde} onChangeText={setDesde} disabled={busy || disabled} maxLength={10} />
      <TextInput label="Hasta (AAAA-MM-DD)" mode="outlined" value={hasta} onChangeText={setHasta} disabled={busy || disabled} maxLength={10} />
      <TextInput label="Motivo interno (opcional)" mode="outlined" value={motivo} onChangeText={setMotivo} disabled={busy || disabled} maxLength={250} />
      <Button mode="outlined" loading={busy} disabled={busy || disabled} onPress={crear}>Registrar ausencia</Button>
    </>}
    {!!error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
  </View>;
}
