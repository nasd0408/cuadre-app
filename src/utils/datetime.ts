// Helpers de fecha local del dispositivo, para que el backend calcule "hoy"
// según la zona horaria del usuario (UTC-4/-5 en Venezuela/Cuba) y no la del
// servidor (UTC). Ver DashboardController / CitasController en el backend.

/** Fecha local del dispositivo en formato yyyy-MM-dd. */
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Offset de zona horaria en minutos, mismo convenio que Date.getTimezoneOffset()
 * (positivo al oeste de UTC; UTC-4 => 240).
 */
export function tzOffsetMinutes(date: Date = new Date()): number {
  return date.getTimezoneOffset();
}

/** Query params `fecha` y `tzOffsetMinutes` para los endpoints de "hoy". */
export function localDayParams(date: Date = new Date()): Record<string, string> {
  return {
    fecha: localDateString(date),
    tzOffsetMinutes: String(tzOffsetMinutes(date)),
  };
}
