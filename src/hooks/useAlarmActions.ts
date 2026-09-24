import { useEffect } from 'react';
import { AppState } from 'react-native';
import dayjs from 'dayjs';
import { HabitAlarm } from '../../modules/habit-alarm';
import { Activity } from '../features/attendance/attendanceService';
import { navigationRef } from '../navigation/AppNavigator';
import { useAttendanceStore } from '../store/attendanceStore';
import { todayStr } from '../utils/dateUtils';

/** Same window rule the dashboard's log button enforces. */
const isInsideTimeBound = (activity: Activity): boolean => {
  const { timeBoundType, timeBoundStartTime, timeBoundEndTime } = activity;
  if (!timeBoundType || !timeBoundStartTime) return true;
  const now = dayjs().format('HH:mm');
  if (timeBoundType === 'before') return now < timeBoundStartTime;
  if (timeBoundType === 'after') return now >= timeBoundStartTime;
  return !timeBoundEndTime || (now >= timeBoundStartTime && now < timeBoundEndTime);
};

/**
 * Logs habits the user marked done from a ringing alarm. The alarm screen
 * can't touch the store, so the native module queues those taps and this
 * drains the queue whenever the app is in the foreground.
 *
 * A habit that needs a note, or is outside its time window, can't be logged
 * blindly; for those the app opens on the habit so the user can finish there.
 */
export function useAlarmActions() {
  const isLoading = useAttendanceStore((state) => state.isLoading);

  useEffect(() => {
    if (!HabitAlarm || isLoading) return;

    const drain = () => {
      const pending = HabitAlarm!.consumePendingDone();
      if (pending.length === 0) return;

      const { activities, logs, logToday, selectActivity } = useAttendanceStore.getState();
      const today = todayStr();
      let needsAttention: string | undefined;

      for (const { activityId, date } of pending) {
        // Tapped on an earlier day and the app wasn't opened since; that day is gone.
        if (date !== today) continue;
        const activity = activities.find((a) => a.id === activityId && !a.completedAt);
        if (!activity) continue;
        if ((logs[activityId] ?? []).some((entry) => entry.date === today)) continue;

        if (activity.requiresNote || !isInsideTimeBound(activity)) {
          needsAttention = activityId;
        } else {
          logToday(activityId);
        }
      }

      if (needsAttention) {
        selectActivity(needsAttention);
        if (navigationRef.isReady()) navigationRef.navigate('ActivityDetail');
      }
    };

    drain();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') drain();
    });
    return () => subscription.remove();
  }, [isLoading]);
}
