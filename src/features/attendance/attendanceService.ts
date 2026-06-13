import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { todayStr } from '../../utils/dateUtils';
import { StorageKeys } from '../../constants';

export interface Activity {
  id: string;
  name: string;
  createdAt: number;
  requiresNote?: boolean;
  /**
   * When set (1–7), this activity uses Weekly Goal mode.
   * The streak counts consecutive calendar weeks where the user logged at least this many times.
   * When undefined, the activity uses the original daily consecutive streak logic.
   */
  weeklyGoal?: number;

  /** Ordered list of task strings that rotate one-per-day. */
  taskSequence?: string[];
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

export interface NoteEntry {
  text: string;
  /** ISO timestamp when this note was written. Null for notes migrated from the old single-string format. */
  time: string | null;
}

// Notes: { [activityId]: { [dateStr YYYY-MM-DD]: NoteEntry[] } }
export type NotesMap = Record<string, Record<string, NoteEntry[]>>;

// TaskHistory: { [activityId]: { [dateStr YYYY-MM-DD]: string } }
export type TaskHistoryMap = Record<string, Record<string, string>>;

/**
 * SequenceSkips: { [activityId]: string[] }
 * Each value is an array of YYYY-MM-DD dates where the user logged but
 * chose to skip today's sequence task (e.g. did cardio instead of Push day).
 * The sequence does not advance on skipped days.
 */
export type SequenceSkipsMap = Record<string, string[]>;

/**
 * Attendance Service
 * Handles persistence of activities, logged dates, and notes via AsyncStorage.
 */
export const attendanceService = {
  getActivities: async (): Promise<Activity[]> => {
    try {
      const raw = await AsyncStorage.getItem(StorageKeys.ACTIVITIES);
      if (!raw) return [];
      return JSON.parse(raw) as Activity[];
    } catch {
      return [];
    }
  },

  saveActivities: async (activities: Activity[]): Promise<void> => {
    await AsyncStorage.setItem(StorageKeys.ACTIVITIES, JSON.stringify(activities));
  },

  updateActivity: async (id: string, newName: string): Promise<void> => {
    const activities = await attendanceService.getActivities();
    const updated = activities.map(a => (a.id === id ? { ...a, name: newName } : a));
    await attendanceService.saveActivities(updated);
  },

  getLogs: async (): Promise<Record<string, string[]>> => {
    try {
      const raw = await AsyncStorage.getItem(StorageKeys.LOGS);
      if (!raw) return {};
      return JSON.parse(raw) as Record<string, string[]>;
    } catch {
      return {};
    }
  },

  saveLogs: async (logs: Record<string, string[]>): Promise<void> => {
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
      return JSON.parse(raw) as TaskHistoryMap;
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

  logToday: async (activityId: string, note?: string): Promise<boolean> => {
    const logs = await attendanceService.getLogs();
    const today = todayStr();

    const activityLogs = logs[activityId] || [];
    if (activityLogs.some(log => dayjs(log).format('YYYY-MM-DD') === today)) {
      return false; // already logged today
    }

    logs[activityId] = [...activityLogs, dayjs().toISOString()];
    await attendanceService.saveLogs(logs);

    // Persist the note if one was provided
    if (note && note.trim()) {
      const notes = await attendanceService.getNotes();
      if (!notes[activityId]) notes[activityId] = {};
      notes[activityId][today] = [{ text: note.trim(), time: dayjs().toISOString() }];
      await attendanceService.saveNotes(notes);
    }

    return true;
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
      { text: text.trim(), time: dayjs().toISOString() },
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
  },

  exportData: async (): Promise<string> => {
    const activities = await attendanceService.getActivities();
    const logs = await attendanceService.getLogs();
    const notes = await attendanceService.getNotes();
    const taskHistory = await attendanceService.getTaskHistory();
    const sequenceSkips = await attendanceService.getSequenceSkips();
    return JSON.stringify({ activities, logs, notes, taskHistory, sequenceSkips });
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

      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Returns the task string that should be displayed for the given date.
 * Works identically for daily and weekly-goal habits.
 *
 * calendar mode (default):
 *   index = (days elapsed since sequenceStartDate - skips on or before dateStr) mod tasks.length
 *   Each sequence skip "pauses" the sequence for that calendar day, so the
 *   same task reappears on the following day.
 *
 * log mode:
 *   index = (number of logged days strictly before dateStr that are NOT skipped) mod tasks.length
 *   Task advances only when the user actually performs the sequence task.
 *
 * @param skippedDates - Array of YYYY-MM-DD dates where the sequence was skipped.
 *   On these dates the user logged but did not perform the sequence task.
 */
export function getTaskForDate(
  activity: Activity,
  dateStr: string,
  logs: string[] = [],
  skippedDates: string[] = [],
): string | null {
  if (!activity.taskSequence || activity.taskSequence.length === 0) return null;

  const n = activity.taskSequence.length;
  let index: number;

  if (activity.sequenceMode === 'log') {
    // Count unique calendar days with a log strictly before dateStr,
    // excluding days where the sequence was skipped.
    const skippedSet = new Set(skippedDates);
    const uniqueLogDays = new Set(
      logs
        .map(l => dayjs(l).format('YYYY-MM-DD'))
        .filter(d => d < dateStr && !skippedSet.has(d)),
    );
    index = uniqueLogDays.size % n;
  } else {
    // calendar (default)
    const start =
      activity.sequenceStartDate ??
      dayjs(activity.createdAt).format('YYYY-MM-DD');
    const rawOffset = dayjs(dateStr).diff(dayjs(start), 'day');
    // Subtract the number of skips that occurred on or before dateStr.
    // Each skip pauses the sequence by one calendar day.
    const skipsOnOrBefore = skippedDates.filter(d => d <= dateStr).length;
    const offset = rawOffset - skipsOnOrBefore;
    index = ((offset % n) + n) % n; // handles negative offset correctly
  }

  return activity.taskSequence[index];
}
