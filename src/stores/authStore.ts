import { create } from 'zustand';
import { User, AuthResponse } from '../types';
import { analytics, AnalyticsEvent } from '../analytics';

// Token de sesión: wrapper único, compartido con api/client.ts
import { secureStorage as storage } from '../utils/secureStorage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isBarbero: boolean;
  isSuperAdmin: boolean;

  setUser: (authResponse: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

/** Ver la guarda de reentrada en logout(). */
let cerrandoSesion = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAdmin: false,
  isBarbero: false,
  isSuperAdmin: false,

  setUser: async (authResponse: AuthResponse) => {
    const user: User = {
      id: authResponse.userId,
      email: authResponse.userEmail,
      nombreCompleto: authResponse.userName,
      empresa: authResponse.empresa,
      empresaId: authResponse.empresaId,
      roles: authResponse.roles,
      token: authResponse.token,
    };

    await storage.setItem('auth_token', authResponse.token);
    if (authResponse.refreshToken) {
      await storage.setItem('refresh_token', authResponse.refreshToken);
    }
    await storage.setItem('user_data', JSON.stringify(user));

    set({
      user,
      isAuthenticated: true,
      isAdmin: authResponse.roles.includes('Admin'),
      isBarbero: authResponse.roles.includes('Barbero'),
      isSuperAdmin: authResponse.roles.includes('SuperAdmin'),
      isLoading: false,
    });
    // Sin `empresa`: GA4 prohíbe enviar datos identificables, y el nombre del
    // negocio lo es. Con empresaId y rol se segmenta igual.
    analytics.identify(user.id, {
      empresaId: user.empresaId,
      rol: user.roles[0],
    });
    analytics.track(AnalyticsEvent.LoginSucceeded, { rol: user.roles[0] });

    const { usePlanStore } = require('./planStore');

    await usePlanStore.getState().fetchPlan();
  },

  logout: async () => {
    // Guarda de reentrada.
    //
    // El interceptor de axios llama a logout() cuando el refresh falla, y lo hace
    // UNA VEZ POR PETICION EN VUELO: con cinco peticiones simultaneas se
    // disparaban cinco borrados de token push, cinco POST /auth/logout y cinco
    // cierres de sesion de Google. Ademas de ruido, es una carrera contra si
    // mismo.
    if (cerrandoSesion) return;
    cerrandoSesion = true;

    try {
    // Borrar el token push en el servidor ANTES de limpiar el auth token
    // (el endpoint requiere autenticación). Lazy require para evitar ciclos.
    try {
      const { unregisterPushToken } = require('../notifications/push');
      await unregisterPushToken();
    } catch {}

    // Revocar el refresh token en el servidor (best-effort, sin bloquear el logout)
    try {
      const refreshToken = await storage.getItem('refresh_token');
      const baseUrl = process.env.EXPO_PUBLIC_API_URL;
      if (refreshToken && baseUrl) {
        fetch(`${baseUrl}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {});
      }
    } catch {}

    // Cerrar también la sesión de Google: si no, el próximo login reusa la última
    // cuenta en silencio y no se puede cambiar de usuario desde la app.
    try {
      const { cerrarSesionGoogle } = require('../auth/google');
      await cerrarSesionGoogle();
    } catch {}

    await storage.deleteItem('auth_token');
    await storage.deleteItem('refresh_token');
    await storage.deleteItem('user_data');
    analytics.reset();
    const { usePlanStore } = require('./planStore');
    const { useMensajeriaStore } = require('./mensajeriaStore');

    await usePlanStore.getState().clear();
    useMensajeriaStore.getState().clear();

    // Lo que antes NO se limpiaba y viajaba de una cuenta a la siguiente.
    // Cada uno va en su try: que falle uno no puede impedir el cierre de sesion.

    // El estado de suscripcion del usuario anterior hacia que el siguiente viera
    // la pantalla de "cuenta suspendida" hasta que respondiera checkStatus().
    try {
      const { useSubscriptionStore } = require('./subscriptionStore');
      useSubscriptionStore.getState().clearStatus();
    } catch {}

    // adsStore.clear() existia y no se llamaba desde ningun sitio: un usuario de
    // plan pago heredaba los topes diarios de anuncios del usuario Gratis anterior.
    try {
      const { useAdsStore } = require('../ads/adsStore');
      await useAdsStore.getState().clear();
    } catch {}

    // Las credenciales biometricas sobrevivian al logout: la huella seguia
    // entrando a la cuenta anterior.
    try {
      const { deleteItemAsync } = require('expo-secure-store');
      await Promise.all([
        deleteItemAsync('biometric_refresh_token'),
        // Clave de versiones anteriores: guardaba la contraseña en claro.
        deleteItemAsync('biometric_saved_credentials'),
        deleteItemAsync('biometric_saved_email'),
        deleteItemAsync('biometric_enabled'),
      ]);
    } catch {}

    set({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      isBarbero: false,
      isSuperAdmin: false,
      isLoading: false,
    });
    } finally {
      cerrandoSesion = false;
    }
  },

  loadStoredAuth: async () => {
    try {
      const token = await storage.getItem('auth_token');
      const userData = await storage.getItem('user_data');

      if (token && userData) {
        const user: User = JSON.parse(userData);
        set({
          user,
          isAuthenticated: true,
          isAdmin: user.roles.includes('Admin'),
          isBarbero: user.roles.includes('Barbero'),
          isSuperAdmin: user.roles.includes('SuperAdmin'),
          isLoading: false,
        });

        // La sesión almacenada y su plan forman una sola hidratación. Si el plan
        // se pide antes de recuperar la sesión, puede responder 401 y rescatar del
        // caché el plan de otro usuario del mismo dispositivo.
        const { usePlanStore } = require('./planStore');
        await usePlanStore.getState().fetchPlan();
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      analytics.captureError(error, { origen: 'authStore', detalle: 'Error loading stored auth:' });
      set({ isLoading: false });
    }
  },
}));
