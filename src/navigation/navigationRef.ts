import { createNavigationContainerRef } from '@react-navigation/native';

// Ref global de navegación, para navegar desde fuera de componentes
// (ej. al tocar una notificación push).
export const navigationRef = createNavigationContainerRef();

let pendingNotificationScreen: string | undefined;

/** Navega a la pantalla asociada a una notificación, según su `data.screen`. */
export function navigateFromNotification(screen?: string) {
  if (!screen) return;
  const privateRoutesAvailable =
    navigationRef.isReady() &&
    navigationRef.getRootState()?.routeNames.includes('Main');

  if (!privateRoutesAvailable) {
    pendingNotificationScreen = screen;
    return;
  }

  // navigate está tipado como never sin un ParamList; casteamos para el ref global.
  const navigate = navigationRef.navigate as (...args: any[]) => void;

  switch (screen) {
    case 'Deudores':
      navigate('Main', {
        screen: 'Clientes',
        params: { screen: 'Deudores' },
      });
      break;
    case 'Recordatorios':
      navigate('Main', {
        screen: 'Clientes',
        params: { screen: 'Recordatorios' },
      });
      break;
    case 'Nominas':
      navigate('Main', {
        screen: 'Mas',
        params: { screen: 'Nominas' },
      });
      break;
    case 'Citas':
      navigate('Main', {
        screen: 'Citas',
        params: { screen: 'CitasList' },
      });
      break;
    case 'GestionarCuenta':
      navigate('Main', {
        screen: 'Mas',
        params: { screen: 'GestionarCuenta' },
      });
      break;
    case 'Notificaciones':
      navigate('Notificaciones');
      break;
    case 'Dashboard':
    default:
      navigate('Main', { screen: 'Dashboard' });
      break;
  }
}

export function flushPendingNotificationNavigation() {
  if (!pendingNotificationScreen || !navigationRef.isReady()) return;
  const screen = pendingNotificationScreen;
  pendingNotificationScreen = undefined;
  navigateFromNotification(screen);
}
