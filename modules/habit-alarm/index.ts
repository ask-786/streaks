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

export interface PendingDone {
  activityId: string;
  /** YYYY-MM-DD, device-local, when "Mark done" was tapped. */
  date: string;
}

interface HabitAlarmNativeModule {
  setAlarms(alarms: AlarmSpec[]): void;
  cancelSnoozes(activityIds: string[]): void;
  consumePendingDone(): PendingDone[];
  canUseFullScreenIntent(): boolean;
  openFullScreenIntentSettings(): void;
}

/**
 * Real, ringing alarms (Android only). `null` anywhere the native module isn't
 * built in — iOS, web, Expo Go — so callers fall back to plain notifications.
 */
export const HabitAlarm = requireOptionalNativeModule<HabitAlarmNativeModule>('HabitAlarm');
