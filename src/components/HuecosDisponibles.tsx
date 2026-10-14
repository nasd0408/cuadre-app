import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { Disponibilidad, horariosApi } from '../api/horarios';
import { fechaValida } from '../utils/horarios';
import { mensajeDeError } from '../utils/alert';
import { useAgendaRealtime } from '../hooks/useAgendaRealtime';

interface Props { empleadoId: number; duracionMinutos: number; onSeleccionar: (inicioUtc: string) => void; seleccionado: string; disabled?: boolean }

export default function HuecosDisponibles({ empleadoId, duracionMinutos, onSeleccionar, seleccionado, disabled }: Props) {
  const [fecha, setFecha] = useState('');
  const [resultado, setResultado] = useState<Disponibilidad | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useAgendaRealtime(() => setRetry(n => n + 1), fechaValida(fecha));
  useEffect(() => {
    const controller = new AbortController();
    setResultado(null); setError(''); setLoading(false);
    if (!fechaValida(fecha) || duracionMinutos < 1 || duracionMinutos > 600) return () => controller.abort();
    setLoading(true);
    horariosApi.disponibilidad(empleadoId, fecha, duracionMinutos, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResultado(data); })
      .catch(e => { if (!controller.signal.aborted) setError(mensajeDeError(e, 'No pudimos consultar los huecos libres.')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [empleadoId, fecha, duracionMinutos, retry]);

  return <View style={{ gap: 12, marginVertical: 16 }}>
    <Text variant="titleMedium">Elegir un hueco disponible</Text>
    <Text>Duración de los servicios: {duracionMinutos} min. Escribe la fecha del profesional.</Text>
    <TextInput mode="outlined" label="Fecha del profesional (AAAA-MM-DD)" value={fecha} onChangeText={setFecha} maxLength={10} disabled={disabled} />
    {!!fecha && !fechaValida(fecha) && <HelperText type="error">Introduce una fecha válida en formato AAAA-MM-DD.</HelperText>}
    {duracionMinutos > 600 && <Text>Para servicios de más de 600 minutos, selecciona la hora manualmente.</Text>}
    {loading && <ActivityIndicator accessibilityLabel="Consultando disponibilidad" />}
    {!!error && <View><HelperText type="error">{error}</HelperText><Button disabled={disabled} onPress={() => setRetry(n => n + 1)}>Reintentar</Button></View>}
    {resultado && (!resultado.horarioConfigurado ? <Text>Este profesional no tiene un horario activo. Utiliza la fecha y hora manuales.</Text> : <>
      <Text>Horas en {resultado.zonaHoraria}. Al elegir una, se actualizará la fecha y hora de la cita.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{resultado.iniciosUtc.map(inicio => <Chip key={inicio}
        disabled={disabled} selected={new Date(inicio).getTime() === new Date(seleccionado).getTime()} onPress={() => onSeleccionar(inicio)}>
        {new Date(inicio).toLocaleTimeString('es', { timeZone: resultado.zonaHoraria, hour: '2-digit', minute: '2-digit', hour12: false })}
      </Chip>)}</View>
      {resultado.iniciosUtc.length === 0 && <Text>No hay huecos libres para esta fecha y duración.</Text>}
      <Button disabled={disabled || loading} onPress={() => setRetry(n => n + 1)}>Actualizar huecos</Button>
    </>)}
    <Text>La disponibilidad se comprueba de nuevo al guardar la cita.</Text>
  </View>;
}
