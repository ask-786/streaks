import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { todayStr, getCurrentTz } from '../../utils/dateUtils';
import { StorageKeys } from '../../constants';

/**
 * One step of a habit's task sequence.
 *
 * `title` is the short line shown wherever the task is named; `description` is
 * optional longer detail (sets, reps, a route, why it matters) surfaced under
 * the title. Sequences created before descriptions existed were plain strings
 * and are migrated to `{ title }` on read — see `normalizeSequenceTask`.
 */
export interface SequenceTask {
  title: string;
  description?: string;
}

export interface Activity {
  id: string;
  name: string;
  /**
   * Optional longer detail about the habit itself — what counts as done, why
   * it matters, the rule you set yourself. Distinct from a sequence task's
   * description, which belongs to one step rather than the whole habit.
   */
  description?: string;
  createdAt: number;
  requiresNote?: boolean;
  /**
   * When set (1–7), this activity uses Weekly Goal mode.
   * The streak counts consecutive calendar weeks where the user logged at least this many times.
   * When undefined, the activity uses the original daily consecutive streak logic.
   */
  weeklyGoal?: number;

  /** Ordered list of tasks that rotate one-per-day. */
  taskSequence?: SequenceTask[];
  /**
   * The YYYY-MM-DD date that maps to index 0 of taskSequence.
   * Defaults to dayjs(createdAt).format('YYYY-MM-DD') when not set.
   */
  sequenceStartDate?: string;
  /**
   * How the sequence advances:
   * - 'calendar' (default): one step per calendar day since sequenceStartDate
   * - 'log': one step per logged day (advances only when user actually logs)
   */
  sequenceMode?: 'calendar' | 'log';

  /**
   * Time bound constraints for logging.
   */
  timeBoundType?: 'before' | 'after' | 'between';
  timeBoundStartTime?: string; // e.g. "HH:mm"
  timeBoundEndTime?: string; // e.g. "HH:mm", used only for 'between'

  /**
   * Activity completion type:
   * - 'goal': completes automatically when streakGoal is reached
   * - 'endless': no predefined target; can be manually completed
   * Defaults to 'endless' for activities created before this feature.
   */
  activityType?: 'goal' | 'endless';

  /**
   * The streak count target for goal-based activities.
   * When currentStreak reaches this value, the activity is marked completed.
   */
  streakGoal?: number;

  /**
   * Timestamp (ms) when the activity was completed.
   * Presence of this field means the activity is in the Completed state.
   */
  completedAt?: number;
}

/**
 * A single log event. `ts` is the UTC ISO timestamp; `date` is the
 * YYYY-MM-DD local date at the moment of logging. The `date` field is
 * intentionally kept separate so it never shifts when the device's
 * timezone changes (e.g. the user travels to another country).
 */
export interface LogEntry {
  ts: string; // UTC ISO string, e.g. "2026-07-10T08:45:00.000Z"
  date: string; // Local YYYY-MM-DD at the time of logging, e.g. "2026-07-10"
  tz?: string; // IANA timezone name at time of logging, e.g. "Asia/Kolkata"
  /**
   * True when the entry was added after the fact through the missed-day fix
   * rather than on the day itself — the habit was done, the tap was forgotten.
   * `ts` then holds the moment of the fix, not the moment of the habit, which
   * is why a backfilled entry never shows a "time logged".
   *
   * The flag is permanent on purpose: a fixed day still counts toward the
   * streak, but the calendar keeps showing which days were earned live. See
   * `backfill.ts` for the rules that gate creating one.
   */
  backfilled?: boolean;
}

export interface NoteEntry {
  text: string;
  /** ISO timestamp when this note was written. Null for notes migrated from the old single-string format. */
  time: string | null;
  /** IANA timezone name when this note was written, e.g. "Asia/Kolkata". */
  tz?: string;
}

// Notes: { [activityId]: { [dateStr YYYY-MM-DD]: NoteEntry[] } }
export type NotesMap = Record<string, Record<string, NoteEntry[]>>;

// TaskHistory: { [activityId]: { [dateStr YYYY-MM-DD]: SequenceTask } }
// Older versions stored a bare title string per date; those are migrated on read.
export type TaskHistoryMap = Record<string, Record<string, SequenceTask>>;

/**
 * SequenceSkips: { [activityId]: string[] }
 * Each value is an array of YYYY-MM-DD dates where the user logged but
 * chose to skip today's sequence task (e.g. did cardio instead of Push day).
 * The sequence does not advance on skipped days.
 */
export type SequenceSkipsMap = Record<string, string[]>;

/**
 * One dropped sequence step — the user pulled a task out of the current cycle
 * without doing it (skipped Leg day and went straight back to Push).
 *
 * The opposite of a sequence skip: a skip holds the pointer still so the task
 * comes back, a drop pushes the pointer forward so the task never comes back.
 * Drops are stored as a list rather than a set of dates because dropping twice
 * in one day is meaningful — that jumps two steps down the sequence.
 */
export interface SequenceDrop {
  /** Local YYYY-MM-DD date the drop was made. */
  date: string;
  /** The task that was dropped, kept so history can name it. */
  task?: SequenceTask;
  /** UTC ISO timestamp of the drop. */
  ts?: string;
  /** IANA timezone name at the time of the drop. */
  tz?: string;
  /** Optional reason the user gave. */
  note?: string;
}

/** SequenceDrops: { [activityId]: SequenceDrop[] } */
export type SequenceDropsMap = Record<string, SequenceDrop[]>;

/**
 * Coerces one stored sequence entry into a `SequenceTask`.
 *
 * Accepts the legacy plain-string form, the current object form, and the
 * shapes a hand-written or exported JSON file is likely to use (`text`/`name`
 * as an alias for `title`, `notes`/`detail` for `description`). Returns null
 * for anything without a usable title, so callers can filter junk out.
 */
export function normalizeSequenceTask(value: unknown): SequenceTask | null {
  if (typeof value === 'string') {
    const title = value.trim();
    return title ? { title } : null;
  }
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;
  const titleSource = [raw.title, raw.text, raw.name].find((v) => typeof v === 'string');
  const title = typeof titleSource === 'string' ? titleSource.trim() : '';
  if (!title) return null;

  const descSource = [raw.description, raw.notes, raw.detail].find((v) => typeof v === 'string');
  const description = typeof descSource === 'string' ? descSource.trim() : '';

  return description ? { title, description } : { title };
}

/** Normalizes a whole stored sequence, dropping entries with no usable title. */
export function normalizeSequenceTasks(value: unknown): SequenceTask[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeSequenceTask).filter((t): t is SequenceTask => t !== null);
}

/**
 * Coerces stored drops into `SequenceDrop[]`, keeping only entries with a
 * usable YYYY-MM-DD date. Imported files can carry anything, and a malformed
 * date here would silently shift every task in the sequence.
 */
export function normalizeSequenceDrops(value: unknown): SequenceDrop[] {
  if (!Array.isArray(value)) return [];
  const drops: SequenceDrop[] = [];
  for (const entry of value) {
    // A bare date string is accepted so a hand-written export still works.
    const raw = typeof entry === 'string' ? { date: entry } : entry;
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as Record<string, unknown>;
    const date = typeof record.date === 'string' ? record.date.trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const drop: SequenceDrop = { date };
    const task = normalizeSequenceTask(record.task);
    if (task) drop.task = task;
    if (typeof record.ts === 'string') drop.ts = record.ts;
    if (typeof record.tz === 'string') drop.tz = record.tz;
    if (typeof record.note === 'string' && record.note.trim()) drop.note = record.note.trim();
    drops.push(drop);
  }
  return drops;
}

/** Normalizes a whole stored drops map. */
export function normalizeSequenceDropsMap(value: unknown): SequenceDropsMap {
  if (!value || typeof value !== 'object') return {};
  const result: SequenceDropsMap = {};
  for (const [activityId, drops] of Object.entries(value as Record<string, unknown>)) {
    result[activityId] = normalizeSequenceDrops(drops);
  }
  return result;
}

/**
 * Attendance Service
 * Handles persistence of activities, logged dates, and notes via AsyncStorage.
 */
export const attendanceService = {
  getActivities: async (): Promise<Activity[]> => {
    try {
      const raw = await AsyncStorage.getItem(StorageKeys.ACTIVITIES);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Activity[];
      // Migrate: sequences used to be plain strings, before tasks gained a
      // description. Normalizing here means nothing downstream sees both forms.
      return parsed.map((activity) => {
        if (!activity.taskSequence) return activity;
        return { ...activity, taskSequence: normalizeSequenceTasks(activity.taskSequence) };
      });
    } catch {
      return [];
    }
  },

  saveActivities: async (activities: Activity[]): Promise<void> => {
    await AsyncStorage.setItem(StorageKeys.ACTIVITIES, JSON.stringify(activities));
  },

  updateActivity: async (id: string, newName: string): Promise<void> => {
    const activities = await attendanceService.getActivities();
    const updated = activities.map((a) => (a.id === id ? { ...a, name: newName } : a));
    await attendanceService.saveActivities(updated);
  },

  getLogs: async (): Promise<Record<string, LogEntry[]>> => {
    try {
      const raw = await AsyncStorage.getItem(StorageKeys.LOGS);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, (string | LogEntry)[]>;

      // Migrate: older versions stored plain ISO strings or bare date strings.
      // Wrap them in LogEntry objects, computing the local date from the timestamp.
      const result: Record<string, LogEntry[]> = {};
      for (const actId of Object.keys(parsed)) {
        result[actId] = (parsed[actId] ?? []).map((entry) => {
          if (typeof entry === 'string') {
            // Old format: string is either a UTC ISO string or a bare YYYY-MM-DD date.
            const ts = entry.includes('T') ? entry : `${entry}T00:00:00.000Z`;
            const date = dayjs(ts).format('YYYY-MM-DD');
            return { ts, date };
          }
          // Already a LogEntry — pass through.
          return entry;
        });
      }
      return result;
    } catch {
      return {};
    }
  },

  saveLogs: async (logs: Record<string, LogEntry[]>): Promise<void> => {
    await AsyncStorage.setItem(StorageKeys.LOGS, JSON.stringify(logs));
  },

  getNotes: async (): Promise<NotesMap> => {
    try {
      const raw = await AsyncStorage.getItem(StorageKeys.NOTES);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, Record<string, unknown>>;

      // Migrate: older versions stored a plain string per date — wrap in NoteEntry[]
      const migrated: NotesMap = {};
      for (const actId of Object.keys(parsed)) {
        migrated[actId] = {};
        for (const dateStr of Object.keys(parsed[actId])) {
          const val = parsed[actId][dateStr];
          if (typeof val === 'string') {
            migrated[actId][dateStr] = [{ text: val, time: null }];
          } else if (Array.isArray(val)) {
            migrated[actId][dateStr] = val as NoteEntry[];
          }
        }
      }
      return migrated;
    } catch {
      return {};
    }
  },

  saveNotes: async (notes: NotesMap): Promise<void> => {
    await AsyncStorage.setItem(StorageKeys.NOTES, JSON.stringify(notes));
  },

  getTaskHistory: async (): Promise<TaskHistoryMap> => {
    try {
      const raw = await AsyncStorage.getItem(StorageKeys.TASK_HISTORY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, Record<string, unknown>>;

      // Migrate: older versions locked in a bare title string per date.
      const migrated: TaskHistoryMap = {};
      for (const actId of Object.keys(parsed)) {
        migrated[actId] = {};
        for (const dateStr of Object.keys(parsed[actId])) {
          const task = normalizeSequenceTask(parsed[actId][dateStr]);
          if (task) migrated[actId][dateStr] = task;
        }
      }
      return migrated;
    } catch {
      return {};
    }
  },

  saveTaskHistory: async (history: TaskHistoryMap): Promise<void> => {
    await AsyncStorage.setItem(StorageKeys.TASK_HISTORY, JSON.stringify(history));
  },

  getSequenceSkips: async (): Promise<SequenceSkipsMap> => {
    try {
      const raw = await AsyncStorage.getItem(StorageKeys.SEQUENCE_SKIPS);
      if (!raw) return {};
      return JSON.parse(raw) as SequenceSkipsMap;
    } catch {
      return {};
    }
  },

  saveSequenceSkips: async (skips: SequenceSkipsMap): Promise<void> => {
    await AsyncStorage.setItem(StorageKeys.SEQUENCE_SKIPS, JSON.stringify(skips));
  },

  getSequenceDrops: async (): Promise<SequenceDropsMap> => {
    try {
      const raw = await AsyncStorage.getItem(StorageKeys.SEQUENCE_DROPS);
      if (!raw) return {};
      return normalizeSequenceDropsMap(JSON.parse(raw));
    } catch {
      return {};
    }
  },

  saveSequenceDrops: async (drops: SequenceDropsMap): Promise<void> => {
    await AsyncStorage.setItem(StorageKeys.SEQUENCE_DROPS, JSON.stringify(drops));
  },

  logToday: async (activityId: string, note?: string): Promise<boolean> => {
    const logs = await attendanceService.getLogs();
    const today = todayStr();

    const activityLogs = logs[activityId] || [];
    if (activityLogs.some((entry) => entry.date === today)) {
      return false; // already logged today
    }

    const newEntry: LogEntry = { ts: dayjs().toISOString(), date: today, tz: getCurrentTz() };
    logs[activityId] = [...activityLogs, newEntry];
    await attendanceService.saveLogs(logs);

    // Persist the note if one was provided
    if (note && note.trim()) {
      const notes = await attendanceService.getNotes();
      if (!notes[activityId]) notes[activityId] = {};
      notes[activityId][today] = [
        { text: note.trim(), time: dayjs().toISOString(), tz: getCurrentTz() },
      ];
      await attendanceService.saveNotes(notes);
    }

    return true;
  },

  /**
   * Records a day the user completed but forgot to log.
   *
   * Callers must clear `getBackfillEligibility` first — this layer enforces
   * only the invariant every log path shares (one entry per day) and the one
   * this path adds (a reason is not optional). The reason is stored as an
   * ordinary note so it shows up in the day's timeline and in exports.
   *
   * Entries are inserted in date order rather than appended, so the stored list
   * stays ascending the way every other write leaves it.
   */
  logPastDate: async (
    activityId: string,
    dateStr: string,
    reason: string,
  ): Promise<LogEntry | null> => {
    const trimmed = reason.trim();
    if (!trimmed) return null;

    const logs = await attendanceService.getLogs();
    const activityLogs = logs[activityId] || [];
    if (activityLogs.some((entry) => entry.date === dateStr)) return null;

    const newEntry: LogEntry = {
      ts: dayjs().toISOString(),
      date: dateStr,
      tz: getCurrentTz(),
      backfilled: true,
    };
    const insertAt = activityLogs.findIndex((entry) => entry.date > dateStr);
    logs[activityId] =
      insertAt === -1
        ? [...activityLogs, newEntry]
        : [...activityLogs.slice(0, insertAt), newEntry, ...activityLogs.slice(insertAt)];
    await attendanceService.saveLogs(logs);

    await attendanceService.appendNote(activityId, dateStr, trimmed);

    return newEntry;
  },

  /**
   * Appends a new NoteEntry to the list for the given activity + date.
   * Multiple calls on the same day accumulate entries (journal-style).
   */
  appendNote: async (activityId: string, dateStr: string, text: string): Promise<void> => {
    const notes = await attendanceService.getNotes();
    if (!notes[activityId]) notes[activityId] = {};
    const existing = notes[activityId][dateStr] || [];
    notes[activityId][dateStr] = [
      ...existing,
      { text: text.trim(), time: dayjs().toISOString(), tz: getCurrentTz() },
    ];
    await attendanceService.saveNotes(notes);
  },

  /**
   * Edits the text of an existing NoteEntry at a specific index.
   * The original timestamp is preserved.
   */
  editNote: async (
    activityId: string,
    dateStr: string,
    index: number,
    text: string,
  ): Promise<void> => {
    const notes = await attendanceService.getNotes();
    const entries = notes[activityId]?.[dateStr];
    if (!entries || index < 0 || index >= entries.length) return;
    const updated = [...entries];
    updated[index] = { ...updated[index], text: text.trim() };
    notes[activityId][dateStr] = updated;
    await attendanceService.saveNotes(notes);
  },

  clearAll: async (): Promise<void> => {
    await AsyncStorage.removeItem(StorageKeys.ACTIVITIES);
    await AsyncStorage.removeItem(StorageKeys.LOGS);
    await AsyncStorage.removeItem(StorageKeys.NOTES);
    await AsyncStorage.removeItem(StorageKeys.TASK_HISTORY);
    await AsyncStorage.removeItem(StorageKeys.SEQUENCE_SKIPS);
    await AsyncStorage.removeItem(StorageKeys.SEQUENCE_DROPS);
  },

  exportData: async (): Promise<string> => {
    const activities = await attendanceService.getActivities();
    const logs = await attendanceService.getLogs();
    const notes = await attendanceService.getNotes();
    const taskHistory = await attendanceService.getTaskHistory();
    const sequenceSkips = await attendanceService.getSequenceSkips();
    const sequenceDrops = await attendanceService.getSequenceDrops();
    return JSON.stringify({ activities, logs, notes, taskHistory, sequenceSkips, sequenceDrops });
  },

  importData: async (jsonData: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!parsed || typeof parsed !== 'object') return false;
      if (!Array.isArray(parsed.activities)) return false;
      if (!parsed.logs || typeof parsed.logs !== 'object') return false;

      // Basic validation of activities
      for (const act of parsed.activities) {
        if (!act.id || !act.name) return false;
      }

      await attendanceService.saveActivities(parsed.activities);
      await attendanceService.saveLogs(parsed.logs);

      // Notes are optional (older exports won't have them)
      if (parsed.notes && typeof parsed.notes === 'object') {
        await attendanceService.saveNotes(parsed.notes);
      }

      // Task history is optional
      if (parsed.taskHistory && typeof parsed.taskHistory === 'object') {
        await attendanceService.saveTaskHistory(parsed.taskHistory);
      }

      // Sequence skips are optional (older exports won't have them)
      if (parsed.sequenceSkips && typeof parsed.sequenceSkips === 'object') {
        await attendanceService.saveSequenceSkips(parsed.sequenceSkips);
      }

      // Sequence drops are optional too, and normalized on the way in — a bad
      // date here would silently shift every task in the sequence.
      if (parsed.sequenceDrops && typeof parsed.sequenceDrops === 'object') {
        await attendanceService.saveSequenceDrops(normalizeSequenceDropsMap(parsed.sequenceDrops));
      }

      return true;
    } catch {
      return false;
    }
  },
};

/**
 * How the sequence pointer has been nudged away from its natural position.
 *
 * `postponed` and `dropped` are exact opposites and cancel each other out:
 * a postponed day holds the pointer still so the same task comes back
 * tomorrow, a dropped task pushes the pointer forward so that task never
 * comes back this cycle.
 */
export interface SequenceContext {
  /** YYYY-MM-DD dates the activity was logged on. */
  logs?: string[];
  /**
   * YYYY-MM-DD dates where the user logged but did not perform the sequence
   * task, so it carries over to the next session.
   */
  postponed?: string[];
  /**
   * YYYY-MM-DD dates where the user dropped that day's task from the cycle.
   * Repeats are meaningful: two entries on one date jump two steps forward.
   */
  dropped?: string[];
}

/**
 * Returns the task that should be displayed for the given date.
 * Works identically for daily and weekly-goal habits.
 *
 * calendar mode (default):
 *   index = (days elapsed since sequenceStartDate - postponed + dropped) mod tasks.length
 *   Each postponement "pauses" the sequence for that calendar day, so the same
 *   task reappears on the following day; each drop does the reverse and pulls
 *   the rest of the sequence a day closer.
 *
 * log mode:
 *   index = (logged days strictly before dateStr that were not postponed + dropped) mod tasks.length
 *   Task advances only when the user actually performs the sequence task, or
 *   explicitly drops one.
 *
 * Drops count from the day they were made (`<= dateStr`) in both modes, so
 * tapping Skip swaps the card to the next task immediately.
 */
export function getTaskForDate(
  activity: Activity,
  dateStr: string,
  context: SequenceContext = {},
): SequenceTask | null {
  // Normalize rather than trust the field: an imported file can carry the
  // legacy string form straight into the store without passing getActivities.
  const sequence = normalizeSequenceTasks(activity.taskSequence);
  if (sequence.length === 0) return null;

  const { logs = [], postponed = [], dropped = [] } = context;
  const n = sequence.length;
  const dropsOnOrBefore = dropped.filter((d) => d <= dateStr).length;
  let index: number;

  if (activity.sequenceMode === 'log') {
    // Count unique calendar days with a log strictly before dateStr,
    // excluding days where the sequence task was postponed.
    // `logs` contains pre-sanitized YYYY-MM-DD date strings.
    const postponedSet = new Set(postponed);
    const uniqueLogDays = new Set(logs.filter((d) => d < dateStr && !postponedSet.has(d)));
    index = (uniqueLogDays.size + dropsOnOrBefore) % n;
  } else {
    // calendar (default)
    const start = activity.sequenceStartDate ?? dayjs(activity.createdAt).format('YYYY-MM-DD');
    const rawOffset = dayjs(dateStr).diff(dayjs(start), 'day');
    const postponedOnOrBefore = postponed.filter((d) => d <= dateStr).length;
    const offset = rawOffset - postponedOnOrBefore + dropsOnOrBefore;
    index = ((offset % n) + n) % n; // handles negative offset correctly
  }

  return sequence[index];
}
