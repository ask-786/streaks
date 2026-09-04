import { create } from 'zustand';
import dayjs from 'dayjs';
import {
  attendanceService,
  Activity,
  NotesMap,
  NoteEntry,
  LogEntry,
  getTaskForDate,
  TaskHistoryMap,
  SequenceSkipsMap,
  SequenceDrop,
  SequenceDropsMap,
  SequenceTask,
} from '../features/attendance/attendanceService';
import { getBackfillEligibility, BackfillEligibility } from '../features/attendance/backfill';
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateCurrentWeeklyStreak,
  calculateLongestWeeklyStreak,
  isWeeklyGoalMetThisWeek,
  getThisWeekLogCount,
} from '../utils/streakUtils';
import { todayStr, getCurrentTz } from '../utils/dateUtils';
import { setHapticsEnabled as applyHapticsPreference } from '../utils/haptics';

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
  logs: Record<string, LogEntry[]>;
  notes: NotesMap;
  taskHistory: TaskHistoryMap;
  sequenceSkips: SequenceSkipsMap;
  sequenceDrops: SequenceDropsMap;
  selectedActivityId: string | null;
  isLoading: boolean;
  isConfettiEnabled: boolean;
  isHideExtraDaysEnabled: boolean;
  isHapticsEnabled: boolean;

  // Actions
  hydrate: () => Promise<void>;
  createActivity: (
    name: string,
    description?: string,
    requiresNote?: boolean,
    weeklyGoal?: number,
    taskSequence?: SequenceTask[],
    sequenceStartDate?: string,
    sequenceMode?: 'calendar' | 'log',
    timeBoundType?: 'before' | 'after' | 'between' | null,
    timeBoundStartTime?: string | null,
    timeBoundEndTime?: string | null,
    activityType?: 'goal' | 'endless',
    streakGoal?: number,
  ) => Promise<void>;
  editActivity: (
    id: string,
    name: string,
    description?: string,
    requiresNote?: boolean,
    weeklyGoal?: number,
    taskSequence?: SequenceTask[],
    sequenceStartDate?: string,
    sequenceMode?: 'calendar' | 'log',
    timeBoundType?: 'before' | 'after' | 'between' | null,
    timeBoundStartTime?: string | null,
    timeBoundEndTime?: string | null,
  ) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  /** Bulk delete. One persistence pass, so selecting ten habits is one write. */
  deleteActivities: (ids: string[]) => Promise<void>;
  selectActivity: (id: string) => void;
  completeActivity: (id: string) => Promise<void>;
  /** Bulk complete. Same single-pass guarantee as `deleteActivities`. */
  completeActivities: (ids: string[]) => Promise<void>;
  setConfettiEnabled: (enabled: boolean) => Promise<void>;
  setHideExtraDaysEnabled: (enabled: boolean) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  logToday: (activityId: string, note?: string) => Promise<void>;
  /**
   * Logs a past day the user actually completed but forgot to record.
   * Rejects (returning false) unless `getBackfillEligibility` allows it and a
   * reason was written — the rules live in `features/attendance/backfill.ts`.
   */
  logMissedDay: (activityId: string, dateStr: string, reason: string) => Promise<boolean>;
  /** Logs today AND marks the sequence task as skipped. Streak is maintained but sequence does not advance. */
  logTodayWithSequenceSkip: (activityId: string, note?: string) => Promise<void>;
  /**
   * Drops today's sequence task out of the current cycle without doing it, so
   * the next session lands on the task after it. Deliberately independent of
   * logging: drop then log to record a different task today, or drop alone to
   * take the day off with the task gone.
   */
  dropSequenceTask: (activityId: string, note?: string) => Promise<void>;
  /** Removes the most recent drop made today. No-op if there isn't one. */
  undoSequenceDrop: (activityId: string) => Promise<void>;
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
  /** Whether a past day can still be fixed, and how much of the quota is left. */
  getBackfillEligibility: (activityId: string, dateStr: string) => BackfillEligibility;
}

export { NoteEntry, getTaskForDate };
export type { LogEntry, SequenceSkipsMap, SequenceDrop, SequenceDropsMap, SequenceTask };

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  activities: [],
  logs: {},
  notes: {},
  taskHistory: {},
  sequenceSkips: {},
  sequenceDrops: {},
  selectedActivityId: null,
  isLoading: false,
  isConfettiEnabled: true,
  isHideExtraDaysEnabled: true,
  isHapticsEnabled: true,

  hydrate: async () => {
    set({ isLoading: true });
    const activities = await attendanceService.getActivities();
    const logs = await attendanceService.getLogs();
    const notes = await attendanceService.getNotes();
    const taskHistory = await attendanceService.getTaskHistory();
    const sequenceSkips = await attendanceService.getSequenceSkips();
    const sequenceDrops = await attendanceService.getSequenceDrops();

    // Load confetti setting (default to true)
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const { StorageKeys } = await import('../constants/storage');
      const confettiStr = await AsyncStorage.getItem(StorageKeys.CONFETTI);
      const isConfettiEnabled = confettiStr ? JSON.parse(confettiStr) : true;

      const hideExtraDaysStr = await AsyncStorage.getItem(StorageKeys.HIDE_EXTRA_DAYS);
      const isHideExtraDaysEnabled = hideExtraDaysStr ? JSON.parse(hideExtraDaysStr) : true;

      const hapticsStr = await AsyncStorage.getItem(StorageKeys.HAPTICS);
      const isHapticsEnabled = hapticsStr ? JSON.parse(hapticsStr) : true;
      // The haptics util is called from plain callbacks, so it keeps its own
      // mirror of this flag rather than subscribing to the store.
      applyHapticsPreference(isHapticsEnabled);

      set({
        activities,
        logs,
        notes,
        taskHistory,
        sequenceSkips,
        sequenceDrops,
        isConfettiEnabled,
        isHideExtraDaysEnabled,
        isHapticsEnabled,
        isLoading: false,
      });
    } catch {
      set({
        activities,
        logs,
        notes,
        taskHistory,
        sequenceSkips,
        sequenceDrops,
        isConfettiEnabled: true,
        isHideExtraDaysEnabled: true,
        isHapticsEnabled: true,
        isLoading: false,
      });
    }
  },

  createActivity: async (
    name: string,
    description?: string,
    requiresNote?: boolean,
    weeklyGoal?: number,
    taskSequence?: SequenceTask[],
    sequenceStartDate?: string,
    sequenceMode?: 'calendar' | 'log',
    timeBoundType?: 'before' | 'after' | 'between' | null,
    timeBoundStartTime?: string | null,
    timeBoundEndTime?: string | null,
    activityType?: 'goal' | 'endless',
    streakGoal?: number,
  ) => {
    const { activities } = get();
    const newActivity: Activity = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      name,
      createdAt: Date.now(),
      requiresNote: requiresNote ?? false,
      ...(description && description.trim() ? { description: description.trim() } : {}),
      activityType: activityType ?? 'endless',
      ...(activityType === 'goal' && streakGoal && streakGoal > 0 ? { streakGoal } : {}),
      ...(weeklyGoal !== undefined && weeklyGoal > 0 ? { weeklyGoal } : {}),
      ...(taskSequence && taskSequence.length > 0 ? { taskSequence } : {}),
      ...(sequenceStartDate ? { sequenceStartDate } : {}),
      ...(sequenceMode ? { sequenceMode } : {}),
      ...(timeBoundType ? { timeBoundType } : {}),
      ...(timeBoundStartTime ? { timeBoundStartTime } : {}),
      ...(timeBoundEndTime ? { timeBoundEndTime } : {}),
    };

    const updatedActivities = [...activities, newActivity];
    await attendanceService.saveActivities(updatedActivities);
    set({ activities: updatedActivities });
  },

  editActivity: async (
    id: string,
    name: string,
    description?: string,
    requiresNote?: boolean,
    weeklyGoal?: number,
    taskSequence?: SequenceTask[],
    sequenceStartDate?: string,
    sequenceMode?: 'calendar' | 'log',
    timeBoundType?: 'before' | 'after' | 'between' | null,
    timeBoundStartTime?: string | null,
    timeBoundEndTime?: string | null,
  ) => {
    const { activities } = get();
    const updatedActivities = activities.map((a) => {
      if (a.id !== id) return a;
      const updated = { ...a, name };
      if (description !== undefined) {
        const trimmed = description.trim();
        if (trimmed) {
          updated.description = trimmed;
        } else {
          delete updated.description;
        }
      }
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

      if (timeBoundType !== undefined) {
        if (timeBoundType !== null) {
          updated.timeBoundType = timeBoundType;
        } else {
          delete updated.timeBoundType;
          delete updated.timeBoundStartTime;
          delete updated.timeBoundEndTime;
        }
      }
      if (timeBoundStartTime !== undefined) {
        if (timeBoundStartTime !== null) {
          updated.timeBoundStartTime = timeBoundStartTime;
        } else {
          delete updated.timeBoundStartTime;
        }
      }
      if (timeBoundEndTime !== undefined) {
        if (timeBoundEndTime !== null) {
          updated.timeBoundEndTime = timeBoundEndTime;
        } else {
          delete updated.timeBoundEndTime;
        }
      }

      return updated;
    });
    set({ activities: updatedActivities });
    await attendanceService.saveActivities(updatedActivities);
  },

  deleteActivity: async (id: string) => {
    await get().deleteActivities([id]);
  },

  deleteActivities: async (ids: string[]) => {
    if (ids.length === 0) return;
    const doomed = new Set(ids);
    const {
      activities,
      logs,
      notes,
      taskHistory,
      sequenceSkips,
      sequenceDrops,
      selectedActivityId,
    } = get();

    // Every per-activity map is keyed the same way, so one helper drops all of
    // the doomed ids from each of them in a single copy.
    const without = <T>(map: Record<string, T>): Record<string, T> => {
      const next = { ...map };
      for (const id of doomed) delete next[id];
      return next;
    };

    const updatedActivities = activities.filter((a) => !doomed.has(a.id));
    const updatedLogs = without(logs);
    const updatedNotes = without(notes);
    const updatedTaskHistory = without(taskHistory);
    const updatedSequenceSkips = without(sequenceSkips);
    const updatedSequenceDrops = without(sequenceDrops);

    await attendanceService.saveActivities(updatedActivities);
    await attendanceService.saveLogs(updatedLogs);
    await attendanceService.saveNotes(updatedNotes);
    await attendanceService.saveTaskHistory(updatedTaskHistory);
    await attendanceService.saveSequenceSkips(updatedSequenceSkips);
    await attendanceService.saveSequenceDrops(updatedSequenceDrops);

    set({
      activities: updatedActivities,
      logs: updatedLogs,
      notes: updatedNotes,
      taskHistory: updatedTaskHistory,
      sequenceSkips: updatedSequenceSkips,
      sequenceDrops: updatedSequenceDrops,
      selectedActivityId:
        selectedActivityId && doomed.has(selectedActivityId) ? null : selectedActivityId,
    });
  },

  selectActivity: (id: string) => {
    set({ selectedActivityId: id });
  },

  completeActivity: async (id: string) => {
    await get().completeActivities([id]);
  },

  completeActivities: async (ids: string[]) => {
    if (ids.length === 0) return;
    const target = new Set(ids);
    const completedAt = Date.now();
    const { activities } = get();
    const updatedActivities = activities.map((a) =>
      target.has(a.id) && !a.completedAt ? { ...a, completedAt } : a,
    );
    await attendanceService.saveActivities(updatedActivities);
    set({ activities: updatedActivities });
  },

  setConfettiEnabled: async (enabled: boolean) => {
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const { StorageKeys } = await import('../constants/storage');
      await AsyncStorage.setItem(StorageKeys.CONFETTI, JSON.stringify(enabled));
    } catch {}
    set({ isConfettiEnabled: enabled });
  },

  setHideExtraDaysEnabled: async (enabled: boolean) => {
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const { StorageKeys } = await import('../constants/storage');
      await AsyncStorage.setItem(StorageKeys.HIDE_EXTRA_DAYS, JSON.stringify(enabled));
    } catch {}
    set({ isHideExtraDaysEnabled: enabled });
  },

  setHapticsEnabled: async (enabled: boolean) => {
    // Mirror into the util first, so the confirming tap of *this* toggle is
    // already silenced (or audible) when it fires.
    applyHapticsPreference(enabled);
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const { StorageKeys } = await import('../constants/storage');
      await AsyncStorage.setItem(StorageKeys.HAPTICS, JSON.stringify(enabled));
    } catch {}
    set({ isHapticsEnabled: enabled });
  },

  logToday: async (activityId: string, note?: string) => {
    const { logs, notes, taskHistory, activities, sequenceSkips, sequenceDrops } = get();
    const today = todayStr();
    const activityLogs = logs[activityId] || [];
    if (activityLogs.some((entry) => entry.date === today)) return;

    set({ isLoading: true });
    await attendanceService.logToday(activityId, note);

    const updatedLogs = { ...logs };
    updatedLogs[activityId] = [
      ...activityLogs,
      { ts: dayjs().toISOString(), date: today, tz: getCurrentTz() },
    ];

    // Compute and lock in the task history for this specific day
    const updatedTaskHistory = { ...taskHistory };
    const activity = activities.find((a) => a.id === activityId);
    if (activity && activity.taskSequence && activity.taskSequence.length > 0) {
      // getTaskForDate expects plain YYYY-MM-DD date strings
      const task = getTaskForDate(activity, today, {
        logs: updatedLogs[activityId].map((e) => e.date),
        postponed: sequenceSkips[activityId] ?? [],
        dropped: (sequenceDrops[activityId] ?? []).map((d) => d.date),
      });
      if (task) {
        if (!updatedTaskHistory[activityId]) updatedTaskHistory[activityId] = {};
        updatedTaskHistory[activityId] = {
          ...updatedTaskHistory[activityId],
          [today]: task,
        };
        await attendanceService.saveTaskHistory(updatedTaskHistory);
      }
    }

    // Update local notes map if a note was provided
    let updatedNotes = notes;
    if (note && note.trim()) {
      updatedNotes = { ...notes };
      if (!updatedNotes[activityId]) updatedNotes[activityId] = {};
      updatedNotes[activityId] = {
        ...updatedNotes[activityId],
        [today]: [{ text: note.trim(), time: dayjs().toISOString(), tz: getCurrentTz() }],
      };
    }

    // Auto-complete goal-based activities when streakGoal is reached
    let updatedActivities = activities;
    const freshActivity = activities.find((a) => a.id === activityId);
    if (
      freshActivity &&
      freshActivity.activityType === 'goal' &&
      freshActivity.streakGoal &&
      !freshActivity.completedAt
    ) {
      const { calculateCurrentStreak, calculateCurrentWeeklyStreak } =
        await import('../utils/streakUtils');
      const logDates = updatedLogs[activityId].map((e) => e.date);
      const newStreak = freshActivity.weeklyGoal
        ? calculateCurrentWeeklyStreak(logDates, freshActivity.weeklyGoal)
        : calculateCurrentStreak(logDates);
      if (newStreak >= freshActivity.streakGoal) {
        updatedActivities = activities.map((a) =>
          a.id === activityId ? { ...a, completedAt: Date.now() } : a,
        );
        await attendanceService.saveActivities(updatedActivities);
      }
    }

    set({
      logs: updatedLogs,
      notes: updatedNotes,
      taskHistory: updatedTaskHistory,
      activities: updatedActivities,
      isLoading: false,
    });
  },

  logMissedDay: async (activityId: string, dateStr: string, reason: string) => {
    const { logs, notes, taskHistory, activities, sequenceSkips, sequenceDrops } = get();
    const trimmedReason = reason.trim();
    if (!trimmedReason) return false;

    const activity = activities.find((a) => a.id === activityId);
    const entries = logs[activityId] ?? [];
    // Re-check here rather than trusting the screen: the quota can be spent in
    // another tab, and midnight can pass while the sheet sits open.
    if (!getBackfillEligibility(activity, entries, dateStr).allowed) return false;

    set({ isLoading: true });
    const newEntry = await attendanceService.logPastDate(activityId, dateStr, trimmedReason);
    if (!newEntry) {
      set({ isLoading: false });
      return false;
    }

    // Keep the in-memory list ascending, the same way the service just did on disk.
    const insertAt = entries.findIndex((entry) => entry.date > dateStr);
    const updatedEntries =
      insertAt === -1
        ? [...entries, newEntry]
        : [...entries.slice(0, insertAt), newEntry, ...entries.slice(insertAt)];
    const updatedLogs = { ...logs, [activityId]: updatedEntries };

    // Lock in the task for that day, exactly as logging it live would have. In
    // 'log' mode this shifts the *upcoming* task by one step, which is correct:
    // a session that happened is a session the sequence should have advanced on.
    const updatedTaskHistory = { ...taskHistory };
    if (activity?.taskSequence && activity.taskSequence.length > 0) {
      const task = getTaskForDate(activity, dateStr, {
        logs: updatedEntries.map((e) => e.date),
        postponed: sequenceSkips[activityId] ?? [],
        dropped: (sequenceDrops[activityId] ?? []).map((d) => d.date),
      });
      if (task) {
        updatedTaskHistory[activityId] = { ...updatedTaskHistory[activityId], [dateStr]: task };
        await attendanceService.saveTaskHistory(updatedTaskHistory);
      }
    }

    // The reason is stored as an ordinary note, so mirror it like appendNote does.
    const updatedNotes = { ...notes };
    const existing = updatedNotes[activityId]?.[dateStr] ?? [];
    updatedNotes[activityId] = {
      ...updatedNotes[activityId],
      [dateStr]: [
        ...existing,
        { text: trimmedReason, time: dayjs().toISOString(), tz: getCurrentTz() },
      ],
    };

    // A fixed day can be the one that completes a goal — it stands for work
    // that was actually done, so it settles the goal the same as any other log.
    let updatedActivities = activities;
    if (activity && activity.activityType === 'goal' && activity.streakGoal) {
      const logDates = updatedEntries.map((e) => e.date);
      const newStreak = activity.weeklyGoal
        ? calculateCurrentWeeklyStreak(logDates, activity.weeklyGoal)
        : calculateCurrentStreak(logDates);
      if (newStreak >= activity.streakGoal) {
        updatedActivities = activities.map((a) =>
          a.id === activityId ? { ...a, completedAt: Date.now() } : a,
        );
        await attendanceService.saveActivities(updatedActivities);
      }
    }

    set({
      logs: updatedLogs,
      notes: updatedNotes,
      taskHistory: updatedTaskHistory,
      activities: updatedActivities,
      isLoading: false,
    });
    return true;
  },

  logTodayWithSequenceSkip: async (activityId: string, note?: string) => {
    const { logs, notes, sequenceSkips } = get();
    const today = todayStr();
    const activityLogs = logs[activityId] || [];
    if (activityLogs.some((entry) => entry.date === today)) return;

    set({ isLoading: true });

    // Perform the normal log (saves to AsyncStorage)
    await attendanceService.logToday(activityId, note);

    const updatedLogs = { ...logs };
    updatedLogs[activityId] = [
      ...activityLogs,
      { ts: dayjs().toISOString(), date: today, tz: getCurrentTz() },
    ];

    // Record the sequence skip
    const updatedSkips = { ...sequenceSkips };
    const activitySkips = updatedSkips[activityId] ? [...updatedSkips[activityId]] : [];
    if (!activitySkips.includes(today)) {
      activitySkips.push(today);
    }
    updatedSkips[activityId] = activitySkips;
    await attendanceService.saveSequenceSkips(updatedSkips);

    // Update local notes map if a note was provided
    let updatedNotes = notes;
    if (note && note.trim()) {
      updatedNotes = { ...notes };
      if (!updatedNotes[activityId]) updatedNotes[activityId] = {};
      updatedNotes[activityId] = {
        ...updatedNotes[activityId],
        [today]: [{ text: note.trim(), time: dayjs().toISOString(), tz: getCurrentTz() }],
      };
    }

    set({ logs: updatedLogs, notes: updatedNotes, sequenceSkips: updatedSkips, isLoading: false });
  },

  dropSequenceTask: async (activityId: string, note?: string) => {
    const { logs, activities, sequenceSkips, sequenceDrops } = get();
    const activity = activities.find((a) => a.id === activityId);
    if (!activity || !activity.taskSequence?.length || activity.completedAt) return;

    const today = todayStr();
    // Dropping after logging would skip the *next* task rather than today's,
    // which is never what the button appears to promise.
    if ((logs[activityId] ?? []).some((entry) => entry.date === today)) return;

    const activityDrops = sequenceDrops[activityId] ?? [];
    const droppedTask = getTaskForDate(activity, today, {
      logs: (logs[activityId] ?? []).map((e) => e.date),
      postponed: sequenceSkips[activityId] ?? [],
      dropped: activityDrops.map((d) => d.date),
    });

    const drop: SequenceDrop = {
      date: today,
      ts: dayjs().toISOString(),
      tz: getCurrentTz(),
      ...(droppedTask ? { task: droppedTask } : {}),
      ...(note && note.trim() ? { note: note.trim() } : {}),
    };

    const updatedDrops = { ...sequenceDrops, [activityId]: [...activityDrops, drop] };
    await attendanceService.saveSequenceDrops(updatedDrops);
    set({ sequenceDrops: updatedDrops });
  },

  undoSequenceDrop: async (activityId: string) => {
    const { logs, sequenceDrops } = get();
    const activityDrops = sequenceDrops[activityId] ?? [];
    const today = todayStr();

    // Once today is logged its task is locked into taskHistory. Putting the
    // drop back would shift every following day out from under that record.
    if ((logs[activityId] ?? []).some((entry) => entry.date === today)) return;

    // Only today's drops are undoable — rolling back an older one would
    // reshuffle every task logged since.
    const lastToday = activityDrops.map((d) => d.date).lastIndexOf(today);
    if (lastToday === -1) return;

    const remaining = activityDrops.filter((_, i) => i !== lastToday);
    const updatedDrops = { ...sequenceDrops };
    if (remaining.length > 0) {
      updatedDrops[activityId] = remaining;
    } else {
      delete updatedDrops[activityId];
    }
    await attendanceService.saveSequenceDrops(updatedDrops);
    set({ sequenceDrops: updatedDrops });
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
      [dateStr]: [...existing, { text: trimmed, time: dayjs().toISOString(), tz: getCurrentTz() }],
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
    const { logs, notes, taskHistory, sequenceSkips, sequenceDrops } = get();
    const updatedLogs = { ...logs };
    delete updatedLogs[id];
    await attendanceService.saveLogs(updatedLogs);

    const updatedNotes = { ...notes };
    delete updatedNotes[id];
    await attendanceService.saveNotes(updatedNotes);

    const updatedTaskHistory = { ...taskHistory };
    delete updatedTaskHistory[id];
    await attendanceService.saveTaskHistory(updatedTaskHistory);

    const updatedSequenceSkips = { ...sequenceSkips };
    delete updatedSequenceSkips[id];
    await attendanceService.saveSequenceSkips(updatedSequenceSkips);

    const updatedSequenceDrops = { ...sequenceDrops };
    delete updatedSequenceDrops[id];
    await attendanceService.saveSequenceDrops(updatedSequenceDrops);

    set({
      logs: updatedLogs,
      notes: updatedNotes,
      taskHistory: updatedTaskHistory,
      sequenceSkips: updatedSequenceSkips,
      sequenceDrops: updatedSequenceDrops,
    });
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
      const taskHistory = await attendanceService.getTaskHistory();
      const sequenceSkips = await attendanceService.getSequenceSkips();
      const sequenceDrops = await attendanceService.getSequenceDrops();
      set({ activities, logs, notes, taskHistory, sequenceSkips, sequenceDrops });
    }
    return success;
  },

  getActivityStats: (activityId: string) => {
    const logEntries = get().logs[activityId] || [];
    const logs = logEntries.map((e) => e.date); // plain YYYY-MM-DD strings for streak utils
    const activity = get().activities.find((a) => a.id === activityId);
    const isTodayLogged = logEntries.some((e) => e.date === todayStr());

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

  getBackfillEligibility: (activityId: string, dateStr: string) => {
    const { activities, logs } = get();
    return getBackfillEligibility(
      activities.find((a) => a.id === activityId),
      logs[activityId] ?? [],
      dateStr,
    );
  },
}));
