import dayjs from 'dayjs';
import { DATE_FORMAT } from '../../constants/dateFormat';
import { todayStr } from '../../utils/dateUtils';
import type { Activity, LogEntry } from './attendanceService';

/**
 * Fixing a missed log — the rules.
 *
 * The feature exists for one honest case: the habit was actually done, the tap
 * was forgotten. It is deliberately awkward, because a frictionless "mark any
 * past day done" button turns a streak into a number the user types in rather
 * than one they earn.
 *
 * Three limits do that work, and they are all here rather than spread through
 * the UI so the rule set can be read — and changed — in one place:
 *
 *   1. A two-day window. Long enough for "I forgot last night", too short to
 *      reconstruct a week from memory.
 *   2. A rolling quota. Three fixes per activity per thirty days; a habit that
 *      needs more than that is not being forgotten, it is being missed.
 *   3. A written reason, enforced by the caller, kept forever as a note.
 *
 * A fixed day is also marked `backfilled` for life (see `LogEntry`), so the
 * calendar never quietly launders a fix into an ordinary green square.
 */

/** How many days back a missed day stays fixable. 2 = yesterday and the day before. */
export const BACKFILL_WINDOW_DAYS = 2;

/** Fixes allowed per activity inside the rolling window below. */
export const BACKFILL_QUOTA = 3;

/** Length of the rolling window the quota is counted over. */
export const BACKFILL_QUOTA_WINDOW_DAYS = 30;

/** Why a day cannot be fixed. Each maps to a sentence the user is shown. */
export type BackfillBlock =
  | 'activity_completed'
  | 'already_logged'
  | 'not_past'
  | 'too_old'
  | 'before_start'
  | 'quota_exhausted';

interface BackfillQuotaState {
  /** Fixes left in the rolling window. */
  remaining: number;
  /** Fixes already spent in the rolling window. */
  used: number;
}

/**
 * A union rather than an optional `block`, so a caller that has checked
 * `allowed` can read the reason without asserting it exists.
 */
export type BackfillEligibility =
  | ({ allowed: true } & BackfillQuotaState)
  /** `block` is the first rule that rejected the day, not every rule it failed. */
  | ({ allowed: false; block: BackfillBlock } & BackfillQuotaState);

/**
 * The local day a log entry was *written*, which for a fix is the day the user
 * tapped rather than the day being claimed. Falls back to the claimed date for
 * entries with no usable timestamp.
 */
const actionDay = (entry: LogEntry): string => {
  if (!entry.ts) return entry.date;
  const parsed = dayjs(entry.ts);
  return parsed.isValid() ? parsed.format(DATE_FORMAT) : entry.date;
};

/**
 * Counts fixes spent in the rolling window. Counted by when the fix was made,
 * not by the day it claimed — the quota limits the habit of fixing, and two
 * fixes made this morning cost two regardless of which days they pointed at.
 */
export const countRecentBackfills = (entries: LogEntry[], today: string = todayStr()): number => {
  const cutoff = dayjs(today).subtract(BACKFILL_QUOTA_WINDOW_DAYS, 'day').format(DATE_FORMAT);
  return entries.filter((entry) => entry.backfilled && actionDay(entry) > cutoff).length;
};

/**
 * Answers "can this day be fixed, and how much slack is left" in one call, so
 * the UI never has to assemble the rules itself.
 *
 * Blocks are evaluated in the order the user would run into them, and only the
 * first is reported — telling someone their fix is both too old and out of
 * quota helps nobody.
 */
export const getBackfillEligibility = (
  activity: Activity | undefined,
  entries: LogEntry[],
  dateStr: string,
  today: string = todayStr(),
): BackfillEligibility => {
  const used = countRecentBackfills(entries, today);
  const remaining = Math.max(0, BACKFILL_QUOTA - used);
  const deny = (block: BackfillBlock): BackfillEligibility => ({
    allowed: false,
    block,
    remaining,
    used,
  });

  if (!activity || activity.completedAt) return deny('activity_completed');
  if (entries.some((entry) => entry.date === dateStr)) return deny('already_logged');
  // Today has its own log button, and tomorrow has not happened.
  if (dateStr >= today) return deny('not_past');

  const oldest = dayjs(today).subtract(BACKFILL_WINDOW_DAYS, 'day').format(DATE_FORMAT);
  if (dateStr < oldest) return deny('too_old');

  const startDate = dayjs(activity.createdAt).format(DATE_FORMAT);
  if (dateStr < startDate) return deny('before_start');

  if (remaining <= 0) return deny('quota_exhausted');

  return { allowed: true, remaining, used };
};

/** The sentence shown in place of the button when a day cannot be fixed. */
export const describeBackfillBlock = (block: BackfillBlock, used: number): string => {
  switch (block) {
    case 'activity_completed':
      return 'This habit is finished — its history is closed.';
    case 'already_logged':
      return 'This day is already logged.';
    case 'not_past':
      return 'Only days that have already ended can be fixed.';
    case 'too_old':
      return `Too long ago. Only the last ${BACKFILL_WINDOW_DAYS} days can be fixed — after that a missed day stays missed.`;
    case 'before_start':
      return 'This is before the habit was created.';
    case 'quota_exhausted':
      return `No fixes left. You've used ${used} of ${BACKFILL_QUOTA} in the last ${BACKFILL_QUOTA_WINDOW_DAYS} days.`;
  }
};
