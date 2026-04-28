import { create } from 'zustand';
import dayjs from 'dayjs';
import { attendanceService, Activity, NotesMap, NoteEntry, getTaskForDate } from '../features/attendance/attendanceService';
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateCurrentWeeklyStreak,
  calculateLongestWeeklyStreak,
  isWeeklyGoalMetThisWeek,
  getThisWeekLogCount,
} from '../utils/streakUtils';
import { todayStr } from '../utils/dateUtils';

interface ActivityStats {
  currentStreak: number;
  longestStreak: number;
  isTodayLogged: boolean;
  /** 'day' for normal daily streaks, 'week' for weekly-goal activities */
  unit: 'day' | 'week';
  /** Only relevant in weekly mode: whether this week's goal is already met */
  isThisWeekGoalMet: boolean;
  /** Weekly goal value when in weekly mode, undefined otherwise */
  weeklyGoal?: number;
  /** Number of unique days logged in the current calendar week */
  thisWeekCount: number;
}

interface AttendanceState {
  activities: Activity[];
  logs: Record<string, string[]>;
  notes: NotesMap;
  selectedActivityId: string | null;
  isLoading: boolean;
  isConfettiEnabled: boolean;

  // Actions
  hydrate: () => Promise<void>;
  createActivity: (
    name: string,
    requiresNote?: boolean,
    weeklyGoal?: number,
    taskSequence?: string[],
    sequenceStartDate?: string,
    sequenceMode?: 'calendar' | 'log',
  ) => Promise<void>;
  editActivity: (
    id: string,
    name: string,
    requiresNote?: boolean,
    weeklyGoal?: number,
    taskSequence?: string[],
    sequenceStartDate?: string,
    sequenceMode?: 'calendar' | 'log',
  ) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  selectActivity: (id: string) => void;
  setConfettiEnabled: (enabled: boolean) => Promise<void>;
  logToday: (activityId: string, note?: string) => Promise<void>;
  resetActivityData: (id: string) => Promise<void>;
  /** Appends a new note entry to the activity's journal for the given date. */
  appendNote: (activityId: string, dateStr: string, text: string) => Promise<void>;
  /** Edits the text of an existing note entry by index. The original timestamp is preserved. */
  editNote: (activityId: string, dateStr: string, index: number, text: string) => Promise<void>;
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<boolean>;

  // Derived getters
  getActivityStats: (activityId: string) => ActivityStats;
  getNoteEntries: (activityId: string, dateStr: string) => NoteEntry[] | undefined;
}

export { NoteEntry, getTaskForDate };

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  activities: [],
  logs: {},
  notes: {},
  selectedActivityId: null,
  isLoading: false,
  isConfettiEnabled: true,

  hydrate: async () => {
    set({ isLoading: true });
    const activities = await attendanceService.getActivities();
    const logs = await attendanceService.getLogs();
    const notes = await attendanceService.getNotes();

    // Load confetti setting (default to true)
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const { StorageKeys } = await import('../constants/storage');
      const confettiStr = await AsyncStorage.getItem(StorageKeys.CONFETTI);
      const isConfettiEnabled = confettiStr ? JSON.parse(confettiStr) : true;
      set({ activities, logs, notes, isConfettiEnabled, isLoading: false });
    } catch {
      set({ activities, logs, notes, isConfettiEnabled: true, isLoading: false });
    }
  },

  createActivity: async (
    name: string,
    requiresNote?: boolean,
    weeklyGoal?: number,
    taskSequence?: string[],
    sequenceStartDate?: string,
    sequenceMode?: 'calendar' | 'log',
  ) => {
    const { activities } = get();
    const newActivity: Activity = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      name,
      createdAt: Date.now(),
      requiresNote: requiresNote ?? false,
      ...(weeklyGoal !== undefined && weeklyGoal > 0 ? { weeklyGoal } : {}),
      ...(taskSequence && taskSequence.length > 0 ? { taskSequence } : {}),
      ...(sequenceStartDate ? { sequenceStartDate } : {}),
      ...(sequenceMode ? { sequenceMode } : {}),
    };

    const updatedActivities = [...activities, newActivity];
    await attendanceService.saveActivities(updatedActivities);
    set({ activities: updatedActivities });
  },

  editActivity: async (
    id: string,
    name: string,
    requiresNote?: boolean,
    weeklyGoal?: number,
    taskSequence?: string[],
    sequenceStartDate?: string,
    sequenceMode?: 'calendar' | 'log',
  ) => {
    const { activities } = get();
    const updatedActivities = activities.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, name };
      if (requiresNote !== undefined) updated.requiresNote = requiresNote;
      // weeklyGoal=0 means "remove weekly mode"; undefined means "don't change"
      if (weeklyGoal !== undefined) {
        if (weeklyGoal > 0) {
          updated.weeklyGoal = weeklyGoal;
        } else {
          delete updated.weeklyGoal;
        }
      }
      // taskSequence: empty array means "remove sequence"
      if (taskSequence !== undefined) {
        if (taskSequence.length > 0) {
          updated.taskSequence = taskSequence;
        } else {
          delete updated.taskSequence;
          delete updated.sequenceStartDate;
          delete updated.sequenceMode;
        }
      }
      if (sequenceStartDate !== undefined) updated.sequenceStartDate = sequenceStartDate;
      if (sequenceMode !== undefined) updated.sequenceMode = sequenceMode;
      return updated;
    });
    await attendanceService.saveActivities(updatedActivities);
    set({ activities: updatedActivities });
  },

  deleteActivity: async (id: string) => {
    const { activities, logs, notes, selectedActivityId } = get();

    const updatedActivities = activities.filter(a => a.id !== id);
    await attendanceService.saveActivities(updatedActivities);

    const updatedLogs = { ...logs };
    delete updatedLogs[id];
    await attendanceService.saveLogs(updatedLogs);

    const updatedNotes = { ...notes };
    delete updatedNotes[id];
    await attendanceService.saveNotes(updatedNotes);

    set({
      activities: updatedActivities,
      logs: updatedLogs,
      notes: updatedNotes,
      selectedActivityId: selectedActivityId === id ? null : selectedActivityId,
    });
  },

  selectActivity: (id: string) => {
    set({ selectedActivityId: id });
  },

  setConfettiEnabled: async (enabled: boolean) => {
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const { StorageKeys } = await import('../constants/storage');
      await AsyncStorage.setItem(StorageKeys.CONFETTI, JSON.stringify(enabled));
    } catch {}
    set({ isConfettiEnabled: enabled });
  },

  logToday: async (activityId: string, note?: string) => {
    const { logs, notes } = get();
    const today = todayStr();
    const activityLogs = logs[activityId] || [];
    if (activityLogs.some(log => dayjs(log).format('YYYY-MM-DD') === today)) return;

    set({ isLoading: true });
    await attendanceService.logToday(activityId, note);

    const updatedLogs = { ...logs };
    updatedLogs[activityId] = [...activityLogs, dayjs().toISOString()];

    // Update local notes map if a note was provided
    let updatedNotes = notes;
    if (note && note.trim()) {
      updatedNotes = { ...notes };
      if (!updatedNotes[activityId]) updatedNotes[activityId] = {};
      updatedNotes[activityId] = {
        ...updatedNotes[activityId],
        [today]: [{ text: note.trim(), time: dayjs().toISOString() }],
      };
    }

    set({ logs: updatedLogs, notes: updatedNotes, isLoading: false });
  },

  appendNote: async (activityId: string, dateStr: string, text: string) => {
    const { notes } = get();
    const trimmed = text.trim();
    if (!trimmed) return;

    await attendanceService.appendNote(activityId, dateStr, trimmed);

    const updatedNotes = { ...notes };
    if (!updatedNotes[activityId]) updatedNotes[activityId] = {};
    const existing = updatedNotes[activityId][dateStr] || [];
    updatedNotes[activityId] = {
      ...updatedNotes[activityId],
      [dateStr]: [...existing, { text: trimmed, time: dayjs().toISOString() }],
    };
    set({ notes: updatedNotes });
  },

  editNote: async (activityId: string, dateStr: string, index: number, text: string) => {
    const { notes } = get();
    const trimmed = text.trim();
    if (!trimmed) return;

    await attendanceService.editNote(activityId, dateStr, index, trimmed);

    const updatedNotes = { ...notes };
    const entries = updatedNotes[activityId]?.[dateStr];
    if (!entries || index < 0 || index >= entries.length) return;
    const updated = [...entries];
    updated[index] = { ...updated[index], text: trimmed };
    updatedNotes[activityId] = { ...updatedNotes[activityId], [dateStr]: updated };
    set({ notes: updatedNotes });
  },

  resetActivityData: async (id: string) => {
    const { logs, notes } = get();
    const updatedLogs = { ...logs };
    delete updatedLogs[id];
    await attendanceService.saveLogs(updatedLogs);

    const updatedNotes = { ...notes };
    delete updatedNotes[id];
    await attendanceService.saveNotes(updatedNotes);

    set({ logs: updatedLogs, notes: updatedNotes });
  },

  exportData: async () => {
    return await attendanceService.exportData();
  },

  importData: async (jsonData: string) => {
    const success = await attendanceService.importData(jsonData);
    if (success) {
      const activities = await attendanceService.getActivities();
      const logs = await attendanceService.getLogs();
      const notes = await attendanceService.getNotes();
      set({ activities, logs, notes });
    }
    return success;
  },

  getActivityStats: (activityId: string) => {
    const logs = get().logs[activityId] || [];
    const activity = get().activities.find(a => a.id === activityId);
    const isTodayLogged = logs.some(log => dayjs(log).format('YYYY-MM-DD') === todayStr());

    if (activity?.weeklyGoal) {
      const goal = activity.weeklyGoal;
      return {
        currentStreak: calculateCurrentWeeklyStreak(logs, goal),
        longestStreak: calculateLongestWeeklyStreak(logs, goal),
        isTodayLogged,
        unit: 'week' as const,
        isThisWeekGoalMet: isWeeklyGoalMetThisWeek(logs, goal),
        weeklyGoal: goal,
        thisWeekCount: getThisWeekLogCount(logs),
      };
    }

    return {
      currentStreak: calculateCurrentStreak(logs),
      longestStreak: calculateLongestStreak(logs),
      isTodayLogged,
      unit: 'day' as const,
      isThisWeekGoalMet: false,
      thisWeekCount: 0,
    };
  },

  getNoteEntries: (activityId: string, dateStr: string) => {
    return get().notes[activityId]?.[dateStr];
  },
}));
