// ─── Color System ────────────────────────────────────────────────────────────
// Two layers:
//   1. Ramps  — raw, mode-agnostic tonal scales. Never used directly in screens.
//   2. Themes — semantic tokens resolved per mode. Read these via `useTheme()`.
//
// The brand hue is taken from the app icon (#5D51E4) and paired with an ember
// accent that echoes the flames in the mark — streaks are warm, the chrome is cool.

// ─── Ramps ───────────────────────────────────────────────────────────────────
export const Ramp = {
  // Brand indigo
  indigo: {
    50: '#F1EFFE',
    100: '#E4E0FF',
    200: '#CBC3FF',
    300: '#AEA1FB',
    400: '#8E7CF4',
    500: '#6D5CE7',
    600: '#5D51E4', // icon brand
    700: '#4A3FC0',
    800: '#39319A',
    900: '#272170',
  },
  // Ember accent — streak heat
  ember: {
    50: '#FFF4EC',
    100: '#FFE6D3',
    200: '#FFC9A3',
    300: '#FFA76B',
    400: '#FB8B3C',
    500: '#F1741B',
    600: '#D65C0C',
    700: '#A94709',
  },
  // Emerald — success / logged
  emerald: {
    50: '#ECFDF5',
    100: '#D2F8E7',
    200: '#A2EFD0',
    300: '#5FDDB0',
    400: '#2FC894',
    500: '#12A97A',
    600: '#0C8862',
    700: '#0A6B4E',
  },
  // Amber — warning / best streak
  amber: {
    50: '#FFF9EB',
    100: '#FFEFC7',
    200: '#FFDC8A',
    300: '#FFC44D',
    400: '#F7A916',
    500: '#DC8908',
    600: '#B06904',
  },
  // Rose — destructive / missed
  rose: {
    50: '#FFF1F3',
    100: '#FFE0E5',
    200: '#FFC1CB',
    300: '#FF8FA2',
    400: '#F65C78',
    500: '#E11D48',
    600: '#BE123C',
  },
  // Cool neutrals, nudged a few degrees toward the brand hue so greys never
  // look muddy next to indigo.
  slate: {
    0: '#FFFFFF',
    25: '#FBFBFE',
    50: '#F6F6FB',
    100: '#EEEEF6',
    150: '#E6E6F1',
    200: '#DCDCEA',
    300: '#C3C3D6',
    400: '#9C9CB6',
    500: '#75758F',
    600: '#585873',
    700: '#3F3F58',
    800: '#25253A',
    850: '#1C1C2B',
    900: '#14141F',
    950: '#0B0B14',
  },
};

// ─── Semantic themes ─────────────────────────────────────────────────────────
export interface ThemePalette {
  // Brand
  primary: string;
  primaryHover: string;
  primaryMuted: string; // tinted fill behind primary content
  primarySubtle: string; // faintest brand wash
  onPrimary: string;
  primaryBorder: string;

  // Accent
  accent: string;
  accentMuted: string;

  // Semantic
  success: string;
  successMuted: string;
  successBorder: string;
  warning: string;
  warningMuted: string;
  warningBorder: string;
  danger: string;
  dangerMuted: string;
  dangerBorder: string;

  // Surfaces — background < surface < surfaceRaised, sunken sits below background
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  surfaceVariant: string;

  // Lines
  border: string;
  borderStrong: string;
  divider: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  textOnColor: string;

  // Effects
  shadowColor: string;
  scrim: string;
  skeleton: string;
}

export const lightPalette: ThemePalette = {
  primary: Ramp.indigo[600],
  primaryHover: Ramp.indigo[700],
  primaryMuted: Ramp.indigo[100],
  primarySubtle: Ramp.indigo[50],
  onPrimary: '#FFFFFF',
  primaryBorder: Ramp.indigo[200],

  accent: Ramp.ember[500],
  accentMuted: Ramp.ember[100],

  success: Ramp.emerald[500],
  successMuted: Ramp.emerald[50],
  successBorder: Ramp.emerald[200],
  warning: Ramp.amber[500],
  warningMuted: Ramp.amber[50],
  warningBorder: Ramp.amber[200],
  danger: Ramp.rose[500],
  dangerMuted: Ramp.rose[50],
  dangerBorder: Ramp.rose[200],

  background: Ramp.slate[50],
  backgroundElevated: Ramp.slate[25],
  surface: Ramp.slate[0],
  surfaceRaised: Ramp.slate[0],
  surfaceSunken: Ramp.slate[100],
  surfaceVariant: Ramp.slate[100],

  border: '#E8E8F2',
  borderStrong: Ramp.slate[200],
  divider: '#EFEFF6',

  textPrimary: '#14142B',
  textSecondary: Ramp.slate[600],
  textTertiary: Ramp.slate[500],
  textDisabled: Ramp.slate[400],
  textOnColor: '#FFFFFF',

  // Tinted rather than pure black — this is what stops light-mode cards from
  // looking like grey smudges.
  shadowColor: '#2A2359',
  scrim: 'rgba(17, 16, 38, 0.44)',
  skeleton: Ramp.slate[150],
};

export const darkPalette: ThemePalette = {
  primary: Ramp.indigo[400],
  primaryHover: Ramp.indigo[300],
  primaryMuted: '#241F4D',
  primarySubtle: '#1B1839',
  onPrimary: '#0B0B14',
  primaryBorder: '#37307A',

  accent: Ramp.ember[300],
  accentMuted: '#3A2312',

  success: Ramp.emerald[300],
  successMuted: '#0C2B22',
  successBorder: '#16543F',
  warning: Ramp.amber[300],
  warningMuted: '#332305',
  warningBorder: '#5C420C',
  danger: Ramp.rose[300],
  dangerMuted: '#3A1220',
  dangerBorder: '#66203A',

  background: Ramp.slate[950],
  backgroundElevated: '#101019',
  surface: Ramp.slate[900],
  surfaceRaised: Ramp.slate[850],
  surfaceSunken: '#08080F',
  surfaceVariant: '#1F1F2E',

  border: '#262636',
  borderStrong: '#333349',
  divider: '#1F1F2D',

  textPrimary: '#ECECF7',
  textSecondary: '#9A9AB8',
  textTertiary: '#7A7A98',
  textDisabled: '#55556E',
  textOnColor: '#0B0B14',

  shadowColor: '#000000',
  scrim: 'rgba(3, 3, 8, 0.68)',
  skeleton: '#1F1F2E',
};

// ─── Calendar day states ─────────────────────────────────────────────────────
export const CalendarColors = {
  light: {
    logged: Ramp.emerald[500],
    loggedText: '#FFFFFF',
    missed: Ramp.rose[100],
    missedText: Ramp.rose[600],
    today: Ramp.indigo[600],
    todayText: '#FFFFFF',
    idleText: '#14142B',
  },
  dark: {
    logged: Ramp.emerald[500],
    loggedText: '#04140E',
    missed: '#3A1220',
    missedText: Ramp.rose[300],
    today: Ramp.indigo[500],
    todayText: '#FFFFFF',
    idleText: '#ECECF7',
  },
};

// ─── Back-compat flat export ─────────────────────────────────────────────────
// Existing screens import `Colors.primary` etc. directly. These now resolve to
// the refreshed palette so every surface picks up the new system for free.
// Prefer `useTheme().colors` for anything mode-dependent.
export const Colors = {
  // Brand
  primary: lightPalette.primary,
  primaryDark: Ramp.indigo[800],
  primaryLight: Ramp.indigo[400],
  primaryContainer: lightPalette.primaryMuted,

  // Accent
  accent: Ramp.ember[500],
  accentLight: Ramp.ember[200],

  // Semantic
  success: Ramp.emerald[500],
  successLight: Ramp.emerald[50],
  warning: Ramp.amber[500],
  warningLight: Ramp.amber[50],
  error: Ramp.rose[500],
  errorLight: Ramp.rose[50],

  // Surface
  background: lightPalette.background,
  surface: lightPalette.surface,
  surfaceVariant: lightPalette.surfaceVariant,
  card: lightPalette.surface,

  // Text
  textPrimary: lightPalette.textPrimary,
  textSecondary: lightPalette.textSecondary,
  textDisabled: lightPalette.textDisabled,
  textOnPrimary: '#FFFFFF',

  // Calendar
  calendarLogged: CalendarColors.light.logged,
  calendarLoggedDot: CalendarColors.light.logged,
  calendarMissed: CalendarColors.light.missed,
  calendarMissedDot: Ramp.rose[400],
  calendarToday: CalendarColors.light.today,
  calendarTodayText: '#FFFFFF',

  // Dark variants
  dark: {
    background: darkPalette.background,
    surface: darkPalette.surface,
    surfaceVariant: darkPalette.surfaceVariant,
    card: darkPalette.surface,
    textPrimary: darkPalette.textPrimary,
    textSecondary: darkPalette.textSecondary,
    primaryContainer: darkPalette.primaryMuted,
  },
};

/** Composes a hex colour with an alpha channel (0–1). */
export const alpha = (hex: string, a: number): string => {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const value = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${full}${value}`;
};
