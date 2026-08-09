import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAttendanceStore } from '../store/attendanceStore';
import { MonthlyProgress } from '../components/MonthlyProgress';
import {
  Spacing,
  Typography,
  BorderRadius,
  ScreenPadding,
  alpha,
} from '../constants';
import { useTheme } from '../hooks/useTheme';
import {
  loggedDaysThisMonth,
  totalDaysPassedThisMonth,
  todayStr,
} from '../utils/dateUtils';
import { Card, EmptyState, ProgressBar, StatTile } from '../components/ui';

interface DetailRowProps {
  icon: string;
  label: string;
  value: string;
  tint: string;
  isLast?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value, tint, isLast }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.detailRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
      ]}
    >
      <View style={[styles.detailIcon, { backgroundColor: alpha(tint, 0.12) }]}>
        <FontAwesome5 name={icon} size={12} color={tint} />
      </View>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
};

export const StatsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { logs, selectedActivityId, activities, getActivityStats } = useAttendanceStore();

  const selectedActivity = activities.find(a => a.id === selectedActivityId);
  const logEntries = selectedActivityId ? logs[selectedActivityId] || [] : [];
  // Extract the locked local date strings for all stats/display purposes
  const logDateStrings = logEntries.map(e => e.date);
  const stats = selectedActivityId
    ? getActivityStats(selectedActivityId)
    : {
        currentStreak: 0,
        longestStreak: 0,
        unit: 'day' as const,
        isThisWeekGoalMet: false,
        weeklyGoal: undefined,
      };
  const { currentStreak, longestStreak, unit, weeklyGoal } = stats;
  const isWeekly = unit === 'week';

  const thisMonthLogged = loggedDaysThisMonth(logDateStrings);
  const thisMonthTotal = totalDaysPassedThisMonth();
  const totalLogged = logDateStrings.length;

  const sortedDates = [...logDateStrings].sort();
  const firstLoggedDate = sortedDates.length > 0 ? sortedDates[0] : null;

  // Lifetime hit rate: logged days over days the habit has existed.
  const daysSinceStart = selectedActivity
    ? Math.max(1, dayjs(todayStr()).diff(dayjs(selectedActivity.createdAt), 'day') + 1)
    : 0;
  const lifetimeRate =
    daysSinceStart > 0 ? Math.min(1, totalLogged / daysSinceStart) : 0;

  const thisWeekCount = (() => {
    const d = dayjs(todayStr());
    const weekStart = d.subtract((d.day() + 6) % 7, 'day').format('YYYY-MM-DD');
    const weekEnd = dayjs(weekStart).add(6, 'day').format('YYYY-MM-DD');
    return new Set(logDateStrings.filter(dt => dt >= weekStart && dt <= weekEnd)).size;
  })();

  if (totalLogged === 0) {
    return (
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Insights</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Your stats</Text>
        </Animated.View>
        <EmptyState
          icon="chart-line"
          title="No data yet"
          description="Log this habit at least once and your streaks, monthly consistency and history will appear here."
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.springify()} style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Insights</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Your stats</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Consistency over time, not just today
        </Text>
      </Animated.View>

      {/* Headline streaks */}
      <Animated.View entering={FadeInDown.delay(70).springify()} style={styles.statRow}>
        <StatTile
          label={isWeekly ? 'Week streak' : 'Current streak'}
          value={currentStreak}
          unit={isWeekly ? 'wks' : 'days'}
          icon="fire"
          accent={currentStreak >= (isWeekly ? 4 : 7) ? colors.accent : colors.primary}
          delay={90}
        />
        <StatTile
          label={isWeekly ? 'Best run' : 'Best streak'}
          value={longestStreak}
          unit={isWeekly ? 'wks' : 'days'}
          icon="trophy"
          accent={colors.warning}
          accentMuted={colors.warningMuted}
          delay={150}
        />
      </Animated.View>

      {/* Monthly consistency */}
      <Animated.View entering={FadeInDown.delay(130).springify()} style={styles.block}>
        <MonthlyProgress loggedDays={thisMonthLogged} totalDays={thisMonthTotal} />
      </Animated.View>

      {/* Weekly goal */}
      {isWeekly && weeklyGoal ? (
        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.block}>
          <Card elevation="low">
            <View style={styles.weekHeader}>
              <View
                style={[styles.detailIcon, { backgroundColor: alpha(colors.primary, 0.12) }]}
              >
                <FontAwesome5 name="calendar-check" size={12} color={colors.primary} />
              </View>
              <Text style={[styles.weekLabel, { color: colors.textTertiary }]}>
                This week's goal
              </Text>
              <Text style={[styles.weekValue, { color: colors.textPrimary }]}>
                {thisWeekCount}
                <Text style={{ color: colors.textTertiary }}> / {weeklyGoal}</Text>
              </Text>
            </View>
            <ProgressBar
              value={thisWeekCount / weeklyGoal}
              color={thisWeekCount >= weeklyGoal ? colors.success : colors.primary}
              segments={weeklyGoal}
              height={8}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        </Animated.View>
      ) : null}

      {/* Lifetime hit rate */}
      <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.block}>
        <Card elevation="low">
          <View style={styles.weekHeader}>
            <View
              style={[styles.detailIcon, { backgroundColor: alpha(colors.success, 0.12) }]}
            >
              <FontAwesome5 name="bullseye" size={12} color={colors.success} />
            </View>
            <Text style={[styles.weekLabel, { color: colors.textTertiary }]}>
              Lifetime hit rate
            </Text>
            <Text style={[styles.weekValue, { color: colors.textPrimary }]}>
              {Math.round(lifetimeRate * 100)}%
            </Text>
          </View>
          <ProgressBar
            value={lifetimeRate}
            color={colors.success}
            height={8}
            style={{ marginTop: Spacing.md }}
          />
          <Text style={[styles.weekCaption, { color: colors.textTertiary }]}>
            {totalLogged} logged of {daysSinceStart} day{daysSinceStart === 1 ? '' : 's'} tracked
          </Text>
        </Card>
      </Animated.View>

      {/* Detail list */}
      <Animated.View entering={FadeInDown.delay(260).springify()} style={styles.block}>
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>History</Text>
        <Card elevation="low" padding={0}>
          <DetailRow
            icon="check-double"
            label="Total days logged"
            value={String(totalLogged)}
            tint={colors.success}
          />
          <DetailRow
            icon="calendar-day"
            label="This month"
            value={`${thisMonthLogged} of ${thisMonthTotal}`}
            tint={colors.primary}
          />
          {firstLoggedDate ? (
            <DetailRow
              icon="flag"
              label="First logged"
              value={dayjs(firstLoggedDate).format('MMM D, YYYY')}
              tint={colors.accent}
            />
          ) : null}
          <DetailRow
            icon="seedling"
            label="Tracking since"
            value={
              selectedActivity
                ? dayjs(selectedActivity.createdAt).format('MMM D, YYYY')
                : '—'
            }
            tint={colors.warning}
            isLast
          />
        </Card>
      </Animated.View>
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
    paddingBottom: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.md + 2,
  },
  eyebrow: {
    ...Typography.overline,
    marginBottom: 6,
  },
  title: {
    ...Typography.headlineLarge,
  },
  subtitle: {
    ...Typography.bodyMedium,
    marginTop: 3,
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
  },
  block: {
    marginTop: Spacing.md - 2,
  },
  sectionLabel: {
    ...Typography.overline,
    marginBottom: Spacing.sm,
    marginLeft: 2,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  weekLabel: {
    ...Typography.overline,
    flex: 1,
  },
  weekValue: {
    ...Typography.numeralSmall,
  },
  weekCaption: {
    ...Typography.caption,
    marginTop: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
  },
  detailIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    ...Typography.bodyMedium,
    flex: 1,
  },
  detailValue: {
    ...Typography.labelLarge,
    fontWeight: '700',
  },
});
