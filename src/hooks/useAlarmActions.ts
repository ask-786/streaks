import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import dayjs from 'dayjs';
import { HabitAlarm, PendingDone } from '../../modules/habit-alarm';
import { Activity } from '../features/attendance/attendanceService';
import { useAttendanceStore } from '../store/attendanceStore';
import { todayStr } from '../utils/dateUtils';

/** Same window rule the dashboard's log button enforces, judged at `at` (HH:mm). */
const isInsideTimeBound = (activity: Activity, at: string): boolean => {
  const { timeBoundType, timeBoundStartTime, timeBoundEndTime } = activity;
  if (!timeBoundType || !timeBoundStartTime) return true;
  if (timeBoundType === 'before') return at < timeBoundStartTime;
  if (timeBoundType === 'after') return at >= timeBoundStartTime;
  return !timeBoundEndTime || (at >= timeBoundStartTime && at < timeBoundEndTime);
};

/** A queued "Mark done" tap, checked against the habit and ready to ask about. */
export interface AlarmTap extends PendingDone {
  activity: Activity;
  /** False when the tap fell outside the habit's time window — it can't be logged. */
  insideWindow: boolean;
}

/**
 * Turns "Mark done" taps from a ringing alarm into logs — but only once the
 * user confirms each one in the app. The alarm screen can't touch the store,
 * so the native module queues the taps; this reads that queue whenever the app
 * comes to the foreground and hands back the taps still waiting for an answer.
 *
 * Taps stay queued natively until answered, so a confirmation cut short by the
 * app closing is asked again next time. While one waits, the native side also
 * keeps that habit's later alarms that day from ringing.
 */
export function useAlarmActions() {
  const hasHydrated = useAttendanceStore((state) => state.hasHydrated);
  const [queue, setQueue] = useState<AlarmTap[]>([]);
  /** Taps the user closed without answering. Asked again next time the app comes back. */
  const [deferred, setDeferred] = useState<Set<string>>(new Set());

  const refresh = useCallback(() => {
    if (!HabitAlarm) return;
    const pending = HabitAlarm.getPendingDone();
    const { activities, logs } = useAttendanceStore.getState();
    const today = todayStr();
    const settled: string[] = [];
    const seen = new Set<string>();
    const taps: AlarmTap[] = [];

    // Oldest first, so a habit tapped twice in a day is asked about once, for the first tap.
    for (const tap of [...pending].sort((a, b) => a.tappedAt - b.tappedAt)) {
      const activity = activities.find((a) => a.id === tap.activityId && !a.completedAt);
      const key = `${tap.activityId}:${tap.date}`;
      const alreadyLogged = (logs[tap.activityId] ?? []).some((e) => e.date === tap.date);
      // Nothing left to ask: the habit is gone or finished, the day got logged
      // some other way, or this is a repeat tap on the same day.
      if (!activity || alreadyLogged || seen.has(key)) {
        settled.push(tap.id);
        continue;
      }
      seen.add(key);
      // Taps queued before they carried a time can only be judged against now,
      // and only on the day they were made.
      const at = tap.time || (tap.date === today ? dayjs().format('HH:mm') : null);
      taps.push({ ...tap, activity, insideWindow: at === null || isInsideTimeBound(activity, at) });
    }

    if (settled.length > 0) HabitAlarm.removePendingDone(settled);
    setQueue(taps);
  }, []);

  useEffect(() => {
    // Before hydration the habit list is empty, and every tap would look orphaned.
    if (!HabitAlarm || !hasHydrated) return;
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setDeferred(new Set());
      refresh();
    });
    return () => subscription.remove();
  }, [hasHydrated, refresh]);

  /** Marks a tap answered — logged, declined or unloggable — so it's never asked again. */
  const settle = useCallback((id: string) => {
    HabitAlarm?.removePendingDone([id]);
    setQueue((current) => current.filter((tap) => tap.id !== id));
  }, []);

  /** Closes a tap's question without answering it; it comes back next time the app opens. */
  const defer = useCallback((id: string) => {
    setDeferred((current) => new Set(current).add(id));
  }, []);

  const current = queue.find((tap) => !deferred.has(tap.id));
  return { current, settle, defer };
}
