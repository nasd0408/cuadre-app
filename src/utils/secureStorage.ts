import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Almacenamiento del token de sesión.
 *
 * Estaba duplicado, palabra por palabra, en `api/client.ts` y en
 * `stores/authStore.ts`. Dos copias del sitio donde se guardan las credenciales
 * es una invitación a que se arreglen a medias: cualquier cambio en una tenía
 * que acordarse de la otra, y el borrado de una clave en `logout` ya vivía en un
 * fichero distinto del que la escribía.
 *
 * En nativo usa SecureStore (Keystore de Android / Keychain de iOS). En web cae
 * a localStorage, que es accesible desde cualquier XSS: es una limitación
 * conocida de la versión web, no un descuido.
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web") return localStorage.getItem(key);
      return await SecureStore.getItemAsync(key);
    } catch {
      // Un fallo leyendo el token equivale a no tener sesión, no a romper la app.
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
