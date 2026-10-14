// Sincronización de citas agendadas con el calendario del teléfono.
//
// Se escribe en el calendario NATIVO, no contra la API de Google Calendar: en
// Android, si el teléfono tiene la cuenta de Google configurada, el evento aparece
// en Google Calendar solo por la sincronización del sistema. La API de Google
// exigiría un scope sensible con verificación de semanas.
//
// El SDK se carga con require diferido (patrón de src/ads/sdk.ts): un import
// estático tumbaría Expo Go y el bundle de web.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePlanStore } from "../stores/planStore";

const PREF_KEY = "@calendario_activo";
const MAPA_KEY = "@calendario_eventos";
const OFRECIDO_KEY = "@calendario_ofrecido";
const DESTINO_KEY = "@calendario_destino";

/**
 * El mapa citaId -> eventId va SEPARADO POR CUENTA.
 *
 * Estaba en una clave global e indexado por el citaId numerico, que cada empresa
 * reinicia por su cuenta. En un telefono donde se hubieran usado dos cuentas,
 * cancelar la cita 42 de una borraba el evento de calendario de la cita 42 de la
 * otra. Silenciosamente, y en el calendario personal del usuario.
 *
 * Se lee del store con require diferido para no crear un ciclo de importacion:
 * authStore ya usa este mismo patron con planStore.
 */
function cuentaActual(): string {
  try {
    const { useAuthStore } = require("../stores/authStore");
    const user = useAuthStore.getState().user;
    if (!user?.id) return "anon";
    return `${user.empresaId ?? "empresa"}:${user.id}`;
  } catch {
    return "anon";
  }
}

const mapaKey = () => `${MAPA_KEY}:${cuentaActual()}`;

/** Duración por defecto cuando los servicios no la tienen configurada. */
const MINUTOS_POR_DEFECTO = 30;

/** Aviso una hora antes: suficiente para moverse, sin ser molesto. */
const MINUTOS_RECORDATORIO = 60;

let cache: any | null | undefined;

function getSdk(): any | null {
  if (cache !== undefined) return cache;
  try {
    cache = require("expo-calendar");
  } catch {
    cache = null;
  }
  return cache;
}

export const calendarioDisponible = (): boolean => getSdk() != null;

// ── Preferencia del usuario ──

export async function estaActivo(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREF_KEY)) === "true";
  } catch {
    return false;
  }
}

export async function activar(valor: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(PREF_KEY, valor ? "true" : "false");
  } catch {}
}

// ── Descubrimiento ──
//
// Un interruptor apagado enterrado en Ajustes es un interruptor que nadie
// enciende: el usuario agenda su cita, no pasa nada, y concluye que la función
// no sirve. Por eso se ofrece UNA vez, justo después de agendar, que es cuando
// el beneficio se entiende sin explicarlo.

export async function yaSeOfrecio(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(OFRECIDO_KEY)) === "true";
  } catch {
    return true; // Ante la duda no se insiste.
  }
}

export async function marcarOfrecido(): Promise<void> {
  try {
    await AsyncStorage.setItem(OFRECIDO_KEY, "true");
  } catch {}
}

/**
 * Pide permiso de calendario. Se llama SOLO al activar el interruptor, nunca al
 * arrancar la app: pedir permisos sin contexto es la mejor forma de que te los
 * nieguen.
 */
export async function pedirPermiso(): Promise<boolean> {
  const sdk = getSdk();
  if (!sdk) return false;
  try {
    const { status } = await sdk.requestCalendarPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

// ── Mapa citaId -> eventId ──
//
// Se guarda en el dispositivo y no en el backend: evita una migración y una
// columna nueva. Si el usuario reinstala se pierde el mapa y los eventos viejos
// quedan huérfanos en su calendario, que es un coste menor y aceptable.

async function leerMapa(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(mapaKey());
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function guardarMapa(mapa: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(mapaKey(), JSON.stringify(mapa));
  } catch {}
}

/**
 * Valor de ACCOUNT_TYPE para una cuenta de Google en Android.
 *
 * OJO con `source.name`: NO es "Google", es el ACCOUNT_NAME, o sea el correo
 * ("alguien@gmail.com"). Buscar la palabra "google" ahí no acierta nunca y el
 * evento acababa en el primer calendario escribible que hubiera, que puede ser
 * uno local que jamás sube a la nube.
 */
const TIPO_GOOGLE = "com.google";

export interface CalendarioDestino {
  id: string;
  /** Nombre visible, para poder enseñárselo al usuario. */
  titulo: string;
  /** Cuenta propietaria: el correo, o "Solo en este teléfono". */
  cuenta: string;
  /**
   * Si es false, el evento se queda en el teléfono y NO aparece en
   * calendar.google.com ni en otros dispositivos.
   */
  sincronizaConLaNube: boolean;
}

/** SYNC_EVENTS a 0 = el calendario existe pero el sistema no lo sube. */
const seSincroniza = (c: any) => c.isSynced !== false;

const esDeGoogle = (c: any) =>
  c.source?.type === TIPO_GOOGLE && c.source?.isLocalAccount !== true;

function describir(c: any): CalendarioDestino {
  return {
    id: String(c.id),
    titulo: c.title || c.name || "Calendario",
    cuenta:
      c.source?.isLocalAccount === true
        ? "Solo en este teléfono"
        : c.ownerAccount || c.source?.name || "Cuenta del teléfono",
    sincronizaConLaNube: c.source?.isLocalAccount !== true && seSincroniza(c),
  };
}

/** Solo los calendarios donde se puede escribir: el resto no sirve de destino. */
async function escribibles(sdk: any): Promise<any[]> {
  const calendarios = await sdk.getCalendarsAsync(sdk.EntityTypes.EVENT);
  return calendarios.filter((c: any) => c.allowsModifications);
}

/**
 * Todos los destinos posibles, para que el usuario elija. Con varias cuentas de
 * Google la heurística automática siempre acierta a medias, y hay quien prefiere
 * a propósito un calendario local que no suba a ninguna nube.
 */
export async function listarCalendarios(): Promise<CalendarioDestino[]> {
  const sdk = getSdk();
  if (!sdk) return [];

  try {
    const { status } = await sdk.getCalendarPermissionsAsync();
    if (status !== "granted") return [];

    return (await escribibles(sdk)).map(describir);
  } catch {
    return [];
  }
}

/** `null` vuelve a dejarlo en automático. */
export async function fijarDestino(id: string | null): Promise<void> {
  try {
    if (id) await AsyncStorage.setItem(DESTINO_KEY, id);
    else await AsyncStorage.removeItem(DESTINO_KEY);
  } catch {}
}

/** Devuelve el id elegido a mano, o null si está en automático. */
export async function destinoElegido(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(DESTINO_KEY);
  } catch {
    return null;
  }
}

/**
 * La heurística, aislada y sin SDK ni AsyncStorage para poder probarla.
 *
 * Aquí vivía el fallo que mandaba los eventos a un calendario local: comparaba
 * source.name contra "google", pero en Android ese campo es el ACCOUNT_NAME
 * (el correo). Es una decisión con seis casos de desempate y ninguna forma de
 * verla desde fuera, así que va cubierta por tests.
 */
export function elegirDeLista(
  lista: any[],
  preferidoId?: string | null,
): { destino: CalendarioDestino; preferidoPerdido: boolean } | null {
  if (lista.length === 0) return null;

  if (preferidoId) {
    const encontrado = lista.find((c: any) => String(c.id) === preferidoId);
    if (encontrado) return { destino: describir(encontrado), preferidoPerdido: false };
  }

  const elegido =
    // El principal de Google: donde el usuario espera ver sus cosas.
    lista.find((c: any) => esDeGoogle(c) && seSincroniza(c) && c.isPrimary) ??
    // Google titula el principal con el correo de la cuenta.
    lista.find(
      (c: any) => esDeGoogle(c) && seSincroniza(c) && c.title === c.ownerAccount,
    ) ??
    lista.find((c: any) => esDeGoogle(c) && seSincroniza(c)) ??
    // Sin cuenta de Google, al menos uno que salga del teléfono.
    lista.find((c: any) => c.source?.isLocalAccount !== true && seSincroniza(c)) ??
    lista.find((c: any) => c.isPrimary) ??
    lista[0];

  return { destino: describir(elegido), preferidoPerdido: !!preferidoId };
}

/**
 * Calendario donde escribir. Manda lo que haya elegido el usuario; si no eligió
 * —o si el que eligió ya no existe, por ejemplo porque quitó esa cuenta del
 * teléfono— se recurre a la heurística. Devuelve null solo si no hay ninguno
 * donde escribir.
 */
async function elegirCalendario(sdk: any): Promise<CalendarioDestino | null> {
  const resultado = elegirDeLista(await escribibles(sdk), await destinoElegido());
  if (!resultado) return null;

  // El elegido ya no está: se limpia para no reintentar contra un id muerto en
  // cada cita.
  if (resultado.preferidoPerdido) await fijarDestino(null);

  return resultado.destino;
}

/**
 * Dónde van a acabar las citas. Se enseña en Ajustes para que el usuario no
 * tenga que adivinar si el evento sube a Google o se queda en el aparato.
 */
export async function describirDestino(): Promise<CalendarioDestino | null> {
  const sdk = getSdk();
  if (!sdk) return null;

  try {
    const { status } = await sdk.getCalendarPermissionsAsync();
    if (status !== "granted") return null;
    return await elegirCalendario(sdk);
  } catch {
    return null;
  }
}

export interface DatosCita {
  citaId: number;
  fechaISO: string;
  cliente: string;
  empleado?: string;
  servicios: { nombre: string; duracionMinutos?: number }[];
  observaciones?: string;
}

function construirEvento(datos: DatosCita) {
  const inicio = new Date(datos.fechaISO);

  const minutos =
    datos.servicios.reduce((total, s) => total + (s.duracionMinutos || 0), 0) ||
    MINUTOS_POR_DEFECTO;

  const fin = new Date(inicio.getTime() + minutos * 60 * 1000);
  const listaServicios = datos.servicios.map((s) => s.nombre).join(", ");

  const notas = [
    listaServicios ? `Servicios: ${listaServicios}` : null,
    datos.empleado ? `Atiende: ${datos.empleado}` : null,
    datos.observaciones || null,
    "Creado desde CuadreAPP",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title: listaServicios ? `${datos.cliente} · ${listaServicios}` : datos.cliente,
    startDate: inicio,
    endDate: fin,
    notes: notas,
    alarms: [{ relativeOffset: -MINUTOS_RECORDATORIO }],
  };
}

/**
 * Por qué no se creó el evento. Antes esto era un `false` mudo para los cinco
 * casos, así que un usuario con la función apagada veía exactamente lo mismo
 * que uno con un fallo real: nada. Con el motivo, quien llama puede ofrecer
 * activarla, explicar el permiso o callarse, según corresponda.
 */
export type ResultadoCalendario =
  | "creado"
  | "desactivado"
  | "sin_plan"
  | "no_disponible"
  | "sin_permiso"
  | "sin_calendario"
  | "error";

/**
 * Crea el evento de una cita agendada. No hace nada si el usuario no activó la
 * función. Nunca lanza: fallar al escribir en el calendario no puede impedir que
 * la cita quede registrada.
 */
export async function crearEvento(
  datos: DatosCita,
): Promise<ResultadoCalendario> {
  const sdk = getSdk();
  if (!sdk) return "no_disponible";
  if (usePlanStore.getState().plan?.moduloCalendario !== true)
    return "sin_plan";
  if (!(await estaActivo())) return "desactivado";

  try {
    const { status } = await sdk.getCalendarPermissionsAsync();
    if (status !== "granted") return "sin_permiso";

    // Un teléfono sin ninguna cuenta sincronizada no tiene dónde escribir.
    const destino = await elegirCalendario(sdk);
    if (!destino) return "sin_calendario";

    const eventoId = await sdk.createEventAsync(
      destino.id,
      construirEvento(datos),
    );

    const mapa = await leerMapa();
    mapa[String(datos.citaId)] = eventoId;
    await guardarMapa(mapa);

    return "creado";
  } catch {
    return "error";
  }
}

/** Actualiza el evento de una cita reprogramada. */
export async function actualizarEvento(datos: DatosCita): Promise<boolean> {
  const sdk = getSdk();
  if (
    !sdk ||
    usePlanStore.getState().plan?.moduloCalendario !== true ||
    !(await estaActivo())
  )
    return false;

  try {
    const mapa = await leerMapa();
    const eventoId = mapa[String(datos.citaId)];
    if (!eventoId) return (await crearEvento(datos)) === "creado";

    await sdk.updateEventAsync(eventoId, construirEvento(datos));
    return true;
  } catch {
    return false;
  }
}

/** Borra el evento al cancelar la cita. */
export async function borrarEvento(citaId: number): Promise<boolean> {
  const sdk = getSdk();
  if (!sdk) return false;

  try {
    const mapa = await leerMapa();
    const eventoId = mapa[String(citaId)];
    if (!eventoId) return false;

    await sdk.deleteEventAsync(eventoId);
    delete mapa[String(citaId)];
    await guardarMapa(mapa);
    return true;
  } catch {
    return false;
  }
}
