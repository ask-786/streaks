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

/**
 * How long a touch must stay put before it counts as a press.
 *
 * With no delay, `onPressIn` fires the instant a finger lands — including the
 * finger that is about to scroll the list it landed on. The press is cancelled
 * a moment later when the scroll view claims the gesture, but any press-in
 * feedback (the sink animation, the haptic tick) has already happened, so
 * scrolling buzzes the whole way down. Waiting this long first lets the scroll
 * claim the touch before anything reacts to it.
 *
 * A real tap is unaffected: a press released before the delay elapses still
 * gets its press-in and press-out, just at release.
 */
export const PressInDelay = 120;

/**
 * Time from touch-down to a long press. React Native counts `delayLongPress`
 * from press-in rather than from contact, so the press delay comes back out of
 * it here and the threshold the thumb actually feels stays at 320ms.
 */
export const LongPressDelay = 320 - PressInDelay;

export const HitSlop = {
  sm: { top: 6, bottom: 6, left: 6, right: 6 },
  md: { top: 10, bottom: 10, left: 10, right: 10 },
  lg: { top: 16, bottom: 16, left: 16, right: 16 },
};
