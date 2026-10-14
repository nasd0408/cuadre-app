// Registro y manejo de notificaciones push (Expo).
//
// IMPORTANTE: desde Expo SDK 53, Expo Go NO recibe push en Android. Para probar
// notificaciones hay que usar un development build + FCM. En Expo Go este módulo
// no falla: simplemente no registra token (se detecta y se omite).
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificacionesApi } from '../api/notificaciones';
import { navigateFromNotification } from '../navigation/navigationRef';
import { analytics } from '../analytics';

const TOKEN_KEY = 'expo_push_token';

// En primer plano: mostrar la notificación igual (banner + sonido).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function esExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

/**
 * Pide permiso, obtiene el ExpoPushToken y lo registra en el backend.
 * Seguro de llamar siempre: no hace nada en simulador ni en Expo Go.
 */
export async function registerForPushNotifications(
  requestPermission = false,
): Promise<string | null> {
  if (!Device.isDevice || esExpoGo()) {
    // Simulador o Expo Go: push no soportado. No es error.
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B6A1D',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted' && requestPermission) {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') {
    if (status === 'denied') await unregisterPushToken();
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId;

  if (!projectId) return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await notificacionesApi.registrarToken(token, Platform.OS);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch {
    return null;
  }
}

/** Al cerrar sesión: borrar el token en el backend para no seguir enviando. */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      await notificacionesApi.eliminarToken(token).catch(() => {});
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // best-effort
  }
}

/**
 * Suscribe el manejo de "tap" en una notificación (navega a la pantalla).
 * Devuelve una función para desuscribir. Llamar una vez al montar la app.
 */
export function setupNotificationTapHandling(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const screen = (response.notification.request.content.data as any)?.screen;
    analytics.track('push_opened', { screen });
    navigateFromNotification(screen);
  });

  // Si la app se abrió DESDE una notificación (estaba cerrada)
  Notifications.getLastNotificationResponseAsync().then((response) => {
    const screen = (response?.notification.request.content.data as any)?.screen;
    if (screen) {
      analytics.track('push_opened', { screen, appState: 'cold_start' });
      navigateFromNotification(screen);
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
    }
  });

  return () => sub.remove();
}
