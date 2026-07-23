import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export type ThemePreference = 'light' | 'dark' | 'system';

type ThemeContextType = {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
};

const SETTINGS_FILE = FileSystem.documentDirectory + 'theme_settings.json';

const ThemeContext = createContext<ThemeContextType>({
  preference: 'system',
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Load saved preference on mount
  useEffect(() => {
    async function loadPreference() {
      try {
        const info = await FileSystem.getInfoAsync(SETTINGS_FILE);
        if (info.exists) {
          const json = await FileSystem.readAsStringAsync(SETTINGS_FILE);
          const data = JSON.parse(json);
          if (data.theme) {
            applyTheme(data.theme);
            setPreferenceState(data.theme);
          }
        }
      } catch (e) {
        console.warn('Failed to load theme preference:', e);
      }
    }
    loadPreference();
  }, []);

  const applyTheme = (pref: ThemePreference) => {
    if (pref === 'system') {
      Appearance.setColorScheme(null); // Follow system
    } else {
      Appearance.setColorScheme(pref);
    }
  };

  const setPreference = async (pref: ThemePreference) => {
    setPreferenceState(pref);
    applyTheme(pref);
    try {
      await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify({ theme: pref }));
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemePreference() {
  return useContext(ThemeContext);
}
