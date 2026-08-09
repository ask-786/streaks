import { StyleSheet } from 'react-native';

// ─── Spacing ─────────────────────────────────────────────────────────────────
// 4pt base grid. `xxs` and `xxxl` were added so components stop reaching for
// magic numbers when 4 is too much and 8 is too little.
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

/** Consistent horizontal gutter for every screen. */
export const ScreenPadding = Spacing.lg - 4; // 20

// ─── Border Radius ────────────────────────────────────────────────────────────
export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 28,
  full: 999,
};

export const Hairline = StyleSheet.hairlineWidth;

// ─── Hit targets ──────────────────────────────────────────────────────────────
/** Minimum comfortable touch target (Material + HIG both land near 44–48). */
export const MinTouchTarget = 44;

export const HitSlop = {
  sm: { top: 6, bottom: 6, left: 6, right: 6 },
  md: { top: 10, bottom: 10, left: 10, right: 10 },
  lg: { top: 16, bottom: 16, left: 16, right: 16 },
};
