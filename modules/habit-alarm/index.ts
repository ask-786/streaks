import { requireOptionalNativeModule } from 'expo';

export interface AlarmSpec {
  /** Unique per ring, e.g. `${activityId}:${date}:${time}`. */
  id: string;
  activityId: string;
  title: string;
  message: string;
  /** Epoch milliseconds. */
  triggerAt: number;
}

/** A "Mark done" tap from the alarm, waiting for the user to confirm it in the app. */
export interface PendingDone {
  /** Stable per tap; pass back to `removePendingDone` once it's been answered. */
  id: string;
  activityId: string;
  /** YYYY-MM-DD, device-local, when "Mark done" was tapped. */
  date: string;
  /** HH:mm, device-local, when it was tapped. Empty for taps queued by older versions. */
  time: string;
  /** Epoch ms of the tap. 0 for taps queued by older versions. */
  tappedAt: number;
  /** IANA timezone at the tap. Empty for taps queued by older versions. */
  tz: string;
}

interface HabitAlarmNativeModule {
  setAlarms(alarms: AlarmSpec[]): void;
  cancelSnoozes(activityIds: string[]): void;
  /** The queued taps. Reading leaves them queued; see `removePendingDone`. */
  getPendingDone(): PendingDone[];
  removePendingDone(ids: string[]): void;
  canUseFullScreenIntent(): boolean;
  openFullScreenIntentSettings(): void;
}

/**
 * Real, ringing alarms (Android only). `null` anywhere the native module isn't
 * built in — iOS, web, Expo Go — so callers fall back to plain notifications.
 */
export const HabitAlarm = requireOptionalNativeModule<HabitAlarmNativeModule>('HabitAlarm');
