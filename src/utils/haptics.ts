import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Tactile feedback vocabulary.
 *
 * Every call site picks a *meaning* (`success`, `warning`, `selection`) rather
 * than a waveform, so the physical feel stays consistent across the app and can
 * be retuned in one place.
 *
 * Platform mapping:
 * - iOS uses the Taptic Engine directly (`impactAsync` / `notificationAsync`).
 * - Android uses `performAndroidHapticsAsync`, which drives the platform's own
 *   `HapticFeedbackConstants`. This is what Android recommends over the raw
 *   `Vibrator` API: the effects are tuned per-device, respect the user's system
 *   haptics setting, and need no `VIBRATE` permission.
 * - Web falls back to `navigator.vibrate` where the browser offers it, and is
 *   silently inert where it doesn't.
 */

const isAndroid = Platform.OS === 'android';

/**
 * User preference, mirrored here from the store so that call sites — many of
 * which are plain callbacks outside React — can stay synchronous and ignorant
 * of state management. `attendanceStore` pushes changes in via `setEnabled`.
 */
let enabled = true;

/** Kept in sync by the attendance store on hydrate and on toggle. */
export const setHapticsEnabled = (value: boolean) => {
  enabled = value;
};

/**
 * Haptics are decoration: a rejected promise (no motor, OS setting off, older
 * Android without the requested constant, no native module on web) must never
 * surface to the user.
 */
const fire = (run: () => Promise<void>) => {
  if (!enabled) return;
  try {
    run().catch(() => {});
  } catch {
    // Ignore — best-effort only.
  }
};

const impact = (style: Haptics.ImpactFeedbackStyle) => () => Haptics.impactAsync(style);
const notify = (type: Haptics.NotificationFeedbackType) => () => Haptics.notificationAsync(type);
const android = (type: Haptics.AndroidHaptics) => () => Haptics.performAndroidHapticsAsync(type);

/** Picks the platform-appropriate effect for one semantic event. */
const effect = (ios: () => Promise<void>, droid: () => Promise<void>) => () =>
  fire(isAndroid ? droid : ios);

export const haptics = {
  /** Ordinary taps: buttons, rows, tab switches. The default tick. */
  light: effect(
    impact(Haptics.ImpactFeedbackStyle.Light),
    android(Haptics.AndroidHaptics.Virtual_Key),
  ),

  /** Committing to something: opening a sheet, saving, confirming. */
  medium: effect(
    impact(Haptics.ImpactFeedbackStyle.Medium),
    android(Haptics.AndroidHaptics.Context_Click),
  ),

  /** Moving between discrete choices — segments, day chips, pickers. */
  selection: effect(Haptics.selectionAsync, android(Haptics.AndroidHaptics.Segment_Tick)),

  /** A long-press landed, or a drag just picked an item up. */
  longPress: effect(
    impact(Haptics.ImpactFeedbackStyle.Medium),
    android(Haptics.AndroidHaptics.Long_Press),
  ),

  /** A switch flipped. Android has distinct on/off effects; iOS does not. */
  toggle: (on: boolean) =>
    fire(
      isAndroid
        ? android(on ? Haptics.AndroidHaptics.Toggle_On : Haptics.AndroidHaptics.Toggle_Off)
        : impact(on ? Haptics.ImpactFeedbackStyle.Rigid : Haptics.ImpactFeedbackStyle.Soft),
    ),

  /** A streak was logged, a habit created — the payoff moment. */
  success: effect(
    notify(Haptics.NotificationFeedbackType.Success),
    android(Haptics.AndroidHaptics.Confirm),
  ),

  /** Blocked but recoverable: a time-locked habit, a missing required note. */
  warning: effect(
    notify(Haptics.NotificationFeedbackType.Warning),
    android(Haptics.AndroidHaptics.Reject),
  ),

  /**
   * Something failed or was destroyed — import errors, deletions. Android has
   * no separate warning constant, so this and `warning` share `Reject` there;
   * on iOS they stay distinct.
   */
  error: effect(
    notify(Haptics.NotificationFeedbackType.Error),
    android(Haptics.AndroidHaptics.Reject),
  ),
};
