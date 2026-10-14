// Inicio de sesión con Google (Android). El bundle web usa ./google.web.ts, que
// devuelve siempre "no disponible": el SDK nativo no compila en web y hoy el
// botón de Google solo se ofrece en Android.
//
// El SDK se carga con require diferido y cacheado. Un import estático NO sirve:
// `@react-native-google-signin/google-signin` hace
// `TurboModuleRegistry.getEnforcing('RNGoogleSignin')` al importarse, lo que
// lanza excepción cuando el binario nativo no está — es decir, tumbaría la app
// entera en Expo Go, no solo el login con Google.
let cache: any | null | undefined;

function getGoogleSdk(): any | null {
  if (cache !== undefined) return cache;
  try {
    cache = require("@react-native-google-signin/google-signin");
  } catch {
    cache = null;
  }
  return cache;
}

/**
 * Client ID **Web** del proyecto de Google Cloud.
 *
 * No es un error que sea el "Web" en una app Android: el SDK usa el client de
 * Android (que se resuelve por package name + huella SHA-1, no por config) para
 * autenticar, pero emite el ID token con este de audiencia. Es el mismo valor que
 * debe estar en `Authentication:Google:ClientIds` del backend, o la verificación
 * fallará por audiencia inválida.
 */
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

/**
 * Hay client ID configurado Y el módulo nativo está enlazado.
 *
 * En Expo Go devuelve false, así que el botón de Google no se renderiza: es mejor
 * no ofrecerlo que ofrecer uno que falla siempre.
 */
export const googleDisponible = (): boolean =>
  WEB_CLIENT_ID.length > 0 && getGoogleSdk() != null;

let configurado = false;

function configurar(sdk: any): void {
  if (configurado) return;
  sdk.GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  configurado = true;
}

/** El usuario cerró el diálogo: no es un error que haya que mostrarle. */
export class GoogleCancelado extends Error {}

/**
 * Abre el selector de cuentas de Google y devuelve el ID token.
 * Lanza GoogleCancelado si el usuario cierra el diálogo.
 */
export async function obtenerIdTokenGoogle(): Promise<string> {
  const sdk = getGoogleSdk();

  if (!sdk) {
    throw new Error(
      "El inicio de sesión con Google no está disponible en esta versión de la app.",
    );
  }

  if (!WEB_CLIENT_ID) {
    throw new Error("El inicio de sesión con Google no está configurado.");
  }

  const { GoogleSignin, isErrorWithCode, statusCodes } = sdk;
  configurar(sdk);

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // signOut previo: si no, el SDK reusa la última cuenta en silencio y el
    // usuario no puede cambiar de cuenta desde la app.
    await GoogleSignin.signOut().catch(() => {});

    const respuesta = await GoogleSignin.signIn();

    if (respuesta.type === "cancelled") {
      throw new GoogleCancelado();
    }

    const idToken = respuesta.data?.idToken;
    if (!idToken) {
      throw new Error("Google no devolvió un token. Intenta de nuevo.");
    }

    return idToken;
  } catch (error) {
    if (error instanceof GoogleCancelado) throw error;

    if (isErrorWithCode(error)) {
      switch ((error as any).code) {
        case statusCodes.SIGN_IN_CANCELLED:
          throw new GoogleCancelado();
        case statusCodes.IN_PROGRESS:
          throw new Error("Ya hay un inicio de sesión en curso.");
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error(
            "Este dispositivo no tiene Google Play Services. Inicia sesión con tu correo y contraseña.",
          );
      }
    }

    throw error;
  }
}

/** Cierra la sesión de Google para que la próxima vez vuelva a preguntar la cuenta. */
export async function cerrarSesionGoogle(): Promise<void> {
  const sdk = getGoogleSdk();
  if (!sdk || !WEB_CLIENT_ID) return;
  try {
    configurar(sdk);
    await sdk.GoogleSignin.signOut();
  } catch {}
}
