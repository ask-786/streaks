import dayjs from 'dayjs';
import { Colors, BorderRadius } from '../constants';

export type MarkedDates = {
  [date: string]: {
    selected?: boolean;
    selectedColor?: string;
    selectedTextColor?: string;
    marked?: boolean;
    dotColor?: string;
    customStyles?: object;
    today?: boolean;
  };
};

/**
 * Builds the markedDates object for react-native-calendars.
 * - Logged days: green selected background
 * - Missed days (past, not logged, within active period): red background
 * - Today: orange ring with bold text — ONLY if the activity is not yet completed
 * - Days after the activity's completedAt date are left unmarked
 */
export const buildMarkedDates = (
  loggedDates: string[],
  today: string,
  activityCreatedAt?: number,
  completedAt?: number
): MarkedDates => {
  // The last day we should evaluate as "active". For completed activities this
  // is the calendar-date of completion; for ongoing activities it is yesterday
  // (today is handled separately below).
  const completionDateStr = completedAt ? dayjs(completedAt).format('YYYY-MM-DD') : null;
  const marked: MarkedDates = {};
  // loggedDates are pre-sanitized YYYY-MM-DD strings (extracted from LogEntry.date by callers)
  const loggedSet = new Set(loggedDates);

  // Mark all logged dates
  loggedDates.forEach((date) => {
    marked[date] = {
      customStyles: {
        container: {
          backgroundColor: Colors.calendarLogged,
          borderRadius: BorderRadius.sm,
        },
        text: {
          color: Colors.textPrimary,
          fontWeight: '600',
        },
      },
    };
  });

  // Mark missed days (from activity creation date up to the end of the active period)
  // For completed activities the active period ends on the completion date.
  // For ongoing activities it ends the day before today (today is handled separately).
  const startOfPeriod = activityCreatedAt ? dayjs(activityCreatedAt) : dayjs(today).startOf('month');
  // upperBound is exclusive: we iterate while cursor is strictly before this day.
  const upperBound = completionDateStr
    ? dayjs(completionDateStr).add(1, 'day')  // include the completion day itself
    : dayjs(today);                             // stop before today (today handled below)
  let cursor = startOfPeriod.startOf('day');

  while (cursor.isBefore(upperBound, 'day')) {
    const dateStr = cursor.format('YYYY-MM-DD');
    if (!loggedSet.has(dateStr)) {
      marked[dateStr] = {
        customStyles: {
          container: {
            backgroundColor: Colors.calendarMissed,
            borderRadius: BorderRadius.sm,
          },
          text: {
            color: Colors.textPrimary,
            fontWeight: '600',
          },
        },
      };
    }
    cursor = cursor.add(1, 'day');
  }

  // Today: only apply special styling if the activity is still active.
  // For a completed activity we skip this entirely — the completion date was
  // already evaluated in the missed-days loop above, so nothing extra is needed.
  if (!completionDateStr) {
    if (loggedSet.has(today)) {
      marked[today] = {
        customStyles: {
          container: {
            backgroundColor: Colors.calendarLogged,
            borderRadius: BorderRadius.sm,
          },
          text: {
            color: Colors.textPrimary,
            fontWeight: 'bold',
          },
        },
      };
    } else {
      marked[today] = {
        customStyles: {
          container: {
            backgroundColor: Colors.calendarToday,
            borderRadius: BorderRadius.sm,
          },
          text: {
            color: Colors.textPrimary,
            fontWeight: 'bold',
          },
        },
      };
    }
  }

  return marked;
};
