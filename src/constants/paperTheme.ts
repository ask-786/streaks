import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { lightPalette, darkPalette } from './colors';

// ─── React Native Paper Themes ───────────────────────────────────────────────
// Paper only supplies Text/IconButton/FAB here, but its theme still drives
// ripple tints and disabled states, so it needs the full semantic mapping.

export const lightPaperTheme = {
  ...MD3LightTheme,
  roundness: 14,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightPalette.primary,
    onPrimary: lightPalette.onPrimary,
    primaryContainer: lightPalette.primaryMuted,
    onPrimaryContainer: lightPalette.primaryHover,
    secondary: lightPalette.accent,
    onSecondary: '#FFFFFF',
    secondaryContainer: lightPalette.accentMuted,
    error: lightPalette.danger,
    errorContainer: lightPalette.dangerMuted,
    background: lightPalette.background,
    onBackground: lightPalette.textPrimary,
    surface: lightPalette.surface,
    onSurface: lightPalette.textPrimary,
    surfaceVariant: lightPalette.surfaceVariant,
    onSurfaceVariant: lightPalette.textSecondary,
    outline: lightPalette.borderStrong,
    outlineVariant: lightPalette.border,
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level0: 'transparent',
      level1: lightPalette.surface,
      level2: lightPalette.surface,
      level3: lightPalette.surfaceRaised,
      level4: lightPalette.surfaceRaised,
      level5: lightPalette.surfaceRaised,
    },
  },
};

export const darkPaperTheme = {
  ...MD3DarkTheme,
  roundness: 14,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkPalette.primary,
    onPrimary: darkPalette.onPrimary,
    primaryContainer: darkPalette.primaryMuted,
    onPrimaryContainer: darkPalette.primaryHover,
    secondary: darkPalette.accent,
    onSecondary: '#0B0B14',
    secondaryContainer: darkPalette.accentMuted,
    error: darkPalette.danger,
    errorContainer: darkPalette.dangerMuted,
    background: darkPalette.background,
    onBackground: darkPalette.textPrimary,
    surface: darkPalette.surface,
    onSurface: darkPalette.textPrimary,
    surfaceVariant: darkPalette.surfaceVariant,
    onSurfaceVariant: darkPalette.textSecondary,
    outline: darkPalette.borderStrong,
    outlineVariant: darkPalette.border,
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: 'transparent',
      level1: darkPalette.surface,
      level2: darkPalette.surface,
      level3: darkPalette.surfaceRaised,
      level4: darkPalette.surfaceRaised,
      level5: darkPalette.surfaceRaised,
    },
  },
};
