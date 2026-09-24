import React from 'react';
import { View, StyleSheet, TextInput, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { FontAwesome5 } from '@expo/vector-icons';
import { HabitAlarm } from '../../modules/habit-alarm';
import { HabitReminder } from '../features/attendance/attendanceService';
import { Spacing, Typography, BorderRadius, alpha } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { to12h, to24h, isValidTime12h } from '../utils/dateUtils';
import { haptics } from '../utils/haptics';
import { SegmentedControl } from './ui';
import { FullScreenAlarmHint } from './FullScreenAlarmHint';

/** What the editor holds while the user types: 12h time, before it's valid enough to store. */
export interface ReminderDraft {
  time: string;
  ampm: 'AM' | 'PM';
  message: string;
  mode: 'notification' | 'alarm';
}

export const toReminderDraft = (reminder?: HabitReminder): ReminderDraft => {
  const { time, ampm } = to12h(reminder?.time ?? '');
  return {
    time,
    ampm,
    message: reminder?.message ?? '',
    mode: reminder?.alarm ? 'alarm' : 'notification',
  };
};

export const fromReminderDraft = (draft: ReminderDraft): HabitReminder => ({
  time: to24h(draft.time, draft.ampm),
  ...(draft.message.trim() ? { message: draft.message.trim() } : {}),
  ...(draft.mode === 'alarm' ? { alarm: true } : {}),
});

export const isReminderDraftValid = (draft: ReminderDraft) => isValidTime12h(draft.time);

const MODE_OPTIONS = [
  { value: 'notification' as const, label: 'Notification', icon: 'bell' },
  { value: 'alarm' as const, label: 'Alarm', icon: 'stopwatch' },
];

const MODE_DESCRIPTIONS = {
  notification: 'A regular notification at this time. Skipped on days you’ve already logged.',
  alarm:
    'Rings full-screen at alarm volume until you snooze, dismiss or mark it done. Skipped on days you’ve already logged.',
};

export interface ReminderEditorProps {
  draft: ReminderDraft;
  onChange: (draft: ReminderDraft) => void;
  habitName: string;
  /** Field fill; differs between the bottom sheet and the settings cards. */
  fieldBackground: string;
}

/**
 * Mode, time and message for a habit reminder. Shared by the habit form and
 * the habit settings screen so both look and behave the same.
 */
export const ReminderEditor: React.FC<ReminderEditorProps> = ({
  draft,
  onChange,
  habitName,
  fieldBackground,
}) => {
  const { colors } = useTheme();
  const update = (patch: Partial<ReminderDraft>) => onChange({ ...draft, ...patch });
  const timeInvalid = draft.time.length > 0 && !isValidTime12h(draft.time);

  return (
    <View style={styles.container}>
      {/* Mode */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textTertiary }]}>Remind me with</Text>
        <SegmentedControl
          options={MODE_OPTIONS}
          value={draft.mode}
          onChange={(mode) => update({ mode })}
        />
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          {MODE_DESCRIPTIONS[draft.mode]}
        </Text>
        {draft.mode === 'alarm' &&
          (HabitAlarm ? (
            <FullScreenAlarmHint />
          ) : (
            <View style={[styles.notice, { backgroundColor: alpha(colors.warning, 0.12) }]}>
              <FontAwesome5 name="info-circle" size={12} color={colors.warning} />
              <Text style={[styles.noticeText, { color: colors.textPrimary }]}>
                This build of the app doesn’t include alarms yet, so this will arrive as a
                notification. Install a newer build to get the full alarm.
              </Text>
            </View>
          ))}
      </View>

      {/* Time */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textTertiary }]}>Time</Text>
        <View style={styles.timeRow}>
          <View
            style={[
              styles.inputShell,
              styles.timeInputShell,
              {
                backgroundColor: fieldBackground,
                borderColor: timeInvalid ? colors.danger : colors.border,
              },
            ]}
          >
            <FontAwesome5
              name="clock"
              size={14}
              color={timeInvalid ? colors.danger : colors.textTertiary}
            />
            <TextInput
              style={[styles.input, { color: timeInvalid ? colors.danger : colors.textPrimary }]}
              placeholder="7:30"
              placeholderTextColor={colors.textDisabled}
              value={draft.time}
              onChangeText={(time) => update({ time })}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              selectionColor={colors.primary}
              accessibilityLabel="Reminder time"
            />
          </View>
          <View
            style={[
              styles.ampmGroup,
              { backgroundColor: fieldBackground, borderColor: colors.border },
            ]}
          >
            {(['AM', 'PM'] as const).map((ampm) => {
              const selected = draft.ampm === ampm;
              return (
                <Pressable
                  key={ampm}
                  onPress={() => {
                    if (!selected) haptics.selection();
                    update({ ampm });
                  }}
                  style={[styles.ampmOption, selected && { backgroundColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.ampmText,
                      { color: selected ? colors.onPrimary : colors.textSecondary },
                    ]}
                  >
                    {ampm}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        {timeInvalid && (
          <Text style={[styles.caption, { color: colors.danger }]}>
            Enter a time like 7:30 or 12:05
          </Text>
        )}
      </View>

      {/* Message */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textTertiary }]}>Message (optional)</Text>
        <View
          style={[
            styles.inputShell,
            { backgroundColor: fieldBackground, borderColor: colors.border },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder={`Time for ${habitName.trim() || 'your habit'}`}
            placeholderTextColor={colors.textDisabled}
            value={draft.message}
            onChangeText={(message) => update({ message })}
            maxLength={120}
            selectionColor={colors.primary}
            accessibilityLabel="Reminder message"
          />
        </View>
      </View>
    </View>
  );
};

const FIELD_HEIGHT = 48;

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.overline,
    marginLeft: 2,
  },
  caption: {
    ...Typography.caption,
    marginLeft: 2,
  },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: FIELD_HEIGHT,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
  },
  timeInputShell: {
    flex: 1,
  },
  input: {
    ...Typography.bodyLarge,
    flex: 1,
    height: FIELD_HEIGHT,
    paddingVertical: 0,
  },
  ampmGroup: {
    flexDirection: 'row',
    height: FIELD_HEIGHT,
    padding: 4,
    gap: 4,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ampmOption: {
    minWidth: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ampmText: {
    ...Typography.labelMedium,
    fontWeight: '700',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  noticeText: {
    ...Typography.caption,
    flex: 1,
  },
});
