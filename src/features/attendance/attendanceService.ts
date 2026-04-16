import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { todayStr } from '../../utils/dateUtils';
import { StorageKeys } from '../../constants';

export interface Activity {
  id: string;
  name: string;
  createdAt: number;
  requiresNote?: boolean;
}

export interface NoteEntry {
  text: string;
  /** ISO timestamp when this note was written. Null for notes migrated from the old single-string format. */
  time: string | null;
}

// Notes: { [activityId]: { [dateStr YYYY-MM-DD]: NoteEntry[] } }
export type NotesMap = Record<string, Record<string, NoteEntry[]>>;

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
  },

  exportData: async (): Promise<string> => {
    const activities = await attendanceService.getActivities();
    const logs = await attendanceService.getLogs();
    const notes = await attendanceService.getNotes();
    return JSON.stringify({ activities, logs, notes });
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

      return true;
    } catch {
      return false;
    }
  },
};
