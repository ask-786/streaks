import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import Animated, { FadeInDown, FadeInRight, FadeOutRight } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { useTheme } from '../hooks/useTheme';

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
  onSelect: (id: string) => void;
  onLongPress: (id: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  id,
  name,
  stats,
  index,
  isSelectedForAction,
  onSelect,
  onLongPress,
  onEdit,
  onDelete,
}) => {
  const { colors, isDark } = useTheme();

  const cardBg = isDark
    ? isSelectedForAction
      ? '#2A264A'
      : stats.isTodayLogged
        ? '#181E28'
        : colors.surface
    : isSelectedForAction
      ? '#F3F0FF'
      : stats.isTodayLogged
        ? '#FAFFFE'
        : '#FCFCFF';

  const actionsBg = isDark ? '#2A264A' : '#F3F0FF';
  const actionBtnBg = isDark ? colors.surfaceVariant : '#FFFFFF';

  return (
    <Animated.View entering={FadeInDown.delay(50 + index * 50).springify()}>
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: cardBg },
          isSelectedForAction && styles.cardSelected,
        ]}
        activeOpacity={0.75}
        onPress={() => onSelect(id)}
        onLongPress={() => onLongPress(id)}
        delayLongPress={350}
      >
        {/* Left accent bar */}
        <View
          style={[
            styles.accentBar,
            { backgroundColor: stats.isTodayLogged ? Colors.success : Colors.primary },
          ]}
        />

        {/* Card body */}
        <View style={styles.cardBody}>
          {/* Name + status badge */}
          <View style={styles.cardHeader}>
            <Text style={[styles.activityName, { color: isDark ? colors.textPrimary : Colors.primaryDark }]} numberOfLines={1}>
              {name}
            </Text>
            {!isSelectedForAction && (
              <Animated.View entering={FadeInRight.duration(200)} exiting={FadeOutRight.duration(200)}>
                <View style={[
                  styles.statusBadge,
                  stats.isTodayLogged
                    ? { backgroundColor: isDark ? '#0A2E2B' : Colors.successLight }
                    : { backgroundColor: colors.surfaceVariant },
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: stats.isTodayLogged ? Colors.success : colors.textSecondary },
                  ]}>
                    {stats.isTodayLogged ? '✓ Logged' : 'Pending'}
                  </Text>
                </View>
              </Animated.View>
            )}
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats.currentStreak}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {stats.unit === 'week' ? 'week streak ' : 'day streak '}<FontAwesome5 name="fire" size={12} color={Colors.primary} />
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.surfaceVariant }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats.longestStreak}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                best <FontAwesome5 name="bolt" size={12} color={Colors.warning} />
              </Text>
            </View>
          </View>

          {/* Weekly Progress Bar */}
          {stats.unit === 'week' && stats.weeklyGoal && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>This Week</Text>
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
            </View>
          )}
        </View>

        {/* Action overlay on long-press */}
        {isSelectedForAction && (
          <Animated.View
            entering={FadeInRight.duration(200).springify()}
            style={[styles.actionsOverlay, { backgroundColor: actionsBg }]}
          >
            <IconButton
              icon="pencil"
              iconColor={Colors.primary}
              size={22}
              onPress={() => onEdit(id, name)}
              style={[styles.actionBtn, { backgroundColor: actionBtnBg }]}
            />
            <IconButton
              icon="delete"
              iconColor={Colors.error}
              size={22}
              onPress={() => onDelete(id, name)}
              style={[styles.actionBtn, { backgroundColor: actionBtnBg }]}
            />
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSelected: {
    transform: [{ scale: 0.98 }],
  },
  accentBar: {
    width: 5,
    height: '100%',
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  activityName: {
    ...Typography.titleLarge,
    fontWeight: '700',
    flex: 1,
    paddingRight: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    ...Typography.labelMedium,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    ...Typography.headlineMedium,
    lineHeight: 22,
  },
  statLabel: {
    ...Typography.bodySmall,
  },
  statDivider: {
    width: 1,
    height: 16,
    marginHorizontal: Spacing.md,
    borderRadius: 1,
  },
  actionsOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    borderTopRightRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
  },
  actionBtn: {
    margin: 4,
    borderRadius: BorderRadius.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  progressContainer: {
    marginTop: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  progressText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
