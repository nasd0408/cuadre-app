import { fechaValida, horaAMinutos, minutosAHora } from '../utils/horarios';

it.each([['00:00', 0], ['09:30', 570], ['24:00', 1440]])('convierte %s sin depender de la zona del dispositivo', (hora, minutos) => {
  expect(horaAMinutos(hora)).toBe(minutos);
  expect(minutosAHora(minutos)).toBe(hora);
});

it.each(['2030-02-30', '2030-02-29', '2030-13-01', '2030-00-01', '30-01-01', ''])('rechaza fecha inexistente %s', fecha => {
  expect(fechaValida(fecha)).toBe(false);
});
it.each(['2032-02-29', '2030-01-07'])('admite fechas reales %s', fecha => {
  expect(fechaValida(fecha)).toBe(true);
});
it.each(['9:00', '25:00', '24:30', '09:60', '', '9am'])('rechaza hora inválida %s', hora => {
  expect(() => horaAMinutos(hora)).toThrow();
});
