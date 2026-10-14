import { AxiosError, CanceledError } from 'axios';
import { apiClient } from '../api/client';

const mockConnectionError = jest.fn();
jest.mock('../stores/connectionStore', () => ({ useConnectionStore: { getState: () => ({
  setConnectionError: mockConnectionError, isOfflineMode: false, clearConnectionError: jest.fn(),
}) } }));
jest.mock('../stores/authStore', () => ({ useAuthStore: { getState: () => ({ isAuthenticated: false }) } }));
jest.mock('../utils/secureStorage', () => ({ secureStorage: { getItem: async () => null } }));

beforeEach(() => mockConnectionError.mockClear());
afterEach(() => jest.restoreAllMocks());

it('cancelar una consulta no comprueba health ni declara el servidor caído', async () => {
  const health = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
  const error = new CanceledError('consulta obsoleta');
  await expect(apiClient.get('/prueba', { adapter: async () => { throw error; } })).rejects.toBe(error);
  expect(health).not.toHaveBeenCalled();
  expect(mockConnectionError).not.toHaveBeenCalled();
});

it('un fallo real de red sigue comprobando health y mostrando el error de conexión', async () => {
  const health = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
  const error = new AxiosError('Network Error');
  await expect(apiClient.get('/prueba', { adapter: async () => { throw error; } })).rejects.toBe(error);
  expect(health).toHaveBeenCalledTimes(1);
  expect(mockConnectionError).toHaveBeenCalledWith('server_error');
});
