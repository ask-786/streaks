import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, StatusBar } from 'react-native';
import dayjs from 'dayjs';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAttendanceStore, getTaskForDate } from '../store/attendanceStore';
import { LogButton } from '../components/LogButton';
import { NoteInputModal } from '../components/NoteInputModal';
import {
  Spacing,
  Typography,
  BorderRadius,
  ScreenPadding,
  alpha,
} from '../constants';
import { formatDisplayDate, todayStr, formatTime12h } from '../utils/dateUtils';
import { useTheme } from '../hooks/useTheme';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Card, Chip, ProgressBar, PressableScale, StatTile } from '../components/ui';
import { haptics } from '../utils/haptics';

export const DashboardScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const {
    selectedActivityId,
    activities,
    logs: allLogs,
    notes,
    getActivityStats,
    logToday,
    logTodayWithSequenceSkip,
    dropSequenceTask,
    undoSequenceDrop,
    sequenceSkips,
    sequenceDrops,
    isLoading,
    isConfettiEnabled,
  } = useAttendanceStore();

  const selectedActivity = activities.find(a => a.id === selectedActivityId);
  const isCompleted = !!selectedActivity?.completedAt;
  const stats = selectedActivityId
    ? getActivityStats(selectedActivityId)
    : {
        isTodayLogged: false,
        currentStreak: 0,
        longestStreak: 0,
        unit: 'day' as const,
        isThisWeekGoalMet: false,
        thisWeekCount: 0,
        weeklyGoal: undefined,
      };
  const { isTodayLogged, currentStreak, longestStreak, unit, isThisWeekGoalMet } = stats;
  const isWeekly = unit === 'week';

  const [noteModalVisible, setNoteModalVisible] = React.useState(false);
  const [laterModalVisible, setLaterModalVisible] = React.useState(false);
  const [dropModalVisible, setDropModalVisible] = React.useState(false);
  const confettiRef = React.useRef<any>(null);

  const triggerConfetti = () => {
    if (isConfettiEnabled && confettiRef.current) {
      confettiRef.current.start();
    }
  };

  // Compute time-bound disabled state
  const computeTimeBoundState = (): {
    isDisabled: boolean;
    reason: string | undefined;
    kind: 'too_early' | 'too_late' | undefined;
  } => {
    if (!selectedActivity?.timeBoundType || isTodayLogged)
      return { isDisabled: false, reason: undefined, kind: undefined };
    const now = dayjs();
    const currentTime = now.format('HH:mm');
    const { timeBoundType, timeBoundStartTime, timeBoundEndTime } = selectedActivity;
    if (timeBoundType === 'before' && timeBoundStartTime) {
      if (currentTime >= timeBoundStartTime) {
        return {
          isDisabled: true,
          reason: `Deadline was ${formatTime12h(timeBoundStartTime)}`,
          kind: 'too_late',
        };
      }
    } else if (timeBoundType === 'after' && timeBoundStartTime) {
      if (currentTime < timeBoundStartTime) {
        return {
          isDisabled: true,
          reason: `Available after ${formatTime12h(timeBoundStartTime)}`,
          kind: 'too_early',
        };
      }
    } else if (timeBoundType === 'between' && timeBoundStartTime && timeBoundEndTime) {
      if (currentTime < timeBoundStartTime) {
        return {
          isDisabled: true,
          reason: `Opens at ${formatTime12h(timeBoundStartTime)}`,
          kind: 'too_early',
        };
      }
      if (currentTime >= timeBoundEndTime) {
        return {
          isDisabled: true,
          reason: `Closed at ${formatTime12h(timeBoundEndTime)}`,
          kind: 'too_late',
        };
      }
    }
    return { isDisabled: false, reason: undefined, kind: undefined };
  };

  const {
    isDisabled: isTimeBoundDisabled,
    reason: timeBoundDisabledReason,
    kind: timeBoundKind,
  } = computeTimeBoundState();

  const handleLogToday = () => {
    if (!selectedActivityId || !selectedActivity) return;
    if (isTimeBoundDisabled || isCompleted) return;

    if (selectedActivity.requiresNote) {
      haptics.medium(); // committing to the flow, not finishing it
      setNoteModalVisible(true);
    } else {
      haptics.success();
      logToday(selectedActivityId);
      triggerConfetti();
    }
  };

  const handleNoteSubmit = (note: string) => {
    if (!selectedActivityId) return;
    setNoteModalVisible(false);
    haptics.success();
    logToday(selectedActivityId, note);
    triggerConfetti();
  };

  const handleDoLater = () => {
    if (!selectedActivityId || !selectedActivity) return;
    if (isTodayLogged || isCompleted) return;
    haptics.medium();
    setLaterModalVisible(true);
  };

  const handleLaterSubmit = (note: string) => {
    if (!selectedActivityId) return;
    setLaterModalVisible(false);
    haptics.success();
    logTodayWithSequenceSkip(selectedActivityId, note || undefined);
    triggerConfetti();
  };

  const handleSkipTask = () => {
    if (!selectedActivityId || !selectedActivity) return;
    if (isTodayLogged || isCompleted) return;
    haptics.medium();
    setDropModalVisible(true);
  };

  const handleDropSubmit = (note: string) => {
    if (!selectedActivityId) return;
    setDropModalVisible(false);
    haptics.success();
    // No confetti here — nothing was accomplished, the task just left the cycle.
    dropSequenceTask(selectedActivityId, note || undefined);
  };

  const handleUndoDrop = () => {
    if (!selectedActivityId) return;
    haptics.light();
    undoSequenceDrop(selectedActivityId);
  };

  const today = todayStr();

  // Postponed days for this activity — logged, but the task carried over.
  const activitySequenceSkips: string[] = selectedActivityId
    ? (sequenceSkips[selectedActivityId] ?? [])
    : [];
  const isTodayPostponed = activitySequenceSkips.includes(today);

  // Tasks dropped out of the cycle entirely.
  const activityDrops = selectedActivityId ? (sequenceDrops[selectedActivityId] ?? []) : [];
  const activityDropDates = activityDrops.map(d => d.date);
  const todayDrops = activityDrops.filter(d => d.date === today);

  const sequenceContext = {
    logs: selectedActivityId ? (allLogs[selectedActivityId] ?? []).map(e => e.date) : [],
    postponed: activitySequenceSkips,
    dropped: activityDropDates,
  };

  // Today's task, with both postponements and drops applied.
  const todayTask =
    selectedActivity && selectedActivityId
      ? getTaskForDate(selectedActivity, today, sequenceContext)
      : null;

  // What the card would show if the user skipped right now — used to promise
  // the outcome up front in the confirmation sheet.
  const taskAfterDrop =
    selectedActivity && selectedActivityId
      ? getTaskForDate(selectedActivity, today, {
          ...sequenceContext,
          dropped: [...activityDropDates, today],
        })
      : null;

  const isSequenceByLog = selectedActivity?.sequenceMode === 'log';
  const canAdjustSequence = !!todayTask && !isTodayLogged && !isCompleted && !isTodayPostponed;

  // Today's postpone note (first note entry on today, if logged-with-postpone)
  const todayPostponeNote =
    isTodayPostponed && selectedActivityId
      ? notes[selectedActivityId]?.[today]?.[0]?.text
      : undefined;

  // ── Presentation ───────────────────────────────────────────────────────────
  const unitLabel = isWeekly
    ? currentStreak === 1
      ? 'week'
      : 'weeks'
    : currentStreak === 1
      ? 'day'
      : 'days';

  // Streak runs cold → brand → ember as it grows.
  const streakTint =
    currentStreak === 0
      ? colors.textTertiary
      : currentStreak >= (isWeekly ? 4 : 7)
        ? colors.accent
        : colors.primary;

  const goalTarget = selectedActivity?.streakGoal;
  // Something to climb toward: the explicit goal if set, else your own record.
  const climbTarget = goalTarget ?? (longestStreak > currentStreak ? longestStreak : 0);
  const climbLabel = goalTarget ? 'to goal' : 'to your record';

  const greeting = isCompleted
    ? 'Goal achieved'
    : isTodayLogged
      ? "Today's locked in"
      : isWeekly && isThisWeekGoalMet
        ? 'Weekly goal met'
        : 'Ready to check in?';

  const statusLine = isCompleted
    ? `Completed on ${dayjs(selectedActivity?.completedAt).format('MMMM D, YYYY')}.`
    : isWeekly
      ? isThisWeekGoalMet
        ? "You've hit this week's goal — anything more is a bonus."
        : `Log ${stats.weeklyGoal ?? ''} times this week to keep the streak alive.`
      : isTodayLogged
        ? 'Your attendance is recorded. Come back tomorrow.'
        : 'One tap keeps the streak going.';

  const motivation = (() => {
    if (isCompleted) return 'Incredible dedication. Take a moment to enjoy it.';
    const n = currentStreak;
    if (isWeekly) {
      if (n === 0) return 'Every streak starts with a single week.';
      if (n < 4) return `${n} week${n > 1 ? 's' : ''} in. The habit is forming.`;
      if (n < 12) return `${n} weeks. This is genuinely consistent now.`;
      return `${n} weeks. That is remarkable staying power.`;
    }
    if (n === 0) return 'Every streak starts with a single day.';
    if (n < 7) return `${n} day${n > 1 ? 's' : ''} in. The hardest part is behind you.`;
    if (n < 30) return `${n} days. You are past the point where most people stop.`;
    return `${n} days. That is a habit, not an effort.`;
  })();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />

        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>
            {formatDisplayDate(today)}
          </Text>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>{greeting}</Text>
          {/* The nav bar carries the habit's name; this is the rest of what the
              user wrote about it, where it is read before deciding to log. */}
          {selectedActivity?.description ? (
            <Text style={[styles.habitDescription, { color: colors.textSecondary }]}>
              {selectedActivity.description}
            </Text>
          ) : null}
        </Animated.View>

        {/* ── Hero: streak + the one action that matters ────────────────────── */}
        <Animated.View entering={FadeInDown.delay(70).springify()}>
          <Card elevation="medium" padding={0} radius={BorderRadius.xl}>
            {/* Streak readout */}
            <View style={styles.heroTop}>
              <View style={styles.heroStreak}>
                <Text style={[styles.heroLabel, { color: colors.textTertiary }]}>
                  {isWeekly ? 'Week streak' : 'Current streak'}
                </Text>
                <View style={styles.heroValueRow}>
                  <Text style={[styles.heroValue, { color: streakTint }]}>
                    {currentStreak}
                  </Text>
                  <Text style={[styles.heroUnit, { color: colors.textTertiary }]}>
                    {unitLabel}
                  </Text>
                  {currentStreak >= (isWeekly ? 4 : 7) ? (
                    <FontAwesome5
                      name="fire"
                      size={18}
                      color={colors.accent}
                      style={styles.heroFlame}
                    />
                  ) : null}
                </View>
              </View>

              <View style={[styles.heroBest, { borderLeftColor: colors.divider }]}>
                <Text style={[styles.heroLabel, { color: colors.textTertiary }]}>Best</Text>
                <Text style={[styles.heroBestValue, { color: colors.textSecondary }]}>
                  {longestStreak}
                </Text>
              </View>
            </View>

            {/* Climb toward record or goal */}
            {climbTarget > 0 && !isCompleted ? (
              <View style={styles.climb}>
                <ProgressBar
                  value={currentStreak / climbTarget}
                  color={streakTint}
                  height={6}
                />
                <Text style={[styles.climbLabel, { color: colors.textTertiary }]}>
                  {Math.max(0, climbTarget - currentStreak)} more {climbLabel}
                </Text>
              </View>
            ) : null}

            {/* Constraints & targets */}
            {(!isTodayLogged && !isCompleted && selectedActivity?.timeBoundType) ||
            (selectedActivity?.activityType === 'goal' &&
              selectedActivity?.streakGoal &&
              !isCompleted) ? (
              <View style={styles.chipRow}>
                {!isTodayLogged && !isCompleted && selectedActivity?.timeBoundType ? (
                  <Chip
                    icon={isTimeBoundDisabled ? 'lock' : 'clock'}
                    tone={isTimeBoundDisabled ? 'neutral' : 'success'}
                    variant="soft"
                    label={
                      selectedActivity.timeBoundType === 'between'
                        ? `${formatTime12h(selectedActivity.timeBoundStartTime ?? '')} – ${formatTime12h(
                            selectedActivity.timeBoundEndTime ?? '',
                          )}`
                        : `${selectedActivity.timeBoundType} ${formatTime12h(
                            selectedActivity.timeBoundStartTime ?? '',
                          )}`
                    }
                    trailing={isTimeBoundDisabled ? 'Locked' : undefined}
                  />
                ) : null}

                {selectedActivity?.activityType === 'goal' &&
                selectedActivity?.streakGoal &&
                !isCompleted ? (
                  <Chip
                    icon="bullseye"
                    tone="brand"
                    label={`Target ${selectedActivity.streakGoal} ${
                      isWeekly
                        ? selectedActivity.streakGoal === 1
                          ? 'week'
                          : 'weeks'
                        : selectedActivity.streakGoal === 1
                          ? 'day'
                          : 'days'
                    }`}
                  />
                ) : null}
              </View>
            ) : null}

            {/* Action */}
            <View style={[styles.heroAction, { borderTopColor: colors.divider }]}>
              <LogButton
                onPress={handleLogToday}
                isLogged={isTodayLogged}
                isCompleted={isCompleted}
                isLoading={isLoading}
                disabled={isTimeBoundDisabled || isCompleted}
                disabledReason={
                  isCompleted ? "You've conquered this one" : timeBoundDisabledReason
                }
                disabledKind={isCompleted ? undefined : timeBoundKind}
              />
              <Text style={[styles.statusLine, { color: colors.textTertiary }]}>
                {statusLine}
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* ── Today's task ──────────────────────────────────────────────────── */}
        {todayTask ? (
          <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.block}>
            <Card elevation="low">
              <View style={styles.taskHeader}>
                <View
                  style={[
                    styles.taskIcon,
                    { backgroundColor: alpha(colors.primary, 0.12) },
                  ]}
                >
                  <FontAwesome5 name="list-ol" size={12} color={colors.primary} />
                </View>
                <Text style={[styles.taskLabel, { color: colors.textTertiary }]}>
                  Today's task
                </Text>

                {canAdjustSequence ? (
                  <>
                    <PressableScale
                      onPress={handleDoLater}
                      scaleTo={0.94}
                      style={[
                        styles.taskActionBtn,
                        { borderColor: colors.warningBorder, backgroundColor: colors.warningMuted },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Log today but keep this task for the next session"
                    >
                      <FontAwesome5 name="clock" size={9} color={colors.warning} />
                      <Text style={[styles.taskActionText, { color: colors.warning }]}>
                        Do later
                      </Text>
                    </PressableScale>

                    <PressableScale
                      onPress={handleSkipTask}
                      scaleTo={0.94}
                      style={[
                        styles.taskActionBtn,
                        { borderColor: colors.border, backgroundColor: colors.surfaceVariant },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Drop this task from the current cycle"
                    >
                      <FontAwesome5 name="forward" size={9} color={colors.textSecondary} />
                      <Text style={[styles.taskActionText, { color: colors.textSecondary }]}>
                        Skip
                      </Text>
                    </PressableScale>
                  </>
                ) : null}

                {isTodayPostponed ? (
                  <Chip label="Doing later" icon="clock" tone="warning" />
                ) : null}
              </View>

              <Text
                style={[
                  styles.taskText,
                  {
                    color: isTodayPostponed
                      ? colors.textTertiary
                      : colors.textPrimary,
                    textDecorationLine: isTodayPostponed ? 'line-through' : 'none',
                  },
                ]}
              >
                {todayTask.title}
              </Text>

              {todayTask.description ? (
                <Text
                  style={[
                    styles.taskDescription,
                    {
                      color: isTodayPostponed
                        ? colors.textDisabled
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {todayTask.description}
                </Text>
              ) : null}

              {isTodayPostponed ? (
                <View
                  style={[
                    styles.taskBanner,
                    { backgroundColor: colors.surfaceVariant },
                  ]}
                >
                  <FontAwesome5
                    name={todayPostponeNote ? 'sticky-note' : 'info-circle'}
                    size={11}
                    color={colors.textTertiary}
                  />
                  <Text style={[styles.taskBannerText, { color: colors.textSecondary }]}>
                    {todayPostponeNote ?? 'Logged today — this task moves to your next session.'}
                  </Text>
                </View>
              ) : null}

              {todayDrops.length > 0 ? (
                <View
                  style={[
                    styles.taskBanner,
                    { backgroundColor: colors.surfaceVariant },
                  ]}
                >
                  <FontAwesome5 name="forward" size={11} color={colors.textTertiary} />
                  <Text style={[styles.taskBannerText, { color: colors.textSecondary }]}>
                    Skipped{' '}
                    <Text style={{ fontWeight: '700' }}>
                      {todayDrops.map(d => d.task?.title ?? 'a task').join(', ')}
                    </Text>
                    {' — '}
                    {todayDrops.length > 1 ? 'they are ' : 'it is '}
                    out of this cycle.
                  </Text>
                  {/* Undo disappears once today is logged: that log locked in
                      the post-skip task, so putting the task back would shift
                      every following day out from under it. */}
                  {!isTodayLogged && !isCompleted ? (
                    <PressableScale
                      onPress={handleUndoDrop}
                      scaleTo={0.94}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Undo the last skipped task"
                    >
                      <Text style={[styles.undoText, { color: colors.primary }]}>Undo</Text>
                    </PressableScale>
                  ) : null}
                </View>
              ) : null}
            </Card>
          </Animated.View>
        ) : null}

        {/* ── Weekly goal ───────────────────────────────────────────────────── */}
        {isWeekly && stats.weeklyGoal ? (
          <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.block}>
            <Card elevation="low">
              <View style={styles.weekHeader}>
                <Text style={[styles.taskLabel, { color: colors.textTertiary }]}>
                  This week
                </Text>
                <Text style={[styles.weekValue, { color: colors.textPrimary }]}>
                  {stats.thisWeekCount}
                  <Text style={{ color: colors.textTertiary }}> / {stats.weeklyGoal}</Text>
                </Text>
              </View>
              <ProgressBar
                value={stats.thisWeekCount / stats.weeklyGoal}
                color={isThisWeekGoalMet ? colors.success : colors.primary}
                segments={stats.weeklyGoal}
                height={8}
              />
            </Card>
          </Animated.View>
        ) : null}

        {/* ── Secondary stats ───────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.statRow}>
          <StatTile
            label={isWeekly ? 'Best run' : 'Longest streak'}
            value={longestStreak}
            unit={isWeekly ? 'wks' : 'days'}
            icon="trophy"
            accent={colors.warning}
            accentMuted={colors.warningMuted}
            delay={240}
          />
          <StatTile
            label="Total logged"
            value={selectedActivityId ? (allLogs[selectedActivityId]?.length ?? 0) : 0}
            unit="days"
            icon="check-double"
            accent={colors.success}
            accentMuted={colors.successMuted}
            delay={300}
          />
        </Animated.View>

        {/* ── Motivation ────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(280).springify()}>
          <Text style={[styles.motivation, { color: colors.textTertiary }]}>
            {motivation}
          </Text>
        </Animated.View>
      </ScrollView>

      <ConfettiCannon
        count={120}
        origin={{ x: -10, y: 0 }}
        autoStart={false}
        ref={confettiRef}
        fadeOut
      />

      <NoteInputModal
        visible={noteModalVisible}
        activityName={selectedActivity?.name}
        onClose={() => setNoteModalVisible(false)}
        onSubmit={handleNoteSubmit}
      />

      {/* Do Later — logs the day, the task carries over. Note is required. */}
      <NoteInputModal
        visible={laterModalVisible}
        activityName={selectedActivity?.name}
        title="Keep This Task for Later?"
        subtitle={
          todayTask
            ? `"${todayTask.title}" will be deferred to your next session. Add a note explaining why.`
            : undefined
        }
        submitLabel="Log & Do Later"
        noteRequired
        onClose={() => setLaterModalVisible(false)}
        onSubmit={handleLaterSubmit}
      />

      {/* Skip — the task leaves the cycle unfinished. Note is optional. */}
      <NoteInputModal
        visible={dropModalVisible}
        activityName={selectedActivity?.name}
        title="Skip This Task?"
        subtitle={
          todayTask
            ? isSequenceByLog
              ? `"${todayTask.title}" leaves this cycle without being done${
                  taskAfterDrop ? `, so you move on to "${taskAfterDrop.title}"` : ''
                }. It won't appear in your record.`
              : `"${todayTask.title}" leaves this cycle without being done${
                  taskAfterDrop ? `, so today becomes "${taskAfterDrop.title}"` : ''
                } and the rest of the sequence shifts a day earlier.`
            : undefined
        }
        submitLabel="Skip Task"
        noteRequired={false}
        onClose={() => setDropModalVisible(false)}
        onSubmit={handleDropSubmit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.md + 2,
  },
  eyebrow: {
    ...Typography.overline,
    marginBottom: 6,
  },
  greeting: {
    ...Typography.headlineLarge,
  },

  // Hero
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg - 4,
    paddingTop: Spacing.lg - 4,
  },
  heroStreak: {
    flex: 1,
  },
  heroLabel: {
    ...Typography.overline,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  heroValue: {
    ...Typography.numeralLarge,
    fontSize: 52,
    lineHeight: 56,
  },
  heroUnit: {
    ...Typography.titleLarge,
  },
  heroFlame: {
    marginLeft: 2,
  },
  heroBest: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingLeft: Spacing.md,
    minWidth: 74,
    paddingTop: 2,
  },
  heroBestValue: {
    ...Typography.numeralMedium,
    marginTop: 4,
  },
  climb: {
    paddingHorizontal: Spacing.lg - 4,
    marginTop: Spacing.md,
  },
  climbLabel: {
    ...Typography.caption,
    marginTop: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm - 2,
    paddingHorizontal: Spacing.lg - 4,
    marginTop: Spacing.md,
  },
  heroAction: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.lg - 4,
    paddingHorizontal: Spacing.lg - 4,
    paddingTop: Spacing.md + 2,
    paddingBottom: Spacing.md + 2,
  },
  statusLine: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.sm + 2,
  },

  // Blocks
  block: {
    marginTop: Spacing.md - 2,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm - 2,
    marginBottom: Spacing.sm + 2,
  },
  taskIcon: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskLabel: {
    ...Typography.overline,
    flex: 1,
  },
  taskText: {
    ...Typography.bodyLarge,
    fontWeight: '500',
  },
  taskDescription: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
  },
  habitDescription: {
    ...Typography.bodyMedium,
    marginTop: Spacing.xs,
  },
  taskActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  taskActionText: {
    ...Typography.labelMedium,
    fontWeight: '700',
  },
  taskBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.sm + 2,
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
  },
  taskBannerText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  undoText: {
    ...Typography.labelMedium,
    fontWeight: '700',
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm + 2,
  },
  weekValue: {
    ...Typography.numeralSmall,
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
    marginTop: Spacing.md - 2,
  },
  motivation: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
});
