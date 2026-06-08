import dayjs from 'dayjs';
import { DATE_FORMAT } from '../constants/dateFormat';

/**
 * Returns today's date as a YYYY-MM-DD string.
 * We always use local date (not UTC) to match the user's timezone.
 */
export const todayStr = (): string => dayjs().format(DATE_FORMAT);

/**
 * Returns yesterday's date as a YYYY-MM-DD string.
 */
export const yesterdayStr = (): string =>
  dayjs().subtract(1, 'day').format(DATE_FORMAT);

/**
 * Formats any dayjs-compatible value to YYYY-MM-DD string.
 */
export const toDateStr = (date: dayjs.ConfigType): string =>
  dayjs(date).format(DATE_FORMAT);

/**
 * Returns an array of all YYYY-MM-DD strings in the given month.
 * @param year  Full year (e.g. 2025)
 * @param month 0-indexed month (0 = Jan)
 */
export const daysInMonth = (year: number, month: number): string[] => {
  const start = dayjs().year(year).month(month).startOf('month');
  const count = start.daysInMonth();
  return Array.from({ length: count }, (_, i) =>
    start.add(i, 'day').format(DATE_FORMAT)
  );
};

/**
 * Returns the last N day strings (including today), in ascending order.
 */
export const getPastNDays = (n: number): string[] => {
  const today = dayjs();
  return Array.from({ length: n }, (_, i) =>
    today.subtract(n - 1 - i, 'day').format(DATE_FORMAT)
  );
};

/**
 * Returns the number of days logged in the current month.
 */
export const loggedDaysThisMonth = (loggedDates: string[]): number => {
  const now = dayjs();
  const currentMonthStr = now.format('YYYY-MM');
  return loggedDates.filter((d) => dayjs(d).format('YYYY-MM') === currentMonthStr).length;
};

/**
 * Returns total days passed in the current month so far (up to and including today).
 */
export const totalDaysPassedThisMonth = (): number => {
  return dayjs().date(); // day-of-month is the count of days passed
};

/**
 * Formats a YYYY-MM-DD string for display (e.g. "Thursday, March 19").
 */
export const formatDisplayDate = (dateStr: string): string =>
  dayjs(dateStr).format('dddd, MMMM D');

/**
 * Returns the display name for a month (e.g. "March 2025").
 */
export const formatMonthYear = (year: number, month: number): string =>
  dayjs().year(year).month(month).format('MMMM YYYY');

/**
 * Formats a 24-hour time string (HH:mm) to a 12-hour string with AM/PM.
 */
export const formatTime12h = (time24: string): string => {
  if (!time24) return '';
  const parts = time24.split(':');
  if (parts.length !== 2) return '';
  let hour = parseInt(parts[0], 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour.toString().padStart(2, '0')}:${parts[1]} ${ampm}`;
};

export const to12h = (time24: string): { time: string, ampm: 'AM' | 'PM' } => {
  if (!time24) return { time: '', ampm: 'AM' as 'AM' | 'PM' };
  const parts = time24.split(':');
  if (parts.length !== 2) return { time: '', ampm: 'AM' as 'AM' | 'PM' };
  let hour = parseInt(parts[0], 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  const hourStr = hour.toString().padStart(2, '0');
  return { time: `${hourStr}:${parts[1]}`, ampm };
};

export const to24h = (time12: string, ampm: 'AM' | 'PM'): string => {
  if (!time12) return '';
  const parts = time12.split(':');
  if (parts.length !== 2) return '';
  let hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return '';
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${parts[1]}`;
};

export const isValidTime12h = (time: string): boolean => {
  if (!time) return false;
  return /^(0?[1-9]|1[0-2]):[0-5][0-9]$/.test(time.trim());
};
