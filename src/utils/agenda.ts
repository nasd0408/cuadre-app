import type { CitaResponse, CitaServicioResponse } from '../types';

export type VistaAgenda = 'month' | 'week' | 'day';

export function rangoAgenda(fecha: Date, vista: VistaAgenda) {
  const from = new Date(fecha);
  from.setHours(0, 0, 0, 0);
  if (vista === 'month') from.setDate(1);
  if (vista === 'week') from.setDate(from.getDate() - from.getDay());
  const to = new Date(from);
  if (vista === 'month') { to.setMonth(to.getMonth() + 1); to.setDate(0); }
  if (vista === 'week') to.setDate(to.getDate() + 6);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function moverFechaAgenda(fecha: Date, vista: VistaAgenda, direccion: 1 | -1) {
  const siguiente = new Date(fecha);
  // Enero 31 + un mes desborda a marzo si no se pone primero el día 1.
  if (vista === 'month') { siguiente.setDate(1); siguiente.setMonth(siguiente.getMonth() + direccion); }
  else siguiente.setDate(siguiente.getDate() + direccion * (vista === 'week' ? 7 : 1));
  return siguiente;
}

export function filtrosRangoCitas(from: Date, to: Date) {
  // Contrato actual de GET /citas: el servidor añade 24h a FechaHasta.
  // La interfaz usa extremos exactos (incluidos), también en días con cambio de hora.
  return { fechaDesde: from.toISOString(), fechaHasta: new Date(to.getTime() - 86_400_000).toISOString() };
}

export function duracionCita(servicios: Pick<CitaServicioResponse, 'duracionMinutos' | 'cantidad'>[]) {
  if (!servicios.length) return 30;
  return servicios.reduce((total, s) => total + (s.duracionMinutos ?? 30) * s.cantidad, 0);
}

// Distribuye intervalos [inicio, fin): las citas simultáneas necesitan columnas
// separadas, incluso cuando pertenecen a profesionales distintos.
export function distribuirCitas(citas: CitaResponse[]) {
  const ordenadas = citas.map(cita => {
    const fecha = new Date(cita.fecha);
    const inicio = fecha.getHours() * 60 + fecha.getMinutes();
    return { cita, inicio, fin: Math.min(1440, inicio + Math.max(1, duracionCita(cita.servicios))), columna: 0, columnas: 1 };
  }).sort((a, b) => a.inicio - b.inicio || a.cita.id - b.cita.id);
  let grupo: typeof ordenadas = [];
  let finales: number[] = [];
  let finGrupo = -1;
  const terminarGrupo = () => grupo.forEach(evento => { evento.columnas = finales.length; });
  for (const evento of ordenadas) {
    if (evento.inicio >= finGrupo) { terminarGrupo(); grupo = []; finales = []; }
    let columna = finales.findIndex(fin => fin <= evento.inicio);
    if (columna === -1) columna = finales.length;
    finales[columna] = evento.fin;
    evento.columna = columna;
    grupo.push(evento);
    finGrupo = Math.max(finGrupo, evento.fin);
  }
  terminarGrupo();
  return ordenadas;
}
