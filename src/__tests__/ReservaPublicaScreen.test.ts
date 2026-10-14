import React, { act } from 'react';
import ReservarPublicoScreen from '../screens/public/ReservarPublicoScreen';
import CitaPublicaScreen from '../screens/public/CitaPublicaScreen';

const { create } = require('react-test-renderer');
const mockCatalogo = jest.fn(); const mockDisponibilidad = jest.fn(); const mockCrear = jest.fn();
const mockCita = jest.fn(); const mockCancelar = jest.fn();
jest.mock('../api/reservasPublicas', () => ({ reservasPublicasApi: {
  catalogo: (...args: unknown[]) => mockCatalogo(...args), disponibilidad: (...args: unknown[]) => mockDisponibilidad(...args),
  crear: (...args: unknown[]) => mockCrear(...args), cita: (...args: unknown[]) => mockCita(...args), cancelar: (...args: unknown[]) => mockCancelar(...args),
} }));
jest.mock('../utils/reservasPublicas', () => ({ ...jest.requireActual('../utils/reservasPublicas'), nuevaSolicitudToken: () => 'b'.repeat(64) }));
jest.mock('react-native', () => ({ View: 'View', ScrollView: 'ScrollView', Linking: { openURL: jest.fn() }, StyleSheet: { create: (styles: unknown) => styles } }));
jest.mock('react-native-paper', () => {
  const React = require('react');
  return { ActivityIndicator: 'ActivityIndicator', Button: 'Button', HelperText: 'HelperText', Text: 'Text', TextInput: 'TextInput', Portal: 'Portal',
    Card: Object.assign((props: any) => React.createElement('Card', props), { Content: 'Content' }),
    Dialog: Object.assign((props: any) => React.createElement('Dialog', props), { Title: 'Title', Content: 'Content', Actions: 'Actions' }),
    useTheme: () => ({ colors: {}, dark: false }) };
});
const token = 'a'.repeat(64); const inicio = '2030-01-01T09:00:00Z';
const catalogo = { nombre: 'Salón', descripcion: null, telefono: null, local: { nombre: 'Centro', direccionPublica: 'Calle 1', latitud: null, longitud: null },
  profesionales: [{ id: 1, nombre: 'Ana', zonaHoraria: 'UTC' }, { id: 2, nombre: 'Luis', zonaHoraria: 'UTC' }], servicios: [{ id: 1, nombre: 'Corte', precio: 15, duracionMinutos: 30 }] };
let render: any; const originalWindow = (globalThis as any).window;
const button = (label: string) => render.root.findAllByType('Button').find((b: any) => b.props.children === label);
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2030-01-01T08:00:00Z')); jest.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  (globalThis as any).window = { location: { hash: '', href: 'https://cuadreapp.duckdns.org/app/' }, history: { back: jest.fn() } };
  mockCatalogo.mockResolvedValue(catalogo);
  mockDisponibilidad.mockResolvedValue({ horarioConfigurado: true, zonaHoraria: 'UTC', iniciosUtc: [inicio] });
  mockCrear.mockRejectedValue(new Error('Conexión interrumpida'));
  mockCita.mockResolvedValue({ negocio: 'Salón', profesional: 'Ana', zonaHoraria: 'UTC', nombreCliente: 'Cliente', inicioUtc: inicio,
    estado: 'Pendiente', puedeCancelar: true, local: 'Centro', direccion: 'Calle 1', telefonoNegocio: null, servicios: catalogo.servicios });
  const error = console.error;
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) error(...args); });
});
afterEach(async () => {
  if (render) await act(async () => render.unmount()); render = undefined;
  (globalThis as any).window = originalWindow; jest.useRealTimers(); jest.restoreAllMocks();
});
async function datos() {
  await act(async () => {
    render.root.findByProps({ label: 'Nombre *' }).props.onChangeText('Cliente');
    render.root.findByProps({ label: 'Teléfono con prefijo de país *' }).props.onChangeText('+34600123456');
    button('09:00').props.onPress();
  });
}
it('reutiliza la solicitud tras un fallo de conexión y bloquea el doble toque', async () => {
  await act(async () => { render = create(React.createElement(ReservarPublicoScreen, { token })); }); await datos();
  await act(async () => { button('Reservar cita').props.onPress(); button('Reservar cita').props.onPress(); });
  expect(mockCrear).toHaveBeenCalledTimes(1);
  await act(async () => button('Reservar cita').props.onPress());
  expect(mockCrear).toHaveBeenCalledTimes(2);
  expect(mockCrear.mock.calls[0][1]).toEqual(mockCrear.mock.calls[1][1]);
  expect(button('Comprobar mi última reserva')).toBeDefined();
  mockCrear.mockResolvedValue({}); await act(async () => button('Reservar cita').props.onPress());
  expect((globalThis as any).window.location.hash).toBe(`/cita/${'b'.repeat(64)}`);
});
it('un horario ocupado recarga disponibilidad y exige elegir de nuevo', async () => {
  mockCrear.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: 'Ese horario ya no está disponible.' } });
  await act(async () => { render = create(React.createElement(ReservarPublicoScreen, { token })); }); await datos();
  await act(async () => button('Reservar cita').props.onPress());
  expect(mockDisponibilidad).toHaveBeenCalledTimes(2); expect(button('Reservar cita').props.disabled).toBe(true);
  expect(render.root.findByProps({ label: 'Nombre *' }).props.value).toBe('Cliente');
});
it('un enlace de profesional no válido no cambia silenciosamente a otro empleado', async () => {
  await act(async () => { render = create(React.createElement(ReservarPublicoScreen, { token, empleadoId: 999 })); });
  expect(mockDisponibilidad).not.toHaveBeenCalled(); expect(button('Reservar cita')).toBeUndefined();
});
it('cancelar requiere confirmación y actualiza el estado de la cita', async () => {
  mockCancelar.mockResolvedValue({ ...(await mockCita()), estado: 'Cancelada', puedeCancelar: false });
  await act(async () => { render = create(React.createElement(CitaPublicaScreen, { token })); });
  await act(async () => button('Cancelar cita').props.onPress()); expect(mockCancelar).not.toHaveBeenCalled();
  await act(async () => button('Confirmar cancelación').props.onPress());
  expect(mockCancelar).toHaveBeenCalledWith(token); expect(button('Cancelar cita')).toBeUndefined();
});
