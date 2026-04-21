import React from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAttendanceStore } from '../store/attendanceStore';
import { StreakBadge } from '../components/StreakBadge';
import { MonthlyProgress } from '../components/MonthlyProgress';
import { Colors, Spacing, Typography, BorderRadius } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { loggedDaysThisMonth, totalDaysPassedThisMonth, todayStr } from '../utils/dateUtils';


export const StatsScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { logs, selectedActivityId, activities, getActivityStats, resetActivityData } = useAttendanceStore();
  const loggedDates = selectedActivityId ? logs[selectedActivityId] || [] : [];
  const stats = selectedActivityId
    ? getActivityStats(selectedActivityId)
    : { currentStreak: 0, longestStreak: 0, unit: 'day' as const, isThisWeekGoalMet: false, weeklyGoal: undefined };
  const { currentStreak, longestStreak, unit, weeklyGoal } = stats;
  const isWeekly = unit === 'week';

  const thisMonthLogged = loggedDaysThisMonth(loggedDates);
  const thisMonthTotal = totalDaysPassedThisMonth();
  const totalLogged = loggedDates.length;

  const firstLoggedDate =
    loggedDates.length > 0
      ? dayjs([...loggedDates].sort()[0]).format('MMMM D, YYYY')
      : null;

  const handleReset = () => {
    Alert.alert(
      'Reset Activity Data',
      'This will permanently delete all your logged days and streak history for this activity. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            if (selectedActivityId) resetActivityData(selectedActivityId);
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Your Stats</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Track your consistency over time
        </Text>
      </Animated.View>

      {/* Streak Badges */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.badgeRow}>
        <StreakBadge
          label={isWeekly ? 'Week Streak' : 'Current Streak'}
          count={currentStreak}
          icon="fire"
          accent={Colors.primary}
          accentLight={colors.primaryContainer}
        />
        <View style={styles.badgeDivider} />
        <StreakBadge
          label={isWeekly ? 'Best Week Streak' : 'Best Streak'}
          count={longestStreak}
          icon="trophy"
          accent={Colors.warning}
          accentLight={isDark ? '#3A2B0A' : Colors.warningLight}
        />
      </Animated.View>

      {/* Monthly Progress */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
        <MonthlyProgress
          loggedDays={thisMonthLogged}
          totalDays={thisMonthTotal}
        />
      </Animated.View>

      {/* Weekly Progress Card — only for weekly-goal activities */}
      {isWeekly && weeklyGoal && (
        <Animated.View entering={FadeInDown.delay(290).springify()} style={[styles.weeklyCard, { backgroundColor: colors.surface }]}>
          <FontAwesome5 name="calendar-check" size={22} color={Colors.primary} style={{ marginRight: Spacing.md }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.weeklyCardLabel, { color: colors.textSecondary }]}>This Week's Progress</Text>
            <Text style={[styles.weeklyCardValue, { color: colors.textPrimary }]}>
              {(() => {
                const today = todayStr();
                const d = dayjs(today);
                const weekStart = d.subtract((d.day() + 6) % 7, 'day').format('YYYY-MM-DD');
                const weekEnd = dayjs(weekStart).add(6, 'day').format('YYYY-MM-DD');
                const thisWeekLogs = loggedDates.filter(dt => {
                  const ds = dayjs(dt).format('YYYY-MM-DD');
                  return ds >= weekStart && ds <= weekEnd;
                });
                const uniqueThisWeek = new Set(thisWeekLogs.map(dt => dayjs(dt).format('YYYY-MM-DD'))).size;
                return `${uniqueThisWeek} / ${weeklyGoal} sessions`;
              })()}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Summary Cards */}
      <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryValue, { color: Colors.primary }]}>{totalLogged}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Total Days Logged
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryValue, { color: Colors.primary }]}>{thisMonthLogged}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>This Month</Text>
        </View>
      </Animated.View>

      {/* First Login */}
      {firstLoggedDate && (
        <Animated.View
          entering={FadeInDown.delay(400).springify()}
          style={[styles.infoCard, { backgroundColor: colors.surface }]}
        >
          <Text style={styles.infoEmoji}><FontAwesome5 name="calendar-alt" size={28} color={Colors.primary} /></Text>
          <View>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Journey Started
            </Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {firstLoggedDate}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Reset button */}
      <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.resetWrapper}>
        <Text style={styles.resetButton} onPress={handleReset}>
          <FontAwesome5 name="trash-alt" size={16} />  Reset Activity Data
        </Text>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.headlineLarge,
  },
  subtitle: {
    ...Typography.bodyMedium,
    marginTop: Spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  badgeDivider: {
    width: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryValue: {
    ...Typography.displayMedium,
  },
  summaryLabel: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  weeklyCard: {
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
  weeklyCardLabel: {
    ...Typography.bodySmall,
  },
  weeklyCardValue: {
    ...Typography.titleMedium,
    fontWeight: '700',
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  infoEmoji: {
    fontSize: 28,
  },
  infoLabel: {
    ...Typography.bodySmall,
  },
  infoValue: {
    ...Typography.titleMedium,
    marginTop: 2,
  },
  resetWrapper: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  resetButton: {
    ...Typography.bodyMedium,
    color: Colors.error,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
});
