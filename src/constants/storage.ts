// ─── AsyncStorage Keys ───────────────────────────────────────────────────────
// Single source of truth for all AsyncStorage keys used in the app.
export const StorageKeys = {
  ACTIVITIES:   'streak_activities',
  LOGS:         'streak_logs',
  NOTES:        'streak_notes',
  TASK_HISTORY: 'streak_task_history',
  THEME:        '@streak_counter_theme',
  CONFETTI:     '@streak_counter_confetti',
  HIDE_EXTRA_DAYS: '@streak_counter_hide_extra_days',
} as const;
