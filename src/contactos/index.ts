// Alta de clientes desde la agenda del teléfono.
//
// NO se usa presentContactPickerAsync(): ese método lanza
// `Intent(ACTION_PICK).setType(...)` sin URI de datos, y algunos launchers de
// Android resuelven ese intent ambiguo abriendo la GALERÍA en vez de los
// contactos. Comprobado en un teléfono real.
//
// En su lugar se lee la lista con getContactsAsync y se muestra un selector
// propio (components/ContactoPickerModal). Además de evitar el bug, se comporta
// igual en todos los fabricantes y permite buscar y marcar quién ya es cliente.
//
// El SDK se carga con require diferido (patrón de src/ads/sdk.ts): un import
// estático tumbaría la app entera en Expo Go.
let cache: any | null | undefined;

function getSdk(): any | null {
  if (cache !== undefined) return cache;
  try {
    cache = require("expo-contacts");
  } catch {
    cache = null;
  }
  return cache;
}

export interface ContactoDelTelefono {
  id: string;
  nombre: string;
  telefono: string;
}

export const contactosDisponibles = (): boolean => getSdk() != null;

/**
 * Deja solo dígitos y un posible '+' inicial.
 *
 * No se usa buildPhone() de utils/whatsapp: esa función antepone el código de
 * país para armar el enlace de WhatsApp. Aquí se guarda el teléfono tal como lo
 * tiene el usuario; la conversión a internacional ocurre al enviar.
 */
export function limpiarTelefono(valor: string): string {
  const limpio = (valor || "").replace(/[^\d+]/g, "");
  return limpio.startsWith("+")
    ? "+" + limpio.slice(1).replace(/\+/g, "")
    : limpio.replace(/\+/g, "");
}

/** Pide el permiso de lectura de contactos. */
export async function pedirPermiso(): Promise<boolean> {
  const sdk = getSdk();
  if (!sdk) return false;
  try {
    const { status } = await sdk.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

/**
 * Lee la agenda y devuelve solo los contactos que tienen teléfono: uno sin
 * número no sirve para dar de alta a un cliente.
 */
export async function listarContactos(): Promise<ContactoDelTelefono[]> {
  const sdk = getSdk();
  if (!sdk) return [];

  try {
    const { data } = await sdk.getContactsAsync({
      fields: [sdk.Fields.Name, sdk.Fields.PhoneNumbers],
      sort: sdk.SortTypes.FirstName,
    });

    return (data || [])
      .map((c: any) => ({
        id: String(c.id),
        nombre: (c.name || "").trim(),
        telefono: limpiarTelefono(c.phoneNumbers?.[0]?.number ?? ""),
      }))
      .filter((c: ContactoDelTelefono) => c.nombre && c.telefono);
  } catch {
    return [];
  }
}
