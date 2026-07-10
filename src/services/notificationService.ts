import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Activity, LogEntry } from '../features/attendance/attendanceService';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestPermissionsAsync = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  }
  return false;
};

export const rescheduleAllNotifications = async (
  activities: Activity[],
  logs: Record<string, LogEntry[]>
) => {
  // 1. Cancel all existing notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  // 2. Schedule Morning Reminder — repeating daily at 10:00 AM local time
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Good Morning! 🌅',
      body: 'Time to check in on your streaks!',
      priority: Notifications.AndroidNotificationPriority.MAX,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 10,
      minute: 0,
      channelId: 'default',
    },
  });

  if (activities.length === 0) return;

  const now = new Date();
  // Compute today's local date string (YYYY-MM-DD)
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayLocal = `${yyyy}-${mm}-${dd}`;

  // 3. Tonight's evening notification — DYNAMIC content.
  //    Because this function is called reactively (useNotifications hook) every time the
  //    user logs an activity, tonight's one-shot DATE trigger is refreshed with the
  //    latest state each time, so it always shows only the remaining unlogged activities.
  const todayAt9PM = new Date(now);
  todayAt9PM.setHours(21, 0, 0, 0);

  if (now < todayAt9PM) {
    // App was opened before 9PM — schedule a dynamic one-shot for tonight.
    const unloggedToday = activities.filter(a => {
      const activityLogs = logs[a.id] || [];
      // Use the locked .date field — no timezone parsing needed
      return !activityLogs.some(entry => entry.date === todayLocal);
    });

    if (unloggedToday.length > 0) {
      const names = unloggedToday.map(a => a.name).join(', ');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Evening Check-in 🌙',
          body: `Don't forget to log: ${names}`,
          priority: Notifications.AndroidNotificationPriority.MAX,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: todayAt9PM,
          channelId: 'default',
        },
      });
    } else {
      // All done today — send a congratulatory message instead
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Great job today! 🎉',
          body: 'All activities logged. Keep the streak going!',
          priority: Notifications.AndroidNotificationPriority.MAX,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: todayAt9PM,
          channelId: 'default',
        },
      });
    }
  }

  // 4. Standing daily evening reminder at 9 PM (repeating, OS-managed).
  //    ALWAYS scheduled so that future days when the app is never opened still
  //    get a notification. Expo's DAILY trigger fires at its next occurrence —
  //    when scheduled before 9PM it defers to tomorrow (not tonight), so this
  //    does NOT duplicate the one-shot DATE trigger above on the current day.
  //    DATE-type triggers require SCHEDULE_EXACT_ALARM which Android 12+ restricts
  //    in production; DAILY triggers are delivered by the OS alarm infrastructure
  //    and fire even when the app is fully killed.
  const allNames = activities.map(a => a.name).join(', ');
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Evening Check-in 🌙',
      body: `Don't forget to log: ${allNames}`,
      priority: Notifications.AndroidNotificationPriority.MAX,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
      channelId: 'default',
    },
  });
};
