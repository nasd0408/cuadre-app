import { citasApi } from '../api/citas';

const mockGet = jest.fn();
jest.mock('../api/client', () => ({ apiClient: { get: (...args: unknown[]) => mockGet(...args) } }));
jest.mock('../analytics', () => ({ analytics: { track: jest.fn() }, AnalyticsEvent: {} }));
beforeEach(() => mockGet.mockReset());

it('carga todas las páginas del calendario y conserva filtros y cancelación', async () => {
  const from = new Date('2030-01-07T00:00:00Z');
  const to = new Date('2030-01-07T23:59:59.999Z');
  const signal = new AbortController().signal;
  mockGet.mockResolvedValueOnce({ data: { items: Array.from({ length: 100 }, (_, i) => ({ id: i + 1 })), totalPages: 3 } })
    .mockResolvedValueOnce({ data: { items: [{ id: 101 }], totalPages: 3 } })
    .mockResolvedValueOnce({ data: { items: [{ id: 102 }], totalPages: 3 } });
  const citas = await citasApi.getRangoCalendario(from, to, 0, signal);
  expect(citas).toHaveLength(102);
  mockGet.mock.calls.forEach(([url, config], i) => {
    const params = new URL(url, 'https://test.local').searchParams;
    expect(params.get('page')).toBe(String(i + 1));
    expect(params.get('pageSize')).toBe('100');
    expect(params.get('estado')).toBe('0');
    expect(new Date(new Date(params.get('fechaHasta')!).getTime() + 86_400_000)).toEqual(to);
    expect(config.signal).toBe(signal);
  });
});

it('un fallo de una página rechaza la carga completa para no mostrar un calendario incompleto', async () => {
  mockGet.mockResolvedValueOnce({ data: { items: [{ id: 1 }], totalPages: 2 } });
  const error = new Error('segunda página falló');
  mockGet.mockRejectedValueOnce(error);
  await expect(citasApi.getRangoCalendario(new Date(), new Date())).rejects.toBe(error);
});

it('no repite una cita si cambia de página durante la consulta', async () => {
  mockGet.mockResolvedValueOnce({ data: { items: [{ id: 1 }], totalPages: 2 } })
    .mockResolvedValueOnce({ data: { items: [{ id: 1 }, { id: 2 }], totalPages: 2 } });
  expect(await citasApi.getRangoCalendario(new Date(), new Date())).toEqual([{ id: 1 }, { id: 2 }]);
});
