// Stub de web: expo-contacts no tiene build de web y el bundle nunca debe
// resolverlo. El selector de contactos no se ofrece en la versión web.
export interface ContactoDelTelefono {
  id: string;
  nombre: string;
  telefono: string;
}

export const contactosDisponibles = (): boolean => false;

export function limpiarTelefono(valor: string): string {
  return (valor || "").replace(/[^\d+]/g, "");
}

export async function pedirPermiso(): Promise<boolean> {
  return false;
}

export async function listarContactos(): Promise<ContactoDelTelefono[]> {
  return [];
}
