import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { FontAwesome5 } from '@expo/vector-icons';
import { Spacing, Typography, BorderRadius, alpha } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { Card, ProgressBar } from './ui';

interface MonthlyProgressProps {
  loggedDays: number;
  totalDays: number;
}

/**
 * MonthlyProgress — consistency for the current month.
 *
 * The percentage is the headline now rather than a footnote under the bar, and
 * it is colour-coded so a glance tells you whether the month is going well.
 */
export const MonthlyProgress: React.FC<MonthlyProgressProps> = ({ loggedDays, totalDays }) => {
  const { colors } = useTheme();
  const ratio = totalDays > 0 ? Math.min(loggedDays / totalDays, 1) : 0;
  const percent = Math.round(ratio * 100);

  // Three bands: struggling, holding, strong.
  const tint = percent >= 80 ? colors.success : percent >= 50 ? colors.primary : colors.warning;
  const verdict =
    percent >= 80 ? 'Excellent consistency' : percent >= 50 ? 'Holding steady' : 'Room to grow';

  return (
    <Card elevation="low">
      <View style={styles.header}>
        <View style={[styles.iconChip, { backgroundColor: alpha(tint, 0.12) }]}>
          <FontAwesome5 name="chart-line" size={13} color={tint} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.label, { color: colors.textTertiary }]}>This Month</Text>
          <Text style={[styles.verdict, { color: colors.textPrimary }]}>{verdict}</Text>
        </View>
        <Text style={[styles.percent, { color: tint }]}>{percent}%</Text>
      </View>

      <ProgressBar value={ratio} color={tint} height={10} style={styles.bar} />

      <Text style={[styles.fraction, { color: colors.textTertiary }]}>
        {loggedDays} of {totalDays} day{totalDays === 1 ? '' : 's'} logged so far
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  label: {
    ...Typography.overline,
  },
  verdict: {
    ...Typography.titleMedium,
    marginTop: 2,
  },
  percent: {
    ...Typography.numeralMedium,
  },
  bar: {
    marginTop: Spacing.md,
  },
  fraction: {
    ...Typography.caption,
    marginTop: Spacing.sm,
  },
});
