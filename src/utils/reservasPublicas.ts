import { enlaceEmpresa } from './enlacesPublicos';

const tokenValido = (token: string) => /^[a-f0-9]{64}$/.test(token);
export type RutaReserva = { tipo: 'reservar'; token: string; empleadoId?: number } | { tipo: 'cita'; token: string };
export function reservaDesdeHash(hash: string): RutaReserva | null {
  const match = /^#\/(reservar|cita)\/([a-f0-9]{64})(?:\/([1-9]\d*))?\/?$/.exec(hash);
  if (!match || (match[1] === 'cita' && match[3])) return null;
  const empleadoId = match[3] ? Number(match[3]) : undefined;
  if (empleadoId !== undefined && (!Number.isSafeInteger(empleadoId) || empleadoId > 2147483647)) return null;
  return match[1] === 'cita' ? { tipo: 'cita', token: match[2] } : { tipo: 'reservar', token: match[2], empleadoId };
}
export function enlaceReserva(token: string, empleadoId?: number, webUrl?: string, apiUrl?: string): string | null {
  if (!tokenValido(token) || (empleadoId !== undefined && (!Number.isInteger(empleadoId) || empleadoId < 1 || empleadoId > 2147483647))) return null;
  const base = enlaceEmpresa(1, webUrl, apiUrl);
  if (!base) return null;
  const url = new URL(base);
  url.hash = `/reservar/${token}${empleadoId ? `/${empleadoId}` : ''}`;
  return url.toString();
}
export function nuevaSolicitudToken(): string {
  if (!globalThis.crypto?.getRandomValues) throw new Error('Abre el enlace mediante HTTPS para poder reservar.');
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
export function fechaEnZona(date: Date, zonaHoraria: string): string {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: zonaHoraria, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const parte = (type: string) => partes.find(p => p.type === type)!.value;
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
}
export function fechaReserva(utc: string, zonaHoraria: string): string {
  return new Intl.DateTimeFormat('es', { timeZone: zonaHoraria, dateStyle: 'full', timeStyle: 'short' }).format(new Date(utc));
}
export function validarContacto(nombre: string, telefono: string, email: string): string | null {
  if (nombre.trim().length < 2 || nombre.trim().length > 150) return 'Escribe tu nombre (entre 2 y 150 caracteres).';
  if (!/^\+?\d{7,15}$/.test(telefono.replace(/[ ()-]/g, ''))) return 'Escribe un teléfono válido, incluyendo el prefijo de país.';
  if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Revisa tu correo electrónico.';
  return null;
}
