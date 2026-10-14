import { apiClient } from '../api/client';
import { perfilPublicoApi } from '../api/perfilPublico';

jest.mock('../api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));

const get = apiClient.get as jest.Mock;
const post = apiClient.post as jest.Mock;
const put = apiClient.put as jest.Mock;
beforeEach(() => jest.clearAllMocks());

it('trata el perfil inexistente como formulario nuevo', async () => {
  get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
  await expect(perfilPublicoApi.getPerfil()).resolves.toBeNull();
});

it('no oculta errores de autorización o de servidor', async () => {
  const error = { isAxiosError: true, response: { status: 403 } };
  get.mockRejectedValueOnce(error);
  await expect(perfilPublicoApi.getPerfil()).rejects.toBe(error);
});

it('distingue crear y editar, sin enviar identificadores de empresa', async () => {
  const input = { nombre: 'Local', direccionPublica: null, latitud: null, longitud: null, publicada: false };
  post.mockResolvedValueOnce({ data: { ...input, id: 7 } });
  put.mockResolvedValueOnce({ data: { ...input, id: 7 } });
  await perfilPublicoApi.saveSucursal(input);
  await perfilPublicoApi.saveSucursal(input, 7);
  expect(post).toHaveBeenCalledWith('/empresa/sucursales', input);
  expect(put).toHaveBeenCalledWith('/empresa/sucursales/7', input);
});
