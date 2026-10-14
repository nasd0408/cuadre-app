// services/apiClient.ts
import axios, { AxiosError, create, isCancel, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../stores/authStore";
import { useConnectionStore } from "../stores/connectionStore";

import { secureStorage as storage } from '../utils/secureStorage';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const HEALTH_URL = BASE_URL?.replace(/\/api\/?$/, '');

// ── Refresh token: una sola llamada en vuelo aunque fallen varias requests ──
let refreshPromise: Promise<string | null> | null = null;

async function refreshAuthToken(): Promise<string | null> {
  const refreshToken = await storage.getItem("refresh_token");
  if (!refreshToken) return null;

  try {
    // axios "pelado" (sin interceptores) para evitar recursión
    const res = await axios.post(
      `${BASE_URL}/auth/refresh`,
      { refreshToken },
      { timeout: 15000, headers: { "Content-Type": "application/json" } },
    );
    const { token, refreshToken: newRefreshToken } = res.data;
    await storage.setItem("auth_token", token);
    await storage.setItem("refresh_token", newRefreshToken);
    return token as string;
  } catch {
    return null;
  }
}

export const apiClient = create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ── Request: adjuntar token ──────────────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await storage.getItem("auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers["ngrok-skip-browser-warning"] = "true";
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response: un solo interceptor para todo ──────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    // Si había un error de conexión previo y ahora respondió, limpiarlo
    useConnectionStore.getState().clearConnectionError();
    return response;
  },
  async (error: AxiosError) => {
    // AbortController cancela consultas obsoletas; no significa que cayó el servidor.
    if (isCancel(error)) return Promise.reject(error);
    const { setConnectionError, isOfflineMode } =
      useConnectionStore.getState();

    // Sin respuesta del servidor = red caída o servidor muerto
    if (!error.response) {
      if (!isOfflineMode) {
        await checkHealthAndSetError(setConnectionError);
      }
      return Promise.reject(error);
    }

    // 401: intentar renovar el token antes de cerrar sesión
    if (error.response.status === 401) {
      const { isAuthenticated, logout } = useAuthStore.getState();
      const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
      const isAuthEndpoint = originalRequest?.url?.includes("/auth/") ?? false;

      if (isAuthenticated && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
        originalRequest._retry = true;

        refreshPromise = refreshPromise ?? refreshAuthToken();
        const newToken = await refreshPromise;
        refreshPromise = null;

        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }

        // Refresh falló: la sesión sí expiró
        await storage.deleteItem("auth_token");
        await logout();
      }
      return Promise.reject(error);
    }

    if ([502, 503, 504].includes(error.response.status)) {
      // 502/504 = servidor caído o gateway timeout
      // 503 = servidor vivo pero DB caída (el que devuelve tu /health)
      const isDbError = error.response.status === 503;
      if (!isOfflineMode) {
        setConnectionError(isDbError ? "db_error" : "server_error");
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

// Llama a /health para distinguir si el servidor existe pero la DB falló
async function checkHealthAndSetError(
  setConnectionError: (e: "server_error" | "db_error") => void,
) {
  try {
    const res = await fetch(`${HEALTH_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    // Servidor responde pero unhealthy = DB caída
    setConnectionError(res.ok ? "server_error" : "db_error");
  } catch {
    // No responde de ninguna forma = servidor caído
    setConnectionError("server_error");
  }
}

export default apiClient;
