import { Platform, Vibration } from 'react-native';

/**
 * Lightweight tactile feedback.
 *
 * Uses the core `Vibration` API rather than `expo-haptics` so this adds no
 * native dependency (the VIBRATE permission is already declared).
 *
 * Android only: iOS `Vibration.vibrate()` ignores the duration argument and
 * fires a ~400ms buzz, which is far too heavy for UI feedback. iOS users get
 * no haptic rather than a jarring one.
 */

const canVibrate = Platform.OS === 'android';

const buzz = (pattern: number | number[]) => {
  if (!canVibrate) return;
  try {
    Vibration.vibrate(pattern);
  } catch {
    // Vibration is best-effort; never let it break an interaction.
  }
};

export const haptics = {
  /** Taps, toggles, tab switches. */
  light: () => buzz(8),
  /** Committing an action — opening a sheet, confirming. */
  medium: () => buzz(16),
  /** A streak was logged. Two quick pulses read as "done". */
  success: () => buzz([0, 14, 60, 22]),
  /** Blocked interaction — a locked, time-bound habit. */
  warning: () => buzz([0, 24, 70, 24]),
  /** Long-press entering selection mode. */
  selection: () => buzz(12),
};
