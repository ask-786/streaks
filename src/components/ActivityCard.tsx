import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import {
  Typography,
  Spacing,
  BorderRadius,
  HitSlop,
  stagger,
} from '../constants';
import { useTheme } from '../hooks/useTheme';
import { Card, Chip, ProgressBar, PressableScale } from './ui';

export interface ActivityStats {
  currentStreak: number;
  longestStreak: number;
  isTodayLogged: boolean;
  unit: 'day' | 'week';
  isThisWeekGoalMet: boolean;
  weeklyGoal?: number;
  thisWeekCount: number;
}

export interface ActivityCardProps {
  id: string;
  name: string;
  stats: ActivityStats;
  index: number;
  isSelectedForAction: boolean;
  /** Oldest → newest. `true` = logged that day. Length drives the trail width. */
  recentDays?: boolean[];
  onSelect: (id: string) => void;
  onLongPress: (id: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
}

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const ActivityCard: React.FC<ActivityCardProps> = ({
  id,
  name,
  stats,
  index,
  isSelectedForAction,
  recentDays,
  onSelect,
  onLongPress,
  onEdit,
  onDelete,
}) => {
  const { colors } = useTheme();

  // Streak colour is earned: grey at zero, brand once running, ember once hot.
  const streakTint =
    stats.currentStreak === 0
      ? colors.textTertiary
      : stats.currentStreak >= 7
        ? colors.accent
        : colors.primary;

  const done = stats.isTodayLogged || (stats.unit === 'week' && stats.isThisWeekGoalMet);

  // Trailing day labels line up with the last N weekdays.
  const today = new Date().getDay();
  const trail = recentDays ?? [];

  return (
    <Animated.View
      entering={FadeInDown.delay(stagger(index)).springify()}
      style={styles.wrapper}
    >
      <PressableScale
        onPress={() => onSelect(id)}
        onLongPress={() => onLongPress(id)}
        delayLongPress={320}
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityLabel={`${name}. ${stats.currentStreak} ${stats.unit} streak. ${
          done ? 'Logged' : 'Not logged yet'
        }.`}
        accessibilityHint="Opens this habit. Long press for edit and delete."
      >
        <Card
          elevation="low"
          padding={0}
          radius={BorderRadius.lg}
          style={isSelectedForAction ? { borderColor: colors.primaryBorder } : undefined}
        >
          <View style={styles.body}>
            {/* Title row */}
            <View style={styles.titleRow}>
              <Text
                style={[styles.name, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {name}
              </Text>

              {/*
                Always mounted. Unmounting it on long-press collapsed the title
                row to the height of the bare text, so the whole card shrank and
                the list jumped. The action rail is opaque and sits directly over
                it, so there is nothing to hide.
              */}
              <Chip
                label={done ? 'Done' : 'Pending'}
                icon={done ? 'check' : 'circle-notch'}
                tone={done ? 'success' : 'neutral'}
              />
            </View>

            {/* Metrics */}
            <View style={styles.metrics}>
              <View style={styles.metric}>
                <Text style={[styles.metricValue, { color: streakTint }]}>
                  {stats.currentStreak}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>
                  {stats.unit === 'week' ? 'wk streak' : 'day streak'}
                </Text>
              </View>

              <View style={[styles.metricDivider, { backgroundColor: colors.divider }]} />

              <View style={styles.metric}>
                <Text style={[styles.metricValue, { color: colors.textSecondary }]}>
                  {stats.longestStreak}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>
                  best
                </Text>
              </View>

              {/* Last-7-days trail — the whole history at a glance. */}
              {trail.length > 0 ? (
                <View style={styles.trail}>
                  {trail.map((logged, i) => {
                    const dayIdx = (today - (trail.length - 1 - i) + 7 * 2) % 7;
                    const isToday = i === trail.length - 1;
                    return (
                      <View key={i} style={styles.trailCol}>
                        <View
                          style={[
                            styles.trailDot,
                            {
                              backgroundColor: logged
                                ? colors.success
                                : colors.surfaceVariant,
                              borderColor: isToday && !logged
                                ? colors.primary
                                : 'transparent',
                              borderWidth: isToday && !logged ? 1.5 : 0,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.trailLabel,
                            {
                              color: isToday ? colors.textSecondary : colors.textDisabled,
                            },
                          ]}
                        >
                          {DAY_INITIALS[dayIdx]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>

            {/* Weekly goal progress */}
            {stats.unit === 'week' && stats.weeklyGoal ? (
              <View style={styles.progressBlock}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>
                    This week
                  </Text>
                  <Text style={[styles.progressValue, { color: colors.textSecondary }]}>
                    {stats.thisWeekCount}
                    <Text style={{ color: colors.textTertiary }}> / {stats.weeklyGoal}</Text>
                  </Text>
                </View>
                <ProgressBar
                  value={stats.thisWeekCount / stats.weeklyGoal}
                  color={stats.isThisWeekGoalMet ? colors.success : colors.primary}
                  segments={stats.weeklyGoal}
                  height={6}
                  delay={stagger(index) + 80}
                />
              </View>
            ) : null}
          </View>

          {/* Action rail — revealed by long press */}
          {isSelectedForAction ? (
            <Animated.View
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(120)}
              style={[
                styles.actions,
                {
                  backgroundColor: colors.surface,
                  borderLeftColor: colors.border,
                },
              ]}
            >
              <Pressable
                onPress={() => onEdit(id, name)}
                hitSlop={HitSlop.sm}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: colors.primaryMuted,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${name}`}
              >
                <FontAwesome5 name="pen" size={14} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => onDelete(id, name)}
                hitSlop={HitSlop.sm}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: colors.dangerMuted,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${name}`}
              >
                <FontAwesome5 name="trash-alt" size={14} color={colors.danger} />
              </Pressable>
            </Animated.View>
          ) : null}
        </Card>
      </PressableScale>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.sm + 2,
  },
  body: {
    paddingLeft: Spacing.md,
    paddingRight: Spacing.md,
    paddingVertical: Spacing.md - 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm + 4,
  },
  name: {
    ...Typography.titleLarge,
    fontWeight: '700',
    flex: 1,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  metricValue: {
    ...Typography.numeralSmall,
  },
  metricLabel: {
    ...Typography.caption,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    marginHorizontal: Spacing.md - 2,
  },
  trail: {
    flexDirection: 'row',
    gap: 5,
    marginLeft: 'auto',
    alignItems: 'flex-end',
  },
  trailCol: {
    alignItems: 'center',
    gap: 3,
  },
  trailDot: {
    width: 9,
    height: 9,
    borderRadius: 3,
  },
  trailLabel: {
    fontSize: 8.5,
    lineHeight: 10,
    fontWeight: '700',
  },
  progressBlock: {
    marginTop: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    ...Typography.overline,
  },
  progressValue: {
    ...Typography.labelMedium,
    fontWeight: '700',
  },
  actions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderTopRightRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
