import { enlaceReserva, fechaEnZona, nuevaSolicitudToken, reservaDesdeHash, validarContacto } from '../utils/reservasPublicas';

const token = 'a'.repeat(64);
it('abre negocio, profesional y recibo mediante enlaces independientes de autenticación', () => {
  expect(reservaDesdeHash(`#/reservar/${token}`)).toEqual({ tipo: 'reservar', token, empleadoId: undefined });
  expect(reservaDesdeHash(`#/reservar/${token}/12`)).toEqual({ tipo: 'reservar', token, empleadoId: 12 });
  expect(reservaDesdeHash(`#/cita/${token}`)).toEqual({ tipo: 'cita', token });
  for (const hash of [`#/cita/${token}/12`, '#/reservar/admin.jwt', `#/reservar/${token}/0`, `#/reservar/${token}/2147483648`])
    expect(reservaDesdeHash(hash)).toBeNull();
});
it('genera enlaces para el mismo DuckDNS y permite un profesional seleccionado', () => {
  expect(enlaceReserva(token, 12, undefined, 'https://cuadreapp.duckdns.org/api')).toBe(`https://cuadreapp.duckdns.org/app/#/reservar/${token}/12`);
  expect(enlaceReserva(token, undefined, 'http://localhost:8081/?token=secreto')).toBe(`http://localhost:8081/#/reservar/${token}`);
  expect(enlaceReserva(token, 0, 'https://example.com/app/')).toBeNull();
  expect(enlaceReserva('admin.jwt', 12, 'https://example.com/app/')).toBeNull();
});
it('obtiene el día del negocio aunque el dispositivo esté en otra zona', () => {
  expect(fechaEnZona(new Date('2030-01-01T00:30:00Z'), 'America/New_York')).toBe('2029-12-31');
  expect(fechaEnZona(new Date('2030-01-01T00:30:00Z'), 'UTC')).toBe('2030-01-01');
});
it('exige contacto válido y acepta correo opcional y prefijos internacionales', () => {
  expect(validarContacto('Ana', '+34 600-123-456', '')).toBeNull();
  expect(validarContacto(' ', '123', '')).toBeTruthy();
  expect(validarContacto('Ana', '+34600123456', 'incorrecto')).toBeTruthy();
  expect(validarContacto('Ana', '600<script>123', '')).toBeTruthy();
});
it('el enlace privado usa entropía criptográfica de 256 bits', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const getRandomValues = jest.fn((bytes: Uint8Array) => { bytes.fill(255); return bytes; });
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues } });
  try { expect(nuevaSolicitudToken()).toBe('ff'.repeat(32)); expect(getRandomValues.mock.calls[0][0]).toHaveLength(32); }
  finally { if (original) Object.defineProperty(globalThis, 'crypto', original); else Reflect.deleteProperty(globalThis, 'crypto'); }
});
