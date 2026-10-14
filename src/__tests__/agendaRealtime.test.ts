import { conectarAgendaRealtime } from '../hooks/useAgendaRealtime';

const mockSession = { isAuthenticated: true, user: { id: 'uno', empresaId: 1 } };
const mockGet = jest.fn();
const mockStorage = jest.fn();
const mockRemove = jest.fn();
let mockForeground: (state: string) => void;
const mockConnection = {
  state: 'Disconnected',
  start: jest.fn(), stop: jest.fn(), off: jest.fn(),
  on: jest.fn(), onreconnected: jest.fn(), onclose: jest.fn(),
};
const mockBuilder = {
  withUrl: jest.fn().mockReturnThis(), configureLogging: jest.fn().mockReturnThis(),
  withAutomaticReconnect: jest.fn().mockReturnThis(), build: () => mockConnection,
};
jest.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: jest.fn(() => mockBuilder),
  HubConnectionState: { Disconnected: 'Disconnected' }, LogLevel: { None: 6 },
}));
jest.mock('react-native', () => ({ AppState: { addEventListener: (_: string, cb: typeof mockForeground) => {
  mockForeground = cb;
  return { remove: mockRemove };
} } }));
jest.mock('../stores/authStore', () => ({ useAuthStore: { getState: () => mockSession } }));
jest.mock('../api/client', () => ({ apiClient: { get: (...args: unknown[]) => mockGet(...args) } }));
jest.mock('../utils/secureStorage', () => ({ secureStorage: { getItem: (...args: unknown[]) => mockStorage(...args) } }));

const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
const changed = () => mockConnection.on.mock.calls.find(([name]) => name === 'AgendaChanged')![1]();

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockSession.isAuthenticated = true;
  mockSession.user = { id: 'uno', empresaId: 1 };
  mockConnection.state = 'Disconnected';
  mockConnection.start.mockReset().mockImplementation(async () => { mockConnection.state = 'Connected'; });
  mockConnection.stop.mockResolvedValue(undefined);
  mockGet.mockResolvedValue({});
  mockStorage.mockResolvedValue('token-renovado');
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

it('recarga tras conexión y agrupa avisos consecutivos; desmontar cancela callbacks', async () => {
  const reload = jest.fn();
  const dispose = conectarAgendaRealtime('https://api.test/api/', 'uno', 1, reload);
  await flush();
  jest.advanceTimersByTime(200);
  expect(reload).toHaveBeenCalledTimes(1);
  changed(); changed(); changed();
  jest.advanceTimersByTime(200);
  expect(reload).toHaveBeenCalledTimes(2);
  changed();
  dispose();
  changed();
  jest.advanceTimersByTime(200);
  expect(reload).toHaveBeenCalledTimes(2);
  expect(mockConnection.stop).toHaveBeenCalled();
  expect(mockRemove).toHaveBeenCalled();
});

it('recupera los cambios perdidos al reconectar o volver al primer plano', async () => {
  const reload = jest.fn();
  const dispose = conectarAgendaRealtime('https://api.test/api', 'uno', 1, reload);
  await flush();
  jest.advanceTimersByTime(200);
  mockConnection.onreconnected.mock.calls[0][0]();
  jest.advanceTimersByTime(200);
  mockForeground('active');
  jest.advanceTimersByTime(200);
  expect(reload).toHaveBeenCalledTimes(3);
  expect(mockConnection.start).toHaveBeenCalledTimes(1);
  dispose();
});

it('renueva usando el cliente HTTP y nunca entrega el token de otra sesión o empresa', async () => {
  const dispose = conectarAgendaRealtime('https://api.test/api', 'uno', 1, jest.fn());
  const tokenFactory = mockBuilder.withUrl.mock.calls[0][1].accessTokenFactory;
  expect(await tokenFactory()).toBe('token-renovado');
  expect(mockGet).toHaveBeenCalledWith('/ajustes/perfil');
  mockSession.user.empresaId = 2;
  expect(await tokenFactory()).toBe('');
  mockSession.user = { id: 'dos', empresaId: 1 };
  expect(await tokenFactory()).toBe('');
  dispose();
  mockSession.user = { id: 'uno', empresaId: 1 };
  expect(await tokenFactory()).toBe('');
});

it('reintenta cuando falla el arranque y deja de reintentar al cerrar la pantalla', async () => {
  mockConnection.start.mockRejectedValue(new Error('offline'));
  const dispose = conectarAgendaRealtime('https://api.test/api', 'uno', 1, jest.fn());
  await flush();
  jest.advanceTimersByTime(15000);
  await flush();
  expect(mockConnection.start).toHaveBeenCalledTimes(2);
  dispose();
  jest.advanceTimersByTime(60000);
  expect(mockConnection.start).toHaveBeenCalledTimes(2);
});
