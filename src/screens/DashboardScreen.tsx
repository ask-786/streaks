import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import dayjs from 'dayjs';
import { Text } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAttendanceStore, getTaskForDate } from '../store/attendanceStore';
import { LogButton } from '../components/LogButton';
import { StreakBadge } from '../components/StreakBadge';
import { NoteInputModal } from '../components/NoteInputModal';
import { Colors, Spacing, Typography, BorderRadius } from '../constants';
import { formatDisplayDate, todayStr, formatTime12h } from '../utils/dateUtils';
import { useTheme } from '../hooks/useTheme';
import ConfettiCannon from 'react-native-confetti-cannon';

export const DashboardScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { selectedActivityId, activities, logs: allLogs, getActivityStats, logToday, isLoading, isConfettiEnabled } = useAttendanceStore();
  const selectedActivity = activities.find(a => a.id === selectedActivityId);
  const stats = selectedActivityId
    ? getActivityStats(selectedActivityId)
    : { isTodayLogged: false, currentStreak: 0, longestStreak: 0, unit: 'day' as const, isThisWeekGoalMet: false, thisWeekCount: 0, weeklyGoal: undefined };
  const { isTodayLogged, currentStreak, longestStreak, unit, isThisWeekGoalMet } = stats;
  const isWeekly = unit === 'week';

  const [noteModalVisible, setNoteModalVisible] = React.useState(false);
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

  const { isDisabled: isTimeBoundDisabled, reason: timeBoundDisabledReason, kind: timeBoundKind } = computeTimeBoundState();

  const handleLogToday = () => {
    if (!selectedActivityId || !selectedActivity) return;
    if (isTimeBoundDisabled) return;

    if (selectedActivity.requiresNote) {
      setNoteModalVisible(true);
    } else {
      logToday(selectedActivityId);
      triggerConfetti();
    }
  };

  const handleNoteSubmit = (note: string) => {
    if (!selectedActivityId) return;
    setNoteModalVisible(false);
    logToday(selectedActivityId, note);
    triggerConfetti();
  };

  const headerScale = useSharedValue(0.9);
  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
    opacity: headerScale.value,
  }));

  useEffect(() => {
    headerScale.value = withSpring(1, { damping: 12, stiffness: 100 });
  }, []);

  const today = todayStr();

  // Compute today's task for the selected activity
  const todayTask = selectedActivity && selectedActivityId
    ? getTaskForDate(
        selectedActivity,
        today,
        allLogs[selectedActivityId] ?? [],
      )
    : null;
  const totalTasks = selectedActivity?.taskSequence?.length ?? 0;
  // Which slot is today? (recompute index for display)
  const todayTaskIndex = todayTask && selectedActivity?.taskSequence
    ? (selectedActivity.taskSequence.indexOf(todayTask) + 1)
    : 0;

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header row: greeting + dark mode toggle */}
      <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            {isTodayLogged ? (
               <>Great job! <FontAwesome5 name="glass-cheers" size={24} color={Colors.primary} /></>
            ) : isWeekly && isThisWeekGoalMet ? (
               <>Goal met! <FontAwesome5 name="glass-cheers" size={24} color={Colors.primary} /></>
            ) : (
               <>Ready to check in? <FontAwesome5 name="hand-paper" size={24} color={Colors.primary} /></>
            )}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {formatDisplayDate(today)}
          </Text>
        </View>
      </Animated.View>

      {/* Status Card */}
      <Animated.View
        entering={FadeInDown.delay(100).springify()}
        style={[styles.statusCard, { backgroundColor: colors.surface }]}
      >
        <View style={[styles.statusIconWrap, { backgroundColor: colors.surfaceVariant }]}>
          <FontAwesome5 name={isTodayLogged ? 'check-circle' : 'hourglass-half'} size={24} color={isTodayLogged ? Colors.success : Colors.warning} />
        </View>
        <View style={styles.statusText}>
          <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
            {isWeekly
              ? isThisWeekGoalMet
                ? 'Goal Met This Week'
                : 'Goal In Progress'
              : isTodayLogged
              ? 'Logged In Today'
              : 'Not Yet Logged'}
          </Text>
          <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
            {isWeekly
              ? isThisWeekGoalMet
                ? "You've hit your weekly goal — great work!"
                : `Log ${stats.weeklyGoal ?? ''} times this week to grow your streak.`
              : isTodayLogged
              ? 'Your attendance is recorded for today.'
              : 'Tap the button below to log your attendance.'}
          </Text>
          {!isTodayLogged && selectedActivity?.timeBoundType && (
            <View style={[
              styles.timeBoundChip,
              isTimeBoundDisabled
                ? { backgroundColor: colors.surfaceVariant, borderColor: Colors.textDisabled }
                : { backgroundColor: isDark ? '#1A2F1A' : '#F0FDF4', borderColor: Colors.success },
            ]}>
              <FontAwesome5
                name="clock"
                size={11}
                color={isTimeBoundDisabled ? Colors.textDisabled : Colors.success}
              />
              <Text style={[styles.timeBoundChipText, { color: isTimeBoundDisabled ? Colors.textDisabled : Colors.success }]}>
                {selectedActivity.timeBoundType === 'between'
                  ? `${formatTime12h(selectedActivity.timeBoundStartTime ?? '')} – ${formatTime12h(selectedActivity.timeBoundEndTime ?? '')}`
                  : `${selectedActivity.timeBoundType} ${formatTime12h(selectedActivity.timeBoundStartTime ?? '')}`}
              </Text>
              {isTimeBoundDisabled && (
                <Text style={[styles.timeBoundChipBadge, { color: Colors.textDisabled }]}>Locked</Text>
              )}
            </View>
          )}
        </View>
      </Animated.View>

      {/* Today's Task Card */}
      {todayTask ? (
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={[styles.taskCard, { backgroundColor: colors.surface }]}
        >
          <View style={styles.taskCardHeader}>
            <View style={[styles.taskCardIconWrap, { backgroundColor: isDark ? Colors.dark?.primaryContainer ?? '#1E1B4B' : Colors.primaryContainer }]}>
              <FontAwesome5 name="list-ol" size={14} color={Colors.primary} />
            </View>
            <Text style={[styles.taskCardLabel, { color: colors.textSecondary }]}>Today's Task</Text>
          </View>
          <Text style={[styles.taskCardText, { color: colors.textPrimary }]}>
            {todayTask}
          </Text>
        </Animated.View>
      ) : null}

      {/* Weekly Progress Card */}
      {isWeekly && stats.weeklyGoal && (
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={[styles.progressCard, { backgroundColor: colors.surface }]}
        >
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>This Week's Progress</Text>
            <Text style={[styles.progressText, { color: colors.textPrimary }]}>
              {stats.thisWeekCount} / {stats.weeklyGoal}
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceVariant }]}>
            <Animated.View 
              style={[
                styles.progressBarFill, 
                { 
                  backgroundColor: stats.isThisWeekGoalMet ? Colors.success : Colors.primary, 
                  width: `${Math.min(100, (stats.thisWeekCount / stats.weeklyGoal) * 100)}%` 
                }
              ]} 
            />
          </View>
        </Animated.View>
      )}

      {/* Streak Badges */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.badgeRow}>
        <StreakBadge
          label={isWeekly ? 'Week Streak' : 'Current Streak'}
          count={currentStreak}
          icon="fire"
          accent={Colors.primary}
          accentLight={colors.primaryContainer}
        />
        <View style={styles.badgeDivider} />
        <StreakBadge
          label={isWeekly ? 'Best Week Streak' : 'Longest Streak'}
          count={longestStreak}
          icon="bolt"
          accent={Colors.warning}
          accentLight={isDark ? '#3A2B0A' : Colors.warningLight}
        />
      </Animated.View>

      {/* Log Button */}
      <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.buttonWrapper}>
        <LogButton
          onPress={handleLogToday}
          isLogged={isTodayLogged}
          isLoading={isLoading}
          disabled={isTimeBoundDisabled}
          disabledReason={timeBoundDisabledReason}
          disabledKind={timeBoundKind}
        />
      </Animated.View>

      {/* Motivational Footer */}
      <Animated.View entering={FadeInDown.delay(400).springify()}>
        <Text style={[styles.motivationText, { color: colors.textSecondary }]}>
          {isWeekly ? (
            currentStreak === 0
              ? (
                <>Start your weekly streak! Hit your goal this week. <FontAwesome5 name="dumbbell" size={16} /></>
              ) : currentStreak < 4
              ? (
                <>{currentStreak} week{currentStreak > 1 ? 's' : ''} strong! Keep it up! <FontAwesome5 name="dumbbell" size={16} /></>
              ) : currentStreak < 12
              ? (
                <>{currentStreak} weeks! You're on fire! <FontAwesome5 name="fire" size={16} /></>
              ) : (
                <>{currentStreak} weeks! Absolutely legendary! <FontAwesome5 name="trophy" size={16} /></>
              )
          ) : (
            currentStreak === 0
              ? (
                <>Start your streak today! Every journey begins with a single step. <FontAwesome5 name="dumbbell" size={16} /></>
              )
              : currentStreak < 7
              ? (
                <>{currentStreak} day{currentStreak > 1 ? 's' : ''} strong! Keep it up! <FontAwesome5 name="dumbbell" size={16} /></>
              )
              : currentStreak < 30
              ? (
                <>{currentStreak} days! You're on fire! <FontAwesome5 name="fire" size={16} /></>
              )
              : (
                <>{currentStreak} days! Absolutely legendary! <FontAwesome5 name="trophy" size={16} /></>
              )
          )}
        </Text>
      </Animated.View>

    </ScrollView>
    <ConfettiCannon
      count={150}
      origin={{ x: -10, y: 0 }}
      autoStart={false}
      ref={confettiRef}
      fadeOut={true}
    />
    <NoteInputModal
      visible={noteModalVisible}
      activityName={selectedActivity?.name}
      onClose={() => setNoteModalVisible(false)}
      onSubmit={handleNoteSubmit}
    />
    </View>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...Typography.headlineLarge,
    marginBottom: 4,
  },
  date: {
    ...Typography.bodyMedium,
  },
  statusCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statusIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  statusEmoji: {
    fontSize: 24,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    ...Typography.titleLarge,
    marginBottom: 2,
  },
  statusSubtitle: {
    ...Typography.bodySmall,
    lineHeight: 18,
  },
  progressCard: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  progressText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: Spacing.xl,
  },
  badgeDivider: {
    width: Spacing.sm,
  },
  buttonWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  timeBoundChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timeBoundChipText: {
    ...Typography.labelMedium,
    fontWeight: '600',
  },
  timeBoundChipBadge: {
    ...Typography.labelMedium,
    fontWeight: '700',
    opacity: 0.6,
    marginLeft: 2,
  },
  motivationText: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    lineHeight: 22,
  },
  // ── Today's Task card ────────────────────────────────────────────────────────
  taskCard: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: Spacing.sm,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  taskCardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCardLabel: {
    ...Typography.labelMedium,
    fontWeight: '600',
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskIndexPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  taskIndexText: {
    ...Typography.labelMedium,
    fontWeight: '700',
  },
  taskCardText: {
    ...Typography.bodyMedium,
    lineHeight: 22,
  },
});
