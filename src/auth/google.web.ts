// Stub de web: el botón de Google hoy solo se ofrece en Android. Metro resuelve
// este archivo al exportar para web, así que el bundle nunca alcanza el SDK nativo.
export class GoogleCancelado extends Error {}

export const googleDisponible = (): boolean => false;

export async function obtenerIdTokenGoogle(): Promise<string> {
  throw new Error("El inicio de sesión con Google no está disponible en la web.");
}

export async function cerrarSesionGoogle(): Promise<void> {}
