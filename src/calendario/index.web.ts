// Stub de web: expo-calendar no tiene build de web y el bundle nunca debe
// resolverlo. El ajuste de calendario no se ofrece en la versión web.
export interface DatosCita {
  citaId: number;
  fechaISO: string;
  cliente: string;
  empleado?: string;
  servicios: { nombre: string; duracionMinutos?: number }[];
  observaciones?: string;
}

export type ResultadoCalendario =
  | 'creado'
  | 'desactivado'
  | 'sin_plan'
  | 'no_disponible'
  | 'sin_permiso'
  | 'sin_calendario'
  | 'error';

export interface CalendarioDestino {
  id: string;
  titulo: string;
  cuenta: string;
  sincronizaConLaNube: boolean;
}

export const calendarioDisponible = (): boolean => false;

export async function describirDestino(): Promise<CalendarioDestino | null> {
  return null;
}

export async function listarCalendarios(): Promise<CalendarioDestino[]> {
  return [];
}

export async function fijarDestino(_id: string | null): Promise<void> {}

export async function destinoElegido(): Promise<string | null> {
  return null;
}

export async function estaActivo(): Promise<boolean> {
  return false;
}

export async function activar(_valor: boolean): Promise<void> {}

export async function yaSeOfrecio(): Promise<boolean> {
  return true;
}

export async function marcarOfrecido(): Promise<void> {}

export async function pedirPermiso(): Promise<boolean> {
  return false;
}

export async function crearEvento(
  _datos: DatosCita,
): Promise<ResultadoCalendario> {
  return 'no_disponible';
}

export async function actualizarEvento(_datos: DatosCita): Promise<boolean> {
  return false;
}

export async function borrarEvento(_citaId: number): Promise<boolean> {
  return false;
}
