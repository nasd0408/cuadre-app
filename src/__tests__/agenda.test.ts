import { distribuirCitas, duracionCita, filtrosRangoCitas, moverFechaAgenda, rangoAgenda } from '../utils/agenda';
import { CitaResponse } from '../types';

it('el rango diario incluye la noche sin cambiar la fecha original', () => {
  const fecha = new Date(2030, 0, 7, 14, 35);
  const { from, to } = rangoAgenda(fecha, 'day');
  expect(from).toEqual(new Date(2030, 0, 7, 0, 0, 0, 0));
  expect(to).toEqual(new Date(2030, 0, 7, 23, 59, 59, 999));
  expect(fecha.getHours()).toBe(14);
});

it('la semana incluye sábado completo aunque cruce de año', () => {
  const { from, to } = rangoAgenda(new Date(2030, 0, 1), 'week');
  expect(from).toEqual(new Date(2029, 11, 30));
  expect(to).toEqual(new Date(2030, 0, 5, 23, 59, 59, 999));
});

it('febrero bisiesto termina el día 29 a última hora', () => {
  const { from, to } = rangoAgenda(new Date(2028, 1, 23), 'month');
  expect(from).toEqual(new Date(2028, 1, 1));
  expect(to).toEqual(new Date(2028, 1, 29, 23, 59, 59, 999));
});

it('avanzar desde enero 31 llega a febrero y retroceder desde marzo 31 también', () => {
  expect(moverFechaAgenda(new Date(2030, 0, 31), 'month', 1)).toEqual(new Date(2030, 1, 1));
  expect(moverFechaAgenda(new Date(2030, 2, 31), 'month', -1)).toEqual(new Date(2030, 1, 1));
});

it('los límites enviados compensan las 24h añadidas por GET /citas', () => {
  // Día de 23h: compensar milisegundos, no restar un día de calendario local.
  const from = new Date('2030-03-31T00:00:00.000Z');
  const to = new Date('2030-03-31T22:59:59.999Z');
  const filtros = filtrosRangoCitas(from, to);
  expect(filtros.fechaDesde).toBe(from.toISOString());
  expect(new Date(new Date(filtros.fechaHasta).getTime() + 86_400_000)).toEqual(to);
});

it('suma duración guardada por cantidad y conserva compatibilidad con APIs antiguas', () => {
  expect(duracionCita([{ duracionMinutos: 30, cantidad: 2 }, { duracionMinutos: 90, cantidad: 1 }])).toBe(150);
  expect(duracionCita([{ cantidad: 2 } as any])).toBe(60);
  expect(duracionCita([])).toBe(30);
});

const cita = (id: number, hora: number, minuto: number, duracion: number) => ({
  id, fecha: new Date(2030, 0, 7, hora, minuto).toISOString(),
  servicios: [{ duracionMinutos: duracion, cantidad: 1 }],
} as CitaResponse);

it('separa citas simultáneas y permite que una cita empiece al terminar otra', () => {
  const eventos = distribuirCitas([cita(1, 9, 0, 60), cita(2, 9, 0, 30), cita(3, 9, 30, 30)]);
  expect(eventos.map(e => [e.columna, e.columnas])).toEqual([[0, 2], [1, 2], [1, 2]]);
});

it('restaura todo el ancho para una cita posterior al grupo de solapamientos', () => {
  const citas = [cita(3, 10, 0, 30), cita(2, 9, 30, 30), cita(1, 9, 0, 60)];
  const eventos = distribuirCitas(citas);
  expect(eventos.map(e => [e.cita.id, e.columnas])).toEqual([[1, 2], [2, 2], [3, 1]]);
  expect(citas.map(c => c.id)).toEqual([3, 2, 1]);
});

it('un grupo encadenado conserva columnas sin esconder citas que se solapan', () => {
  const eventos = distribuirCitas([cita(1, 9, 0, 60), cita(2, 9, 30, 60), cita(3, 10, 0, 60)]);
  expect(eventos.map(e => [e.columna, e.columnas])).toEqual([[0, 2], [1, 2], [0, 2]]);
});
