// stores/themeStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeStore {
  mode: ThemeMode;
  loadTheme: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: 'light',

  loadTheme: async () => {
    const saved = await AsyncStorage.getItem('theme_mode');
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      set({ mode: saved });
    }
  },

  setMode: async (mode) => {
    set({ mode });
    await AsyncStorage.setItem('theme_mode', mode);
  },
}));
