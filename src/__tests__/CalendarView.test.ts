import React, { act } from 'react';
import CalendarView from '../screens/shared/CalendarView';
import { CitaResponse } from '../types';

const { create } = require('react-test-renderer');
jest.mock('react-native', () => ({
  View: 'View', ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));
jest.mock('react-native-paper', () => ({
  Text: 'Text', Surface: 'Surface', Chip: 'Chip', useTheme: () => ({ colors: {} }),
}));
jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: 'Icon' }));

let render: any;
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2030, 0, 31, 12));
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  // React 19 informa la deprecación del renderer incluido en jest-expo.
  const error = console.error;
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    if (String(args[0]).includes('react-test-renderer is deprecated')) return;
    error(...args);
  });
});
afterEach(async () => {
  if (render) await act(async () => render.unmount());
  render = undefined;
  jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks();
});

it('solicita el rango visible al montar, cambiar vista, navegar y volver a hoy', async () => {
  const onRangeChange = jest.fn();
  await act(async () => { render = create(React.createElement(CalendarView, {
    citas: [], estadoConfig: {}, onCitaPress: jest.fn(), onRangeChange,
  })); });
  expect(onRangeChange).toHaveBeenLastCalledWith(new Date(2030, 0, 31), new Date(2030, 0, 31, 23, 59, 59, 999));
  await act(async () => render.root.findByProps({ accessibilityLabel: 'Vista mes' }).props.onPress());
  expect(onRangeChange).toHaveBeenLastCalledWith(new Date(2030, 0, 1), new Date(2030, 0, 31, 23, 59, 59, 999));
  await act(async () => render.root.findByProps({ accessibilityLabel: 'Período siguiente' }).props.onPress());
  expect(onRangeChange).toHaveBeenLastCalledWith(new Date(2030, 1, 1), new Date(2030, 1, 28, 23, 59, 59, 999));
  await act(async () => render.root.findByProps({ accessibilityLabel: 'Vista semana' }).props.onPress());
  expect(onRangeChange).toHaveBeenLastCalledWith(new Date(2030, 0, 27), new Date(2030, 1, 2, 23, 59, 59, 999));
  await act(async () => render.root.findByProps({ accessibilityLabel: 'Período siguiente' }).props.onPress());
  await act(async () => render.root.findByProps({ accessibilityLabel: 'Ir a hoy' }).props.onPress());
  expect(onRangeChange).toHaveBeenLastCalledWith(new Date(2030, 0, 27), new Date(2030, 1, 2, 23, 59, 59, 999));
});

it('dibuja la duración por cantidad y usa un texto compacto para citas cortas', async () => {
  const cita = {
    id: 1, fecha: new Date(2030, 0, 31, 9).toISOString(), estado: 0,
    clienteNombre: 'Ana', empleadoNombre: 'Profesional',
    servicios: [{ duracionMinutos: 90, cantidad: 2, servicioNombre: 'Corte' }],
  } as CitaResponse;
  const props = { citas: [cita], estadoConfig: {}, onCitaPress: jest.fn() };
  await act(async () => { render = create(React.createElement(CalendarView, props)); });
  const evento = () => render.root.findAllByType('TouchableOpacity').find((node: any) =>
    Array.isArray(node.props.style) && node.props.style[0]?.position === 'absolute');
  expect(evento().props.style[1].height).toBe(192);
  const corta = { ...cita, servicios: [{ ...cita.servicios[0], duracionMinutos: 30, cantidad: 1 }] };
  await act(async () => render.update(React.createElement(CalendarView, { ...props, citas: [corta] })));
  expect(evento().props.style[1].height).toBe(32);
  expect(evento().findAllByType('Text')).toHaveLength(1);
  expect(evento().findByType('Text').props.children.join('')).toContain('Ana');
});

it('mantiene accesibles dos reservas simultáneas en columnas distintas', async () => {
  const base = { fecha: new Date(2030, 0, 31, 9).toISOString(), estado: 0,
    servicios: [{ duracionMinutos: 60, cantidad: 1, servicioNombre: 'Corte' }] };
  const citas = [{ ...base, id: 1, clienteNombre: 'Ana', empleadoNombre: 'Uno' },
    { ...base, id: 2, clienteNombre: 'Luis', empleadoNombre: 'Dos' }] as CitaResponse[];
  const onCitaPress = jest.fn();
  await act(async () => { render = create(React.createElement(CalendarView, { citas, estadoConfig: {}, onCitaPress })); });
  const eventos = render.root.findAllByType('TouchableOpacity').filter((node: any) =>
    Array.isArray(node.props.style) && node.props.style[0]?.position === 'absolute');
  expect(eventos.map((node: any) => node.props.style[1].left)).toEqual(['0%', '50%']);
  expect(eventos.map((node: any) => node.props.style[1].width)).toEqual(['50%', '50%']);
  await act(async () => { eventos[0].props.onPress(); eventos[1].props.onPress(); });
  expect(onCitaPress.mock.calls).toEqual([[1], [2]]);
});
