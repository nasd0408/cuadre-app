import React, { act } from 'react';
import App from '../../App';

const { create } = require('react-test-renderer');
const mockAuth = { isLoading: true, isAuthenticated: true, loadStoredAuth: jest.fn() };
let mockActualizar: () => void;
const mockRemove = jest.fn();
jest.mock('../stores/authStore', () => ({ useAuthStore: (selector?: (state: typeof mockAuth) => unknown) => selector ? selector(mockAuth) : mockAuth }));
jest.mock('../stores/themeStore', () => ({ useThemeStore: (selector: (state: unknown) => unknown) => selector({ mode: 'light', loadTheme: jest.fn() }) }));
jest.mock('../stores/connectionStore', () => ({ useConnectionStore: (selector: (state: unknown) => unknown) => selector({ isOfflineMode: true }) }));
jest.mock('react-native', () => ({ Platform: { OS: 'web' }, useColorScheme: () => 'light' }));
jest.mock('react-native-paper', () => ({ PaperProvider: 'PaperProvider', MD3DarkTheme: {}, MD3LightTheme: {} }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaProvider: 'SafeAreaProvider' }));
jest.mock('expo-status-bar', () => ({ StatusBar: 'StatusBar' }));
jest.mock('@react-navigation/native', () => ({ NavigationContainer: 'NavigationContainer' }));
jest.mock('../analytics', () => ({ analytics: { track: jest.fn(), screen: jest.fn() }, AnalyticsEvent: { AppOpened: 'AppOpened' }, initErrorTracking: jest.fn() }));
jest.mock('../notifications/push', () => ({ registerForPushNotifications: jest.fn().mockResolvedValue(undefined), setupNotificationTapHandling: () => jest.fn() }));
jest.mock('../hooks/useNetworkListener', () => ({ useNetworkListener: jest.fn() }));
jest.mock('../hooks/useOfflineSync', () => ({ useOfflineSync: jest.fn() }));
jest.mock('../ads/useAds', () => ({ useAds: jest.fn() }));
jest.mock('../components/ErrorBoundary', () => 'ErrorBoundary');
jest.mock('../components/ConfirmDialog', () => ({ ConfirmDialogProvider: 'ConfirmDialogProvider' }));
jest.mock('../components/OfflineSyncStatus', () => 'OfflineSyncStatus');
jest.mock('../components/SubscriptionGate', () => 'SubscriptionGate');
jest.mock('../components/Screen', () => 'Screen');
jest.mock('../components', () => ({ LoadingScreen: 'LoadingScreen' }));
jest.mock('../screens/shared/OfflineScreen', () => 'OfflineScreen');
jest.mock('../screens/shared/ConnectionErrorScreen', () => 'ConnectionErrorScreen');
jest.mock('../screens/public/ReservarPublicoScreen', () => 'PublicBooking');
jest.mock('../screens/public/CitaPublicaScreen', () => 'PublicReceipt');
jest.mock('../screens/public/EmpresaPublicaScreen', () => 'PublicProfile');
jest.mock('../navigation/AuthNavigator', () => 'AuthNavigator');
jest.mock('../navigation/AppNavigator', () => 'AppNavigator');
jest.mock('../navigation/navigationRef', () => ({ navigationRef: {}, flushPendingNotificationNavigation: jest.fn() }));

it('la reserva pública ignora el modo offline y errores de la sesión privada, y responde al hash', async () => {
  const previousWindow = (globalThis as any).window;
  const token = 'a'.repeat(64);
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  (globalThis as any).window = { location: { hash: `#/reservar/${token}/13` },
    addEventListener: (_: string, actualizar: () => void) => { mockActualizar = actualizar; }, removeEventListener: mockRemove };
  const previousError = console.error;
  const spy = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) previousError(...args); });
  let render: any;
  try {
    await act(async () => { render = create(React.createElement(App)); });
    expect(render.root.findByType('PublicBooking').props).toMatchObject({ token, empleadoId: 13 });
    for (const type of ['OfflineScreen', 'ConnectionErrorScreen', 'OfflineSyncStatus', 'LoadingScreen', 'SubscriptionGate']) expect(render.root.findAllByType(type)).toHaveLength(0);
    await act(async () => { (globalThis as any).window.location.hash = `#/cita/${token}`; mockActualizar(); });
    expect(render.root.findAllByType('PublicReceipt')).toHaveLength(1);
    await act(async () => { (globalThis as any).window.location.hash = ''; mockActualizar(); });
    expect(render.root.findAllByType('OfflineScreen')).toHaveLength(1);
    expect(render.root.findAllByType('ConnectionErrorScreen')).toHaveLength(1);
  } finally {
    if (render) await act(async () => render.unmount()); spy.mockRestore(); (globalThis as any).window = previousWindow;
  }
  expect(mockRemove).toHaveBeenCalledWith('hashchange', expect.any(Function));
});
