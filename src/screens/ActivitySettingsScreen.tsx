import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TextInput, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useAttendanceStore, SequenceTask } from '../store/attendanceStore';
import { TaskSequenceEditor } from '../components/TaskSequenceEditor';
import { Spacing, Typography, BorderRadius, ScreenPadding, alpha } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { to12h, to24h, isValidTime12h, todayStr, formatTime12h } from '../utils/dateUtils';
import { haptics } from '../utils/haptics';
import { Card, Chip, EmptyState, PressableScale } from '../components/ui';
import dayjs from 'dayjs';

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionHeading: React.FC<{
  icon: string;
  title: string;
  subtitle: string;
  tint: string;
}> = ({ icon, title, subtitle, tint }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: alpha(tint, 0.12) }]}>
        <FontAwesome5 name={icon} size={13} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
      </View>
    </View>
  );
};

const ActionCard: React.FC<{
  icon: string;
  label: string;
  sublabel: string;
  tint: string;
  onPress: () => void;
}> = ({ icon, label, sublabel, tint, onPress }) => {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${sublabel}`}
    >
      <Card elevation="low">
        <View style={styles.actionRow}>
          <View style={[styles.actionIcon, { backgroundColor: alpha(tint, 0.12) }]}>
            <FontAwesome5 name={icon} size={15} color={tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionLabel, { color: tint }]}>{label}</Text>
            <Text style={[styles.actionSublabel, { color: colors.textTertiary }]}>{sublabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
        </View>
      </Card>
    </PressableScale>
  );
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export const ActivitySettingsScreen: React.FC = () => {
  const { colors } = useTheme();
  const {
    selectedActivityId,
    activities,
    editActivity,
    resetActivityData,
    appendNote,
    completeActivity,
  } = useAttendanceStore();

  const selectedActivity = activities.find((a) => a.id === selectedActivityId);
  const isCompleted = !!selectedActivity?.completedAt;

  const [timeBoundStartTime, setTimeBoundStartTime] = useState(
    () => to12h(selectedActivity?.timeBoundStartTime || '').time,
  );
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>(
    () => to12h(selectedActivity?.timeBoundStartTime || '').ampm,
  );
  const [timeBoundEndTime, setTimeBoundEndTime] = useState(
    () => to12h(selectedActivity?.timeBoundEndTime || '').time,
  );
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>(
    () => to12h(selectedActivity?.timeBoundEndTime || '').ampm,
  );

  const timeBoundType = selectedActivity?.timeBoundType;

  const isTimeOrderValid =
    !timeBoundType ||
    timeBoundType !== 'between' ||
    (isValidTime12h(timeBoundStartTime) &&
      isValidTime12h(timeBoundEndTime) &&
      to24h(timeBoundStartTime, startAmPm) < to24h(timeBoundEndTime, endAmPm));

  const isTimeValid =
    !timeBoundType ||
    (timeBoundType === 'between'
      ? isValidTime12h(timeBoundStartTime) && isValidTime12h(timeBoundEndTime) && isTimeOrderValid
      : isValidTime12h(timeBoundStartTime));

  const timeOrderInvalid =
    timeBoundType === 'between' &&
    isValidTime12h(timeBoundStartTime) &&
    isValidTime12h(timeBoundEndTime) &&
    to24h(timeBoundStartTime, startAmPm) >= to24h(timeBoundEndTime, endAmPm);

  const startInvalid =
    (timeBoundStartTime.length > 0 && !isValidTime12h(timeBoundStartTime)) || timeOrderInvalid;
  const endInvalid =
    (timeBoundType === 'between' &&
      timeBoundEndTime.length > 0 &&
      !isValidTime12h(timeBoundEndTime)) ||
    timeOrderInvalid;

  const hasUnsavedTimeChanges = () => {
    if (!selectedActivity || !timeBoundType) return false;
    if (to24h(timeBoundStartTime, startAmPm) !== (selectedActivity.timeBoundStartTime || ''))
      return true;
    if (
      timeBoundType === 'between' &&
      to24h(timeBoundEndTime, endAmPm) !== (selectedActivity.timeBoundEndTime || '')
    )
      return true;
    return false;
  };

  const handleSaveTimeBound = async () => {
    if (!selectedActivityId || !selectedActivity || !timeBoundType) return;
    if (!isTimeValid) return haptics.warning();

    const newStart = to24h(timeBoundStartTime, startAmPm);
    const newEnd = timeBoundType === 'between' ? to24h(timeBoundEndTime, endAmPm) : null;

    let oldDesc = '';
    if (timeBoundType === 'between') {
      oldDesc = `${formatTime12h(selectedActivity.timeBoundStartTime || '')} - ${formatTime12h(selectedActivity.timeBoundEndTime || '')}`;
    } else {
      oldDesc = `${formatTime12h(selectedActivity.timeBoundStartTime || '')}`;
    }

    let newDesc = '';
    if (timeBoundType === 'between') {
      newDesc = `${formatTime12h(newStart)} - ${formatTime12h(newEnd || '')}`;
    } else {
      newDesc = `${formatTime12h(newStart)}`;
    }

    const noteText = `Time constraint changed from ${oldDesc} to ${newDesc}`;

    haptics.success();
    await editActivity(
      selectedActivityId,
      selectedActivity.name,
      selectedActivity.description,
      selectedActivity.requiresNote,
      selectedActivity.weeklyGoal,
      selectedActivity.taskSequence,
      selectedActivity.sequenceStartDate,
      selectedActivity.sequenceMode,
      timeBoundType,
      newStart,
      newEnd ?? undefined,
    );
    await appendNote(selectedActivityId, todayStr(), noteText);
  };

  const handleTaskSequenceChange = (newTasks: SequenceTask[]) => {
    if (selectedActivityId && selectedActivity) {
      editActivity(
        selectedActivityId,
        selectedActivity.name,
        selectedActivity.description,
        selectedActivity.requiresNote,
        selectedActivity.weeklyGoal,
        newTasks,
        selectedActivity.sequenceStartDate,
        selectedActivity.sequenceMode || 'calendar',
      );
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset habit data',
      'Every logged day and all streak history for this habit will be permanently deleted. The habit itself stays.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            haptics.error(); // destructive and irreversible — it should land hard
            if (selectedActivityId) resetActivityData(selectedActivityId);
          },
        },
      ],
    );
  };

  const handleMarkComplete = () => {
    if (!selectedActivityId || !selectedActivity) return;
    Alert.alert(
      'Mark as completed',
      `"${selectedActivity.name}" will move to your completed list. You won't be able to log new check-ins, but every day you logged is preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: () => {
            haptics.success();
            completeActivity(selectedActivityId);
          },
        },
      ],
    );
  };

  if (!selectedActivity) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="exclamation-circle"
          title="No habit selected"
          description="Go back and pick a habit to configure its sequence, timing and lifecycle."
        />
      </View>
    );
  }

  const timeField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    ampm: 'AM' | 'PM',
    toggleAmPm: () => void,
    invalid: boolean,
  ) => (
    <View style={styles.timeField}>
      <Text style={[styles.timeLabel, { color: colors.textTertiary }]}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.surfaceSunken,
            borderColor: invalid ? colors.danger : colors.border,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: invalid ? colors.danger : colors.textPrimary }]}
          placeholder="HH:MM"
          placeholderTextColor={colors.textDisabled}
          value={value}
          onChangeText={onChange}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          accessibilityLabel={label}
        />
        <Pressable
          style={({ pressed }) => [
            styles.amPmToggle,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={() => {
            haptics.selection();
            toggleAmPm();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${ampm === 'AM' ? 'PM' : 'AM'}`}
        >
          <Text style={[styles.amPmText, { color: colors.primary }]}>{ampm}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Completed banner */}
      {isCompleted && (
        <Animated.View entering={FadeInDown.springify()} style={styles.banner}>
          <Card elevation="flat" tone="success">
            <View style={styles.bannerRow}>
              <View style={[styles.bannerIcon, { backgroundColor: alpha(colors.success, 0.16) }]}>
                <FontAwesome5 name="trophy" size={18} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: colors.success }]}>Habit completed</Text>
                <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
                  Finished on {dayjs(selectedActivity.completedAt).format('MMMM D, YYYY')}. This
                  habit is now read-only and all history is preserved.
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>
      )}

      {/* Goal banner */}
      {!isCompleted && selectedActivity.activityType === 'goal' && selectedActivity.streakGoal && (
        <Animated.View entering={FadeInDown.springify()} style={styles.banner}>
          <Card elevation="flat" tone="brand">
            <View style={styles.bannerRow}>
              <View style={[styles.bannerIcon, { backgroundColor: alpha(colors.primary, 0.16) }]}>
                <FontAwesome5 name="bullseye" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: colors.primary }]}>
                  Goal-based habit
                </Text>
                <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
                  Completes automatically at a {selectedActivity.streakGoal}-day streak.
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>
      )}

      {/* Task sequence */}
      {!isCompleted && (
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.section}>
          <SectionHeading
            icon="list-ol"
            title="Task sequence"
            subtitle="Add, reorder or edit what each session asks of you"
            tint={colors.primary}
          />
          <Card elevation="low">
            <TaskSequenceEditor
              tasks={selectedActivity.taskSequence || []}
              onChange={handleTaskSequenceChange}
            />
          </Card>
        </Animated.View>
      )}

      {/* Time constraint */}
      {!isCompleted && selectedActivity.timeBoundType && (
        <Animated.View entering={FadeInDown.delay(110).springify()} style={styles.section}>
          <SectionHeading
            icon="clock"
            title="Time constraint"
            subtitle={`This habit can only be logged ${selectedActivity.timeBoundType} a set time`}
            tint={colors.warning}
          />
          <Card elevation="low">
            {timeField(
              timeBoundType === 'between' ? 'Opens at' : 'Time',
              timeBoundStartTime,
              setTimeBoundStartTime,
              startAmPm,
              () => setStartAmPm(startAmPm === 'AM' ? 'PM' : 'AM'),
              startInvalid,
            )}

            {timeBoundType === 'between' &&
              timeField(
                'Closes at',
                timeBoundEndTime,
                setTimeBoundEndTime,
                endAmPm,
                () => setEndAmPm(endAmPm === 'AM' ? 'PM' : 'AM'),
                endInvalid,
              )}

            {timeOrderInvalid && (
              <View style={styles.errorRow}>
                <FontAwesome5 name="exclamation-circle" size={11} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  The closing time must come after the opening time
                </Text>
              </View>
            )}

            {hasUnsavedTimeChanges() && (
              <Animated.View entering={FadeInDown.springify()} style={styles.saveRow}>
                <Chip label="Unsaved changes" icon="pen" tone="warning" />
                <PressableScale
                  onPress={handleSaveTimeBound}
                  disabled={!isTimeValid}
                  haptic={false}
                  scaleTo={0.95}
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor: isTimeValid ? colors.primary : colors.surfaceVariant,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Save time constraint"
                  accessibilityState={{ disabled: !isTimeValid }}
                >
                  <Text
                    style={[
                      styles.saveBtnText,
                      { color: isTimeValid ? colors.onPrimary : colors.textDisabled },
                    ]}
                  >
                    Save
                  </Text>
                </PressableScale>
              </Animated.View>
            )}
          </Card>
        </Animated.View>
      )}

      {/* Complete */}
      {!isCompleted && selectedActivity.activityType !== 'goal' && (
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.section}>
          <SectionHeading
            icon="flag-checkered"
            title="Finish up"
            subtitle="Archive this habit with its history intact"
            tint={colors.success}
          />
          <ActionCard
            icon="trophy"
            label="Mark as completed"
            sublabel="Moves to your completed list — no more check-ins"
            tint={colors.success}
            onPress={handleMarkComplete}
          />
        </Animated.View>
      )}

      {/* Danger zone */}
      {!isCompleted && (
        <Animated.View entering={FadeInDown.delay(190).springify()} style={styles.section}>
          <SectionHeading
            icon="exclamation-triangle"
            title="Danger zone"
            subtitle="These actions cannot be undone"
            tint={colors.danger}
          />
          <ActionCard
            icon="trash-alt"
            label="Reset habit data"
            sublabel="Deletes every logged day and all streak history"
            tint={colors.danger}
            onPress={handleReset}
          />
        </Animated.View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
  },
  banner: {
    marginBottom: Spacing.lg,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md - 2,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    ...Typography.titleLarge,
    fontWeight: '700',
    marginBottom: 3,
  },
  bannerSub: {
    ...Typography.bodySmall,
  },
  section: {
    marginBottom: Spacing.lg + 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm + 2,
    marginBottom: Spacing.sm + 4,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  sectionTitle: {
    ...Typography.titleLarge,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md - 2,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...Typography.titleLarge,
    fontWeight: '700',
  },
  actionSublabel: {
    ...Typography.caption,
    marginTop: 2,
  },
  timeField: {
    gap: 6,
    marginBottom: Spacing.md - 4,
  },
  timeLabel: {
    ...Typography.overline,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
    gap: Spacing.sm,
  },
  input: {
    ...Typography.bodyLarge,
    flex: 1,
    paddingVertical: Spacing.sm - 2,
  },
  amPmToggle: {
    minWidth: 46,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: BorderRadius.xs,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amPmText: {
    ...Typography.labelMedium,
    fontWeight: '700',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xs,
  },
  errorText: {
    ...Typography.caption,
    flex: 1,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  saveBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
  },
  saveBtnText: {
    ...Typography.labelLarge,
    fontWeight: '700',
  },
});
