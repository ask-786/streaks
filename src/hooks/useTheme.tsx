import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Colors,
  lightPalette,
  darkPalette,
  CalendarColors,
  ThemePalette,
  createElevation,
  ElevationSet,
  lightPaperTheme,
  darkPaperTheme,
  StorageKeys,
} from '../constants';

/** User preference. `system` follows the OS and is the default. */
export type ThemePreference = 'light' | 'dark' | 'system';
type ThemeMode = 'light' | 'dark';

/**
 * Resolved colour set. This is the flat back-compat `Colors` shape overlaid with
 * the full semantic palette, so `colors.surface` and `colors.textTertiary` both
 * work and both follow the active mode.
 */
export type ResolvedColors = typeof Colors & ThemePalette;

interface ThemeContextValue {
  /** Currently rendered mode — always concrete. */
  mode: ThemeMode;
  /** What the user actually chose, including `system`. */
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  /** Cycles light → dark → light. Kept for the existing switch in Settings. */
  toggleTheme: () => void;
  isDark: boolean;
  colors: ResolvedColors;
  elevation: ElevationSet;
  calendar: typeof CalendarColors.light;
  paperTheme: typeof lightPaperTheme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Load persisted preference on mount. Values written by older builds were
  // only ever 'light' | 'dark', so they read back cleanly.
  useEffect(() => {
    AsyncStorage.getItem(StorageKeys.THEME).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setPreferenceState(saved);
      }
    });
  }, []);

  const mode: ThemeMode =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const isDark = mode === 'dark';

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(StorageKeys.THEME, pref);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(isDark ? 'light' : 'dark');
  }, [isDark, setPreference]);

  const value = useMemo<ThemeContextValue>(() => {
    const palette = isDark ? darkPalette : lightPalette;

    const colors: ResolvedColors = {
      ...Colors,
      ...palette,
      // Keep the legacy aliases pointing at the active palette so screens that
      // still read `colors.card` / `colors.error` stay theme-correct.
      card: palette.surface,
      primaryContainer: palette.primaryMuted,
      error: palette.danger,
      errorLight: palette.dangerMuted,
      successLight: palette.successMuted,
      warningLight: palette.warningMuted,
      textOnPrimary: palette.onPrimary,
    };

    return {
      mode,
      preference,
      setPreference,
      toggleTheme,
      isDark,
      colors,
      elevation: createElevation(palette, isDark),
      calendar: isDark ? CalendarColors.dark : CalendarColors.light,
      paperTheme: isDark ? darkPaperTheme : lightPaperTheme,
    };
  }, [isDark, mode, preference, setPreference, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
