import { reservasPublicasApi } from '../api/reservasPublicas';

const mockGet = jest.fn(); const mockPost = jest.fn();
jest.mock('axios', () => ({ __esModule: true, create: jest.fn(() => ({ get: (...args: unknown[]) => mockGet(...args), post: (...args: unknown[]) => mockPost(...args) })) }));
jest.mock('../api/client', () => { throw new Error('El cliente anónimo no debe importar la sesión privada.'); });
beforeEach(() => { mockGet.mockReset(); mockPost.mockReset(); mockGet.mockResolvedValue({ data: {} }); mockPost.mockResolvedValue({ data: {} }); });
it('consulta horarios pasando IDs, fecha y cancelación sin credenciales de sesión', async () => {
  const signal = new AbortController().signal;
  await reservasPublicasApi.disponibilidad('token', 1, 2, '2030-01-01', signal);
  expect(mockGet).toHaveBeenCalledWith('/publico/reservas/token/disponibilidad', { params: { empleadoId: 1, servicioId: 2, fecha: '2030-01-01' }, signal });
});
it('reintenta con el mismo token de solicitud y cancela solo con el enlace privado', async () => {
  const data = { solicitudToken: 'b'.repeat(64), empleadoId: 1, servicioId: 2, inicioUtc: '2030-01-01T09:00:00Z', nombre: 'Ana', telefono: '+34600123456', email: null };
  await reservasPublicasApi.crear('publico', data); await reservasPublicasApi.crear('publico', data);
  expect(mockPost.mock.calls).toEqual([['/publico/reservas/publico', data], ['/publico/reservas/publico', data]]);
  await reservasPublicasApi.cancelar(data.solicitudToken);
  expect(mockPost).toHaveBeenLastCalledWith(`/publico/reservas/cita/${data.solicitudToken}/cancelar`);
});
