import { Easing } from 'react-native-reanimated';

// ─── Motion ──────────────────────────────────────────────────────────────────
// One vocabulary for every animation in the app. Screens previously each picked
// their own damping/stiffness, which made transitions feel like they came from
// different products.

/** Springs — use for anything the user directly caused (press, drag, reveal). */
export const Spring = {
  /** Crisp, barely any overshoot. Press feedback. */
  snappy: { damping: 22, stiffness: 340, mass: 0.6 },
  /** Default entrance for cards and rows. */
  gentle: { damping: 20, stiffness: 180, mass: 0.9 },
  /** Celebratory pop — streak counters, success states. */
  bouncy: { damping: 11, stiffness: 220, mass: 0.8 },
};

/** Timings — use for state changes the user did not directly cause. */
export const Duration = {
  instant: 90,
  fast: 160,
  normal: 240,
  slow: 360,
};

export const Ease = {
  /** Decelerate — things entering the screen. */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  /** Accelerate — things leaving the screen. */
  in: Easing.bezier(0.7, 0, 0.84, 0),
  /** Standard both-ends curve. */
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
};

/**
 * Staggered entrance delay. Caps out so a long list never leaves the user
 * waiting on the twentieth row to fade in.
 */
export const stagger = (index: number, step = 45, max = 260): number =>
  Math.min(index * step, max);
