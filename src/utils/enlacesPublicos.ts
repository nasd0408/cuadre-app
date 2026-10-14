export function empresaDesdeHash(hash: string): number | null {
  const match = /^#\/empresa\/([1-9]\d*)\/?$/.exec(hash);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

export function enlaceEmpresa(empresaId: number, webUrl?: string, apiUrl?: string): string | null {
  if (!Number.isInteger(empresaId) || empresaId <= 0 || empresaId > 2147483647) return null;
  try {
    const url = webUrl ? new URL(webUrl) : new URL('/app/', apiUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.search = '';
    url.hash = `/empresa/${empresaId}`;
    return url.toString();
  } catch { return null; }
}

export function enlaceRed(red: 'instagram' | 'facebook' | 'tikTok', usuario: string): string | null {
  const handle = usuario.replace(/^@/, '');
  if (!/^[a-zA-Z0-9._-]+$/.test(handle)) return null;
  const bases = { instagram: 'https://www.instagram.com/', facebook: 'https://www.facebook.com/', tikTok: 'https://www.tiktok.com/@' };
  return bases[red] + encodeURIComponent(handle);
}

export function enlaceMapa(lat: number | null, lon: number | null): string | null {
  if (lat === null || lon === null || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`;
}
