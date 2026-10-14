import { getEmpresaPublica } from '../api/empresasPublicas';

const mockGet = jest.fn();
jest.mock('axios', () => ({
  __esModule: true,
  create: jest.fn(() => ({ get: (...args: unknown[]) => mockGet(...args) })),
  isAxiosError: (error: { isAxiosError?: boolean }) => error.isAxiosError === true,
}));

beforeEach(() => mockGet.mockReset());

it('carga la ficha pública y transmite la cancelación', async () => {
  const signal = new AbortController().signal;
  mockGet.mockResolvedValue({ data: { empresaId: 12 } });
  await expect(getEmpresaPublica(12, signal)).resolves.toEqual({ empresaId: 12 });
  expect(mockGet).toHaveBeenCalledWith('/publico/empresas/12', { signal });
});
it('muestra no disponible para un perfil privado o inexistente', async () => {
  mockGet.mockRejectedValue({ isAxiosError: true, response: { status: 404 } });
  await expect(getEmpresaPublica(12)).resolves.toBeNull();
});
it('distingue fallos del servidor de perfiles no publicados', async () => {
  const error = { isAxiosError: true, response: { status: 500 } };
  mockGet.mockRejectedValue(error);
  await expect(getEmpresaPublica(12)).rejects.toBe(error);
});
