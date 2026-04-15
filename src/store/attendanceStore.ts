import { create } from 'zustand';
import dayjs from 'dayjs';
import { attendanceService, Activity, NotesMap } from '../features/attendance/attendanceService';
import { calculateCurrentStreak, calculateLongestStreak } from '../utils/streakUtils';
import { todayStr } from '../utils/dateUtils';

interface ActivityStats {
  currentStreak: number;
  longestStreak: number;
  isTodayLogged: boolean;
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
  createActivity: (name: string, requiresNote?: boolean) => Promise<void>;
  editActivity: (id: string, name: string, requiresNote?: boolean) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  selectActivity: (id: string) => void;
  setConfettiEnabled: (enabled: boolean) => Promise<void>;
  logToday: (activityId: string, note?: string) => Promise<void>;
  resetActivityData: (id: string) => Promise<void>;
  updateNote: (activityId: string, dateStr: string, note: string) => Promise<void>;
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<boolean>;

  // Derived getters
  getActivityStats: (activityId: string) => ActivityStats;
  getNote: (activityId: string, dateStr: string) => string | undefined;
}

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

  createActivity: async (name: string, requiresNote?: boolean) => {
    const { activities } = get();
    const newActivity: Activity = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      name,
      createdAt: Date.now(),
      requiresNote: requiresNote ?? false,
    };

    const updatedActivities = [...activities, newActivity];
    await attendanceService.saveActivities(updatedActivities);
    set({ activities: updatedActivities });
  },

  editActivity: async (id: string, name: string, requiresNote?: boolean) => {
    const { activities } = get();
    const updatedActivities = activities.map(a =>
      a.id === id
        ? { ...a, name, ...(requiresNote !== undefined ? { requiresNote } : {}) }
        : a
    );
    await attendanceService.saveActivities(updatedActivities);
    set({ activities: updatedActivities });
  },

  deleteActivity: async (id: string) => {
    const { activities, logs, notes, selectedActivityId } = get();

    // Remove activity
    const updatedActivities = activities.filter(a => a.id !== id);
    await attendanceService.saveActivities(updatedActivities);

    // Remove logs
    const updatedLogs = { ...logs };
    delete updatedLogs[id];
    await attendanceService.saveLogs(updatedLogs);

    // Remove notes
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

    // Update local notes map too if a note was provided
    let updatedNotes = notes;
    if (note && note.trim()) {
      updatedNotes = { ...notes };
      if (!updatedNotes[activityId]) updatedNotes[activityId] = {};
      updatedNotes[activityId] = { ...updatedNotes[activityId], [today]: note.trim() };
    }

    set({ logs: updatedLogs, notes: updatedNotes, isLoading: false });
  },

  updateNote: async (activityId: string, dateStr: string, note: string) => {
    const { notes } = get();
    const updatedNotes = { ...notes };
    if (!updatedNotes[activityId]) updatedNotes[activityId] = {};
    const trimmed = note.trim();
    if (trimmed) {
      updatedNotes[activityId] = { ...updatedNotes[activityId], [dateStr]: trimmed };
    } else {
      // Remove note if empty
      const dateMap = { ...updatedNotes[activityId] };
      delete dateMap[dateStr];
      updatedNotes[activityId] = dateMap;
    }
    await attendanceService.saveNotes(updatedNotes);
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
    return {
      currentStreak: calculateCurrentStreak(logs),
      longestStreak: calculateLongestStreak(logs),
      isTodayLogged: logs.some(log => dayjs(log).format('YYYY-MM-DD') === todayStr()),
    };
  },

  getNote: (activityId: string, dateStr: string) => {
    return get().notes[activityId]?.[dateStr];
  },
}));
