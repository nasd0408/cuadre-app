// Utilidades para abrir WhatsApp con un mensaje pre-armado.
//
// Problemas que resuelve frente al `wa.me` pelado que había antes:
//  1. Código de país: wa.me exige número internacional (ej. 58412...), no local.
//  2. WhatsApp Business vs personal: en Android se fuerza el paquete correcto
//     (com.whatsapp.w4b / com.whatsapp) para que abra donde el barbero tiene
//     sus chats de clientes, en vez de la app por defecto del sistema.
import { Linking, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

export type WhatsAppApp = 'business' | 'personal' | 'ask';

const PACKAGE: Record<Exclude<WhatsAppApp, 'ask'>, string> = {
  business: 'com.whatsapp.w4b',
  personal: 'com.whatsapp',
};

/**
 * Normaliza un teléfono a formato internacional solo dígitos.
 * - Quita espacios, guiones, paréntesis y '+'.
 * - Quita un '0' inicial de trunk nacional (ej. 0412... -> 412...).
 * - Antepone el código de país si el número no lo tiene ya.
 */
export function buildPhone(telefono: string, codigoPais: string): string {
  const cc = (codigoPais || '').replace(/\D/g, '');
  let num = (telefono || '').replace(/\D/g, '');

  if (!num) return '';

  // Ya viene con el código de país al frente
  if (cc && num.startsWith(cc)) return num;

  // Quitar cero(s) de trunk nacional
  num = num.replace(/^0+/, '');

  return cc ? `${cc}${num}` : num;
}

/** Reemplaza variables {clave} en la plantilla. Claves faltantes quedan vacías. */
export function renderTemplate(
  template: string,
  vars: Record<string, string | number | undefined | null>,
): string {
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

interface OpenWhatsAppOptions {
  telefono: string;
  codigoPais: string;
  mensaje: string;
  /** 'ask' NO se acepta aquí: la elección se resuelve antes (ver useEnviarWhatsApp). */
  app: Exclude<WhatsAppApp, 'ask'>;
}

export type ResultadoWhatsApp =
  /** Se abrió WhatsApp. `appUsada` dice cuál, o 'sistema' si lo eligió Android. */
  | { estado: 'abierto'; appUsada: Exclude<WhatsAppApp, 'ask'> | 'sistema' }
  /** No hay ningún WhatsApp con el que abrir el chat. */
  | { estado: 'sin_whatsapp' };

/**
 * Abre WhatsApp con el chat del número y el texto pre-cargado.
 *
 * Estrategia en Android, en este orden:
 *   1. La app preferida, por paquete.
 *   2. La otra, por paquete.
 *   3. `https://wa.me/…`, que abre la que haya (o el selector del sistema).
 *
 * Que no esté instalada la preferida es un caso NORMAL —muchísima gente usa solo
 * WhatsApp normal—, no un error: se cae a la siguiente sin molestar al usuario.
 * Solo se reporta fallo cuando no hay absolutamente nada con que abrir el chat.
 *
 * El paso 1 depende de la declaración <queries> del manifiesto
 * (plugins/withWhatsAppQueries.js). Sin ella, Android 11+ impide resolver el
 * paquete aunque esté instalado y siempre se terminaría en el paso 3.
 */
export async function openWhatsApp({
  telefono,
  codigoPais,
  mensaje,
  app,
}: OpenWhatsAppOptions): Promise<ResultadoWhatsApp> {
  const phone = buildPhone(telefono, codigoPais);
  const text = encodeURIComponent(mensaje);
  const waMe = `https://wa.me/${phone}?text=${text}`;

  if (Platform.OS === 'android') {
    const otra = app === 'business' ? 'personal' : 'business';

    for (const candidata of [app, otra] as const) {
      try {
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: waMe,
          packageName: PACKAGE[candidata],
        });
        return { estado: 'abierto', appUsada: candidata };
      } catch {
        // No instalada o no visible para el manifiesto: probar la siguiente.
      }
    }
  } else {
    // iOS: no se puede elegir paquete, se abre el WhatsApp que haya.
    const scheme = `whatsapp://send?phone=${phone}&text=${text}`;
    try {
      if (await Linking.canOpenURL(scheme)) {
        await Linking.openURL(scheme);
        return { estado: 'abierto', appUsada: 'sistema' };
      }
    } catch {
      // sigue al fallback web
    }
  }

  try {
    await Linking.openURL(waMe);
    return { estado: 'abierto', appUsada: 'sistema' };
  } catch {
    return { estado: 'sin_whatsapp' };
  }
}
