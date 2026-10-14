import type { PerfilPublico } from '../api/perfilPublico';

export function validarPerfil(perfil: PerfilPublico): string | null {
  if (!perfil.nombre.trim()) return 'Escribe el nombre público del negocio.';
  if (!perfil.categoria.trim()) return 'Escribe la categoría de tu negocio.';
  for (const [red, usuario] of [['Instagram', perfil.instagram], ['Facebook', perfil.facebook], ['TikTok', perfil.tikTok]]) {
    if (usuario && !/^@?[a-zA-Z0-9._-]+$/.test(usuario))
      return `En ${red}, escribe solo el usuario, sin enlaces ni espacios.`;
  }
  return null;
}

export function parseCoordenadas(latitud: string, longitud: string): { latitud: number | null; longitud: number | null } {
  const lat = latitud.trim();
  const lon = longitud.trim();
  if (!lat && !lon) return { latitud: null, longitud: null };
  const decimal = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/;
  if (!decimal.test(lat) || !decimal.test(lon))
    throw new Error('Escribe ambas coordenadas en formato decimal o deja las dos vacías.');
  const a = Number(lat.replace(',', '.'));
  const b = Number(lon.replace(',', '.'));
  if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 90 || Math.abs(b) > 180)
    throw new Error('La latitud debe estar entre −90 y 90 y la longitud entre −180 y 180.');
  return { latitud: a, longitud: b };
}
