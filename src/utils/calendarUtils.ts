import dayjs from 'dayjs';
import { BorderRadius, CalendarColors } from '../constants';

export type CalendarPalette = typeof CalendarColors.light;

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
 *
 * - Logged days: solid success fill, white numeral.
 * - Missed days: soft tinted fill with a coloured numeral. A wall of solid red
 *   reads as an error state; a tint reads as information.
 * - Today: solid brand fill — only while the activity is still active.
 * - Days after `completedAt` are left unmarked.
 *
 * The palette is passed in so day cells follow the active theme; previously the
 * numerals were hard-coded to the light-mode ink and went unreadable in dark
 * mode.
 */
export const buildMarkedDates = (
  loggedDates: string[],
  today: string,
  activityCreatedAt?: number,
  completedAt?: number,
  palette: CalendarPalette = CalendarColors.light,
): MarkedDates => {
  // The last day we should evaluate as "active". For completed activities this
  // is the calendar-date of completion; for ongoing activities it is yesterday
  // (today is handled separately below).
  const completionDateStr = completedAt ? dayjs(completedAt).format('YYYY-MM-DD') : null;
  const marked: MarkedDates = {};
  // loggedDates are pre-sanitized YYYY-MM-DD strings (extracted from LogEntry.date by callers)
  const loggedSet = new Set(loggedDates);

  const cell = (background: string, text: string, weight: '600' | '700') => ({
    customStyles: {
      container: {
        backgroundColor: background,
        borderRadius: BorderRadius.xs,
      },
      text: {
        color: text,
        fontWeight: weight,
      },
    },
  });

  // Mark all logged dates
  loggedDates.forEach(date => {
    marked[date] = cell(palette.logged, palette.loggedText, '700');
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
      marked[dateStr] = cell(palette.missed, palette.missedText, '600');
    }
    cursor = cursor.add(1, 'day');
  }

  // Today: only apply special styling if the activity is still active.
  // For a completed activity we skip this entirely — the completion date was
  // already evaluated in the missed-days loop above, so nothing extra is needed.
  if (!completionDateStr) {
    marked[today] = loggedSet.has(today)
      ? cell(palette.logged, palette.loggedText, '700')
      : cell(palette.today, palette.todayText, '700');
  }

  return marked;
};
