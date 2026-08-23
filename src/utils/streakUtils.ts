import dayjs from 'dayjs';
import { DATE_FORMAT } from '../constants/dateFormat';
import { todayStr, yesterdayStr } from './dateUtils';

/**
 * Calculates the current streak of consecutive logged days.
 *
 * Algorithm:
 * 1. Build a Set for O(1) lookups.
 * 2. Start at "yesterday" (if today is already logged, count from today).
 * 3. Walk backwards day-by-day; increment streak for each consecutive logged day.
 * 4. Break on the first unlogged day found.
 *
 * Special case: If today is not yet logged, we check from yesterday so the
 * streak doesn't break just because the user hasn't logged today yet.
 * If today IS logged, we count from today so it's included in the streak.
 */
export const calculateCurrentStreak = (loggedDates: string[]): number => {
  if (loggedDates.length === 0) return 0;

  const sanitizedDates = loggedDates.map((d) => dayjs(d).format('YYYY-MM-DD'));
  const loggedSet = new Set(sanitizedDates);
  const today = todayStr();
  const yesterday = yesterdayStr();

  // Determine start point:
  // - If today is logged → start counting from today
  // - If today is NOT logged but yesterday was → still show the ongoing streak from yesterday
  // - If neither today nor yesterday is logged → streak is 0 (it has already broken)
  let pivot = loggedSet.has(today) ? today : yesterday;

  if (!loggedSet.has(pivot)) {
    return 0;
  }

  let streak = 0;
  let cursor = dayjs(pivot);

  while (loggedSet.has(cursor.format(DATE_FORMAT))) {
    streak++;
    cursor = cursor.subtract(1, 'day');
  }

  return streak;
};

/**
 * Calculates the longest streak ever recorded.
 *
 * Algorithm:
 * 1. Sort all logged dates ascending.
 * 2. Walk forward; if consecutive days continue, grow the current run.
 * 3. On a gap, reset. Track the maximum run seen.
 */
export const calculateLongestStreak = (loggedDates: string[]): number => {
  if (loggedDates.length === 0) return 0;

  // Extract unique date strings to handle multiple logs per day safely
  const sanitizedDates = Array.from(new Set(loggedDates.map((d) => dayjs(d).format('YYYY-MM-DD'))));

  // Sort ascending
  const sorted = [...sanitizedDates].sort();
  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    // Parse as UTC midnights to avoid any local Daylight Saving Time issues
    const prev = dayjs(`${sorted[i - 1]}T00:00:00Z`);
    const curr = dayjs(`${sorted[i]}T00:00:00Z`);

    // Check if dates are exactly 1 day apart
    if (curr.diff(prev, 'day') === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      // Gap found — reset current streak
      currentStreak = 1;
    }
  }

  return longestStreak;
};

/**
 * Returns true if the streak is "active" — i.e., either today or yesterday is logged.
 * Useful to decide whether to show a "at risk" indicator.
 */
export const isStreakActive = (loggedDates: string[]): boolean => {
  if (loggedDates.length === 0) return false;
  const sanitizedDates = loggedDates.map((d) => dayjs(d).format('YYYY-MM-DD'));
  const loggedSet = new Set(sanitizedDates);
  return loggedSet.has(todayStr()) || loggedSet.has(yesterdayStr());
};

// ─── Weekly Goal Streak Helpers ───────────────────────────────────────────────

/**
 * Gets the Monday (ISO week start) of the week containing the given date string.
 * dayjs().day() returns 0=Sun,1=Mon,...,6=Sat.
 * Shift: (day + 6) % 7 gives 0=Mon,...,6=Sun.
 */
const getWeekStart = (dateStr: string): string => {
  const d = dayjs(dateStr);
  return d.subtract((d.day() + 6) % 7, 'day').format('YYYY-MM-DD');
};

/**
 * Returns a map of week-start (YYYY-MM-DD of Monday) → number of unique logs in that week.
 */
const groupLogsByWeek = (loggedDates: string[]): Map<string, number> => {
  const map = new Map<string, number>();
  // Deduplicate by calendar day first so double-logging a day doesn't inflate the count
  const uniqueDays = Array.from(new Set(loggedDates.map((d) => dayjs(d).format('YYYY-MM-DD'))));
  for (const day of uniqueDays) {
    const weekKey = getWeekStart(day);
    map.set(weekKey, (map.get(weekKey) ?? 0) + 1);
  }
  return map;
};

/**
 * Returns the number of unique days logged in the current calendar week (Mon–Sun).
 * Used to drive progress bars in the UI.
 */
export const getThisWeekLogCount = (loggedDates: string[]): number => {
  const thisWeekStart = getWeekStart(todayStr());
  const weekMap = groupLogsByWeek(loggedDates);
  return weekMap.get(thisWeekStart) ?? 0;
};

/**
 * Returns true if the user has logged >= goal times in the current calendar week (Mon–Sun).
 */
export const isWeeklyGoalMetThisWeek = (loggedDates: string[], goal: number): boolean => {
  const thisWeekStart = getWeekStart(todayStr());
  const weekMap = groupLogsByWeek(loggedDates);
  return (weekMap.get(thisWeekStart) ?? 0) >= goal;
};

/**
 * Calculates the current weekly streak (consecutive weeks where logs >= goal).
 *
 * Algorithm:
 * 1. Group all logged dates by calendar week start (Monday).
 * 2. Determine if the current week has already met the goal:
 *    - If yes, start counting from this week.
 *    - If no, start counting from last week (so mid-week doesn't break the streak).
 * 3. Walk backward one week at a time; count weeks where logs >= goal.
 * 4. Stop on the first week that doesn't meet the goal.
 */
export const calculateCurrentWeeklyStreak = (loggedDates: string[], goal: number): number => {
  if (loggedDates.length === 0) return 0;

  const weekMap = groupLogsByWeek(loggedDates);
  const thisWeekStart = getWeekStart(todayStr());
  const lastWeekStart = dayjs(thisWeekStart).subtract(7, 'day').format('YYYY-MM-DD');

  // Determine pivot: start from this week if goal already met, else try last week
  const thisWeekMet = (weekMap.get(thisWeekStart) ?? 0) >= goal;
  const lastWeekMet = (weekMap.get(lastWeekStart) ?? 0) >= goal;

  let pivotWeek: string;
  if (thisWeekMet) {
    pivotWeek = thisWeekStart;
  } else if (lastWeekMet) {
    pivotWeek = lastWeekStart;
  } else {
    return 0; // streak has already broken
  }

  let streak = 0;
  let cursor = dayjs(pivotWeek);

  while (true) {
    const key = cursor.format('YYYY-MM-DD');
    const count = weekMap.get(key) ?? 0;
    if (count >= goal) {
      streak++;
      cursor = cursor.subtract(7, 'day');
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Calculates the longest weekly streak ever recorded where logs >= goal.
 */
export const calculateLongestWeeklyStreak = (loggedDates: string[], goal: number): number => {
  if (loggedDates.length === 0) return 0;

  const weekMap = groupLogsByWeek(loggedDates);

  // Sort week keys ascending
  const sortedWeeks = Array.from(weekMap.keys()).sort();
  if (sortedWeeks.length === 0) return 0;

  let longest = 0;
  let current = 0;

  for (const weekKey of sortedWeeks) {
    if ((weekMap.get(weekKey) ?? 0) >= goal) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }

  return longest;
};
