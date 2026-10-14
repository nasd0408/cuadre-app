export function horaAMinutos(hora: string): number {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora) && hora !== '24:00')
    throw new Error('Usa horas en formato HH:mm, por ejemplo 09:00 o 18:30.');
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}
export function minutosAHora(minutos: number): string {
  return `${Math.floor(minutos / 60).toString().padStart(2, '0')}:${(minutos % 60).toString().padStart(2, '0')}`;
}

export function fechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const date = new Date(`${fecha}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === fecha && +fecha.slice(0, 4) >= 2000 && +fecha.slice(0, 4) <= 2100;
}
