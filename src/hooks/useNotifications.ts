import { useEffect, useState } from 'react';
import {
  requestPermissionsAsync,
  rescheduleAllNotifications,
} from '../services/notificationService';
import { useAttendanceStore } from '../store/attendanceStore';

export function useNotifications() {
  const [hasPermissions, setHasPermissions] = useState(false);

  // Observe state that dictates notification scheduling
  const activities = useAttendanceStore((state) => state.activities);
  const logs = useAttendanceStore((state) => state.logs);
  const isLoading = useAttendanceStore((state) => state.isLoading);

  useEffect(() => {
    let mounted = true;
    const initNotifications = async () => {
      const granted = await requestPermissionsAsync();
      if (mounted) {
        setHasPermissions(granted);
      }
    };

    initNotifications();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // Only reschedule when permissions are granted and initial hydration is done
    if (hasPermissions && !isLoading) {
      rescheduleAllNotifications(activities, logs).catch((err) => {
        console.error('Failed to reschedule notifications:', err);
      });
    }
  }, [hasPermissions, activities, logs, isLoading]);

  return { hasPermissions };
}
